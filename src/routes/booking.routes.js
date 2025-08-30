import { Router } from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import { bookingCreateSchema, bookingCancelParams, bookingCancelBody } from '../validation/validationSchemas.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createBookingCtrl, listMyBookingsCtrl } from '../controllers/booking.controller.js';
import { cancelMyBookingCtrl } from '../controllers/booking.controller.js';
import { bookingLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = Router();

router.post('/', requireAuth, bookingLimiter, validate(bookingCreateSchema), createBookingCtrl);
router.get('/me', requireAuth, listMyBookingsCtrl);
router.post('/:id/cancel', requireAuth, bookingLimiter, validate(bookingCancelParams, 'params'), validate(bookingCancelBody), cancelMyBookingCtrl);

export default router;
