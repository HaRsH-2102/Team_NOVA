#pragma once
#include "../models/request.h"
#include "../models/response.h"
#include "../config/config.h"

class ProxyForwarder {
private:
    std::string backend_host;
    int backend_port;
public:
    void init(const Config& config);
    HttpResponse forward(const HttpRequest& req);
};
