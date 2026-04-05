import cluster from "node:cluster";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { findRateLimitRule } from "./rate-limiter.mjs";
import { inspectRequest } from "./waf.mjs";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function normalizeIp(value) {
  if (!value) {
    return "unknown";
  }

  const text = String(value).trim();
  return text.startsWith("::ffff:") ? text.slice(7) : text;
}

function resolveClientIp(request, config) {
  const demoHeader = config.security.demo_ip_header;
  const headerValue = request.headers[demoHeader];

  if (config.security.trust_demo_ip_header && typeof headerValue === "string" && headerValue.trim()) {
    return normalizeIp(headerValue.split(",")[0]);
  }

  return normalizeIp(request.ip || request.socket?.remoteAddress);
}

function getRequestPath(request) {
  return new URL(request.raw.url, "http://proxy.local").pathname;
}

function createBackendHeaders(request, ip, bodyLength) {
  const headers = {};

  for (const [key, value] of Object.entries(request.headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    headers[key] = value;
  }

  headers["x-forwarded-for"] = ip;
  headers["x-nova-proxy"] = "nova-shield";

  if (bodyLength > 0) {
    headers["content-length"] = String(bodyLength);
  }

  return headers;
}

function copyBackendHeaders(reply, headers) {
  for (const [key, value] of headers.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue;
    }
    reply.header(key, value);
  }
}

export async function buildProxyApp({ configStore, rateLimiter, metrics, clusterSettings }) {
  const app = Fastify({
    logger: {
      level: "info",
      transport: process.env.NODE_ENV === "production" ? undefined : {
        target: "pino-pretty",
        options: { translateTime: "SYS:standard" },
      },
    },
    bodyLimit: 1024 * 1024,
  });

  await app.register(cors, {
    origin: true,
  });

  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", { parseAs: "buffer" }, (request, body, done) => {
    done(null, body);
  });

  app.get("/internal/health", async () => ({
    service: "nova-proxy",
    status: "ok",
    configPath: configStore.getPath(),
    pid: process.pid,
    workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
    cluster: {
      enabled: clusterSettings.enabled,
      workers: clusterSettings.workers,
      totalCpuCount: clusterSettings.totalCpuCount,
    },
  }));

  app.get("/internal/metrics/snapshot", async () => metrics.getSnapshot(configStore.getConfig()));

  async function recordMetrics(entry) {
    await metrics.record({
      ...entry,
      pid: process.pid,
      workerId: cluster.isWorker ? cluster.worker?.id ?? null : null,
    });
  }

  async function proxyHandler(request, reply) {
    const config = configStore.getConfig();
    const startedAt = Date.now();
    const method = request.method.toUpperCase();
    const pathName = getRequestPath(request);
    const ip = resolveClientIp(request, config);
    const requestBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const bodyText = requestBody.length > 0 ? requestBody.toString("utf8") : "";

    if (config.security.blacklisted_ips.includes(ip)) {
      await recordMetrics({
        timestamp: startedAt,
        ip,
        method,
        path: pathName,
        statusCode: 403,
        outcome: "blacklisted",
        reason: "IP Blacklisted",
        latencyMs: 0,
      });

      reply.code(403).send({
        error: "Forbidden",
        reason: "IP Blacklisted",
      });
      return;
    }

    const wafDecision = inspectRequest({
      config,
      url: request.raw.url,
      body: bodyText,
    });

    if (wafDecision.blocked) {
      await recordMetrics({
        timestamp: startedAt,
        ip,
        method,
        path: pathName,
        statusCode: wafDecision.statusCode,
        outcome: "waf_blocked",
        reason: wafDecision.reason,
        latencyMs: 0,
      });

      reply.code(wafDecision.statusCode).send({
        error: "Forbidden",
        reason: wafDecision.reason,
      });
      return;
    }

    const rule = findRateLimitRule(config, method, pathName);
    if (rule) {
      const decision = await rateLimiter.consume({
        key: `${ip}:${method}:${pathName}`,
        limit: rule.limit,
        windowSeconds: rule.window_seconds,
        now: startedAt,
      });

      if (!decision.allowed) {
        await recordMetrics({
          timestamp: startedAt,
          ip,
          method,
          path: pathName,
          statusCode: 429,
          outcome: "rate_limited",
          reason: `Exceeded ${method} ${pathName} limit (${rule.limit}/${rule.window_seconds}s)`,
          latencyMs: 0,
        });

        reply
          .header("retry-after", String(decision.retryAfterSeconds))
          .code(429)
          .send({
            error: "Too Many Requests",
            reason: `Exceeded ${method} ${pathName} limit`,
            retryAfterSeconds: decision.retryAfterSeconds,
          });
        return;
      }
    }

    const targetUrl = new URL(request.raw.url, `${config.server.backend_url}/`).toString();

    try {
      const backendResponse = await fetch(targetUrl, {
        method,
        headers: createBackendHeaders(request, ip, requestBody.length),
        body: method === "GET" || method === "HEAD" ? undefined : requestBody,
      });

      const responseBuffer = Buffer.from(await backendResponse.arrayBuffer());
      copyBackendHeaders(reply, backendResponse.headers);

      const latencyMs = Date.now() - startedAt;
      await recordMetrics({
        timestamp: startedAt,
        ip,
        method,
        path: pathName,
        statusCode: backendResponse.status,
        outcome: backendResponse.ok ? "forwarded" : "backend_error",
        reason: backendResponse.ok ? "Forwarded to backend" : "Backend returned an error",
        latencyMs,
      });

      reply.code(backendResponse.status).send(responseBuffer);
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await recordMetrics({
        timestamp: startedAt,
        ip,
        method,
        path: pathName,
        statusCode: 502,
        outcome: "backend_error",
        reason: "Backend Unreachable",
        latencyMs,
      });

      reply.code(502).send({
        error: "Bad Gateway",
        reason: "Backend Unreachable",
        detail: error.message,
      });
    }
  }

  const proxyMethods = ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"];

  app.route({ method: proxyMethods, url: "/", handler: proxyHandler });
  app.route({ method: proxyMethods, url: "/*", handler: proxyHandler });

  return app;
}
