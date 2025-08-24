import { Router } from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import { bookingCreateSchema } from '../validation/validationSchemas.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createBookingCtrl, listMyBookingsCtrl } from '../controllers/booking.controller.js';
import { cancelMyBookingCtrl } from '../controllers/booking.controller.js';

const router = Router();

router.post('/', requireAuth, validate(bookingCreateSchema), createBookingCtrl);
router.get('/me', requireAuth, listMyBookingsCtrl);
router.post('/:id/cancel', requireAuth, cancelMyBookingCtrl);

export default router;
