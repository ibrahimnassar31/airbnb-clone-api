import { createListing, findListingById, updateListing, deleteListing, searchListings } from '../repositories/listing.repository.js';
import { StatusCodes } from 'http-status-codes';

export async function createListingForHost(hostId, data) {
  const listing = await createListing({ ...data, host: hostId });
  return listing.toJSON();
}

export async function updateListingByOwner(userId, listingId, patch) {
  const listing = await findListingById(listingId);
  if (!listing) { const e = new Error('Listing not found'); e.status = 404; throw e; }
  if (listing.host.toString() !== userId && patch !== null) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  const updated = await updateListing(listingId, patch);
  return updated?.toJSON();
}

export async function deleteListingByOwner(userId, listingId) {
  const listing = await findListingById(listingId);
  if (!listing) { const e = new Error('Listing not found'); e.status = 404; throw e; }
  if (listing.host.toString() !== userId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  await deleteListing(listingId);
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
