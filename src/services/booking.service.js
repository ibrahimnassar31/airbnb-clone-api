import { findListingById } from '../repositories/listing.repository.js';
import { createBooking, findBookingsByGuest,findBookingById, hasOverlap } from '../repositories/booking.repository.js';
import { StatusCodes } from 'http-status-codes';
import { invalidateCache } from '../middlewares/cacheMiddleware.js';

function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.ceil(ms / (1000*60*60*24));
}

export async function bookListing({ listingId, guestId, checkIn, checkOut, guestsCount }) {
  const listing = await findListingById(listingId);
  if (!listing || !listing.isActive) { const e = new Error('Listing not found'); e.status = 404; throw e; }

  if (listing.host.toString() === guestId) {
    const e = new Error('Hosts cannot book their own listings.');
    e.status = 403;
    throw e;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!(start < end)) { const e = new Error('Invalid date range'); e.status = 400; throw e; }
  if (guestsCount > listing.maxGuests) { const e = new Error('Too many guests'); e.status = 400; throw e; }

  const overlap = await hasOverlap(listingId, start, end);
  if (overlap) { const e = new Error('Dates not available'); e.status = 409; throw e; }

  const nights = nightsBetween(start, end);
  const totalPrice = nights * listing.pricePerNight;

  const booking = await createBooking({ listing: listing.id, guest: guestId, checkIn: start, checkOut: end, guestsCount, totalPrice, status: 'confirmed' });
  await invalidateCache('booking:');
  return booking.toJSON();
}

export async function listMyBookings(guestId, { page=1, limit=20 }={}) {
  const { items, total } = await findBookingsByGuest(guestId, { page, limit });
  // Attach user's review for each booking
  const Review = (await import('../models/review.model.js')).default;
  const itemsWithReview = await Promise.all(items.map(async (booking) => {
    const review = await Review.findOne({ booking: booking._id, author: guestId }).lean();
    return { ...booking, myReview: review || null };
  }));
  return { items: itemsWithReview, total, page, limit };
}


function computeRefund(checkIn, totalPrice, now = new Date()) {
  const ms = new Date(checkIn) - now;
  const days = ms / (1000*60*60*24);
  if (days >= 7) return totalPrice;           
  if (days >= 3) return Math.round(totalPrice * 0.5); 
  return 0;                                   
}
export async function cancelBooking(bookingId, guestId, reason) {
  const booking = await findBookingById(bookingId);
  if (!booking) { const e = new Error('Booking not found'); e.status = 404; throw e; }
  if (booking.guest.toString() !== guestId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
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

