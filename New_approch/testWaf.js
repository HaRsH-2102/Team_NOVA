// Import WAF
const { inspectRequest } = require('./waf');

// Mock config
const config = {
    security: {
        block_sql_injection: true,
        block_xss: true,
        blacklisted_ips: ["203.0.113.42"]
    }
};


// 🔹 Helper to create fake request
function createRequest({ ip, url, body = {}, headers = {} }) {
    return {
        url: url,
        body: body,
        headers: headers,
        socket: {
            remoteAddress: ip
        }
    };
}


// ==============================
// TEST 1: CLEAN REQUEST
// ==============================
let req1 = createRequest({
    ip: "192.168.1.1",
    url: "/login?user=harshal"
});

console.log("Test 1:", inspectRequest(req1, config));


// ==============================
// TEST 2: SQL INJECTION
// ==============================
let req2 = createRequest({
    ip: "192.168.1.1",
    url: "/users?id=1 OR 1=1"
});

console.log("Test 2:", inspectRequest(req2, config));


// ==============================
// TEST 3: XSS ATTACK
// ==============================
let req3 = createRequest({
    ip: "192.168.1.1",
    url: "/login",
    body: { input: "<script>alert('xss')</script>" }
});

console.log("Test 3:", inspectRequest(req3, config));


// ==============================
// TEST 4: BLACKLISTED IP
// ==============================
let req4 = createRequest({
    ip: "203.0.113.42",
    url: "/login"
});

console.log("Test 4:", inspectRequest(req4, config));