import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let client;
let connected = false;

try {
  client = createClient({ url: redisUrl });
  client.on('error', err => console.error('Redis Client Error', err));
  await client.connect();
  connected = true;
} catch (err) {
  console.warn('Redis unavailable, falling back to no-op cache:', err?.message ?? err);
}

const noopAsync = async () => null;
const noopIter = async function* () { };

const redisClient = connected ? client : {
  get: noopAsync,
  set: async () => null,
  setEx: noopAsync,
  eval: async () => 0,
  del: async () => 0,
  ttl: async () => -1,
  keys: async () => [],
  scanIterator: noopIter,
  ping: async () => 'PONG',
  quit: async () => undefined,
};

export default redisClient;
