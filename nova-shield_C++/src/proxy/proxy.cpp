#include "proxy.h"
#include "../utils/logger.h"
#include <winsock2.h>
#include <ws2tcpip.h>
#include <sstream>

void ProxyForwarder::init(const Config& config) {
    backend_host = config.server.backend_host;
    backend_port = config.server.backend_port;
}

HttpResponse ProxyForwarder::forward(const HttpRequest& req) {
    HttpResponse res;
    
    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) {
        res.status_code = 502;
        res.status_message = "Bad Gateway";
        return res;
    }

    sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(backend_port);
    inet_pton(AF_INET, backend_host.c_str(), &server_addr.sin_addr);

    if (connect(sock, (SOCKADDR*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        closesocket(sock);
        res.status_code = 502;
        res.status_message = "Bad Gateway";
        return res;
    }

    std::ostringstream req_oss;
    req_oss << req.method << " " << req.path << " HTTP/1.1\r\n";
    for (const auto& [k, v] : req.headers) {
        if (k == "host") {
            req_oss << "Host: " << backend_host << ":" << backend_port << "\r\n";
        } else {
            req_oss << k << ": " << v << "\r\n";
        }
    }
    if (req.headers.find("host") == req.headers.end()) {
        req_oss << "Host: " << backend_host << ":" << backend_port << "\r\n";
    }
    req_oss << "Connection: close\r\n";
    req_oss << "\r\n" << req.body;

    std::string forwarded_request = req_oss.str();
    send(sock, forwarded_request.c_str(), forwarded_request.size(), 0);

    char buffer[4096];
    std::string response_data;
    
    u_long mode = 1;
    ioctlsocket(sock, FIONBIO, &mode);
    
    while (true) {
        fd_set readfds;
        FD_ZERO(&readfds);
        FD_SET(sock, &readfds);
        
        timeval timeout;
        timeout.tv_sec = 2; // 2 sec timeout
        timeout.tv_usec = 0;
        
        int result = select(0, &readfds, NULL, NULL, &timeout);
        if (result > 0) {
            int bytes_received = recv(sock, buffer, sizeof(buffer), 0);
            if (bytes_received > 0) {
                response_data.append(buffer, bytes_received);
                if (response_data.find("0\r\n\r\n") != std::string::npos) break;
                size_t header_end = response_data.find("\r\n\r\n");
                if (header_end != std::string::npos) {
                    size_t cl_pos = response_data.find("Content-Length: ");
                    if (cl_pos != std::string::npos && cl_pos < header_end) {
                        size_t cl_end = response_data.find("\r\n", cl_pos);
                        int content_length = std::stoi(response_data.substr(cl_pos + 16, cl_end - (cl_pos + 16)));
                        if (response_data.size() >= header_end + 4 + content_length) break;
                    }
                }
            } else {
                break;
            }
        } else {
            break;
        }
    }

    closesocket(sock);

    size_t header_end = response_data.find("\r\n\r\n");
    if (header_end != std::string::npos) {
        std::istringstream stream(response_data.substr(0, header_end));
        std::string line;
        if (std::getline(stream, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            std::istringstream line_stream(line);
            std::string version;
            line_stream >> version >> res.status_code;
            std::getline(line_stream, res.status_message);
            if (!res.status_message.empty() && res.status_message[0] == ' ') {
                res.status_message = res.status_message.substr(1);
            }
        }
        while (std::getline(stream, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            size_t colon = line.find(':');
            if (colon != std::string::npos) {
                std::string key = line.substr(0, colon);
                std::string value = line.substr(colon + 1);
                size_t start = value.find_first_not_of(" \t");
                if (start != std::string::npos) value = value.substr(start);
                if (key != "Transfer-Encoding") {
                    res.headers[key] = value;
                }
            }
        }
        res.body = response_data.substr(header_end + 4);
        res.headers["Content-Length"] = std::to_string(res.body.size());
    } else {
        res.status_code = 502;
        res.status_message = "Bad Gateway";
    }

    return res;
}
