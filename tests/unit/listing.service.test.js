import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../src/repositories/listing.repository.js', () => ({
  createListing: vi.fn(),
  findListingById: vi.fn(),
  updateListing: vi.fn(),
  deleteListing: vi.fn(),
  searchListings: vi.fn(),
}));
vi.mock('../../src/middlewares/cacheMiddleware.js', () => ({
  invalidateCache: vi.fn(),
}));

import * as svc from '../../src/services/listing.service.js';
import * as repo from '../../src/repositories/listing.repository.js';
import { invalidateCache } from '../../src/middlewares/cacheMiddleware.js';

function makeDoc(obj) { return { toJSON: () => obj, ...obj }; }

describe('Listing Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createNewListing appends host and invalidates cache', async () => {
    const created = makeDoc({ id: 'L1', title: 't', host: 'H1' });
    repo.createListing.mockResolvedValue(created);

    const out = await svc.createNewListing({ title: 't' }, 'H1');
    expect(repo.createListing).toHaveBeenCalledWith({ title: 't', host: 'H1' });
    expect(out).toEqual(created.toJSON());
    expect(invalidateCache).toHaveBeenCalledWith('listing:');
  });

  it('updateExistingListing updates when owner matches, forbids otherwise', async () => {
    repo.findListingById.mockResolvedValue({ id: 'L1', host: { toString: () => 'H1' } });
    const updated = makeDoc({ id: 'L1', title: 'new' });
    repo.updateListing.mockResolvedValue(updated);

    const ok = await svc.updateExistingListing('L1', 'H1', { title: 'new' });
    expect(ok).toEqual(updated.toJSON());
    expect(invalidateCache).toHaveBeenCalledWith('listing:');

    // forbidden
    repo.findListingById.mockResolvedValue({ id: 'L1', host: { toString: () => 'OTHER' } });
    await expect(svc.updateExistingListing('L1', 'H1', { title: 'x' })).rejects.toMatchObject({ status: 403 });
  });

  it('updateExistingListing 404 when not found', async () => {
    repo.findListingById.mockResolvedValue(null);
    await expect(svc.updateExistingListing('X', 'H1', {})).rejects.toMatchObject({ status: 404 });
  });

  it('removeListing deletes for owner, forbids others, 404 when not found', async () => {
    repo.findListingById.mockResolvedValue({ id: 'L1', host: { toString: () => 'H1' } });
    const out = await svc.removeListing('L1', 'H1');
    expect(out).toEqual({ deleted: true });
    expect(repo.deleteListing).toHaveBeenCalledWith('L1');
    expect(invalidateCache).toHaveBeenCalledWith('listing:');

    repo.findListingById.mockResolvedValue({ id: 'L1', host: { toString: () => 'OTHER' } });
    await expect(svc.removeListing('L1', 'H1')).rejects.toMatchObject({ status: 403 });

    repo.findListingById.mockResolvedValue(null);
    await expect(svc.removeListing('X', 'H1')).rejects.toMatchObject({ status: 404 });
  });

  it('getListing returns only active listings, else 404', async () => {
    repo.findListingById.mockResolvedValue(makeDoc({ id: 'L', isActive: true }));
    const ok = await svc.getListing('L');
    expect(ok).toEqual({ id: 'L', isActive: true });

    repo.findListingById.mockResolvedValue(makeDoc({ id: 'L', isActive: false }));
    await expect(svc.getListing('L')).rejects.toMatchObject({ status: 404 });
  });

  it('searchPublic passes params through', async () => {
    repo.searchListings.mockResolvedValue({ items: [], total: 0 });
    const out = await svc.searchPublic({ city: 'LA' });
    expect(repo.searchListings).toHaveBeenCalledWith({ city: 'LA' });
    expect(out).toEqual({ items: [], total: 0 });
  });
});
