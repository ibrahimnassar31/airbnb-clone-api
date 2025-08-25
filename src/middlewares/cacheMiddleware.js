import redisClient from '../utils/redisClient.js';

export function cacheMiddleware({ ttlSec = 60, keyFn } = {}) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Use clear cache key prefixes
    const prefix = req.baseUrl.includes('listings') ? 'listing:'
      : req.baseUrl.includes('reviews') ? 'review:'
      : req.baseUrl.includes('bookings') ? 'booking:'
      : 'api:';
    const key = keyFn ? keyFn(req) : `${prefix}${req.originalUrl}`;
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.status(parsed.status).set(parsed.headers).send(parsed.body);
      }
    } catch {}

    const originalSend = res.send.bind(res);
    res.send = async (body) => {
      try {
        const value = JSON.stringify({
          status: res.statusCode,
          headers: { 'Content-Type': res.get('Content-Type') ?? 'application/json' },
          body,
        });
        await redisClient.setEx(key, ttlSec, value);
        res.setHeader('X-Cache', 'MISS');
      } catch {}
      return originalSend(body);
    };

    next();
  };
}

export async function invalidateCache(prefix = 'api:') {
  const keys = await redisClient.keys(`${prefix}*`);
  for (const key of keys) {
    await redisClient.del(key);
  }
}
