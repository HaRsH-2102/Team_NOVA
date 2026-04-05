#pragma once
#include <string>
#include <vector>
#include "../config/config.h"
#include "../models/request.h"

class JwtValidator {
private:
    std::string secret;
    std::vector<std::string> protected_routes;
public:
    void init(const Config& config);
    bool validate(const HttpRequest& req) const;
    bool requires_auth(const std::string& path) const;
};
