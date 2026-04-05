import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

const defaultObservability = {
  event_history_limit: 120,
  traffic_window_seconds: 40,
};

const defaultSecurity = {
  block_sql_injection: true,
  block_xss: true,
  block_path_traversal: true,
  block_command_injection: true,
  blacklisted_ips: [],
  trust_demo_ip_header: true,
  demo_ip_header: "x-demo-client-ip",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeRateLimit(rule) {
  const method = String(rule.method || "").toUpperCase();
  const pathValue = String(rule.path || "").trim();
  const limit = Number(rule.limit);
  const windowSeconds = Number(rule.window_seconds);

  assert(pathValue.startsWith("/"), `Invalid rate-limit path: ${pathValue}`);
  assert(method.length > 0, `Missing rate-limit method for ${pathValue}`);
  assert(Number.isFinite(limit) && limit > 0, `Invalid rate-limit limit for ${method} ${pathValue}`);
  assert(Number.isFinite(windowSeconds) && windowSeconds > 0, `Invalid rate-limit window for ${method} ${pathValue}`);

  return {
    path: pathValue,
    method,
    limit,
    window_seconds: windowSeconds,
  };
}

function normalizeConfig(raw) {
  assert(raw && typeof raw === "object", "config.json must contain an object");
  assert(raw.server && typeof raw.server === "object", "config.json must define server");

  const listenPort = Number(process.env.PROXY_LISTEN_PORT || raw.server.listen_port);
  const backendUrl = String(process.env.PROXY_BACKEND_URL || raw.server.backend_url || "").trim();
  const rateLimits = Array.isArray(raw.rate_limits) ? raw.rate_limits.map(normalizeRateLimit) : [];
  const security = { ...defaultSecurity, ...(raw.security || {}) };
  const observability = { ...defaultObservability, ...(raw.observability || {}) };

  assert(Number.isFinite(listenPort) && listenPort > 0, "server.listen_port must be a valid number");
  assert(backendUrl.startsWith("http://") || backendUrl.startsWith("https://"), "server.backend_url must be an http/https URL");

  return {
    server: {
      listen_port: listenPort,
      backend_url: backendUrl.replace(/\/+$/, ""),
    },
    rate_limits: rateLimits,
    security: {
      ...security,
      blacklisted_ips: Array.from(
        new Set(
          (security.blacklisted_ips || [])
            .map((value) => String(value).trim())
            .filter(Boolean),
        ),
      ),
      demo_ip_header: String(security.demo_ip_header || defaultSecurity.demo_ip_header).toLowerCase(),
    },
    observability: {
      event_history_limit: Number(observability.event_history_limit) || defaultObservability.event_history_limit,
      traffic_window_seconds: Number(observability.traffic_window_seconds) || defaultObservability.traffic_window_seconds,
    },
    rate_limit_index: new Map(
      rateLimits.map((rule) => [`${rule.method} ${rule.path}`, rule]),
    ),
  };
}

export class ConfigStore {
  #config = null;
  #watchListener = null;

  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  loadFromDisk() {
    const fileContents = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(fileContents);
    const nextConfig = normalizeConfig(parsed);
    const previousPort = this.#config?.server.listen_port;

    this.#config = nextConfig;

    if (previousPort && previousPort !== nextConfig.server.listen_port) {
      this.logger.warn?.("listen_port changed in config.json. Restart the proxy to apply the new port binding.");
    }

    return nextConfig;
  }

  startWatching() {
    if (this.#watchListener) {
      return;
    }

    this.#watchListener = () => {
      try {
        this.loadFromDisk();
        this.logger.info?.("Reloaded config.json without restarting the proxy.");
      } catch (error) {
        this.logger.error?.(`Failed to reload config.json: ${error.message}`);
      }
    };

    fs.watchFile(CONFIG_PATH, { interval: 750 }, this.#watchListener);
  }

  stopWatching() {
    if (!this.#watchListener) {
      return;
    }

    fs.unwatchFile(CONFIG_PATH, this.#watchListener);
    this.#watchListener = null;
  }

  getConfig() {
    if (!this.#config) {
      return this.loadFromDisk();
    }

    return this.#config;
  }

  getPath() {
    return CONFIG_PATH;
  }
}
