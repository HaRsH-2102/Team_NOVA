#include "http_parser.h"
#include <sstream>
#include <algorithm>

bool HttpParser::parse_request(const std::string& raw_data, HttpRequest& req) {
    req.raw_request = raw_data;
    size_t header_end = raw_data.find("\r\n\r\n");
    if (header_end == std::string::npos) return false;

    std::string headers_part = raw_data.substr(0, header_end);
    req.body = raw_data.substr(header_end + 4);

    std::istringstream stream(headers_part);
    std::string line;
    
    if (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        std::istringstream line_stream(line);
        line_stream >> req.method >> req.path >> req.version;
    } else {
        return false;
    }

    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        size_t colon = line.find(':');
        if (colon != std::string::npos) {
            std::string key = line.substr(0, colon);
            std::string value = line.substr(colon + 1);
            size_t start = value.find_first_not_of(" \t");
            if (start != std::string::npos) value = value.substr(start);
            
            std::transform(key.begin(), key.end(), key.begin(), ::tolower);
            req.headers[key] = value;
        }
    }
    return true;
}
