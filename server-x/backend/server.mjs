import cluster from "node:cluster";
import { buildBackendApp } from "./app.mjs";
import { formatClusterLabel, getClusterSettings } from "../shared/cluster-utils.mjs";

const port = Number(process.env.BACKEND_PORT || 8080);
const listenBacklog = Number.parseInt(process.env.BACKEND_LISTEN_BACKLOG || "4096", 10);
const clusterSettings = getClusterSettings({ service: "backend" });

async function startWorker() {
  const app = buildBackendApp();
  let shuttingDown = false;

  const closeApp = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await app.close();
  };

  const shutdown = async (signal) => {
    app.log.info(
      {
        signal,
        pid: process.pid,
        workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
      },
      "Shutting down backend worker",
    );

    try {
      await closeApp();
      process.exit(0);
    } catch (error) {
      app.log.error(error, "Failed to shut down backend worker cleanly");
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
      port,
      host: "0.0.0.0",
      backlog: Number.isInteger(listenBacklog) && listenBacklog > 0 ? listenBacklog : 4096,
    });
    app.log.info(
      {
        port,
        backlog: Number.isInteger(listenBacklog) && listenBacklog > 0 ? listenBacklog : 4096,
        pid: process.pid,
        workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
      },
      `Backend listening on http://127.0.0.1:${port} (${formatClusterLabel(clusterSettings)})`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

function startPrimary() {
  let shuttingDown = false;

  console.info(
    `[backend:primary ${process.pid}] Starting ${clusterSettings.workers} workers on port ${port} (${formatClusterLabel(clusterSettings)})`,
  );

  for (let index = 0; index < clusterSettings.workers; index += 1) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.warn(
      `[backend:primary ${process.pid}] Worker ${worker.process.pid} exited (code=${code ?? "null"}, signal=${signal ?? "null"}). Restarting...`,
    );
    cluster.fork();
  });

  const shutdown = () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info(`[backend:primary ${process.pid}] Stopping backend cluster...`);

    cluster.disconnect(() => {
      process.exit(0);
    });

    const forceExitTimer = setTimeout(() => {
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
