const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Store in-memory
// Format: { "IP_path": { count: X, startTime: timestamp } }
/*
 * BONUS: To scale horizontally, swap this in-memory map with Redis (ioredis).
 * Example Redis approach:
 * const key = `${ip}_${reqPath}`;
 * const current = await redis.incr(key);
 * if (current === 1) await redis.expire(key, rule.window_seconds);
 * if (current > rule.limit) return false;
 */
let store = {};

function allowRequest(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const reqPath = req.path;
    const method = req.method;

    // Refresh config in case it dynamically changed (Bonus Implementation)
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Find rule
    const rule = config.rate_limits.find(r => r.path === reqPath && r.method === method);
    if (!rule) {
        return true; // No rule found, allow
    }

    const key = `${ip}_${reqPath}`;
    const now = Date.now();

    if (!store[key]) {
        store[key] = { count: 1, startTime: now };
        return true;
    }

    // Check if time elapsed > window
    if (now - store[key].startTime > rule.window_seconds * 1000) {
        // Reset counter
        store[key] = { count: 1, startTime: now };
        return true;
    }

    if (store[key].count >= rule.limit) {
        return false; // Block
    }

    store[key].count++;
    return true; // Allow
}

module.exports = { allowRequest };
