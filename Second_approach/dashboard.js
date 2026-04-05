const cluster = require('cluster');

if (!cluster.isPrimary) {
    module.exports = {
        updateStats: () => {}
    };
    return;
}

// Import HTTP module
const http = require('http');

// Store stats globally
const stats = {
    totalRequests: 0,
    blockedRequests: 0,
    statusCodes: {},
    startTime: Date.now()
};


// 🔹 Function to update stats (called from proxy)
function updateStats(status, blocked = false) {

    // Increment total requests
    stats.totalRequests++;

    // Increment blocked if needed
    if (blocked) stats.blockedRequests++;

    // Track status codes
    if (!stats.statusCodes[status]) {
        stats.statusCodes[status] = 0;
    }
    stats.statusCodes[status]++;
}


// 🔹 Create HTTP server for dashboard
const server = http.createServer((req, res) => {

    // Serve stats API
    if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });

        // Calculate uptime
        const uptime = (Date.now() - stats.startTime) / 1000;

        res.end(JSON.stringify({
            ...stats,
            uptime,
            reqPerSec: (stats.totalRequests / uptime).toFixed(2)
        }));
        return;
    }


    // Serve dashboard UI
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });

        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Proxy Dashboard</title>
    <style>
        body { font-family: Arial; background: #111; color: #fff; text-align: center; }
        h1 { color: #00ffcc; }
        .card { margin: 20px; padding: 20px; background: #222; border-radius: 10px; display: inline-block; }
    </style>
</head>
<body>

<h1>🚀 Proxy Dashboard</h1>

<div class="card">
    <h2>Total Requests</h2>
    <p id="total">0</p>
</div>

<div class="card">
    <h2>Requests/sec</h2>
    <p id="rps">0</p>
</div>

<div class="card">
    <h2>Blocked Requests</h2>
    <p id="blocked">0</p>
</div>

<div class="card">
    <h2>Status Codes</h2>
    <pre id="status"></pre>
</div>

<script>
async function fetchStats() {
    const res = await fetch('/stats');
    const data = await res.json();

    document.getElementById('total').innerText = data.totalRequests;
    document.getElementById('rps').innerText = data.reqPerSec;
    document.getElementById('blocked').innerText = data.blockedRequests;
    document.getElementById('status').innerText = JSON.stringify(data.statusCodes, null, 2);
}

// Refresh every second
setInterval(fetchStats, 1000);
fetchStats();
</script>

</body>
</html>
        `);
        return;
    }

    res.writeHead(404);
    res.end();
});


// 🔹 Start dashboard server
server.listen(3000, () => {
    console.log("📊 Dashboard running on http://localhost:3000");
});


// Export function so proxy can update stats
module.exports = {
    updateStats
};