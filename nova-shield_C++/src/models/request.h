#pragma once
#include <string>
#include <map>

struct HttpRequest {
    std::string method;
    std::string path;
    std::string version;
    std::string client_ip;
    std::map<std::string, std::string> headers;
    std::string body;
    std::string raw_request;
};
