// const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const logger = require("./middleware/logger");
const security = require("./middleware/security");
const rateLimiter = require("./middleware/rateLimiter");
const proxyService = require("./services/proxyService");
const redis = require("./services/redisService");
const { setConfig, getConfig } = require("./utils/configManager");
const { getMetrics } = require("./utils/metrics");
const express = require("express");
const cors = require("cors");
const { getAttacks } = require("./utils/attackStore");




const app = express();

app.use(express.static("public"));

// Middleware to parse JSON
app.use(express.json());
// console.log("logger type:", typeof logger);
// console.log("security type:", typeof security);
// console.log("rateLimiter type:", typeof rateLimiter);

// Load config
const configPath = path.join(__dirname, "config", "config.json");
// let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

let config = {};

// const { setConfig } = require("./utils/configManager");

function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(data);

    setConfig(parsed); // 🔥 THIS LINE FIXES EVERYTHING

    console.log("🔄 Config loaded");
  } catch (err) {
    console.error("❌ Config load error:", err);
  }
}
// Initial load
loadConfig();


fs.watch(configPath, (eventType) => {
  if (eventType === "change") {
    console.log("⚡ Config file changed, reloading...");
    loadConfig();
  }
});



app.get("/favicon.ico", (req, res) => res.status(204).end());


app.use(cors({
  origin: "http://localhost:8081",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


// Simple Logger MiddlewareA
app.use(logger);







// Security Middleware (basic WAF)

app.use(security);

// app.use((req, res, next) => {
//   const ip = req.ip;
//   const data = JSON.stringify(req.body) + req.url;

//   // Block blacklisted IPs
//   if (config.security.blacklisted_ips.includes(ip)) {
//     console.log(`🚫 Blocked IP: ${ip}`);
//     return res.status(403).send("Forbidden");
//   }

//  // Advanced SQL Injection Detection
// if (config.security.block_sql_injection) {
//   const normalizedData = data.toLowerCase();

//   const sqlPatterns = [
//     /(\bor\b|\band\b)\s+\d+=\d+/i,        // OR 1=1
//     /union\s+select/i,                   // UNION SELECT
//     /drop\s+table/i,                    // DROP TABLE
//     /insert\s+into/i,
//     /delete\s+from/i,
//     /update\s+\w+\s+set/i,
//     /--/,                               // SQL comment
//     /;/,                                // multiple statements
//     /xp_cmdshell/i,                     // SQL Server attack
//     /information_schema/i,
//     /sleep\(\d+\)/i                     // time-based attack
//   ];

//   const isSQLInjection = sqlPatterns.some(pattern =>
//     pattern.test(normalizedData)
//   );

//   if (isSQLInjection) {
//     console.log("🚫 SQL Injection Attempt Blocked");
//     return res.status(403).send("SQL Injection Blocked");
//   }
// }

//   // XSS check
//   if (data.includes("<script>")) {
//     console.log("🚫 XSS Attack Blocked");
//     return res.status(403).send("XSS Blocked");
//   }

//   next();
// });

// Rate Limiter (in-memory for now)
app.use(rateLimiter);

//const rateLogs = {};

// app.use((req, res, next) => {
//   const ip = req.ip;
//   const pathReq = req.path;
//   const method = req.method;

//   const rule = config.rate_limits.find(
//     r => r.path === pathReq && r.method === method
//   );

//   if (!rule) return next();

//   const key = `${ip}:${pathReq}:${method}`;
//   const now = Date.now();

//   if (!rateLogs[key]) rateLogs[key] = [];

//   // Remove old timestamps
//   rateLogs[key] = rateLogs[key].filter(
//     t => now - t < rule.window_seconds * 1000
//   );

//   if (rateLogs[key].length >= rule.limit) {
//     console.log(`🚫 Rate limit exceeded for ${key}`);
//     return res.status(429).send("Too Many Requests");
//   }

//   rateLogs[key].push(now);
//   next();
// });


app.get("/logs", (req, res) => {
  console.log("📊 Logs requested");
  res.json(getAttacks());
});



app.get("/metrics", (req, res) => {
  res.json(getMetrics());
});

// Start Proxy Server

const currentConfig = getConfig();



// Proxy Handler (MAIN PART)



app.use(proxyService);
// app.use(async (req, res) => {
//   try {
//     const backendURL = config.server.backend_url;

//     console.log("➡️ Forwarding to:", backendURL + req.url);

//     const options = {
//       method: req.method,
//       headers: {
//         "content-type": "application/json"
//       }
//     };

//     // Only attach body for POST/PUT/PATCH
//     if (["POST", "PUT", "PATCH"].includes(req.method)) {
//       options.body = JSON.stringify(req.body);
//     }

//     const response = await fetch(backendURL + req.url, options);

//     const data = await response.text();

//     res.status(response.status).send(data);

//   } catch (error) {
//     console.error("❌ Proxy Error:", error.message);
//     res.status(500).send("Proxy Server Error");
//   }
// });





app.listen(currentConfig.server.listen_port, () => {
  console.log(`🚀 Proxy running on http://localhost:${currentConfig.server.listen_port}`);
});

// app.listen(config.server.listen_port, () => {
//   console.log(`🚀 Proxy running on http://localhost:${config.server.listen_port}`);
// });