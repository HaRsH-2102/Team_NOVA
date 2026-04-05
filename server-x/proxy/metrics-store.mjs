function formatTick(seconds) {
  return new Date(seconds * 1000).toLocaleTimeString([], {
    minute: "2-digit",
    second: "2-digit",
  });
}

function clampHistory(history, limit) {
  if (history.length > limit) {
    history.length = limit;
  }
}

export class MetricsStore {
  #trafficBuckets = new Map();
  #recentEvents = [];
  #routeStats = new Map();

  constructor({ auditLogger, historyLimit = 120, trafficWindowSeconds = 40 }) {
    this.auditLogger = auditLogger;
    this.historyLimit = historyLimit;
    this.trafficWindowSeconds = trafficWindowSeconds;
    this.startedAt = Date.now();
    this.totals = {
      received: 0,
      forwarded: 0,
      blocked: 0,
      rateLimited: 0,
      wafBlocked: 0,
      blacklisted: 0,
      backendErrors: 0,
    };
  }

  updateConfig({ historyLimit, trafficWindowSeconds }) {
    this.historyLimit = historyLimit;
    this.trafficWindowSeconds = trafficWindowSeconds;
    clampHistory(this.#recentEvents, this.historyLimit);
  }

  record(entry) {
    const now = entry.timestamp || Date.now();
    const second = Math.floor(now / 1000);
    const bucket = this.#trafficBuckets.get(second) || {
      requests: 0,
      blocked: 0,
      latencyTotal: 0,
      latencyCount: 0,
    };

    bucket.requests += 1;
    if (entry.outcome !== "forwarded") {
      bucket.blocked += 1;
    }
    if (typeof entry.latencyMs === "number" && entry.latencyMs >= 0) {
      bucket.latencyTotal += entry.latencyMs;
      bucket.latencyCount += 1;
    }
    this.#trafficBuckets.set(second, bucket);
    this.#trimTraffic(now);

    this.totals.received += 1;
    if (entry.outcome === "forwarded") {
      this.totals.forwarded += 1;
    } else {
      this.totals.blocked += 1;
    }
    if (entry.outcome === "rate_limited") {
      this.totals.rateLimited += 1;
    }
    if (entry.outcome === "waf_blocked") {
      this.totals.wafBlocked += 1;
    }
    if (entry.outcome === "blacklisted") {
      this.totals.blacklisted += 1;
    }
    if (entry.outcome === "backend_error") {
      this.totals.backendErrors += 1;
    }

    const routeKey = `${entry.method} ${entry.path}`;
    const routeStats = this.#routeStats.get(routeKey) || {
      route: routeKey,
      total: 0,
      blocked: 0,
      averageLatencyMs: 0,
      latencyTotal: 0,
      latencyCount: 0,
    };
    routeStats.total += 1;
    if (entry.outcome !== "forwarded") {
      routeStats.blocked += 1;
    }
    if (typeof entry.latencyMs === "number" && entry.latencyMs >= 0) {
      routeStats.latencyTotal += entry.latencyMs;
      routeStats.latencyCount += 1;
      routeStats.averageLatencyMs = Math.round(routeStats.latencyTotal / routeStats.latencyCount);
    }
    this.#routeStats.set(routeKey, routeStats);

    this.#recentEvents.unshift({
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      time: new Date(now).toLocaleTimeString(),
      statusCode: entry.statusCode,
      outcome: entry.outcome,
      reason: entry.reason,
      ip: entry.ip,
      path: entry.path,
      method: entry.method,
      latencyMs: entry.latencyMs ?? null,
    });
    clampHistory(this.#recentEvents, this.historyLimit);

    this.auditLogger.write({
      timestamp: new Date(now).toISOString(),
      ...entry,
    });
  }

  getSnapshot(config) {
    const now = Date.now();
    const nowSecond = Math.floor(now / 1000);
    const windowSeconds = this.trafficWindowSeconds;
    const traffic = [];

    for (let offset = windowSeconds - 1; offset >= 0; offset -= 1) {
      const second = nowSecond - offset;
      const bucket = this.#trafficBuckets.get(second) || {
        requests: 0,
        blocked: 0,
        latencyTotal: 0,
        latencyCount: 0,
      };

      traffic.push({
        tick: formatTick(second),
        requests: bucket.requests,
        blocked: bucket.blocked,
        latencyMs: bucket.latencyCount > 0 ? Math.round(bucket.latencyTotal / bucket.latencyCount) : 0,
      });
    }

    const requestsLastTenSeconds = traffic.slice(-10).reduce((sum, point) => sum + point.requests, 0);
    const blockedLastTenSeconds = traffic.slice(-10).reduce((sum, point) => sum + point.blocked, 0);
    const liveRps = Number((requestsLastTenSeconds / Math.min(10, windowSeconds)).toFixed(1));
    const blockRate = this.totals.received > 0 ? Number(((this.totals.blocked / this.totals.received) * 100).toFixed(1)) : 0;
    const routeStats = Array.from(this.#routeStats.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 6)
      .map((route) => ({
        route: route.route,
        total: route.total,
        blocked: route.blocked,
        averageLatencyMs: route.averageLatencyMs,
      }));

    return {
      generatedAt: new Date(now).toISOString(),
      uptimeSeconds: Math.floor((now - this.startedAt) / 1000),
      summary: {
        ...this.totals,
        liveRps,
        blockedLastTenSeconds,
        blockRate,
        activeBlacklist: config.security.blacklisted_ips.length,
      },
      traffic,
      recentEvents: this.#recentEvents.slice(0, 25),
      routeStats,
      threatBreakdown: [
        { name: "Rate Limit", value: this.totals.rateLimited },
        { name: "WAF", value: this.totals.wafBlocked },
        { name: "Blacklist", value: this.totals.blacklisted },
        { name: "Backend Errors", value: this.totals.backendErrors },
      ],
      config: {
        listenPort: config.server.listen_port,
        backendUrl: config.server.backend_url,
        rateLimits: config.rate_limits,
        security: {
          block_sql_injection: config.security.block_sql_injection,
          block_xss: config.security.block_xss,
          block_path_traversal: config.security.block_path_traversal,
          block_command_injection: config.security.block_command_injection,
          blacklisted_ips: config.security.blacklisted_ips,
          demo_ip_header: config.security.demo_ip_header,
        },
      },
    };
  }

  #trimTraffic(now) {
    const cutoff = Math.floor((now - (this.trafficWindowSeconds * 4 * 1000)) / 1000);

    for (const second of this.#trafficBuckets.keys()) {
      if (second < cutoff) {
        this.#trafficBuckets.delete(second);
      }
    }
  }
}
