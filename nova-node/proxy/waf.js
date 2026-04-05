const fs = require('fs');
const path = require('path');

// Patterns dictionary
const patterns = {
    "SQL Injection": [
        /(\bOR\b|\bAND\b).*=.*/i,
        /SELECT.*FROM/i,
        /DROP\s+TABLE/i,
        /--/,
        /;/ ,
        /UNION.*SELECT/i
    ],
    "XSS": [
        /<script>/i,
        /javascript:/i,
        /onerror\s*=/i,
        /on\w+\s*=\s*["']/i
    ],
    "Path Traversal": [
        /\.\.\//,
        /\/etc\/passwd/,
        /\/proc\//
    ],
    "Command Injection": [
        /\|\s*cat\s/i,
        /;\s*ls\b/i,
        /`[^\`]+`/
    ]
};

function detectThreat(req) {
    const configPath = path.join(__dirname, 'config.json');
    let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const urlPayload = req.url || '';
    const bodyPayload = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
    const combinedPayload = urlPayload + " " + bodyPayload;

    let threatsToCheck = {};
    if (config.security.block_sql_injection) {
        threatsToCheck["SQL Injection"] = patterns["SQL Injection"];
    }
    if (config.security.block_xss) {
        threatsToCheck["XSS"] = patterns["XSS"];
    }
    // Always check traversal and command injection, or add them implicitly
    threatsToCheck["Path Traversal"] = patterns["Path Traversal"];
    threatsToCheck["Command Injection"] = patterns["Command Injection"];

    for (const [threatName, regexList] of Object.entries(threatsToCheck)) {
        for (const regex of regexList) {
            if (regex.test(combinedPayload)) {
                return { blocked: true, reason: threatName };
            }
        }
    }

    return { blocked: false, reason: null };
}

module.exports = { detectThreat };
