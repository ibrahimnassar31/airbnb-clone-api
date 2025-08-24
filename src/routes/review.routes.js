import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createReviewForBookingCtrl, deleteReviewForBookingCtrl } from '../controllers/review.controller.js';

const router = Router();

router.post('/booking', requireAuth, createReviewForBookingCtrl);
router.delete('/booking/:bookingId', requireAuth, deleteReviewForBookingCtrl);

export default router;
