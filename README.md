# Nova Shield

### This is the final product readme after reading this you can run the whole proxy server on your system. 
### Just follow the readme

### Final directory is = Team_NOVA/NovaShield(Final_Product)

Rust-first API security gateway and demo banking backend with a live React dashboard, WebSocket telemetry, rate limiting, WAF checks, runtime blacklisting, and optional HTTPS/TLS.

## Overview

Nova Shield is a small but production-minded security gateway project built to sit in front of an API service. It demonstrates how to:

- proxy requests through a central gateway
- validate JWTs before protected upstream access
- detect malicious payloads with lightweight WAF rules
- rate-limit requests per IP and route
- maintain a runtime blacklist with reasons
- expose live metrics, request logs, and security events
- visualize gateway activity in a React dashboard
- optionally serve HTTPS directly from Rust using Rustls

The project is intentionally split into clear layers so the gateway, protected service, dashboard, and shared contracts remain easy to understand and evolve.

## Workspace Layout

- `backend/`
  Demo banking backend with login, balance, and transfer endpoints.
- `gateway/`
  Security gateway that applies filtering, auth checks, telemetry, blacklist logic, and proxying.
- `shared/`
  Shared request, response, logging, and dashboard event models.
- `dashboard/`
  React admin dashboard with graphs, logs, counters, and live WebSocket updates.
- `config/`
  JSON runtime configuration for backend and gateway.
- `certs/`
  PEM certificate and key files for HTTPS on the gateway.
- `tests/`
  PowerShell test suite for health, auth flow, rate limiting, security, metrics, WebSocket, and load.

## Architecture

Client requests do not talk to the backend directly. They go through the gateway first:

1. The client sends a request to the gateway.
2. The gateway determines the client IP.
3. The gateway checks:
   - runtime blacklist
   - WAF signatures in path/body
   - per-route rate limits
   - JWT validity for protected routes
4. If the request is allowed, the gateway forwards it to the backend.
5. The gateway records request logs and security events.
6. The dashboard receives an initial snapshot plus live updates over WebSocket.

## Main Features

### 1. Security Gateway

The gateway provides:

- JWT validation on protected routes
- blacklist enforcement with operator-controlled reasons
- WAF pattern inspection
- per-IP rate limiting
- upstream proxying with pooled HTTP client connections
- structured operational logging
- live security and request streaming

### 2. WAF Rules

The gateway currently detects and blocks payloads that look like:

- SQL injection
- cross-site scripting (XSS)
- path traversal
- command injection

The rules are regex-based and intentionally lightweight for demonstration and experimentation.

### 3. Runtime Blacklist

The gateway supports two sources of blacklisted IPs:

- static blacklist entries from `config/gateway.json`
- runtime blacklist entries added manually or promoted from malicious WAF detections

When a request is rejected by a malicious WAF rule, the gateway can add that IP into the runtime blacklist so future requests from that IP stay blocked until removed.

### 4. Rate Limiting

The gateway enforces route-aware rate limits. Current defaults are configured in `config/gateway.json`.

Typical behavior:

- login: strict low threshold
- transfer: moderate threshold
- balance: higher threshold
- other routes: default threshold

For login, the project is configured for `5` requests per IP per `60` seconds. Exceeding the limit returns:

