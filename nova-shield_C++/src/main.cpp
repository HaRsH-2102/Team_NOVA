#include "server/server.h"
#include "utils/logger.h"
#include <iostream>

int main() {
    Logger::init();
    Logger::info("Initializing Nova Shield...");

    Server server("config.json");
    server.start();

    return 0;
}
