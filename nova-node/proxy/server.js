const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');
const { allowRequest } = require('./rateLimiter');
const { detectThreat } = require('./waf');

const app = express();

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// State for dashboard
let events = [];
let requestCount = 0;
let totalBlocked = 0;

// Reset RPS counter every second for dashboard
let currentRps = 0;
setInterval(() => {
    currentRps = requestCount;
    requestCount = 0;
}, 1000);

function logEvent(status, ip, reason, pathMethod) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${pathMethod} | IP: ${ip} | STATUS: ${status}` + (reason ? ` | REASON: ${reason}` : ''));
    
    events.unshift({
        statusCode: status,
        ip: ip,
        reason: reason || 'OK',
        time: timestamp
    });
    // Keep last 100 events
    if (events.length > 100) events.pop();
}

app.use(express.json()); // Parse body for WAF

// Middleware Pipeline
app.use((req, res, next) => {
    // 0. Update configs & metrics dynamically
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    requestCount++;
    req.pathMethod = `${req.method} ${req.path}`;
    const ip = req.ip || req.connection.remoteAddress;

    // By-pass metrics endpoint
    if (req.path === '/nova-stats') {
        return next();
    }

    // 1. IP Blacklist Check
    if (config.security.blacklisted_ips.includes(ip)) {
        totalBlocked++;
        logEvent(403, ip, "Blacklisted IP", req.pathMethod);
        return res.status(403).json({ message: "Blocked: Blacklisted IP" });
    }

    // 2. WAF Threat Scan
    const wafResult = detectThreat(req);
    if (wafResult.blocked) {
        totalBlocked++;
        logEvent(403, ip, wafResult.reason, req.pathMethod);
        return res.status(403).json({ message: `Blocked: ${wafResult.reason}` });
    }

    // 3. Rate Limit Check
    if (!allowRequest(req)) {
        totalBlocked++;
        logEvent(429, ip, "Rate Limit Exceeded", req.pathMethod);
        return res.status(429).json({ message: "Too Many Requests" });
    }

    // All clear - prepare to log success when response finishes
    res.on('finish', () => {
        if (res.statusCode < 400) {
            logEvent(res.statusCode, ip, null, req.pathMethod);
        }
    });

    next();
});

// Dashboard stats endpoint
app.get('/nova-stats', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        rps: currentRps,
        totalBlocked,
        events,
        port: config.server.listen_port
    });
});

// 4. Forward to backend
app.use('/', createProxyMiddleware({
    target: config.server.backend_url,
    changeOrigin: true,
    on: {
        proxyReq: fixRequestBody // Ensures we don't break POSTs with body parsing
    }
}));

const PORT = config.server.listen_port || 9090;
app.listen(PORT, () => {
    console.log(`Nova Shield running on port ${PORT}`);
});
