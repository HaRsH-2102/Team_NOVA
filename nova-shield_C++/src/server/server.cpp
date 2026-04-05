#include "server.h"
#include "connection.h"
#include "../utils/logger.h"
#include <ws2tcpip.h>
#include <iostream>

Server::Server(const std::string& config_path) : running(false) {
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);

    state.init(config_path);
    server_socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
}

Server::~Server() {
    stop();
    closesocket(server_socket);
    WSACleanup();
}

void Server::worker_thread() {
    while (true) {
        std::pair<SOCKET, std::string> task;
        {
            std::unique_lock<std::mutex> lock(queue_mutex);
            condition.wait(lock, [this] { return !running || !task_queue.empty(); });
            if (!running && task_queue.empty()) {
                return;
            }
            task = task_queue.front();
            task_queue.pop();
        }
        
        Connection conn(task.first, task.second, &state);
        conn.process();
    }
}

void Server::start() {
    sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(state.config.server.listen_port);
    server_addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(server_socket, (SOCKADDR*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        Logger::error("Bind failed.");
        return;
    }

    if (listen(server_socket, SOMAXCONN) == SOCKET_ERROR) {
        Logger::error("Listen failed.");
        return;
    }

    running = true;
    
    int num_threads = 8;
    for (int i = 0; i < num_threads; ++i) {
        workers.emplace_back(&Server::worker_thread, this);
    }

    Logger::info("Nova Shield started on port " + std::to_string(state.config.server.listen_port));

    std::thread metrics_thread([this]() {
        while (running) {
            std::this_thread::sleep_for(std::chrono::seconds(10));
            Logger::info("Metrics - Total: " + std::to_string(state.metrics.total_requests.load()) +
                         ", Blocked: " + std::to_string(state.metrics.blocked_requests.load()) +
                         ", Active: " + std::to_string(state.metrics.active_connections.load()));
        }
    });
    metrics_thread.detach();

    while (running) {
        sockaddr_in client_addr;
        int client_size = sizeof(client_addr);
        SOCKET client_socket = accept(server_socket, (SOCKADDR*)&client_addr, &client_size);
        
        if (client_socket != INVALID_SOCKET) {
            char ip_str[INET_ADDRSTRLEN];
            inet_ntop(AF_INET, &client_addr.sin_addr, ip_str, INET_ADDRSTRLEN);
            std::string client_ip(ip_str);
            
            {
                std::lock_guard<std::mutex> lock(queue_mutex);
                task_queue.push({client_socket, client_ip});
            }
            condition.notify_one();
        } else if (running) {
            Logger::warn("Accept failed.");
        }
    }
}

void Server::stop() {
    running = false;
    condition.notify_all();
    for (auto& worker : workers) {
        if (worker.joinable()) {
            worker.join();
        }
    }
}
