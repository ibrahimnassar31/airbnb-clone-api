import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import redisClient from '../utils/redisClient.js';
import authRoutes from './auth.routes.js';
import listingRoutes from './listing.routes.js';
import bookingRoutes from './booking.routes.js';
import reviewRoutes from './review.routes.js';
import uploadsRoutes from './uploads.routes.js';
import uploadsCloudRoutes from './uploads.cloud.routes.js';

const router = Router();

router.get('/healthz', async (_req, res) => {
  let db = { status: 'unknown', state: undefined };
  try {
    const state = mongoose.connection.readyState;
    db = { status: state === 1 ? 'up' : 'down', state };
  } catch {  }

  let redis = { status: 'unknown' };
  try {
    const pong = await Promise.race([
      redisClient.ping(),
      new Promise((resolve) => setTimeout(() => resolve(null), 250)),
    ]);
    redis = { status: pong ? 'up' : 'down' };
  } catch {
    redis = { status: 'down' };
  }

  res.json({
    ok: true,
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    version: env.appVersion || process.env.npm_package_version || undefined,
    commit: env.gitSha || undefined,
    db,
    redis,
  });
});
router.get('/', (req, res) => res.json({ message: 'Airbnb Clone API' }));

router.use('/api/auth', authRoutes);
router.use('/api/listings', listingRoutes);
router.use('/api/bookings', bookingRoutes);
router.use('/api/reviews', reviewRoutes);
router.use('/api/uploads', uploadsRoutes);
router.use('/api/uploads', uploadsCloudRoutes);

export default router;
