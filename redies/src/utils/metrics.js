let metrics = {
  totalRequests: 0,
  blockedRequests: 0,
  rateLimited: 0,
  logs: [] // 🔥 NEW
};

let attackerIPs = [];

function addLog(type, req) {
  const log = {
    type,
    path: req.path,
    method: req.method,
    ip: req.ip,
    time: new Date().toLocaleTimeString()
  };

  metrics.logs.unshift(log);

  // 🔥 Track attackers
  if (type === "BLOCKED" || type === "RATE_LIMIT") {
    attackerIPs.push(req.ip);
  }

  if (metrics.logs.length > 20) metrics.logs.pop();
}

function getMetrics() {
  return {
    ...metrics,
    attackerIPs
  };
}

function incrementTotal(req) {
  metrics.totalRequests++;
  addLog("REQUEST", req);
}

function incrementBlocked(req) {
  metrics.blockedRequests++;
  addLog("BLOCKED", req);
}

function incrementRateLimited(req) {
  metrics.rateLimited++;
  addLog("RATE_LIMIT", req);
}

// 🔥 Log system
function addLog(type, req) {
  metrics.logs.unshift({
    type,
    path: req.path,
    method: req.method,
    ip: req.ip,
    time: new Date().toLocaleTimeString()
  });

  // keep only last 20 logs
  if (metrics.logs.length > 20) {
    metrics.logs.pop();
  }
}

function getMetrics() {
  return metrics;
}

module.exports = {
  incrementTotal,
  incrementBlocked,
  incrementRateLimited,
  getMetrics
};