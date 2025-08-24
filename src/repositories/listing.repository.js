import Listing from '../models/listing.model.js';

export async function createListing(data) { return Listing.create(data); }
export async function findListingById(id) { return Listing.findById(id); }
export async function updateListing(id, data) { return Listing.findByIdAndUpdate(id, data, { new: true }); }
export async function deleteListing(id) { return Listing.findByIdAndDelete(id); }

export async function searchListings({ city, minPrice, maxPrice, guests, q, page=1, limit=20 }) {
  const filter = { isActive: true };
  if (city) filter['address.city'] = city;
  if (guests) filter.maxGuests = { $gte: guests };
  if (minPrice != null || maxPrice != null) {
    filter.pricePerNight = {};
    if (minPrice != null) filter.pricePerNight.$gte = minPrice;
    if (maxPrice != null) filter.pricePerNight.$lte = maxPrice;
  }
  let query = Listing.find(filter);
  if (q) query = query.find({ $text: { $search: q } });
  const total = await Listing.countDocuments(query.getFilter());
  const items = await query.sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean();
  return { items, total, page, limit };
}
