import { findListingById } from '../repositories/listing.repository.js';
import { createBooking, findBookingsByGuest, findBookingById, hasOverlap } from '../repositories/booking.repository.js';
import { invalidateCache } from '../middlewares/cacheMiddleware.js';
import ApiError from '../utils/ApiError.js';
import { acquireLock, releaseLock } from '../utils/lock.js';

function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.ceil(ms / (1000*60*60*24));
}

export async function bookListing({ listingId, guestId, checkIn, checkOut, guestsCount }) {
  const listing = await findListingById(listingId);
  if (!listing || !listing.isActive) throw ApiError.notFound('Listing not found');

  if (listing.host.toString() === guestId) throw ApiError.forbidden('Hosts cannot book their own listings.');

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!(start < end)) throw ApiError.badRequest('Invalid date range');
  if (guestsCount > listing.maxGuests) throw ApiError.badRequest('Too many guests');

  const lockKey = `lock:listing-book:${listingId}`;
  const lock = await acquireLock(lockKey, { ttlMs: 3000, waitMs: 4000, retryDelayMs: 150 });
  if (!lock) throw ApiError.conflict('Concurrent booking in progress. Please retry.');
  try {
    const overlap = await hasOverlap(listingId, start, end);
    if (overlap) throw ApiError.conflict('Dates not available');

    const nights = nightsBetween(start, end);
    const totalPrice = nights * listing.pricePerNight;

    const booking = await createBooking({ listing: listing.id, guest: guestId, checkIn: start, checkOut: end, guestsCount, totalPrice, status: 'confirmed' });
    await invalidateCache('booking:');
    return booking.toJSON();
  } finally {
    await releaseLock(lockKey, lock.token);
  }
}

export async function listMyBookings(guestId, { page=1, limit=20 }={}) {
  const { items, total } = await findBookingsByGuest(guestId, { page, limit });
  const Review = (await import('../models/review.model.js')).default;
  const bookingIds = items.map((b) => b._id ?? b.id).filter(Boolean);
  const reviews = await Review.find({ booking: { $in: bookingIds }, author: guestId }).lean();
  const reviewByBooking = new Map(reviews.map((r) => [String(r.booking), r]));
  const itemsWithReview = items.map((booking) => ({
    ...booking,
    myReview: reviewByBooking.get(String(booking._id ?? booking.id)) || null,
  }));
  return { items: itemsWithReview, total, page, limit };
}


export function computeRefund(checkIn, totalPrice, now = new Date()) {
  const ms = new Date(checkIn) - now;
  const days = ms / (1000*60*60*24);
  if (days >= 7) return totalPrice;           
  if (days >= 3) return Math.round(totalPrice * 0.5); 
  return 0;                                   
}
export async function cancelBooking(bookingId, guestId, reason) {
  const booking = await findBookingById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.guest.toString() !== guestId) throw ApiError.forbidden('Forbidden');
  if (booking.status === 'cancelled') return booking.toJSON();

  const refund = computeRefund(booking.checkIn, booking.totalPrice);
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = guestId;
  booking.cancelReason = reason;
  booking.refundAmount = refund;
  await booking.save();
  await invalidateCache('booking:');

  return booking.toJSON();
}

