import { describe, it, beforeEach, expect, vi } from 'vitest';

// Build a chainable Query mock for Listing.find(...)
function makeFindChain(items = []) {
  const chain = {
    sortArg: undefined,
    sort: vi.fn(function(arg) { chain.sortArg = arg; return chain; }),
    skip: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    lean: vi.fn(async () => items),
  };
  return chain;
}

// Use hoisted mock variable so vi.mock can reference it safely
const mockListing = vi.hoisted(() => ({
  find: vi.fn(),
  countDocuments: vi.fn(),
  aggregate: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../../src/models/listing.model.js', () => ({ default: mockListing }));

import * as repo from '../../src/repositories/listing.repository.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listing.repository searchListings', () => {
  it('builds filter for city/price/guests/amenities and sorts newest', async () => {
    const items = [{ _id: '1' }];
    mockListing.find.mockReturnValue(makeFindChain(items));
    mockListing.countDocuments.mockResolvedValue(1);

    const out = await repo.searchListings({ city: 'Los Angeles', minPrice: 100, maxPrice: 300, guests: 3, amenities: 'wifi,pool', page: 1, limit: 10 });

    expect(mockListing.find).toHaveBeenCalledTimes(1);
    const [filter, projection] = mockListing.find.mock.calls[0];
    expect(filter.isActive).toBe(true);
    expect(filter['address.city']).toBeDefined(); // regex
    expect(filter.pricePerNight.$gte).toBe(100);
    expect(filter.pricePerNight.$lte).toBe(300);
    expect(filter.maxGuests.$gte).toBe(3);
    expect(filter.amenities.$all).toEqual(['wifi','pool']);
    expect(projection).toBeUndefined();

    // Sort newest by default
    const chain = mockListing.find.mock.results[0].value;
    expect(chain.sort).toHaveBeenCalled();
    expect(chain.sortArg).toEqual({ createdAt: -1 });

    expect(out.items).toEqual(items);
    expect(out.total).toBe(1);
    expect(out.page).toBe(1);
    expect(out.limit).toBe(10);
  });

  it('applies $text search with projection and score sort when q provided', async () => {
    mockListing.find.mockReturnValue(makeFindChain([]));
    mockListing.countDocuments.mockResolvedValue(0);

    await repo.searchListings({ q: 'beach', sort: 'priceDesc' });

    const [filter, projection] = mockListing.find.mock.calls[0];
    expect(filter.$text).toEqual({ $search: 'beach' });
    expect(projection).toEqual({ score: { $meta: 'textScore' } });

    const chain = mockListing.find.mock.results[0].value;
    expect(chain.sortArg).toEqual({ score: { $meta: 'textScore' }, pricePerNight: -1 });
  });

  it('uses aggregate with $geoNear for near/radiusKm', async () => {
    const items = [{ _id: 'sf' }];
    mockListing.aggregate
      .mockResolvedValueOnce(items) 
      .mockResolvedValueOnce([{ cnt: 1 }]);

    const out = await repo.searchListings({ near: '37.7749,-122.4194', radiusKm: 5, q: 'loft' });
    expect(mockListing.aggregate).toHaveBeenCalledTimes(2);
    const firstPipeline = mockListing.aggregate.mock.calls[0][0];
    const geo = firstPipeline.find(s => s.$geoNear)?.$geoNear;
    expect(geo).toBeDefined();
    expect(geo.near.coordinates).toEqual([-122.4194, 37.7749]);
    expect(geo.key).toBe('location');

    expect(out.items).toEqual(items);
    expect(out.total).toBe(1);
  });

  it('adds $geoWithin filter for bbox', async () => {
    mockListing.find.mockReturnValue(makeFindChain([]));
    mockListing.countDocuments.mockResolvedValue(0);

    await repo.searchListings({ bbox: '37.7,-122.5;37.8,-122.3' });

    const [filter] = mockListing.find.mock.calls[0];
    expect(filter.location).toBeDefined();
    expect(filter.location.$geoWithin.$geometry.type).toBe('Polygon');
  });
});

describe('listing.repository updateListing', () => {
  it('sets GeoJSON location from coordinates on update', async () => {
    mockListing.findByIdAndUpdate.mockResolvedValue({ _id: 'L1' });
    await repo.updateListing('L1', { coordinates: { lat: 10, lng: 20 } });
    expect(mockListing.findByIdAndUpdate).toHaveBeenCalledWith('L1', expect.objectContaining({ location: { type: 'Point', coordinates: [20, 10] } }), expect.objectContaining({ runValidators: true }));
  });

  it('does not set location when coordinates missing', async () => {
    mockListing.findByIdAndUpdate.mockResolvedValue({ _id: 'L1' });
    await repo.updateListing('L1', { title: 'x' });
    const args = mockListing.findByIdAndUpdate.mock.calls[0];
    expect(args[1].location).toBeUndefined();
  });
});
