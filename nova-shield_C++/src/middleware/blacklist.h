#pragma once
#include <string>
#include <unordered_set>
#include "../config/config.h"

class Blacklist {
private:
    std::unordered_set<std::string> blocked_ips;
public:
    void init(const Config& config);
    bool is_blocked(const std::string& ip) const;
};
