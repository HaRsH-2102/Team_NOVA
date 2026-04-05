#pragma once
#include "../config/config.h"
#include "../middleware/rate_limiter.h"
#include "../middleware/waf.h"
#include "../middleware/blacklist.h"
#include "../middleware/jwt.h"
#include "../proxy/proxy.h"
#include <atomic>
#include <deque>
#include <mutex>
#include <nlohmann/json.hpp>

struct LogEntry {
    std::string id;
    std::string time;
    int status;
    std::string method;
    std::string path;
    std::string ip;
    std::string action;
};

struct Metrics {
    std::atomic<int> total_requests{0};
    std::atomic<int> blocked_requests{0};
    std::atomic<int> active_connections{0};
    std::atomic<int> waf_blocks{0};
    std::atomic<int> rate_limit_blocks{0};
    std::atomic<int> blacklist_blocks{0};
    std::atomic<int> jwt_failures{0};
};

struct AppState {
    Config config;
    RateLimiter rateLimiter;
    WAF waf;
    Blacklist blacklist;
    JwtValidator jwt;
    ProxyForwarder proxy;
    Metrics metrics;
    
    std::deque<LogEntry> logs;
    std::mutex logs_mutex;
    
    void add_log(int status, const std::string& method, const std::string& path, const std::string& ip, const std::string& action) {
        LogEntry entry;
        entry.id = std::to_string(std::rand()); // simple random ID
        
        time_t now = time(0);
        char buf[80];
        strftime(buf, sizeof(buf), "%X", localtime(&now));
        entry.time = buf;
        
        entry.status = status;
        entry.method = method;
        entry.path = path;
        entry.ip = ip;
        entry.action = action;
        
        std::lock_guard<std::mutex> lock(logs_mutex);
        logs.push_front(entry);
        if (logs.size() > 100) {
            logs.pop_back();
        }
    }
    
    void init(const std::string& config_file) {
        if (config.load(config_file)) {
            rateLimiter.init(config);
            waf.init(config);
            blacklist.init(config);
            jwt.init(config);
            proxy.init(config);
        }
    }
};
