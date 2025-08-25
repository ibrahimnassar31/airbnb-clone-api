import { findBookingById } from '../repositories/booking.repository.js';
import { findListingById } from '../repositories/listing.repository.js';
import Review from '../models/review.model.js';
import Listing from '../models/listing.model.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { invalidateCache } from '../middlewares/cacheMiddleware.js';

export async function createReviewForBooking(guestId, bookingId, rating, comment) {
  logger.info('Attempting to create review for booking', { guestId, bookingId, rating, comment });

  const booking = await findBookingById(bookingId);
  if (!booking) { const e = new Error('Booking not found'); e.status = 404; throw e; }
  if (booking.status !== 'confirmed') { const e = new Error('Booking not confirmed'); e.status = 403; throw e; }
  if (booking.checkOut >= new Date()) { const e = new Error('Booking has not ended'); e.status = 403; throw e; }
  if (booking.guest.toString() !== guestId) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  const listing = await findListingById(booking.listing);
  if (!listing) { const e = new Error('Listing not found'); e.status = 404; throw e; }

  const exists = await Review.exists({ booking: bookingId, author: guestId });
  if (exists) { const e = new Error('Review already exists for this booking'); e.status = 409; throw e; }

  const review = await Review.create({
    booking: booking._id,
    listing: listing._id,
    host: listing.host,
    author: guestId,
    rating,
    comment,
  });

  await updateListingStats(listing._id);
  await invalidateCache('review:');

  logger.info('Review created successfully', { review });
  return review.toJSON();
}

async function updateListingStats(listingId) {
  const stats = await Review.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(listingId) } },
    { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
  ]);
  const count = stats[0]?.count ?? 0;
  const avg = stats[0]?.avg ?? 0;
  await Listing.updateOne(
    { _id: listingId },
    { $set: { reviewCount: count, averageRating: avg } }
  ).exec();
}

export async function deleteReviewByAuthor(bookingId, guestId) {
  logger.info('Attempting to delete review for booking', { guestId, bookingId });
  const deleted = await Review.findOneAndDelete({ booking: bookingId, author: guestId });
  if (!deleted) { const e = new Error('Review not found for this booking and user'); e.status = 404; throw e; }
  await updateListingStats(deleted.listing);
  await invalidateCache('review:');
  logger.info('Review deleted successfully', { guestId, bookingId });
  return { deleted: true };
}

export async function listListingReviews(listingId, { page=1, limit=20 }={}) {
  return listReviewsForListing(listingId, { page, limit });
}

export async function deleteMyReview(guestId, listingId) {
  logger.info('Attempting to delete review', { guestId, listingId });
  const deleted = await deleteReviewByAuthor(listingId, guestId);
  if (!deleted) {
    logger.error('Review not found for deletion', { listingId, guestId });
    const e = new Error(`Review not found for listingId=${listingId} and guestId=${guestId}`); e.status = 404; throw e;
  }

  const listingObjId = new mongoose.Types.ObjectId(listingId);
  const stats = await Review.aggregate([
    { $match: { listing: listingObjId } },
    { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
  ]);
  const count = stats[0]?.count ?? 0;
  const avg   = stats[0]?.avg ?? 0;

  await Listing.updateOne(
    { _id: listingObjId },
    { $set: { reviewCount: count, averageRating: avg } }
  ).exec();

  logger.info('Review deleted successfully', { guestId, listingId });
  return { deleted: true };
}