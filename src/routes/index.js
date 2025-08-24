import { Router } from 'express';
import authRoutes from './auth.routes.js';
import listingRoutes from './listing.routes.js';
import bookingRoutes from './booking.routes.js';
import reviewRoutes from './review.routes.js';
import uploadsRoutes from './uploads.routes.js';
import uploadsCloudRoutes from './uploads.cloud.routes.js';

const router = Router();

router.get('/healthz', (req, res) => res.json({ ok: true, uptime: process.uptime(), env: process.env.NODE_ENV }));
router.get('/', (req, res) => res.json({ message: 'Airbnb Clone API' }));

router.use('/api/auth', authRoutes);
router.use('/api/listings', listingRoutes);
router.use('/api/bookings', bookingRoutes);
router.use('/api/reviews', reviewRoutes);
router.use('/api/uploads', uploadsRoutes);
router.use('/api/uploads', uploadsCloudRoutes);

export default router;
