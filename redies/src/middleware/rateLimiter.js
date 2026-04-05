const { getConfig } = require("../utils/configManager");
const redis = require("../services/redisService");
const { incrementRateLimited } = require("../utils/metrics");

module.exports = async (req, res, next) => {
  const config = getConfig();

  // 🛡️ FAIL-SAFE CHECK
  if (!config || !config.rate_limits) {
    return next();
  }

  // ✅ INTERNAL ROUTES (skip limiter)
  const internalRoutes = ["/metrics", "/favicon.ico"];

  if (internalRoutes.includes(req.path)) {
    return next();
  }

  const ip = req.ip;

  // 🔥 Normalize request
  const pathReq = req.path.replace(/\/+$/, "").toLowerCase();
  const methodReq = req.method.toUpperCase();

  // 🔥 Match rule safely
  const rule = config.rate_limits.find(r => {
    const configPath = r.path.replace(/\/+$/, "").toLowerCase();
    const configMethod = r.method.toUpperCase();

    return configPath === pathReq && configMethod === methodReq;
  });

  // 🔍 Debug only when needed
  if (process.env.DEBUG === "true") {
    console.log("DEBUG MATCH:", {
      requestPath: pathReq,
      requestMethod: methodReq,
      rule
    });
  }

  // ❗ If no rule → allow request
  if (!rule) {
    return next();
  }

  const key = `rate:${ip}:${pathReq}:${methodReq}`;

  try {
    const requests = await redis.incr(key);

    if (requests === 1) {
      await redis.expire(key, rule.window_seconds);
    }

    if (process.env.DEBUG === "true") {
      console.log("Requests count:", requests);
    }

    // 🚫 Block if limit exceeded
    if (requests > rule.limit) {
      console.log(`🚫 Rate limit exceeded for ${key}`);

      // ✅ Correct metric tracking
      incrementRateLimited(req);

      return res.status(429).send("Too Many Requests");
    }

    next();

  } catch (error) {
    console.error("❌ Redis Rate Limiter Error:", error);
    next(); // fail-safe
  }
};