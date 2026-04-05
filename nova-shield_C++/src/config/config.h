#pragma once
#include <string>
#include <vector>

struct RateLimitConfig {
    std::string path;
    std::string method;
    int limit;
    int window_seconds;
};

struct ServerConfig {
    int listen_port;
    std::string backend_host;
    int backend_port;
};

struct SecurityConfig {
    bool block_sql_injection;
    std::vector<std::string> blacklisted_ips;
};

struct JwtConfig {
    std::vector<std::string> protected_routes;
    std::string secret;
};

class Config {
public:
    ServerConfig server;
    std::vector<RateLimitConfig> rate_limits;
    SecurityConfig security;
    JwtConfig jwt;

    bool load(const std::string& filename);
};
