#include "connection.h"
#include "../utils/http_parser.h"
#include "../utils/logger.h"
#include <vector>
#include <nlohmann/json.hpp>

Connection::Connection(SOCKET sock, const std::string& ip, AppState* st) 
    : client_socket(sock), client_ip(ip), state(st) {
    state->metrics.active_connections++;
}

void Connection::process() {
    char buffer[4096];
    int bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
    
    if (bytes_read > 0) {
        buffer[bytes_read] = '\0';
        std::string raw_request(buffer, bytes_read);
        
        HttpRequest req;
        req.client_ip = client_ip;
        
        if (HttpParser::parse_request(raw_request, req)) {
            
            // Intercept /metrics for the React Dashboard
            if (req.path == "/metrics" && req.method == "GET") {
                HttpResponse res;
                res.status_code = 200;
                res.status_message = "OK";
                
                nlohmann::json j;
                j["total_requests"] = state->metrics.total_requests.load();
                j["blocked_requests"] = state->metrics.blocked_requests.load();
                j["active_connections"] = state->metrics.active_connections.load();
                j["waf_blocks"] = state->metrics.waf_blocks.load();
                j["rate_limit_blocks"] = state->metrics.rate_limit_blocks.load();
                j["blacklist_blocks"] = state->metrics.blacklist_blocks.load();
                j["jwt_failures"] = state->metrics.jwt_failures.load();
                
                // For RPS calculation purely driven by frontend differences over time
                j["rps"] = 0; 
                
                res.headers["Access-Control-Allow-Origin"] = "*";
                res.headers["Content-Type"] = "application/json";
                res.body = j.dump();
                res.headers["Content-Length"] = std::to_string(res.body.size());
                
                std::string res_str = res.to_string();
                send(client_socket, res_str.c_str(), res_str.size(), 0);
            } 
            else if (req.path == "/logs" && req.method == "GET") {
                HttpResponse res;
                res.status_code = 200;
                res.status_message = "OK";
                
                nlohmann::json json_logs = nlohmann::json::array();
                {
                    std::lock_guard<std::mutex> lock(state->logs_mutex);
                    for (const auto& log : state->logs) {
                        nlohmann::json j_log;
                        j_log["id"] = log.id;
                        j_log["time"] = log.time;
                        j_log["status"] = log.status;
                        j_log["method"] = log.method;
                        j_log["path"] = log.path;
                        j_log["ip"] = log.ip;
                        j_log["action"] = log.action;
                        json_logs.push_back(j_log);
                    }
                }
                
                res.headers["Access-Control-Allow-Origin"] = "*";
                res.headers["Content-Type"] = "application/json";
                res.body = json_logs.dump();
                res.headers["Content-Length"] = std::to_string(res.body.size());
                
                std::string res_str = res.to_string();
                send(client_socket, res_str.c_str(), res_str.size(), 0);
            }
            else {
                state->metrics.total_requests++;
                
                HttpResponse res;
                bool blocked = false;
                
                std::string action = "ALLOWED";
                
                if (state->blacklist.is_blocked(client_ip)) {
                    res.status_code = 403;
                    res.status_message = "Forbidden";
                    res.body = "IP Blocked";
                    blocked = true;
                    state->metrics.blacklist_blocks++;
                    action = "IP_BLOCK";
                }
                else if (state->waf.detect(req)) {
                    res.status_code = 403;
                    res.status_message = "Forbidden";
                    res.body = "Malicious Payload Detected";
                    blocked = true;
                    state->metrics.waf_blocks++;
                    action = "WAF_BLOCK";
                }
                else if (!state->rateLimiter.allow(req)) {
                    res.status_code = 429;
                    res.status_message = "Too Many Requests";
                    res.body = "Rate Limit Exceeded";
                    blocked = true;
                    state->metrics.rate_limit_blocks++;
                    action = "RATE_LIMITED";
                }
                else if (state->jwt.requires_auth(req.path) && !state->jwt.validate(req)) {
                    res.status_code = 401;
                    res.status_message = "Unauthorized";
                    res.body = "Invalid or Missing Token";
                    blocked = true;
                    state->metrics.jwt_failures++;
                    action = "JWT_INVALID";
                }
                
                if (blocked) {
                    state->add_log(res.status_code, req.method, req.path, client_ip, action);
                    state->metrics.blocked_requests++;
                    res.headers["Access-Control-Allow-Origin"] = "*";
                    res.headers["Content-Type"] = "text/plain";
                    res.headers["Content-Length"] = std::to_string(res.body.size());
                    std::string res_str = res.to_string();
                    send(client_socket, res_str.c_str(), res_str.size(), 0);
                    Logger::info("Blocked " + req.method + " " + req.path + " from " + client_ip);
                } else {
                    HttpResponse backend_res = state->proxy.forward(req);
                    state->add_log(backend_res.status_code, req.method, req.path, client_ip, "ALLOWED");
                    backend_res.headers["Access-Control-Allow-Origin"] = "*"; // Add CORS safely to backend 
                    std::string res_str = backend_res.to_string();
                    send(client_socket, res_str.c_str(), res_str.size(), 0);
                    Logger::info("Proxied " + req.method + " " + req.path + " -> " + std::to_string(backend_res.status_code));
                }
            }
        }
    }
    
    closesocket(client_socket);
    state->metrics.active_connections--;
}
