#include "rate_limiter.h"
#include <chrono>

void RateLimiter::init(const Config& config) {
    rules = config.rate_limits;
}

long long RateLimiter::current_time_seconds() const {
    return std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
}

bool RateLimiter::allow(const HttpRequest& req) {
    std::lock_guard<std::mutex> lock(mtx);
    long long now = current_time_seconds();

    for (const auto& rule : rules) {
        if (rule.path == req.path && rule.method == req.method) {
            std::string key = req.client_ip + ":" + rule.method + ":" + rule.path;
            auto& window = windows[key];
            if (now - window.start_time > rule.window_seconds) {
                window.start_time = now;
                window.count = 1;
            } else {
                window.count++;
                if (window.count > rule.limit) {
                    return false;
                }
            }
        }
    }
    return true;
}
