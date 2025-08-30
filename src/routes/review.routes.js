import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { reviewLimiter } from '../middlewares/rateLimitMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { reviewCreateForBookingSchema, reviewDeleteForBookingParams } from '../validation/validationSchemas.js';
import { createReviewForBookingCtrl, deleteReviewForBookingCtrl } from '../controllers/review.controller.js';

const router = Router();

router.post('/booking', requireAuth, reviewLimiter, validate(reviewCreateForBookingSchema), createReviewForBookingCtrl);
router.delete('/booking/:bookingId', requireAuth, reviewLimiter, validate(reviewDeleteForBookingParams, 'params'), deleteReviewForBookingCtrl);

export default router;
