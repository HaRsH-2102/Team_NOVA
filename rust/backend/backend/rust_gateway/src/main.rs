use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use actix::*;
use actix_web_actors::ws;
use awc::Client;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use chrono::Utc;
use deadpool_redis::{Config, Pool};
use actix::Message;

// =====================
// CUSTOM WS MESSAGE
// =====================
#[derive(Message)]
#[rtype(result = "()")]
struct WsTextMessage(pub String);

// =====================
// GLOBAL METRICS
// =====================
static TOTAL_REQUESTS: AtomicUsize = AtomicUsize::new(0);
static BLOCKED_REQUESTS: AtomicUsize = AtomicUsize::new(0);
static RATE_LIMITED: AtomicUsize = AtomicUsize::new(0);

// =====================
// LOG STORAGE
// =====================
lazy_static::lazy_static! {
    static ref ATTACK_LOGS: Mutex<Vec<serde_json::Value>> = Mutex::new(Vec::new());
}

// =====================
// WS CLIENTS
// =====================
lazy_static::lazy_static! {
    static ref WS_CLIENTS: Mutex<Vec<Addr<WsSession>>> = Mutex::new(Vec::new());
}

// =====================
// CONSTANTS
// =====================
const BACKEND_URL: &str = "http://127.0.0.1:8080";
const RATE_LIMIT: i32 = 5;
const WINDOW: i64 = 60;

// =====================
// RATE LIMIT
// =====================
async fn is_rate_limited(ip: &str, pool: &web::Data<Pool>) -> bool {
    let mut conn = pool.get().await.unwrap();
    let conn = conn.as_mut();

    let key = format!("rate:{}", ip);

    let count: i32 = redis::cmd("INCR")
        .arg(&key)
        .query_async(conn)
        .await
        .unwrap();

    if count == 1 {
        let _: () = redis::cmd("EXPIRE")
            .arg(&key)
            .arg(WINDOW)
            .query_async(conn)
            .await
            .unwrap();
    }

    count > RATE_LIMIT
}

// =====================
// ATTACK DETECTION
// =====================
fn detect_attack(data: &str) -> Option<&'static str> {
    let d = data.to_lowercase();

    if d.contains("or 1=1") || d.contains("union select") {
        return Some("SQL Injection");
    }

    if d.contains("<script>") || d.contains("onerror=") {
        return Some("XSS Attack");
    }

    None
}

// =====================
// WS SESSION
// =====================
struct WsSession;

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, _msg: Result<ws::Message, ws::ProtocolError>, _ctx: &mut Self::Context) {}
}

impl Handler<WsTextMessage> for WsSession {
    type Result = ();

    fn handle(&mut self, msg: WsTextMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

// =====================
// WS HANDLER
// =====================
async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
) -> Result<HttpResponse, actix_web::Error> {
    use actix_web_actors::ws::WsResponseBuilder;

    let (addr, resp) =
        WsResponseBuilder::new(WsSession, &req, stream).start_with_addr()?;

    WS_CLIENTS.lock().unwrap().push(addr);

    Ok(resp)
}

// =====================
// BROADCAST
// =====================
fn broadcast(message: serde_json::Value) {
    let clients = WS_CLIENTS.lock().unwrap();

    for client in clients.iter() {
        client.do_send(WsTextMessage(message.to_string()));
    }
}

// =====================
// PROXY
// =====================
async fn proxy(
    req: HttpRequest,
    body: web::Bytes,
    pool: web::Data<Pool>,
) -> HttpResponse {

    let path = req.uri().path();

    // ✅ SKIP INTERNAL ROUTES
    if path == "/metrics" || path == "/logs" || path == "/ws" {
        return HttpResponse::Ok().finish();
    }

    TOTAL_REQUESTS.fetch_add(1, Ordering::Relaxed);

    broadcast(serde_json::json!({
        "type": "request",
        "total": TOTAL_REQUESTS.load(Ordering::Relaxed)
    }));

    let ip = req
        .peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or("unknown".into());

    let body_str = String::from_utf8_lossy(&body);
    let full_data = format!("{}{}", req.uri(), body_str);

    // 🔥 WAF
    if let Some(attack) = detect_attack(&full_data) {
        BLOCKED_REQUESTS.fetch_add(1, Ordering::Relaxed);

        let log = serde_json::json!({
            "ip": ip,
            "attack": attack,
            "time": Utc::now().to_rfc3339()
        });

        ATTACK_LOGS.lock().unwrap().push(log.clone());

        broadcast(serde_json::json!({
            "type": "attack",
            "data": log
        }));

        return HttpResponse::Forbidden().body("Blocked");
    }

    // 🔥 RATE LIMIT
    if is_rate_limited(&ip, &pool).await {
        RATE_LIMITED.fetch_add(1, Ordering::Relaxed);

        broadcast(serde_json::json!({
            "type": "rate_limit",
            "ip": ip
        }));

        return HttpResponse::TooManyRequests().body("Too Many Requests");
    }

    // 🔥 FORWARD
    let client = Client::default();
    let url = format!("{}{}", BACKEND_URL, req.uri());

    match client.request(req.method().clone(), url).send_body(body).await {
        Ok(mut res) => {
            let body = res.body().await.unwrap();
            HttpResponse::build(res.status()).body(body)
        }
        Err(_) => HttpResponse::InternalServerError().body("Backend Error"),
    }
}

// =====================
// METRICS
// =====================
async fn metrics() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "total": TOTAL_REQUESTS.load(Ordering::Relaxed),
        "blocked": BLOCKED_REQUESTS.load(Ordering::Relaxed),
        "rate_limited": RATE_LIMITED.load(Ordering::Relaxed)
    }))
}

// =====================
// LOGS
// =====================
async fn logs() -> HttpResponse {
    let logs = ATTACK_LOGS.lock().unwrap();
    HttpResponse::Ok().json(logs.clone())
}

// =====================
// MAIN
// =====================
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 Rust Gateway running on http://localhost:9090");

    let mut cfg = Config::from_url("redis://127.0.0.1/");
    let pool: Pool = cfg.create_pool(None).unwrap();

    use std::time::Duration;

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .route("/metrics", web::get().to(metrics))
            .route("/logs", web::get().to(logs))
            .route("/ws", web::get().to(ws_handler))
            .default_service(web::route().to(proxy))
    })
    .workers(num_cpus::get() * 2)
    .keep_alive(Duration::from_secs(75)) // ✅ FIXED
    .bind(("127.0.0.1", 9090))?
    .run()
    .await
}