const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Load config
const configPath = path.join(__dirname, "config", "config.json");
let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Simple Logger Middleware
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url} | IP: ${req.ip}`);
  next();
});

// Security Middleware (basic WAF)
app.use((req, res, next) => {
  const ip = req.ip;
  const data = JSON.stringify(req.body) + req.url;

  // Block blacklisted IPs
  if (config.security.blacklisted_ips.includes(ip)) {
    console.log(`🚫 Blocked IP: ${ip}`);
    return res.status(403).send("Forbidden");
  }

  // SQL Injection check
  if (config.security.block_sql_injection) {
    if (data.includes("DROP") || data.includes("OR 1=1")) {
      console.log("🚫 SQL Injection Attempt Blocked");
      return res.status(403).send("SQL Injection Blocked");
    }
  }

  // XSS check
  if (data.includes("<script>")) {
    console.log("🚫 XSS Attack Blocked");
    return res.status(403).send("XSS Blocked");
  }

  next();
});

// Rate Limiter (in-memory for now)
const rateLogs = {};

app.use((req, res, next) => {
  const ip = req.ip;
  const pathReq = req.path;
  const method = req.method;

  const rule = config.rate_limits.find(
    r => r.path === pathReq && r.method === method
  );

  if (!rule) return next();

  const key = `${ip}:${pathReq}:${method}`;
  const now = Date.now();

  if (!rateLogs[key]) rateLogs[key] = [];

  // Remove old timestamps
  rateLogs[key] = rateLogs[key].filter(
    t => now - t < rule.window_seconds * 1000
  );

  if (rateLogs[key].length >= rule.limit) {
    console.log(`🚫 Rate limit exceeded for ${key}`);
    return res.status(429).send("Too Many Requests");
  }

  rateLogs[key].push(now);
  next();
});

// Proxy Handler (MAIN PART)
app.use(async (req, res) => {
  try {
    const backendURL = config.server.backend_url;

    const response = await fetch(backendURL + req.url, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" ? null : JSON.stringify(req.body)
    });

    const data = await response.text();

    res.status(response.status).send(data);

  } catch (error) {
    console.error("❌ Proxy Error:", error.message);
    res.status(500).send("Proxy Server Error");
  }
});

// Start Proxy Server
app.listen(config.server.listen_port, () => {
  console.log(`🚀 Proxy running on http://localhost:${config.server.listen_port}`);
});