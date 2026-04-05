import path from "node:path";
import { ConfigStore } from "./config-store.mjs";
import { createAuditLogger } from "./logger.mjs";
import { MetricsStore } from "./metrics-store.mjs";
import { SlidingWindowRateLimiter } from "./rate-limiter.mjs";

const IPC_NAMESPACE = "nova-proxy-cluster";

function createMessage(type, payload, requestId = null) {
  return {
    namespace: IPC_NAMESPACE,
    type,
    requestId,
    payload,
  };
}

function isClusterMessage(message) {
  return Boolean(message && typeof message === "object" && message.namespace === IPC_NAMESPACE);
}

function syncMetricsConfig(configStore, metricsStore) {
  const config = configStore.getConfig();

  metricsStore.updateConfig({
    historyLimit: config.observability.event_history_limit,
    trafficWindowSeconds: config.observability.traffic_window_seconds,
  });

  return config;
}

export function createLocalProxyRuntime({ configStore }) {
  const initialConfig = configStore.getConfig();
  const auditLogger = createAuditLogger(path.resolve(process.cwd(), "logs", "proxy-events.ndjson"));
  const metricsStore = new MetricsStore({
    auditLogger,
    historyLimit: initialConfig.observability.event_history_limit,
    trafficWindowSeconds: initialConfig.observability.traffic_window_seconds,
  });
  const rateLimiter = new SlidingWindowRateLimiter();
  const cleanupInterval = setInterval(() => {
    rateLimiter.sweep();
  }, 60_000);

  cleanupInterval.unref();

  return {
    rateLimiter: {
      async consume(payload) {
        return rateLimiter.consume(payload);
      },
    },
    metrics: {
      async record(entry) {
        syncMetricsConfig(configStore, metricsStore);
        metricsStore.record(entry);
      },
      async getSnapshot(config = null) {
        const nextConfig = config ?? syncMetricsConfig(configStore, metricsStore);
        return metricsStore.getSnapshot(nextConfig);
      },
    },
    close() {
      clearInterval(cleanupInterval);
      auditLogger.close();
    },
  };
}

export class ProxyClusterCoordinator {
  #configStore;
  #auditLogger;
  #metricsStore;
  #rateLimiter;
  #cleanupInterval;

  constructor({ logger = console } = {}) {
    this.#configStore = new ConfigStore({ logger });
    const initialConfig = this.#configStore.getConfig();

    this.#configStore.startWatching();
    this.#auditLogger = createAuditLogger(path.resolve(process.cwd(), "logs", "proxy-events.ndjson"));
    this.#metricsStore = new MetricsStore({
      auditLogger: this.#auditLogger,
      historyLimit: initialConfig.observability.event_history_limit,
      trafficWindowSeconds: initialConfig.observability.traffic_window_seconds,
    });
    this.#rateLimiter = new SlidingWindowRateLimiter();
    this.#cleanupInterval = setInterval(() => {
      this.#rateLimiter.sweep();
    }, 60_000);

    this.#cleanupInterval.unref();
  }

  attachWorker(worker) {
    worker.on("message", (message) => {
      void this.#handleWorkerMessage(worker, message);
    });
  }

  getConfig() {
    return this.#configStore.getConfig();
  }

  close() {
    clearInterval(this.#cleanupInterval);
    this.#configStore.stopWatching();
    this.#auditLogger.close();
  }

  async #handleWorkerMessage(worker, message) {
    if (!isClusterMessage(message)) {
      return;
    }

    switch (message.type) {
      case "rate-limit:consume": {
        const decision = this.#rateLimiter.consume(message.payload || {});
        this.#send(worker, "rate-limit:result", { decision }, message.requestId);
        break;
      }
      case "metrics:record": {
        syncMetricsConfig(this.#configStore, this.#metricsStore);
        this.#metricsStore.record(message.payload || {});
        break;
      }
      case "metrics:snapshot": {
        const config = syncMetricsConfig(this.#configStore, this.#metricsStore);
        const snapshot = this.#metricsStore.getSnapshot(config);
        this.#send(worker, "metrics:snapshot:result", { snapshot }, message.requestId);
        break;
      }
      default:
        break;
    }
  }

  #send(worker, type, payload, requestId = null) {
    if (!worker.isConnected()) {
      return;
    }

    worker.send(createMessage(type, payload, requestId));
  }
}

export class ProxyClusterClient {
  #pending = new Map();
  #nextRequestId = 1;
  #onMessage;
  #onDisconnect;

  constructor() {
    if (typeof process.send !== "function") {
      throw new Error("ProxyClusterClient requires a cluster worker process.");
    }

    this.#onMessage = (message) => {
      this.#handleMessage(message);
    };
    this.#onDisconnect = () => {
      this.#rejectAll(new Error("Proxy cluster coordinator disconnected."));
    };

    process.on("message", this.#onMessage);
    process.on("disconnect", this.#onDisconnect);
  }

  async consume(payload) {
    const result = await this.#request("rate-limit:consume", payload, "rate-limit:result");
    return result.decision;
  }

  async record(entry) {
    this.#send("metrics:record", entry);
  }

  async getSnapshot() {
    const result = await this.#request("metrics:snapshot", null, "metrics:snapshot:result", 4_000);
    return result.snapshot;
  }

  close() {
    process.off("message", this.#onMessage);
    process.off("disconnect", this.#onDisconnect);
    this.#rejectAll(new Error("Proxy cluster client closed."));
  }

  #request(type, payload, expectedType, timeoutMs = 2_000) {
    return new Promise((resolve, reject) => {
      const requestId = String(this.#nextRequestId);
      this.#nextRequestId += 1;

      const timeout = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new Error(`Timed out waiting for ${expectedType}`));
      }, timeoutMs);

      timeout.unref();

      this.#pending.set(requestId, {
        expectedType,
        resolve,
        reject,
        timeout,
      });

      this.#send(type, payload, requestId);
    });
  }

  #send(type, payload, requestId = null) {
    if (typeof process.send !== "function") {
      throw new Error("Proxy cluster coordinator is unavailable.");
    }

    process.send(createMessage(type, payload, requestId));
  }

  #handleMessage(message) {
    if (!isClusterMessage(message) || !message.requestId) {
      return;
    }

    const pending = this.#pending.get(String(message.requestId));

    if (!pending || pending.expectedType !== message.type) {
      return;
    }

    clearTimeout(pending.timeout);
    this.#pending.delete(String(message.requestId));
    pending.resolve(message.payload || {});
  }

  #rejectAll(error) {
    for (const [requestId, pending] of this.#pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.#pending.delete(requestId);
    }
  }
}