- `429 Too Many Requests`
- `Retry-After`
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`

### 5. Live Dashboard

The dashboard shows:

- total requests
- allowed requests
- blocked requests
- rate-limited requests
- JWT failures
- active dashboard WebSocket clients
- latency and blocked-request timeline
- traffic outcome mix
- recent status code trend
- recent security events
- current blacklist
- live request log stream

The dashboard first loads a snapshot from the gateway and then keeps itself up to date over WebSocket.

### 6. HTTPS / TLS

The gateway can serve HTTPS directly using Rustls.

- HTTP port: `8080`
- HTTPS port: `8443`

When TLS is enabled, the gateway can listen on both ports at once so local tools and the dashboard proxy remain easy to use.

## Tech Stack

### Rust

Used for the backend, gateway, shared models, and systems logic.

### Axum

Used to implement the HTTP and WebSocket endpoints in Rust.

### Tokio

Used as the async runtime for request handling, WebSockets, timers, and graceful shutdown.

### Reqwest

Used by the gateway to forward requests to the backend.

### Rustls + axum-server

Used to serve HTTPS directly from the gateway.

### jsonwebtoken

Used to create and verify JWT bearer tokens.

### DashMap

Used for concurrent runtime state such as the blacklist and rate-limit windows.

### Prometheus crate

Used to expose gateway metrics in Prometheus text format.

### React

Used for the dashboard UI.

### Vite

Used as the dashboard dev server and build tool.

### Recharts

Used for the dashboard graphs.

### PowerShell

Used for the operator and validation test scripts on Windows.

## Project Modules

### `shared`

Contains common contract types for:

- API payloads
- JWT claims
- request log entries
- security events
- blacklist entries
- traffic counters
- dashboard snapshots
- WebSocket live events

### `backend`

Implements:

- `POST /login`
- `GET /balance`
- `POST /transfer`
- `GET /health`

This backend simulates a simple banking-style service and uses in-memory balance storage.

### `gateway`

Implements:

- public API routes under `/api/...`
- admin routes under `/api/admin/...`
- WebSocket stream at `/ws/live`
- request inspection, proxying, rate limiting, auth validation, blacklist management, metrics, and live event emission

### `dashboard`

Implements:

- snapshot fetch
- WebSocket connection management
- chart rendering
- log rendering
- live blacklist updates
- LAN-friendly dev-server proxying to the local gateway

### `tests`

Contains a reusable PowerShell harness plus separate files for each test area.

## Current Routes

### Backend

- `GET /health`
- `POST /login`
- `GET /balance`
- `POST /transfer`

Default backend address:

- `http://127.0.0.1:8081`

### Gateway Public API

- `POST /api/login`
- `GET /api/balance`
- `POST /api/transfer`

### Gateway Admin API

- `GET /api/admin/health`
- `GET /api/admin/snapshot`
- `GET /api/admin/logs`
- `GET /api/admin/metrics`
- `POST /api/admin/blacklist/add`
- `POST /api/admin/blacklist/remove`

### Gateway Live Feed

- `GET /ws/live` via WebSocket upgrade

## Configuration

### Backend Configuration

`config/backend.json`

Fields:

- `listen_addr`
- `jwt_secret`
- `token_ttl_secs`
- `issuer`

### Gateway Configuration

`config/gateway.json`

Fields:

- `listen_addr`
- `tls_listen_addr`
- `backend_base_url`
- `request_timeout_ms`
- `dashboard_history_limit`
- `max_inspection_body_bytes`
- `websocket_ping_interval_secs`
- `jwt_secret`
- `tls.enabled`
- `tls.cert_path`
- `tls.key_path`
- `rate_limits.default_per_minute`
- `rate_limits.login_per_minute`
- `rate_limits.transfer_per_minute`
- `rate_limits.balance_per_minute`
- `blacklist`
- `upstream.max_idle_per_host`
- `upstream.pool_idle_timeout_secs`

## Local Development

### Prerequisites

- Rust toolchain
- Node.js + npm
- Windows PowerShell for the included test scripts

### Install dashboard dependencies

```powershell
cd dashboard
npm install
```

### Start the backend

From the repo root:

```powershell
cargo run -p backend
```

### Start the gateway

From the repo root:

```powershell
cargo run -p gateway
```

### Start the dashboard

```powershell
cd dashboard
npx vite --host 0.0.0.0
```

Open:

- local: `http://localhost:5173`
- LAN: `http://<your-ip>:5173`

## LAN Testing

To let your friends test the system on the same network:

