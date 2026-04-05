#include "blacklist.h"

void Blacklist::init(const Config& config) {
    for (const auto& ip : config.security.blacklisted_ips) {
        blocked_ips.insert(ip);
    }
}

bool Blacklist::is_blocked(const std::string& ip) const {
    return blocked_ips.find(ip) != blocked_ips.end();
}
