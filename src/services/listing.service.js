import { createListing, findListingById, updateListing, deleteListing, searchListings } from '../repositories/listing.repository.js';
import { invalidateCache } from '../middlewares/cacheMiddleware.js';
import ApiError from '../utils/ApiError.js';
import { toListingDTO } from '../transformers/listing.dto.js';

export async function createNewListing(data, hostId) {
  const createdListing = await createListing({ ...data, host: hostId });
  await invalidateCache('listing:');
  return createdListing.toJSON();
}

export async function updateExistingListing(listingId, userId, patch) {
  const foundListing = await findListingById(listingId);
  if (!foundListing) throw ApiError.notFound('Listing not found');
  if (foundListing.host.toString() !== userId) throw ApiError.forbidden('Forbidden');
  const updated = await updateListing(listingId, patch);
  await invalidateCache('listing:');
  return updated?.toJSON();
}

export async function removeListing(listingId, userId) {
  const listingToDelete = await findListingById(listingId);
  if (!listingToDelete) throw ApiError.notFound('Listing not found');
  if (listingToDelete.host.toString() !== userId) throw ApiError.forbidden('Forbidden');
  await deleteListing(listingId);
  await invalidateCache('listing:');
  return { deleted: true };
}

export async function getListing(listingId) {
  const listing = await findListingById(listingId);
  if (!listing || !listing.isActive) throw ApiError.notFound('Listing not found');
  return listing.toJSON();
}

export async function searchPublic(params) {
  const res = await searchListings(params);
  return { ...res, items: res.items.map(toListingDTO) };
}
