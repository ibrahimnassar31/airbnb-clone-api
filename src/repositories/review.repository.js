import Listing from '../models/listing.model.js';
import Review from '../models/review.model.js';
import mongoose from 'mongoose';

export async function searchListings(params) {
  const {
    city, minPrice, maxPrice, guests, q, amenities, sort,
    near, radiusKm, page=1, limit=20,
  } = params;

  const filter = { isActive: true };
  if (city) filter['address.city'] = city;
  if (guests) filter.maxGuests = { $gte: guests };
  if (minPrice != null || maxPrice != null) {
    filter.pricePerNight = {};
    if (minPrice != null) filter.pricePerNight.$gte = minPrice;
    if (maxPrice != null) filter.pricePerNight.$lte = maxPrice;
  }
  if (amenities && Array.isArray(amenities)) {
    filter.amenities = { $all: amenities };
  }

  // ترتيب
  const sortMap = {
    priceAsc: { pricePerNight: 1 },
    priceDesc: { pricePerNight: -1 },
    ratingDesc: { averageRating: -1, reviewCount: -1 },
    newest: { createdAt: -1 },
  };
  const sortStage = sortMap[sort] || { createdAt: -1 };

  // Geo
  const pipeline = [];
  if (near && radiusKm) {
    const [latStr, lngStr] = near.split(',');
    const lat = Number(latStr), lng = Number(lngStr);
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        spherical: true,
        maxDistance: radiusKm * 1000,
        key: 'location',
        query: filter,
      }
    });
    if (q) pipeline.push({ $match: { $text: { $search: q } } });
    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: (page-1)*limit }, { $limit: limit });

    const items = await Listing.aggregate(pipeline);
    // total تقريب تقريبي: نجري عدّ بنفس شروط البحث دون pagination
    const countPipeline = pipeline.filter(s => !('$skip' in s || '$limit' in s)).concat([{ $count: 'cnt' }]);
    const countRes = await Listing.aggregate(countPipeline);
    const total = countRes[0]?.cnt || 0;
    return { items, total, page, limit };
  }

  // بدون Geo: find عادي
  let query = Listing.find(filter);
  if (q) query = query.find({ $text: { $search: q } });
  const total = await Listing.countDocuments(query.getFilter());
  const items = await query.sort(sortStage).skip((page-1)*limit).limit(limit).lean();
  return { items, total, page, limit };
}

// Create a new review
export async function createReview(data) {
  // Ensure listing and author are ObjectId
  const reviewData = {
    ...data,
    listing: mongoose.Types.ObjectId.isValid(data.listing) ? new mongoose.Types.ObjectId(data.listing) : data.listing,
    author: mongoose.Types.ObjectId.isValid(data.author) ? new mongoose.Types.ObjectId(data.author) : data.author,
  };
  return Review.create(reviewData);
}

// List reviews for a specific listing
export async function listReviewsForListing(listingId, { page=1, limit=20 }={}) {
  const filter = { listing: listingId };
  const total = await Review.countDocuments(filter);
  const items = await Review.find(filter)
    .sort({ createdAt: -1 })
    .skip((page-1)*limit)
    .limit(limit)
    .lean();
  return { items, total, page, limit };
}
// Delete a review by its author
export async function deleteReviewByAuthor(listingId, authorId) {
  if (!listingId || !authorId) return null;
  const listingObjId = mongoose.Types.ObjectId.isValid(listingId) ? new mongoose.Types.ObjectId(listingId) : listingId;
  const authorObjId  = mongoose.Types.ObjectId.isValid(authorId)  ? new mongoose.Types.ObjectId(authorId)  : authorId;
  return await Review.findOneAndDelete({ listing: listingObjId, author: authorObjId });
}