1. Set gateway listen addresses in `config/gateway.json` to `0.0.0.0`.
2. Start backend, gateway, and dashboard.
3. Find your machine’s LAN IP using `ipconfig`.
4. Share URLs like:
   - `http://<your-ip>:8080/api/admin/health`
   - `http://<your-ip>:5173`

Important:

- `127.0.0.1` only works on your own machine
- the dashboard should be opened via your LAN IP for other devices
- firewall and network isolation settings must allow device-to-device traffic

## HTTPS / TLS Setup

### Enable TLS

Place these files in `certs/`:

- `certs/cert.pem`
- `certs/key.pem`

Then set this in `config/gateway.json`:

```json
"tls": {
  "enabled": true,
  "cert_path": "certs/cert.pem",
  "key_path": "certs/key.pem"
}
```

Restart the gateway.

### Ports

- HTTP: `8080`
- HTTPS: `8443`

### Generate a self-signed certificate with OpenSSL

From `certs/`:

```powershell
@"
[req]
distinguished_name = req_dn
x509_extensions = v3_req
prompt = no

[req_dn]
CN = 10.50.101.31

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = 10.50.101.31
DNS.1 = localhost
"@ | Set-Content .\openssl-local.cnf
```

Then:

```powershell
openssl req -x509 -newkey rsa:4096 -sha256 -nodes `
  -keyout key.pem `
  -out cert.pem `
  -days 365 `
  -config .\openssl-local.cnf `
  -extensions v3_req
```

### Test HTTPS

PowerShell 5.1 does not support `-SkipCertificateCheck` on `Invoke-RestMethod`, so use:

```powershell
curl.exe -k https://127.0.0.1:8443/api/admin/health
```

Or:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
Invoke-RestMethod "https://127.0.0.1:8443/api/admin/health"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = $null
```

## Dashboard Notes

The dashboard uses:

- `GET /api/admin/snapshot` for initial state
- `ws://.../ws/live` or `wss://.../ws/live` for live updates

During development, Vite proxies dashboard requests to the local gateway so browser connectivity remains stable across HTTP/TLS setups.

The dashboard also:

- updates the blacklist view in real time
- keeps strong attack reasons instead of overwriting them with weaker later JWT errors
- displays the count of active dashboard WebSocket sessions

## WebSocket Behavior

Each dashboard tab opens a live WebSocket session to the gateway feed.

The gateway:

- increments active WebSocket count on connect
- sends a full snapshot immediately after connection
- streams request logs and security events
- sends periodic ping frames
- decrements active WebSocket count on disconnect

In development, `React.StrictMode` can temporarily cause duplicate connection behavior while mounting components.

## Blacklist Management

### Static Blacklist

Configured in `config/gateway.json` with IP and reason.

### Runtime Blacklist

Can be modified while the gateway is running.

Add an IP:

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://127.0.0.1:8080/api/admin/blacklist/add" `
  -ContentType "application/json" `
  -Body '{"ip":"192.168.1.50","reason":"manual block"}'
```

Remove an IP:

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://127.0.0.1:8080/api/admin/blacklist/remove" `
  -ContentType "application/json" `
  -Body '{"ip":"192.168.1.50"}'
```

### Automatic Promotion

If an IP is caught by malicious WAF rules such as XSS or SQLi, the gateway can promote that IP into the blacklist so it remains blocked until removed.

## Test Suite

The project includes a split PowerShell test suite.

### Shared helper

- `tests/common.ps1`

Provides:

- gateway URL handling
- WebSocket URL handling
- request helper wrappers
- JSON parsing
- self-signed HTTPS support
- output helpers
- assertions

### Individual scripts

- `tests/01-health.ps1`
  Health endpoint check.
- `tests/02-login.ps1`
  Login flow and token validation.
- `tests/03-auth-flow.ps1`
  Login, balance, and transfer.
- `tests/04-security.ps1`
  Missing JWT, SQLi, XSS, traversal, and blacklist checks.
