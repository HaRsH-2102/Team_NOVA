#pragma once
#include "app_state.h"
#include <string>
#include <winsock2.h>
#include <thread>
#include <vector>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <queue>

class Server {
private:
    AppState state;
    SOCKET server_socket;
    bool running;
    
    std::vector<std::thread> workers;
    std::queue<std::pair<SOCKET, std::string>> task_queue;
    std::mutex queue_mutex;
    std::condition_variable condition;
    
    void worker_thread();

public:
    Server(const std::string& config_path);
    ~Server();
    void start();
    void stop();
};
