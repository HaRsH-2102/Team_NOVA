#pragma once
#include <winsock2.h>
#include "app_state.h"

class Connection {
private:
    SOCKET client_socket;
    std::string client_ip;
    AppState* state;

public:
    Connection(SOCKET sock, const std::string& ip, AppState* state);
    void process();
};
