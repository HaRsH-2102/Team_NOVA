// Create a Map to store rate limiting data
// Structure: Map<ip, Map<"METHOD:/path", [timestamps]>>
const rateLimitStore = new Map();


// 🔹 Helper function to normalize paths
// This removes trailing slash so /login and /login/ are treated same
function normalizePath(path) {
    if (path.endsWith('/') && path.length > 1) {
        return path.slice(0, -1); // Remove last '/'
    }
    return path;
}


// 🔹 Main function to check rate limit
function checkRateLimit(ip, method, path, config) {

    // Normalize path
    const normalizedPath = normalizePath(path);

    // Find matching rule from config
    const rule = config.rate_limits.find(r => {
        return r.method === method && normalizePath(r.path) === normalizedPath;
    });

    // If no rule found → allow request
    if (!rule) {
        return { allowed: true };
    }

    // Extract rule details
    const limit = rule.limit;
    const windowMs = rule.window_seconds * 1000;

    // Get current timestamp
    const now = Date.now();

    // If this IP not in store → create entry
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, new Map());
    }

    // Get map for this IP
    const ipMap = rateLimitStore.get(ip);

    // Create unique key for endpoint
    const key = `${method}:${normalizedPath}`;

    // If endpoint not tracked → initialize array
    if (!ipMap.has(key)) {
        ipMap.set(key, []);
    }

    // Get timestamps array
    let timestamps = ipMap.get(key);

    // 🔹 Remove old timestamps (outside window)
    timestamps = timestamps.filter(ts => now - ts < windowMs);

    // Update cleaned timestamps back to store
    ipMap.set(key, timestamps);

    // Count current requests in window
    const currentCount = timestamps.length;

    // 🔹 If limit exceeded → block
    if (currentCount >= limit) {

        // Calculate retryAfter (seconds until oldest expires)
        const oldest = timestamps[0];
        const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);

        return {
            allowed: false,
            reason: "Rate Limit Exceeded",
            limit: limit,
            remaining: 0,
            retryAfter: retryAfter
        };
    }

    // 🔹 Otherwise allow request

    // Add current timestamp
    timestamps.push(now);

    // Save updated timestamps
    ipMap.set(key, timestamps);

    return {
        allowed: true,
        limit: limit,
        remaining: limit - (timestamps.length)
    };
}


// 🔹 Function to get stats about rate limiter
function getRateLimitStats() {

    // Total IPs tracked
    const totalIPs = rateLimitStore.size;

    let totalRequests = 0;

    // Loop through all IPs
    for (const ipMap of rateLimitStore.values()) {

        // Loop through all endpoints
        for (const timestamps of ipMap.values()) {
            totalRequests += timestamps.length;
        }
    }

    return {
        totalIPs,
        totalRequests
    };
}


// Export functions
module.exports = {
    checkRateLimit,
    getRateLimitStats
};