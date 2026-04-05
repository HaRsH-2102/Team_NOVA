export class SlidingWindowRateLimiter {
  #store = new Map();

  consume({ key, limit, windowSeconds, now = Date.now() }) {
    const windowStart = now - (windowSeconds * 1000);
    const current = this.#store.get(key) || [];

    let firstActiveIndex = 0;
    while (firstActiveIndex < current.length && current[firstActiveIndex] <= windowStart) {
      firstActiveIndex += 1;
    }

    const timestamps = firstActiveIndex === 0 ? current : current.slice(firstActiveIndex);

    if (timestamps.length >= limit) {
      this.#store.set(key, timestamps);
      const retryAfterSeconds = Math.max(1, Math.ceil(((timestamps[0] + (windowSeconds * 1000)) - now) / 1000));

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    timestamps.push(now);
    this.#store.set(key, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, limit - timestamps.length),
      retryAfterSeconds: 0,
    };
  }

  sweep(maxIdleWindowSeconds = 600) {
    const cutoff = Date.now() - (maxIdleWindowSeconds * 1000);

    for (const [key, timestamps] of this.#store.entries()) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
        this.#store.delete(key);
      }
    }
  }
}

export function findRateLimitRule(config, method, pathname) {
  return config.rate_limit_index.get(`${method.toUpperCase()} ${pathname}`) || null;
}
