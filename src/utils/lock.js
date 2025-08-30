import crypto from 'node:crypto';
import redis from './redisClient.js';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function acquireLock(key, { ttlMs = 3000, waitMs = 5000, retryDelayMs = 100 } = {}) {
  const token = crypto.randomBytes(16).toString('hex');
  const deadline = Date.now() + Math.max(0, waitMs);
  while (true) {
    try {
      const res = await redis.set(key, token, { NX: true, PX: ttlMs });
      if (res === 'OK') return { key, token };
    } catch {
    }
    if (Date.now() >= deadline) break;
    await sleep(retryDelayMs);
  }
  return null;
}

export async function releaseLock(key, token) {
  const lua = "\n    if redis.call('get', KEYS[1]) == ARGV[1] then\n      return redis.call('del', KEYS[1])\n    else\n      return 0\n    end\n  ";
  try {
    if (typeof redis.eval === 'function') {
      const res = await redis.eval(lua, { keys: [key], arguments: [token] });
      return res === 1;
    }
    const val = await redis.get(key);
    if (val === token) {
      await redis.del(key);
      return true;
    }
  } catch {
  }
  return false;
}

export default { acquireLock, releaseLock };
