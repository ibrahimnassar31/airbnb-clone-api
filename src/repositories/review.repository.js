import Review from '../models/review.model.js';
import mongoose from 'mongoose';

export async function createReview(data) {
  const reviewData = {
    ...data,
    listing: mongoose.Types.ObjectId.isValid(data.listing) ? new mongoose.Types.ObjectId(data.listing) : data.listing,
    author: mongoose.Types.ObjectId.isValid(data.author) ? new mongoose.Types.ObjectId(data.author) : data.author,
  };
  return Review.create(reviewData);
}

export async function listReviewsForListing(listingId, { page = 1, limit = 20 } = {}) {
  const filter = { listing: listingId };
  const total = await Review.countDocuments(filter);
  const items = await Review.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { items, total, page, limit };
}

export async function deleteReviewByAuthor(listingId, authorId) {
  if (!listingId || !authorId) return null;
  const listingObjId = mongoose.Types.ObjectId.isValid(listingId) ? new mongoose.Types.ObjectId(listingId) : listingId;
  const authorObjId = mongoose.Types.ObjectId.isValid(authorId) ? new mongoose.Types.ObjectId(authorId) : authorId;
  return await Review.findOneAndDelete({ listing: listingObjId, author: authorObjId });
}

export default { createReview, listReviewsForListing, deleteReviewByAuthor };

