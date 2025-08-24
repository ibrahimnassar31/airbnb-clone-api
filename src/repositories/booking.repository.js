import Booking from '../models/booking.model.js';
import mongoose from 'mongoose';

export async function createBooking(data) { return Booking.create(data); }
export async function findBookingById(id) { return Booking.findById(id); }
export async function findBookingsByGuest(guestId, { page=1, limit=20 }={}) {
  const q = Booking.find({ guest: guestId }).sort({ createdAt: -1 });
  const total = await Booking.countDocuments({ guest: guestId });
  const items = await q.skip((page-1)*limit).limit(limit).lean();
  return { items, total, page, limit };
}

export async function hasOverlap(listingId, checkIn, checkOut) {
  // Overlap: A.start < B.end && B.start < A.end
  const exists = await Booking.exists({
    listing: new mongoose.Types.ObjectId(listingId),
    status: { $ne: 'cancelled' },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
  return !!exists;
}
