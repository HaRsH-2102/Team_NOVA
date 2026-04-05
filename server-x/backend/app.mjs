import cluster from "node:cluster";
import Fastify from "fastify";

export function buildBackendApp() {
  const app = Fastify({
    logger: {
      level: "info",
      transport: process.env.NODE_ENV === "production" ? undefined : {
        target: "pino-pretty",
        options: { translateTime: "SYS:standard" },
      },
    },
  });

  const sampleUsers = [
    { id: 1, name: "Aarav Sharma", role: "customer" },
    { id: 2, name: "Isha Verma", role: "auditor" },
    { id: 3, name: "Rahul Kapoor", role: "operator" },
    { id: 4, name: "Maya Menon", role: "analyst" },
  ];

  app.get("/health", async () => ({
    service: "nova-backend",
    status: "ok",
    pid: process.pid,
    workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
  }));

  app.get("/getAllUsers", async () => ({
    count: sampleUsers.length,
    users: sampleUsers,
  }));

  app.post("/login", async (request) => {
    const payload = request.body || {};

    return {
      message: "Login Successful",
      token: "demo-jwt-token",
      user: payload.username || "guest",
    };
  });

  app.get("/balance", async (request) => {
    const accountId = request.query?.accountId || "ACC-1058";

    return {
      accountId,
      availableBalance: 5000,
      currency: "USD",
      updatedAt: new Date().toISOString(),
    };
  });

  app.post("/transfer", async (request, reply) => {
    const payload = request.body || {};

    reply.code(201);
    return {
      message: "Transfer Successful",
      transferId: `TRX-${Date.now()}`,
      amount: Number(payload.amount || 250),
      beneficiary: payload.beneficiary || "ops-vault",
    };
  });

  return app;
}
