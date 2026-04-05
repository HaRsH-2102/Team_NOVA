import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "config.json"), "utf8"));
const baseUrl = process.env.PROXY_URL || `http://127.0.0.1:${config.server.listen_port}`;
const demoHeader = config.security.demo_ip_header || "x-demo-client-ip";
const blacklistedIp = config.security.blacklisted_ips[0] || "203.0.113.42";

function withIp(ip, extra = {}) {
  const headers = {
    [demoHeader]: ip,
    ...extra,
  };

  if (!("content-type" in headers)) {
    headers["content-type"] = "application/json";
  }

  return headers;
}

async function expect(name, requestFactory, assertion) {
  const response = await requestFactory();
  const bodyText = await response.text();
  const parsedBody = (() => {
    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  })();

  const passed = assertion(response, parsedBody);
  const status = passed ? "PASS" : "FAIL";
  console.log(`${status} ${name} -> ${response.status}`);

  if (!passed) {
    console.log(parsedBody);
    process.exitCode = 1;
  }
}

await expect(
  "normal login reaches backend",
  () => fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: withIp("10.10.10.10"),
    body: JSON.stringify({ username: "demo", password: "safe-password" }),
  }),
  (response, body) => response.status === 200 && body.message === "Login Successful",
);

await expect(
  "rate limiter blocks login after 5 requests per IP",
  async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: withIp("10.10.10.20"),
        body: JSON.stringify({ username: "demo", password: `pw-${attempt}` }),
      });
    }

    return fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: withIp("10.10.10.20"),
      body: JSON.stringify({ username: "demo", password: "pw-6" }),
    });
  },
  (response) => response.status === 429,
);

await expect(
  "sql injection is blocked by waf",
  () => fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: withIp("10.10.10.30"),
    body: JSON.stringify({ username: "admin' OR '1'='1", password: "pw" }),
  }),
  (response, body) => response.status === 403 && String(body.reason || "").includes("SQL Injection"),
);

await expect(
  "blacklisted ip is blocked immediately",
  () => fetch(`${baseUrl}/balance`, {
    method: "GET",
    headers: withIp(blacklistedIp),
  }),
  (response, body) => response.status === 403 && String(body.reason || "").includes("Blacklisted"),
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Smoke test suite completed successfully.");
