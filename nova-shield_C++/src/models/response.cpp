#include "response.h"
#include <sstream>

std::string HttpResponse::to_string() const {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << status_code << " " << status_message << "\r\n";
    for (const auto& [k, v] : headers) {
        oss << k << ": " << v << "\r\n";
    }
    oss << "Content-Length: " << body.size() << "\r\n";
    oss << "Connection: close\r\n\r\n";
    oss << body;
    return oss.str();
}
