import {LRUCache} from 'lru-cache';

const cache = new LRUCache({
  max: 500,
  ttl: 60 * 1000, // 60s
});

export function cacheMiddleware({ ttlSec = 60, keyFn } = {}) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = keyFn ? keyFn(req) : req.originalUrl;
    const cached = cache.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(cached.status).set(cached.headers).send(cached.body);
    }

    const originalSend = res.send.bind(res);
    res.send = (body) => {
      try {
        cache.set(
          key,
          {
            status: res.statusCode,
            headers: { 'Content-Type': res.get('Content-Type') ?? 'application/json' },
            body,
          },
          { ttl: ttlSec * 1000 },
        );
        res.setHeader('X-Cache', 'MISS');
      } catch { /* ignore */ }
      return originalSend(body);
    };

    next();
  };
}

export default cacheMiddleware;
