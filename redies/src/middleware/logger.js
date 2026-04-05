const { incrementTotal } = require("../utils/metrics");

module.exports = (req, res, next) => {

  const internalRoutes = ["/metrics", "/favicon.ico"];

  // ❌ Skip internal routes
  if (!internalRoutes.includes(req.path)) {
    incrementTotal(req); // ✅ ONLY HERE
  }

  console.log(`➡️ ${req.method} ${req.url} | IP: ${req.ip}`);
  next();
};