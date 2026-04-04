// Import rate limiter
const { checkRateLimit } = require('./rateLimiter');

// Mock config (same as your config.json)
const config = {
    rate_limits: [
        {
            path: "/login",
            method: "POST",
            limit: 5,
            window_seconds: 60
        }
    ]
};

// Simulated IP
const ip = "192.168.1.1";

// Simulate 7 requests
for (let i = 1; i <= 7; i++) {

    const result = checkRateLimit(ip, "POST", "/login", config);

    if (result.allowed) {
        console.log(`Request ${i}: ALLOWED | Remaining: ${result.remaining}`);
    } else {
        console.log(`Request ${i}: BLOCKED | Reason: ${result.reason} | Retry After: ${result.retryAfter}s`);
    }
}