import cluster from "node:cluster";
import { buildProxyApp } from "./app.mjs";
import {
  createLocalProxyRuntime,
  ProxyClusterClient,
  ProxyClusterCoordinator,
} from "./cluster-bridge.mjs";
import { ConfigStore } from "./config-store.mjs";
import { formatClusterLabel, getClusterSettings } from "../shared/cluster-utils.mjs";

const clusterSettings = getClusterSettings({ service: "proxy" });
const listenBacklog = Number.parseInt(process.env.PROXY_LISTEN_BACKLOG || "4096", 10);

async function startWorker() {
  const configStore = new ConfigStore({ logger: console });
  const initialConfig = configStore.getConfig();
  configStore.startWatching();

  const clusterClient = clusterSettings.enabled ? new ProxyClusterClient() : null;
  const localRuntime = clusterSettings.enabled ? null : createLocalProxyRuntime({ configStore });
  const rateLimiter = clusterClient ?? localRuntime.rateLimiter;
  const metrics = clusterClient ?? localRuntime.metrics;
  const app = await buildProxyApp({
    configStore,
    rateLimiter,
    metrics,
    clusterSettings,
  });
  let shuttingDown = false;

  const closeResources = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    configStore.stopWatching();
    clusterClient?.close();
    localRuntime?.close();
    await app.close();
  };

  const shutdown = async (signal) => {
    app.log.info(
      {
        signal,
        pid: process.pid,
        workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
      },
      "Shutting down proxy worker",
    );

    try {
      await closeResources();
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Failed to shut down proxy worker cleanly");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    await app.listen({
      port: initialConfig.server.listen_port,
      host: "0.0.0.0",
      backlog: Number.isInteger(listenBacklog) && listenBacklog > 0 ? listenBacklog : 4096,
    });
    app.log.info(
      {
        listenPort: initialConfig.server.listen_port,
        backendUrl: initialConfig.server.backend_url,
        backlog: Number.isInteger(listenBacklog) && listenBacklog > 0 ? listenBacklog : 4096,
        pid: process.pid,
        workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
      },
      `Proxy listening on http://127.0.0.1:${initialConfig.server.listen_port} (${formatClusterLabel(clusterSettings)})`,
    );
    app.log.info(`Forwarding to ${initialConfig.server.backend_url}`);
  } catch (error) {
    configStore.stopWatching();
    clusterClient?.close();
    localRuntime?.close();
    app.log.error(error);
    process.exit(1);
  }
}

function startPrimary() {
  const coordinator = new ProxyClusterCoordinator({ logger: console });
  const initialConfig = coordinator.getConfig();
  let shuttingDown = false;

  console.info(
    `[proxy:primary ${process.pid}] Starting ${clusterSettings.workers} workers on port ${initialConfig.server.listen_port} (${formatClusterLabel(clusterSettings)})`,
  );

  cluster.on("fork", (worker) => {
    coordinator.attachWorker(worker);
  });

  for (let index = 0; index < clusterSettings.workers; index += 1) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.warn(
      `[proxy:primary ${process.pid}] Worker ${worker.process.pid} exited (code=${code ?? "null"}, signal=${signal ?? "null"}). Restarting...`,
    );
    cluster.fork();
  });

  const shutdown = () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info(`[proxy:primary ${process.pid}] Stopping proxy cluster...`);

    cluster.disconnect(() => {
      coordinator.close();
      process.exit(0);
    });

    const forceExitTimer = setTimeout(() => {
      coordinator.close();
      process.exit(0);
    }, 5_000);
    forceExitTimer.unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (cluster.isPrimary && clusterSettings.enabled) {
  startPrimary();
} else {
  await startWorker();
}
