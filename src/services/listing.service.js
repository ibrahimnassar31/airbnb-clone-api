import { createListing, findListingById, updateListing, deleteListing, searchListings } from '../repositories/listing.repository.js';
import { StatusCodes } from 'http-status-codes';
import { invalidateCache } from '../middlewares/cacheMiddleware.js';

export async function createNewListing(data, hostId) {
  const createdListing = await createListing({ ...data, host: hostId });
  await invalidateCache('listing:');
  return createdListing.toJSON();
}

export async function updateExistingListing(listingId, userId, patch) {
  const foundListing = await findListingById(listingId);
  if (!foundListing) { const e = new Error('Listing not found'); e.status = 404; throw e; }
  if (foundListing.host.toString() !== userId && patch !== null) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  const updated = await updateListing(listingId, patch);
  await invalidateCache('listing:');
  return updated?.toJSON();
}

export async function removeListing(listingId, userId) {
  const listingToDelete = await findListingById(listingId);
  if (!listingToDelete) { const e = new Error('Listing not found'); e.status = 404; throw e; }
  if (listingToDelete.host.toString() !== userId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  await deleteListing(listingId);
  await invalidateCache('listing:');
  return { deleted: true };
}

export async function getListing(listingId) {
  const listing = await findListingById(listingId);
  if (!listing || !listing.isActive) { const e = new Error('Listing not found'); e.status = 404; throw e; }
  return listing.toJSON();
}

export async function searchPublic(params) {
  return searchListings(params);
}
