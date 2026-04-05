// Import URL module to parse query parameters
const url = require('url');


// 🔹 Helper function to extract client IP
function getClientIP(req) {

    // Check if request came through proxy (X-Forwarded-For)
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
        // If multiple IPs, take the first one
        return forwarded.split(',')[0].trim();
    }

    // Otherwise use direct socket IP
    return req.socket.remoteAddress;
}


// 🔹 Helper function to collect all data from request
function collectRequestData(req) {

    // Parse URL to get query params
    const parsedUrl = url.parse(req.url, true);

    // Extract query params as object
    const queryParams = parsedUrl.query;

    // Convert query params into string
    const queryString = JSON.stringify(queryParams);

    // Get body as string (if exists)
    let bodyString = '';
    if (req.body) {
        bodyString = JSON.stringify(req.body);
    }

    // Extract headers to scan
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const customHeader = req.headers['x-custom-header'] || '';

    // Combine all into one big string for scanning
    const combined = queryString + ' ' + bodyString + ' ' + userAgent + ' ' + referer + ' ' + customHeader;

    return combined;
}


// 🔹 Main function to inspect request
function inspectRequest(req, config) {

    // ==============================
    // 🔥 CHECK 1: IP BLACKLIST
    // ==============================

    // Get client IP
    const ip = getClientIP(req);

    // Check if IP is in blacklist
    if (config.security.blacklisted_ips.includes(ip)) {
        return {
            safe: false,
            reason: "Blacklisted IP",
            status: 403
        };
    }


    // Collect all request data for scanning
    const dataToScan = collectRequestData(req);


    // ==============================
    // 🔥 CHECK 2: SQL INJECTION
    // ==============================

    if (config.security.block_sql_injection) {

        // Define SQL injection patterns
        const sqlPatterns = [
            /DROP\s+TABLE/i,
            /DROP\s+DATABASE/i,
            /OR\s+1=1/i,
            /OR\s+'1'='1'/i,
            /;\s*--/i,
            /UNION\s+SELECT/i,
            /INSERT\s+INTO/i,
            /DELETE\s+FROM/i,
            /xp_cmdshell/i,
            /EXEC\s*\(/i
        ];

        // Check each pattern
        for (const pattern of sqlPatterns) {
            if (pattern.test(dataToScan)) {
                return {
                    safe: false,
                    reason: "SQL Injection Detected",
                    status: 400
                };
            }
        }
    }


    // ==============================
    // 🔥 CHECK 3: XSS DETECTION
    // ==============================

    if (config.security.block_xss) {

        // Define XSS patterns
        const xssPatterns = [
            /<\s*script/i,
            /javascript:/i,
            /onerror\s*=/i,
            /onload\s*=/i,
            /onclick\s*=/i,
            /<\s*iframe/i,
            /<\s*object/i,
            /<\s*embed/i
        ];

        // Check each pattern
        for (const pattern of xssPatterns) {
            if (pattern.test(dataToScan)) {
                return {
                    safe: false,
                    reason: "XSS Attack Detected",
                    status: 400
                };
            }
        }
    }


    // ==============================
    // ✅ SAFE REQUEST
    // ==============================

    return { safe: true };
}


// Export function
module.exports = {
    inspectRequest
};