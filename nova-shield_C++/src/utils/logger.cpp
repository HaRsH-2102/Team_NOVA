#include "logger.h"
#include <iostream>
#include <chrono>
#include <ctime>
#include <iomanip>

static std::string get_time_str() {
    auto now = std::chrono::system_clock::now();
    std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm buf;
#ifdef _WIN32
    localtime_s(&buf, &now_time);
#else
    localtime_r(&now_time, &buf);
#endif
    char buffer[80];
    std::strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &buf);
    return buffer;
}

void Logger::init() {}

void Logger::info(const std::string& msg) {
    std::cout << "[" << get_time_str() << "] [INFO] " << msg << std::endl;
}

void Logger::warn(const std::string& msg) {
    std::cout << "[" << get_time_str() << "] [WARN] " << msg << std::endl;
}

void Logger::error(const std::string& msg) {
    std::cerr << "[" << get_time_str() << "] [ERROR] " << msg << std::endl;
}
