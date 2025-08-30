import redisClient from '../utils/redisClient.js';
import { env } from '../config/env.js';

export function cacheMiddleware({ ttlSec = 60, keyFn } = {}) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (!env.cache?.enabled) return next();

    const cc = (req.get('Cache-Control') || '').toLowerCase();
    if (req.user || req.headers.authorization || cc.includes('no-cache') || cc.includes('no-store') || req.query?.noCache === '1') {
      return next();
    }

    const prefix = req.baseUrl.includes('listings') ? 'listing:'
      : req.baseUrl.includes('reviews') ? 'review:'
      : req.baseUrl.includes('bookings') ? 'booking:'
      : 'api:';
    const key = keyFn ? keyFn(req) : (() => {
      try {
        const base = `${req.baseUrl}${req.path}`;
        const entries = Object.entries(req.query || {}).flatMap(([k, v]) => Array.isArray(v) ? v.map(val => [k, String(val)]) : [[k, String(v)]]);
        entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
        const qs = entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
        return `${prefix}${base}${qs}`;
      } catch {
        return `${prefix}${req.originalUrl}`;
      }
    })();
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        try {
          const remaining = await redisClient.ttl?.(key);
          if (typeof remaining === 'number' && remaining >= 0) res.setHeader('X-Cache-Remaining', String(remaining));
        } catch {}
        return res.status(parsed.status).set(parsed.headers).send(parsed.body);
      }
    } catch {}

    const originalSend = res.send.bind(res);
    res.send = async (body) => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const value = JSON.stringify({
            status: res.statusCode,
            headers: { 'Content-Type': res.get('Content-Type') ?? 'application/json' },
            body,
          });
          const effectiveTtl = Math.max(1, Math.min(Number(ttlSec) || 60, env.cache?.maxTtlSec || 60));
          await redisClient.setEx(key, effectiveTtl, value);
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-TTL', String(effectiveTtl));
        }
      } catch {}
      return originalSend(body);
    };

    next();
  };
}

export async function invalidateCache(prefix = 'api:') {
  try {
    const iter = redisClient.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 });
    for await (const key of iter) {
      await redisClient.del(key);
    }
  } catch {
  }
}
