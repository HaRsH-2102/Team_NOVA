#pragma once
#include <string>
#include <unordered_map>
#include <mutex>
#include <vector>
#include "../config/config.h"
#include "../models/request.h"

class RateLimiter {
private:
    struct Window {
        int count = 0;
        long long start_time = 0;
    };
    std::unordered_map<std::string, Window> windows;
    std::mutex mtx;
    std::vector<RateLimitConfig> rules;

    long long current_time_seconds() const;
    
public:
    void init(const Config& config);
    bool allow(const HttpRequest& req);
};
