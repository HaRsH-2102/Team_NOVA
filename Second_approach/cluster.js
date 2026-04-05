// Import cluster module for multi-process scaling
const cluster = require('cluster');

// Import os module to get CPU core count
const os = require('os');

// Get total number of CPU cores
const numCPUs = Math.min(os.cpus().length, 4); // Limit to 4 for testing

// ==============================
// MASTER PROCESS
// ==============================
if (cluster.isPrimary) {

    // Print startup message
    console.log(`🚀 Master process started. Spawning ${numCPUs} workers...`);

    // 🔹 Central Rate Limit Store (shared in master)
    const rateLimitStore = new Map();


    // 🔹 Function for sliding window logic (same as before)
    function handleRateCheck(msg, worker) {

        const { ip, method, path, config, requestId } = msg;

        const key = `${method}:${path}`;
        const now = Date.now();

        const windowMs = config.window_seconds * 1000;
        const limit = config.limit;

        if (!rateLimitStore.has(ip)) {
            rateLimitStore.set(ip, new Map());
        }

        const ipMap = rateLimitStore.get(ip);

        if (!ipMap.has(key)) {
            ipMap.set(key, []);
        }

        let timestamps = ipMap.get(key);

        // Remove old timestamps
        timestamps = timestamps.filter(ts => now - ts < windowMs);
        ipMap.set(key, timestamps);

        if (timestamps.length >= limit) {
            worker.send({
                type: 'RATE_RESULT',
                requestId,
                allowed: false,
                reason: 'Rate Limit Exceeded'
            });
            return;
        }

        timestamps.push(now);
        ipMap.set(key, timestamps);

        worker.send({
            type: 'RATE_RESULT',
            requestId,
            allowed: true
        });
    }


    // 🔹 Fork workers
    for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork();

        // Listen for messages from worker
        worker.on('message', (msg) => {
            if (msg.type === 'RATE_CHECK') {
                handleRateCheck(msg, worker);
            }
        });
    }


    // 🔹 Restart worker if it crashes
    cluster.on('exit', (worker) => {
        console.log('[Cluster] Worker crashed, spawning replacement...');
        cluster.fork();
    });


    // 🔹 Start dashboard ONLY in master
    const dashboard = require('./dashboard'); // assume it runs on port 3000

}


// ==============================
// WORKER PROCESS
// ==============================
else {
    // Start proxy in worker
    require('./proxy');
}