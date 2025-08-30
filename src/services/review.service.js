import { findBookingById } from '../repositories/booking.repository.js';
import { findListingById } from '../repositories/listing.repository.js';
import { listReviewsForListing as repoListReviewsForListing } from '../repositories/review.repository.js';
import Review from '../models/review.model.js';
import Listing from '../models/listing.model.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { invalidateCache } from '../middlewares/cacheMiddleware.js';
import ApiError from '../utils/ApiError.js';

export async function createReviewForBooking(guestId, bookingId, rating, comment) {
  logger.info('Attempting to create review for booking', { guestId, bookingId, rating, comment });

  const booking = await findBookingById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status !== 'confirmed') throw ApiError.forbidden('Booking not confirmed');
  if (booking.checkOut >= new Date()) throw ApiError.forbidden('Booking has not ended');
  if (booking.guest.toString() !== guestId) throw ApiError.forbidden('Forbidden');

  const listing = await findListingById(booking.listing);
  if (!listing) throw ApiError.notFound('Listing not found');

  const exists = await Review.exists({ booking: bookingId, author: guestId });
  if (exists) throw ApiError.conflict('Review already exists for this booking');

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
  await invalidateCache('listing:');

  logger.info('Review created successfully', { review });
  return review.toJSON();
}

async function updateListingStats(listingId) {
  const idMatch = mongoose.Types.ObjectId.isValid(listingId)
    ? new mongoose.Types.ObjectId(listingId)
    : listingId;
  const stats = await Review.aggregate([
    { $match: { listing: idMatch } },
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
  if (!deleted) throw ApiError.notFound('Review not found for this booking and user');
  await updateListingStats(deleted.listing);
  await invalidateCache('review:');
  await invalidateCache('listing:');
  logger.info('Review deleted successfully', { guestId, bookingId });
  return { deleted: true };
}

export async function listListingReviews(listingId, { page=1, limit=20 }={}) {
  return repoListReviewsForListing(listingId, { page, limit });
}

export async function deleteMyReview(guestId, listingId) {
  logger.info('Attempting to delete review by listing', { guestId, listingId });
  const deleted = await Review.findOneAndDelete({ listing: listingId, author: guestId });
  if (!deleted) {
    logger.error('Review not found for deletion', { listingId, guestId });
    throw ApiError.notFound(`Review not found for listingId=${listingId} and guestId=${guestId}`);
  }

  await updateListingStats(deleted.listing);
  await invalidateCache('review:');
  await invalidateCache('listing:');
  logger.info('Review deleted successfully', { guestId, listingId });
  return { deleted: true };
}
