#pragma once
#include "../models/request.h"

class HttpParser {
public:
    static bool parse_request(const std::string& raw_data, HttpRequest& req);
};
