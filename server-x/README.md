# Nova Shield Pipeline

Nova Shield is a config-driven reverse proxy and API gateway that protects a mock banking backend with:

- Clustered backend + proxy workers across CPU cores for 5k-10k request bursts
- Per-route, per-IP sliding-window rate limiting
- SQL injection, XSS, path traversal, and command-injection blocking
- Config-based IP blacklisting
- Live metrics and alert feed for a React dashboard
- Dynamic `config.json` reload for policy changes
- A 5,000-request load script that hits the pipeline all at once

## Project Layout

- `config.json`: routing, rate limits, and security policy
- `backend/server.mjs`: mock banking API on port `8080`
- `proxy/server.mjs`: protected reverse proxy on port `9090`
- `dashboard/`: Vite + React observability dashboard
- `scripts/smoke-test.mjs`: quick correctness checks
- `scripts/load-5000.mjs`: simultaneous 5k request generator

## Install

```powershell
npm install
npm --prefix dashboard install
```

## Run

Start backend + proxy:

```powershell
npm start
```

`npm start` now runs the backend and proxy in clustered mode by default. The backend uses roughly 25% of the available CPU workers and the proxy uses the remainder so the full stack can scale without oversubscribing the machine.

Start backend + proxy + dashboard:

```powershell
npm run dev
```

Dashboard URL:

```text
http://127.0.0.1:5173
```

Proxy URL:

```text
http://127.0.0.1:9090
```

## Scaling Notes

- Redis is not required for the current clustered setup. The proxy primary process owns the shared rate limiter, metrics store, and audit log stream, so limits and dashboard numbers stay global across workers.
- Override worker counts with `BACKEND_CLUSTER_WORKERS` and `PROXY_CLUSTER_WORKERS`.
- Disable clustering for one service with `BACKEND_CLUSTER_ENABLED=0` or `PROXY_CLUSTER_ENABLED=0`.
- If you want one global override for both services, set `CLUSTER_WORKERS`, but the per-service variables win when both are present.
- Override bind targets for local benchmarking with `BACKEND_PORT`, `PROXY_LISTEN_PORT`, and `PROXY_BACKEND_URL`.
- Increase burst acceptance queues with `BACKEND_LISTEN_BACKLOG` and `PROXY_LISTEN_BACKLOG` when you are pushing very large connection spikes from one host.

## Verify

Smoke tests:

```powershell
npm run smoke
```

Run the full 5k blast:

```powershell
npm run load:5k
```

Run a 10k burst from PowerShell:

```powershell
$env:TOTAL_REQUESTS=10000
node scripts/load-5000.mjs
```

## Notes

- The proxy watches `config.json` and reloads new rate limits, backend targets, blacklist entries, and dashboard settings without restarting.
- Cluster workers share one logical rate limiter and one logical metrics timeline, so the 429 behavior and dashboard stay consistent under load.
- The load and smoke scripts use the demo header defined by `security.demo_ip_header` in `config.json` so they can simulate many client IPs from the same machine.
- Audit events are written to `logs/proxy-events.ndjson`.