- `tests/05-rate-limit.ps1`
  Confirms 5 successful login attempts, then `429`, then reset after 60 seconds.
- `tests/06-load.ps1`
  High-concurrency burst testing using embedded C# and `HttpClient`.
- `tests/07-metrics.ps1`
  Snapshot and Prometheus metrics fetch.
- `tests/08-websocket.ps1`
  Direct WebSocket test of the live feed.
- `tests/run-all.ps1`
  Runs the core test suite in sequence.

### Run the core test suite

```powershell
cd tests
.\run-all.ps1
```

### Run the load test

```powershell
cd tests
.\06-load.ps1 -TotalRequests 5000 -Route login -IpMode unique
```

### Run the WebSocket test

```powershell
cd tests
.\08-websocket.ps1
```

## Example API Usage

### Login

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://127.0.0.1:8080/api/login" `
  -ContentType "application/json" `
  -Body '{"username":"alice","password":"secret"}'
```

### Balance

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8080/api/balance" `
  -Headers @{ Authorization = "Bearer YOUR_TOKEN" }
```

### Transfer

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://127.0.0.1:8080/api/transfer" `
  -Headers @{ Authorization = "Bearer YOUR_TOKEN"; "Content-Type" = "application/json" } `
  -Body '{"to_account":"acct-bob","amount":1500,"reference":"demo"}'
```

## Observability and Metrics

The gateway keeps:

- recent request logs
- recent security events
- traffic counters
- live WebSocket connection counts

Prometheus endpoint:

- `GET /api/admin/metrics`

Snapshot endpoint:

- `GET /api/admin/snapshot`

This makes the project useful both for visual demos and for simple metrics scraping.

## Security Flow Summary

For an incoming request, the gateway performs checks in this order:

1. resolve client IP
2. check runtime blacklist
3. inspect URL/path for WAF matches
4. inspect body for WAF matches when applicable
5. check rate limits
6. validate JWT for protected routes
7. proxy to upstream if allowed
8. record request/security telemetry
9. broadcast live dashboard updates

## Known Limitations

This project is a strong single-node foundation, but the following areas are intentionally simplified:

- in-memory balances
- in-memory blacklist
- in-memory rate limiting
- no distributed state sharing
- no persistent event storage
- no dashboard auth yet
- self-signed certs for local testing only
- regex-based WAF rather than full request normalization and advanced rulesets

## Production-Oriented Next Steps

If this project were taken toward full production readiness, likely next upgrades would be:

- Redis-backed distributed rate limiting
- persistent blacklist and event storage
- dashboard authentication and authorization
- structured log shipping
- Grafana/Prometheus/Loki deployment
- reverse proxy or ingress integration
- managed certificate rotation
- database-backed account state
- horizontal gateway replicas
- richer attack correlation and alerting

## Troubleshooting

### Dashboard shows connection error

Check:

- gateway is running
- dashboard dev server is running
- `vite.config.js` proxy target is correct
- gateway is reachable on `8080`

### Health works locally but not from friends' machines

Check:

- gateway is listening on `0.0.0.0`
- firewall allows the port
- friends are on the same LAN
- guest Wi-Fi/client isolation is not blocking peer traffic

### HTTPS health check fails in PowerShell

If you are on Windows PowerShell 5.1, use `curl.exe -k` or the certificate callback workaround shown above.



### WebSocket client count looks too high

Remember:

- each open dashboard tab counts
- each user counts
- React development mode can create extra temporary connections

## Summary

Nova Shield demonstrates how to combine:

- Rust backend services
- a Rust security gateway
- TLS support
- JWT validation
- WAF inspection
- blacklist enforcement
- rate limiting
- live observability
- a React operations dashboard
- operator-focused PowerShell testing

It is intentionally approachable enough to understand end to end while still being deep enough to demonstrate real gateway, observability, and runtime-control concepts.
