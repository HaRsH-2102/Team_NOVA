#include "config.h"
#include "../utils/logger.h"
#include <fstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

bool Config::load(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        Logger::error("Failed to open config file: " + filename);
        return false;
    }
    
    try {
        json j;
        file >> j;
        
        server.listen_port = j["server"]["listen_port"];
        server.backend_host = j["server"]["backend_host"];
        server.backend_port = j["server"]["backend_port"];
        
        for (const auto& rl : j["rate_limits"]) {
            RateLimitConfig rlc;
            rlc.path = rl["path"];
            rlc.method = rl["method"];
            rlc.limit = rl["limit"];
            rlc.window_seconds = rl["window_seconds"];
            rate_limits.push_back(rlc);
        }
        
        security.block_sql_injection = j["security"]["block_sql_injection"];
        for (const auto& ip : j["security"]["blacklisted_ips"]) {
            security.blacklisted_ips.push_back(ip);
        }
        
        if (j.contains("jwt")) {
            for (const auto& route : j["jwt"]["protected_routes"]) {
                jwt.protected_routes.push_back(route);
            }
            jwt.secret = j["jwt"]["secret"];
        }
        return true;
    } catch (const std::exception& e) {
        Logger::error("Failed to parse config: " + std::string(e.what()));
        return false;
    }
}
