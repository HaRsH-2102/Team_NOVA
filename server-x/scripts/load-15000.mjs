import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "config.json"), "utf8"));
const baseUrl = process.env.PROXY_URL || `http://127.0.0.1:${config.server.listen_port}`;
const totalRequests = Number(process.env.TOTAL_REQUESTS || 15000);
const demoHeader = config.security.demo_ip_header || "x-demo-client-ip";
const blacklistedIp = config.security.blacklisted_ips[0] || "203.0.113.42";

function buildRequest(index) {
  if (index < 7800) {
    return {
      name: "users",
      url: `${baseUrl}/getAllUsers`,
      options: {
        method: "GET",
        headers: {
          [demoHeader]: `10.0.${Math.floor(index / 100) + 1}.${(index % 100) + 1}`,
        },
      },
    };
  }

  if (index < 11400) {
    return {
      name: "balance",
      url: `${baseUrl}/balance?accountId=ACC-${1000 + index}`,
      options: {
        method: "GET",
        headers: {
          [demoHeader]: `10.2.${Math.floor((index - 7800) / 60) + 1}.${((index - 7800) % 60) + 1}`,
        },
      },
    };
  }

  if (index < 13800) {
    return {
      name: "login-burst",
      url: `${baseUrl}/login`,
      options: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [demoHeader]: `10.4.${Math.floor((index - 11400) / 40) + 1}.25`,
        },
        body: JSON.stringify({
          username: "burst-user",
          password: `pw-${index}`,
        }),
      },
    };
  }

  if (index < 14400) {
    return {
      name: "waf",
      url: `${baseUrl}/login`,
      options: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [demoHeader]: `10.6.${Math.floor((index - 13800) / 20) + 1}.${((index - 13800) % 20) + 1}`,
        },
        body: JSON.stringify({
          username: "admin' OR '1'='1",
          password: "exploit",
        }),
      },
    };
  }

  return {
    name: "blacklist",
    url: `${baseUrl}/balance?accountId=ACC-BLOCKED-${index}`,
    options: {
      method: "GET",
      headers: {
        [demoHeader]: blacklistedIp,
      },
    },
  };
}

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * ratio));
  return sortedValues[index];
}

console.log(`Dispatching ${totalRequests} requests to ${baseUrl} with a concurrency limit of 500...`);

const startedAt = performance.now();
const results = new Array(totalRequests);
let nextIndex = 0;
const CONCURRENCY_LIMIT = 500;

async function worker() {
  while (nextIndex < totalRequests) {
    const index = nextIndex++;
    const scenario = buildRequest(index);
    const requestStart = performance.now();
    try {
      const response = await fetch(scenario.url, scenario.options);
      await response.arrayBuffer();
      results[index] = {
        status: "fulfilled",
        value: {
          name: scenario.name,
          status: response.status,
          latencyMs: performance.now() - requestStart,
        },
      };
    } catch (error) {
      results[index] = {
        status: "rejected",
        reason: error,
      };
    }
  }
}

const activeWorkers = [];
for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, totalRequests); i++) {
  activeWorkers.push(worker());
}
await Promise.all(activeWorkers);
const totalDurationMs = performance.now() - startedAt;

const statusCounts = new Map();
const scenarioCounts = new Map();
const latencies = [];
let failures = 0;

for (const result of results) {
  if (result.status === "rejected") {
    failures += 1;
    continue;
  }

  const statusKey = String(result.value.status);
  statusCounts.set(statusKey, (statusCounts.get(statusKey) || 0) + 1);
  scenarioCounts.set(result.value.name, (scenarioCounts.get(result.value.name) || 0) + 1);
  latencies.push(result.value.latencyMs);
}

latencies.sort((left, right) => left - right);

console.log("");
console.log("Summary");
console.log("-------");
console.log(`Total requests: ${totalRequests}`);
console.log(`Completed: ${totalRequests - failures}`);
console.log(`Failures: ${failures}`);
console.log(`Wall time: ${totalDurationMs.toFixed(1)} ms`);
console.log(`Average latency: ${(latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1)).toFixed(1)} ms`);
console.log(`P50 latency: ${percentile(latencies, 0.5).toFixed(1)} ms`);
console.log(`P95 latency: ${percentile(latencies, 0.95).toFixed(1)} ms`);
console.log(`Throughput: ${((totalRequests - failures) / (totalDurationMs / 1000)).toFixed(1)} req/s`);
console.log("");
console.log("Status counts");
for (const [status, count] of Array.from(statusCounts.entries()).sort((left, right) => Number(left[0]) - Number(right[0]))) {
  console.log(`${status}: ${count}`);
}
console.log("");
console.log("Scenario counts");
for (const [name, count] of scenarioCounts.entries()) {
  console.log(`${name}: ${count}`);
}
