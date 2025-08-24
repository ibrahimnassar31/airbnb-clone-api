import * as svc from '../services/booking.service.js';

export async function createBookingCtrl(req, res) {
  const data = await svc.createBookingForGuest(req.user.id, req.body);
  res.status(201).json(data);
}
export async function listMyBookingsCtrl(req, res) {
  const data = await svc.listMyBookings(req.user.id, req.query);
  res.json(data);
}

export async function cancelMyBookingCtrl(req, res) {
  const data = await svc.cancelMyBooking(req.user.id, req.params.id, { reason: req.body?.reason });
  res.json(data);
}
