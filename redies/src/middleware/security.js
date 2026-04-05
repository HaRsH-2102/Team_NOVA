const { getConfig } = require("../utils/configManager");
const { incrementBlocked } = require("../utils/metrics");
const { addAttack } = require("../utils/attackStore");

module.exports = (req, res, next) => {
  const config = getConfig();

  if (!config || !config.security) {
    return next();
  }

  const ip = req.ip;
  const data = JSON.stringify(req.body) + req.url;
  const normalizedData = data.toLowerCase();

  // 🔴 Already blacklisted
  if (config.security.blacklisted_ips?.includes(ip)) {
    console.log(`🚫 Blocked IP: ${ip}`);
    incrementBlocked(req);
            addAttack({
            ip: req.ip,
            type: "Blacklisted IP",
            path: req.path,
            method: req.method,
            timestamp: new Date(),
            status: "blocked",
            severity: "critical"
        });
    return res.status(403).send("Forbidden (Blacklisted)");
  }

  // 🔥 Function to auto-block
  const autoBlock = () => {
    console.log(`🚨 Auto-blocking attacker IP: ${ip}`);
    config.security.blacklisted_ips.push(ip); // 🔥 dynamic block
    incrementBlocked(req);
  };

  // 🔥 SQL Injection
  if (config.security.block_sql_injection) {
    const sqlPatterns = [
      /(\bor\b|\band\b)\s+\d+=\d+/i,
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+\w+\s+set/i,
      /--/,
      /;/,
      /xp_cmdshell/i,
      /information_schema/i,
      /sleep\(\d+\)/i
    ];

    if (sqlPatterns.some(p => p.test(normalizedData))) {
      autoBlock();
      return res.status(403).send("SQL Injection Blocked");
    }

    if (isSQLInjection) {
        console.log("🚫 SQL Injection Attempt Blocked");

        addAttack({
            ip: req.ip,
            type: "SQL Injection",
            path: req.path,
            method: req.method,
            timestamp: new Date(),
            status: "blocked",
            severity: "high"
        });

        return res.status(403).send("SQL Injection Blocked");
    }
  }

  // 🔥 XSS
  if (normalizedData.includes("<script>")) {
    autoBlock();
        addAttack({
            ip: req.ip,
            type: "XSS Attack",
            path: req.path,
            method: req.method,
            timestamp: new Date(),
            status: "blocked",
            severity: "medium"
        });
    return res.status(403).send("XSS Blocked");
  }

  next();
};