import * as svc from '../services/booking.service.js';
import { etagFrom, setCacheHeaders, requestIsFresh } from '../utils/httpCache.js';

export async function createBookingCtrl(req, res) {
  const { listingId, checkIn, checkOut, guestsCount } = req.body;
  const data = await svc.bookListing({
    listingId,
    guestId: req.user.id,
    checkIn,
    checkOut,
    guestsCount,
  });
  res.status(201).json(data);
}
export async function listMyBookingsCtrl(req, res) {
  const data = await svc.listMyBookings(req.user.id, req.query);
  const { items = [], page, limit, total } = data || {};
  const signature = [req.user.id, total, page, limit, ...items.map(i => `${i._id || i.id}:${i.updatedAt || ''}`)].join('|');
  const etag = etagFrom(signature);
  res.set('Cache-Control', 'private, max-age=0, must-revalidate');
  res.set('ETag', etag);
  if (requestIsFresh(req, res)) return res.status(304).end();
  res.json(data);
}

export async function cancelMyBookingCtrl(req, res) {
  const data = await svc.cancelBooking(req.params.id, req.user.id, req.body?.reason);
  res.json(data);
}
