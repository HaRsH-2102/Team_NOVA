#pragma once
#include "../config/config.h"
#include "../models/request.h"
#include <string>
#include <vector>

class WAF {
private:
    bool enabled;
    std::vector<std::string> sql_patterns;
    std::vector<std::string> xss_patterns;
    std::vector<std::string> path_traversal_patterns;
    std::vector<std::string> cmd_patterns;

    bool contains_pattern(const std::string& text, const std::vector<std::string>& patterns) const;
public:
    void init(const Config& config);
    bool detect(const HttpRequest& req) const;
};
