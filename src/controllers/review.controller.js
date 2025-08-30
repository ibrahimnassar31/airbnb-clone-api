import * as svc from '../services/review.service.js';

export async function createReviewForBookingCtrl(req, res) {
  const { bookingId, rating, comment } = req.body;
  const data = await svc.createReviewForBooking(req.user.id, bookingId, rating, comment);
  res.status(201).json(data);
}

export async function deleteReviewForBookingCtrl(req, res) {
  const out = await svc.deleteReviewByAuthor(req.params.bookingId, req.user.id);
  res.json(out);
}
