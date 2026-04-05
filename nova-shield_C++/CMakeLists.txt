cmake_minimum_required(VERSION 3.15)
project(NovaShield CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Fetch nlohmann_json for parsing configuration
include(FetchContent)
FetchContent_Declare(
    json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

include_directories(src)

file(GLOB_RECURSE SRC_FILES "src/*.cpp")

add_executable(nova-shield ${SRC_FILES})

# ws2_32 is required for Windows Sockets (WinSock2)
if(WIN32)
    target_link_libraries(nova-shield PRIVATE nlohmann_json::nlohmann_json ws2_32)
else()
    target_link_libraries(nova-shield PRIVATE nlohmann_json::nlohmann_json)
endif()
