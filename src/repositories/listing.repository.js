import Listing from '../models/listing.model.js';

export async function createListing(data) { return Listing.create(data); }
export async function findListingById(id) { return Listing.findById(id); }
export async function updateListing(id, data) { return Listing.findByIdAndUpdate(id, data, { new: true }); }
export async function deleteListing(id) { return Listing.findByIdAndDelete(id); }

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isNonEmpty = (v) => v !== undefined && v !== null && !(typeof v === 'string' && v.trim() === '');

export async function searchListings(rawParams = {}) {
  const {
    city, country, street, title, description, amenities,
    minPrice, maxPrice, guests, bedrooms, bathrooms,
    q, caseSensitive = false,
    sort = 'newest', page = 1, limit = 20,
  } = rawParams;

  const MAX_LIMIT = 100;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || 20));

  const num = (x) => (x === '' || x === null || x === undefined ? undefined : Number(x));

  const filter = { isActive: true };
  const rx = (v) => (caseSensitive ? { $regex: escapeRegex(String(v)) } : { $regex: escapeRegex(String(v)), $options: 'i' });

  if (isNonEmpty(city))        filter['address.city']    = rx(city);
  if (isNonEmpty(country))     filter['address.country'] = rx(country);
  if (isNonEmpty(street))      filter['address.street']  = rx(street);
  if (isNonEmpty(title))       filter.title              = rx(title);
  if (isNonEmpty(description)) filter.description        = rx(description);

  if (isNonEmpty(guests))    filter.maxGuests   = { $gte: num(guests) };
  if (isNonEmpty(bedrooms))  filter.bedrooms    = { $gte: num(bedrooms) };
  if (isNonEmpty(bathrooms)) filter.bathrooms   = { $gte: num(bathrooms) };

  const minP = num(minPrice), maxP = num(maxPrice);
  if (minP !== undefined || maxP !== undefined) {
    filter.pricePerNight = {};
    if (minP !== undefined) filter.pricePerNight.$gte = minP;
    if (maxP !== undefined) filter.pricePerNight.$lte = maxP;
    if (Object.keys(filter.pricePerNight).length === 0) delete filter.pricePerNight;
  }

  if (isNonEmpty(amenities)) {
    const arr = Array.isArray(amenities)
      ? amenities
      : String(amenities).split(',').map((a) => a.trim());
    const list = arr.filter(isNonEmpty);
    if (list.length) filter.amenities = { $all: list };
  }

  let projection = undefined;
  if (isNonEmpty(q)) {
    if (!caseSensitive) {
      filter.$text = { $search: String(q) };
      projection = { score: { $meta: 'textScore' } };
    } else {
      const rxQ = caseSensitive ? new RegExp(escapeRegex(String(q))) : new RegExp(escapeRegex(String(q)), 'i');
      filter.$or = [
        { title: rxQ },
        { description: rxQ },
        { 'address.city': rxQ },
        { 'address.country': rxQ },
        { 'address.street': rxQ },
        { amenities: rxQ },
      ];
    }
  }

  const sortMap = {
    priceAsc:  { pricePerNight: 1 },
    priceDesc: { pricePerNight: -1 },
    ratingDesc:{ averageRating: -1, reviewCount: -1 },
    newest:    { createdAt: -1 },
  };
  let sortStage = sortMap[sort] || { createdAt: -1 };
  if (filter.$text) sortStage = { score: { $meta: 'textScore' }, ...sortStage };

  const baseQuery = Listing.find(filter, projection);
  const total = await Listing.countDocuments(filter);
  const items = await baseQuery
    .sort(sortStage)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  return { items, total, page: pageNum, limit: limitNum, sort };
}
