import * as svc from '../services/review.service.js';

export async function createReviewForBookingCtrl(req, res) {
  const data = await svc.createReviewForBooking(req.user.id, req.body);
  res.status(201).json(data);
}

export async function deleteReviewForBookingCtrl(req, res) {
  const out = await svc.deleteReviewForBooking(req.user.id, req.params.bookingId);
  res.json(out);
}