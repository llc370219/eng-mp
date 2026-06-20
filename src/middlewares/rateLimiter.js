// 基于内存的速率限制（生产环境建议用 Redis）
const hits = new Map();

function rateLimiter({ windowMs = 60 * 1000, max = 60 } = {}) {
  return (req, res, next) => {
    const key = req.user ? `user:${req.user._id}` : `ip:${req.ip}`;
    const now = Date.now();

    if (!hits.has(key)) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const record = hits.get(key);

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
      return next();
    }

    record.count++;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }

    next();
  };
}

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of hits) {
    if (now > record.resetAt) {
      hits.delete(key);
    }
  }
}, 60 * 1000);

module.exports = rateLimiter;
