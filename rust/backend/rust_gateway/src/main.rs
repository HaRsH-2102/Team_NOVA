use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer};
use awc::Client;
use redis::AsyncCommands;
use std::sync::Arc;



use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use chrono::Utc;

// 🔥 GLOBAL COUNTERS
static TOTAL_REQUESTS: AtomicUsize = AtomicUsize::new(0);
static BLOCKED_REQUESTS: AtomicUsize = AtomicUsize::new(0);
static RATE_LIMITED: AtomicUsize = AtomicUsize::new(0);

// 🔥 LOG STORAGE
lazy_static::lazy_static! {
    static ref ATTACK_LOGS: Mutex<Vec<serde_json::Value>> = Mutex::new(Vec::new());
}

const BACKEND_URL: &str = "http://127.0.0.1:8080";
const RATE_LIMIT: i32 = 5; // max requests
const WINDOW: i64 = 60; // seconds

// =====================
// RATE LIMIT FUNCTION
// =====================
async fn is_rate_limited(ip: &str, redis_client: &redis::Client) -> bool {
    let mut conn = redis_client.get_async_connection().await.unwrap();

    let key = format!("rate:{}", ip);

    let count: i32 = conn.incr(&key, 1).await.unwrap();

    if count == 1 {
        let _: () = conn.expire(&key, WINDOW).await.unwrap();
    }

    count > RATE_LIMIT
}

// =====================
// PROXY HANDLER
// =====================

TOTAL_REQUESTS.fetch_add(1, Ordering::Relaxed);

async fn proxy(
    req: HttpRequest,
    body: web::Bytes,
    redis_client: web::Data<Arc<redis::Client>>,
) -> HttpResponse {
    let ip = req
        .peer_addr()
        .map(|a| a.ip().to_string())
        .unwrap_or("unknown".into());

    let body_str = String::from_utf8_lossy(&body);

    let full_data = format!("{}{}", req.uri(), body_str);

    // =====================
    // 🔥 WAF CHECK
    // =====================
    if let Some(attack_type) = detect_attack(&full_data) {
        println!("🚫 BLOCKED {} from IP: {}", attack_type, ip);

        return HttpResponse::Forbidden().body(format!(
            "Blocked by WAF: {}",
            attack_type
        ));
    }

    // =====================
    // 🔥 RATE LIMIT
    // =====================

    RATE_LIMITED.fetch_add(1, Ordering::Relaxed);


    if is_rate_limited(&ip, &redis_client).await {
        println!("🚫 Rate limited IP: {}", ip);

        return HttpResponse::TooManyRequests().body("Too Many Requests");
    }

    // =====================
    // 🔁 FORWARD REQUEST
    // =====================
    let client = Client::default();
    let url = format!("{}{}", BACKEND_URL, req.uri());

    let response = client
        .request(req.method().clone(), url)
        .send_body(body)
        .await;

    match response {
        Ok(mut res) => {
            let body = res.body().await.unwrap();
            HttpResponse::build(res.status()).body(body)
        }
        Err(_) => HttpResponse::InternalServerError().body("Proxy Error"),
    }
}



// =====================
// MAIN
// =====================
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 Rust Gateway + Redis running on http://localhost:9090");

    let redis_client = Arc::new(redis::Client::open("redis://127.0.0.1/").unwrap());

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(redis_client.clone()))
            .route("/metrics", web::get().to(metrics))
            .route("/logs", web::get().to(logs))
            .default_service(web::route().to(proxy))
    })
    .workers(num_cpus::get())
    .bind(("127.0.0.1", 9090))?
    .run()
    .await
}

fn detect_attack(data: &str) -> Option<&'static str> {
    let d = data.to_lowercase();

    // 🔴 SQL Injection patterns
    let sql_patterns = [
        "or 1=1",
        "union select",
        "drop table",
        "insert into",
        "delete from",
        "update set",
        "--",
        "xp_cmdshell",
        "information_schema",
    ];

    for pattern in sql_patterns {
        if d.contains(pattern) {
            return Some("SQL Injection");
        }
    }

    // 🔴 XSS patterns
    let xss_patterns = [
        "<script>",
        "</script>",
        "onerror=",
        "onload=",
        "alert(",
    ];

    for pattern in xss_patterns {
        if d.contains(pattern) {
            return Some("XSS Attack");
        }
    }

    None
}

BLOCKED_REQUESTS.fetch_add(1, Ordering::Relaxed);

let log = serde_json::json!({
    "ip": ip,
    "attack": attack_type,
    "time": Utc::now().to_rfc3339()
});

ATTACK_LOGS.lock().unwrap().push(log);


async fn metrics() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "total_requests": TOTAL_REQUESTS.load(Ordering::Relaxed),
        "blocked_requests": BLOCKED_REQUESTS.load(Ordering::Relaxed),
        "rate_limited": RATE_LIMITED.load(Ordering::Relaxed)
    }))
}


async fn metrics() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "total_requests": TOTAL_REQUESTS.load(Ordering::Relaxed),
        "blocked_requests": BLOCKED_REQUESTS.load(Ordering::Relaxed),
        "rate_limited": RATE_LIMITED.load(Ordering::Relaxed)
    }))
}