#include "jwt.h"

void JwtValidator::init(const Config& config) {
    secret = config.jwt.secret;
    protected_routes = config.jwt.protected_routes;
}

bool JwtValidator::requires_auth(const std::string& path) const {
    for (const auto& route : protected_routes) {
        if (path == route || (path.find(route) == 0 && (path.length() == route.length() || path[route.length()] == '/'))) {
            return true;
        }
    }
    return false;
}

bool JwtValidator::validate(const HttpRequest& req) const {
    auto it = req.headers.find("authorization");
    if (it == req.headers.end()) return false;
    
    std::string auth_header = it->second;
    if (auth_header.find("Bearer ") != 0) return false;
    
    std::string token = auth_header.substr(7);
    
    // Simplistic mock JWT verification
    return token == "valid_token";
}
