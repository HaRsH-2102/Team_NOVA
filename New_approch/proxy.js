// Import modules
const { updateStats } = require('../dashboard');
const http = require('http');
const { getConfig, startWatcher } = require('../configLoader');
const { inspectRequest } = require('./waf');
const { logRequest, logBlocked } = require('../logger');

// Start config watcher
startWatcher();


// 🔹 Create keep-alive agent (connection pool)
const agent = new http.Agent({
    keepAlive: true,
    maxSockets: 500,
    maxFreeSockets: 100,
    timeout: 30000
});


// 🔹 Create HTTP server
const server = http.createServer(async (req, res) => {

    try {

        const config = getConfig();

        // STEP A — Extract IP
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (ip.includes(',')) ip = ip.split(',')[0].trim();
        if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');


        // STEP B — WAF (GET without body)
        if (['GET', 'DELETE', 'HEAD'].includes(req.method)) {

            const waf = inspectRequest(req, config);

            if (!waf.safe) {
                logBlocked(ip, req.method, req.url, waf.reason);
                res.writeHead(waf.status);
                res.end(JSON.stringify({ error: waf.reason }));
                return;
            }
        }


        // STEP C — Rate Limit (skip IPC for now if not integrated yet)


        // STEP D — Forward request

        const backendUrl = new URL(config.server.backend_url);

        const options = {
            hostname: backendUrl.hostname,
            port: backendUrl.port,
            path: req.url,
            method: req.method,
            headers: {
                ...req.headers,
                'x-forwarded-for': ip,
                'x-real-ip': ip,
                'x-proxy-by': 'MyCustomProxy'
            },
            agent
        };

        // Remove host header
        delete options.headers.host;


        const backendReq = http.request(options, (backendRes) => {

            // Copy headers
            Object.entries(backendRes.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            res.writeHead(backendRes.statusCode);

            // Pipe response (zero-copy)
            backendRes.pipe(res);

            logRequest(ip, req.method, req.url, backendRes.statusCode);
            updateStats(backendRes.statusCode, false);
        });


        // Handle backend errors
        backendReq.on('error', (err) => {

            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
                res.writeHead(502);
                res.end(JSON.stringify({ error: 'Bad Gateway' }));
            } else if (err.code === 'ETIMEDOUT') {
                res.writeHead(504);
                res.end(JSON.stringify({ error: 'Gateway Timeout' }));
            }
        });


        // Pipe request directly
        req.pipe(backendReq);

    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end('Internal Error');
    }
});


// 🔹 Enable TCP_NODELAY
server.on('connection', (socket) => {
    socket.setNoDelay(true);
});


// 🔹 Server tuning
server.maxHeadersCount = 0;
server.headersTimeout = 15000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 30000;


// Start server
const config = getConfig();

server.listen(config.server.listen_port, () => {
    console.log(`Worker running on port ${config.server.listen_port}`);
});

server.listen(config.server.listen_port, () => {
    console.log(`✅ Worker ${process.pid} listening on port ${config.server.listen_port}`);
});