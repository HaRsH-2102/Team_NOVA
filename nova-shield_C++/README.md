# 🛡️ Nova Shield

> **A High-Performance, Production-Grade Reverse Proxy & React Dashboard API Gateway**

**Nova Shield** is a state-of-the-art security API Gateway implemented in standard C++17, bundled with a stunning real-time React dashboard. Designed strictly for speed on Windows (`WinSock2`), it operates as a secure barrier and router for backend microservices, screening incoming HTTP traffic for malicious intent and tracking realtime network vitals.

---

## 🏗️ Architecture

```text
[ Clients / Hackers ]  --->  [ Nova Shield (C++ Proxy) ]  --->  [ Backend Services ]
                                        |
                 [ React Dashboard (Vite + Tailwind Frontend) ]
```

---

## ✨ Features

### 🛡️ C++ Reverse Proxy Core
* **Transparent Routing**: Silently processes headers and body payloads mapping traffic straight to restricted targets without bottlenecks.
* **Granular Rate Limiting**: Track requests by `IP:Method:Path` across custom sliding windows to completely halt DDoS attacks or abuse.
* **WAF (Web Application Firewall)**: Identifies and brutally slices out malicious packet intents containing:
  * SQL Injections (`or 1=1`, `DROP TABLE`)
  * Cross-Site Scripting (XSS) (`<script>`)
  * Path Traversals (`../etc/`)
* **JWT Access Gates**: Validates incoming `Authorization: Bearer` headers enforcing strict access per route.
* **Sleek Multi-Threading**: Non-blocking sockets and native `std::thread` pools scale to high request concurrency dynamically.

### 📊 React Real-time Dashboard
* **Dynamic Traffic Chartizing**: Features a live ticking Area Chart (`Recharts`) tracking Allowed vs Blocked RPS (Requests per second).
* **Live WAF Terminal**: A slick, auto-scrolling visual terminal for analyzing network events. Includes live filtering, search options, and play/pause functions.
* **Threat Security Analysis**: Maps the structural percentage of what kinds of threats hit specific API endpoints (SQLi vs XSS).
* **Glassmorphism Design**: Custom Dark UI inspired by Cloudflare and Grafana configured via Tailwind CSS.

---

## 🚀 Quick Start Guide

### 1. Build and Run the C++ Proxy Server
Nova Shield relies on CMake and `nlohmann_json` (pulled automatically).
From the project root:
```cmd
.\run.bat
```
*(This native helper immediately finds your build directory, starts a mock python backend on port `8080`, and fires up the Nova Shield Proxy on `9090`)*

*(Manual build optional)*:
```cmd
mkdir build
cd build
cmake -G "MinGW Makefiles" ..
cmake --build .
```

### 2. Launch the React Dashboard
To view your networking stats visually, boot up the frontend server:
```cmd
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173/`** (or `5174`) in your browser to view the interface.

---

## ⚙️ How It Works (Configuration)

All restrictions, limits, and backend port mapping logic sit within the primary `config.json` inside the root directory. 
Nova Shield pulls this directly at boot, removing any need for hardcoded logic.

```json
{
  "server": {
    "listen_port": 9090,
    "backend_host": "127.0.0.1",
    "backend_port": 8080
  },
  "rate_limits": [
    {
      "path": "/login",
      "method": "POST",
      "limit": 5,
      "window_seconds": 60
    }
  ],
  "security": {
    "block_sql_injection": true,
    "blacklisted_ips": ["192.168.1.10"]
  }
}
```

---

## 🧪 Quick Curl Testing

Send manual requests to test the `403` and `429` filters dynamically! Open another terminal window:

**Trigger the Web Application Firewall:**
```cmd
curl "http://localhost:9090/?q=or+1=1"
```

**Trigger the Rate Limiter (Denial of Service protections):**
```cmd
for ($i = 0; $i -lt 6; $i++) { curl.exe -s -X POST http://localhost:9090/login; echo "" }
```
*(6th Request receives HTTP 429 Too Many Requests)*

**Test Normal Valid Load:**
```cmd
curl http://localhost:9090/
```

---

*Powered by standard C++17 concurrency and Vite/React for the modern web.*
