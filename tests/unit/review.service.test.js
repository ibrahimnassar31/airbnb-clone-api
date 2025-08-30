import { describe, it, beforeEach, expect, vi } from 'vitest';

// Hoisted mocks for models
const mockReviewModel = vi.hoisted(() => ({
  exists: vi.fn(),
  create: vi.fn(),
  aggregate: vi.fn(),
  findOneAndDelete: vi.fn(),
  find: vi.fn(),
}));
const mockListingModel = vi.hoisted(() => ({
  updateOne: vi.fn(() => ({ exec: vi.fn().mockResolvedValue() })),
}));

vi.mock('../../src/models/review.model.js', () => ({ default: mockReviewModel }));
vi.mock('../../src/models/listing.model.js', () => ({ default: mockListingModel }));

vi.mock('../../src/repositories/booking.repository.js', () => ({
  findBookingById: vi.fn(),
}));
vi.mock('../../src/repositories/listing.repository.js', () => ({
  findListingById: vi.fn(),
}));
vi.mock('../../src/repositories/review.repository.js', () => ({
  listReviewsForListing: vi.fn(),
}));
vi.mock('../../src/middlewares/cacheMiddleware.js', () => ({
  invalidateCache: vi.fn(),
}));

import * as svc from '../../src/services/review.service.js';
import * as bookingRepo from '../../src/repositories/booking.repository.js';
import * as listingRepo from '../../src/repositories/listing.repository.js';
import { listReviewsForListing as repoListReviewsForListing } from '../../src/repositories/review.repository.js';
import { invalidateCache } from '../../src/middlewares/cacheMiddleware.js';

function pastDays(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function futureDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

beforeEach(() => { vi.clearAllMocks(); });

describe('review.service createReviewForBooking', () => {
  it('creates review and updates listing stats', async () => {
    bookingRepo.findBookingById.mockResolvedValue({
      _id: 'B1', listing: 'L1', status: 'confirmed', checkOut: pastDays(1), guest: { toString: () => 'G1' },
    });
    listingRepo.findListingById.mockResolvedValue({ _id: 'L1', host: 'H1' });
    mockReviewModel.exists.mockResolvedValue(false);
    mockReviewModel.create.mockResolvedValue({ toJSON: () => ({ id: 'R1', rating: 4, booking: 'B1', listing: 'L1', author: 'G1' }) });
    mockReviewModel.aggregate.mockResolvedValue([{ count: 1, avg: 4 }]);

    const out = await svc.createReviewForBooking('G1', 'B1', 4, 'Great');
    expect(out).toMatchObject({ id: 'R1', rating: 4, booking: 'B1', listing: 'L1' });
    expect(mockListingModel.updateOne).toHaveBeenCalled();
    expect(invalidateCache).toHaveBeenCalledWith('review:');
    expect(invalidateCache).toHaveBeenCalledWith('listing:');
  });

  it('rejects duplicate review', async () => {
    bookingRepo.findBookingById.mockResolvedValue({ _id: 'B1', listing: 'L1', status: 'confirmed', checkOut: pastDays(1), guest: { toString: () => 'G1' } });
    listingRepo.findListingById.mockResolvedValue({ _id: 'L1' });
    mockReviewModel.exists.mockResolvedValue(true);
    await expect(svc.createReviewForBooking('G1', 'B1', 5)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects when booking not found or not confirmed or not ended or not owner', async () => {
    bookingRepo.findBookingById.mockResolvedValue(null);
    await expect(svc.createReviewForBooking('G1', 'B1', 5)).rejects.toMatchObject({ status: 404 });

    bookingRepo.findBookingById.mockResolvedValue({ _id: 'B1', listing: 'L1', status: 'pending', checkOut: pastDays(1), guest: { toString: () => 'G1' } });
    await expect(svc.createReviewForBooking('G1', 'B1', 5)).rejects.toMatchObject({ status: 403 });

    bookingRepo.findBookingById.mockResolvedValue({ _id: 'B1', listing: 'L1', status: 'confirmed', checkOut: futureDays(1), guest: { toString: () => 'G1' } });
    await expect(svc.createReviewForBooking('G1', 'B1', 5)).rejects.toMatchObject({ status: 403 });

    bookingRepo.findBookingById.mockResolvedValue({ _id: 'B1', listing: 'L1', status: 'confirmed', checkOut: pastDays(1), guest: { toString: () => 'OTHER' } });
    await expect(svc.createReviewForBooking('G1', 'B1', 5)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects when listing not found', async () => {
    bookingRepo.findBookingById.mockResolvedValue({ _id: 'B1', listing: 'Lx', status: 'confirmed', checkOut: pastDays(1), guest: { toString: () => 'G1' } });
    listingRepo.findListingById.mockResolvedValue(null);
    await expect(svc.createReviewForBooking('G1', 'B1', 4)).rejects.toMatchObject({ status: 404 });
  });
});

describe('review.service deleteReviewByAuthor / deleteMyReview', () => {
  it('deletes by booking and author and updates stats', async () => {
    mockReviewModel.findOneAndDelete.mockResolvedValue({ listing: 'L1' });
    mockReviewModel.aggregate.mockResolvedValue([{ count: 0, avg: 0 }]);
    const out = await svc.deleteReviewByAuthor('B1', 'G1');
    expect(out).toEqual({ deleted: true });
    expect(mockListingModel.updateOne).toHaveBeenCalled();
    expect(invalidateCache).toHaveBeenCalledWith('review:');
    expect(invalidateCache).toHaveBeenCalledWith('listing:');
  });

  it('deleteMyReview removes by listing and author and updates stats', async () => {
    mockReviewModel.findOneAndDelete.mockResolvedValue({ listing: 'L1' });
    mockReviewModel.aggregate.mockResolvedValue([{ count: 0, avg: 0 }]);
    const out = await svc.deleteMyReview('G1', 'L1');
    expect(out).toEqual({ deleted: true });
    expect(mockListingModel.updateOne).toHaveBeenCalled();
  });

  it('delete operations 404 when not found', async () => {
    mockReviewModel.findOneAndDelete.mockResolvedValue(null);
    await expect(svc.deleteReviewByAuthor('B1', 'G1')).rejects.toMatchObject({ status: 404 });
    await expect(svc.deleteMyReview('G1', 'L1')).rejects.toMatchObject({ status: 404 });
  });
});

describe('review.service listListingReviews', () => {
  it('delegates to repository function', async () => {
    (repoListReviewsForListing).mockResolvedValue({ items: [], total: 0 });
    const out = await svc.listListingReviews('L1', { page: 2, limit: 5 });
    expect(repoListReviewsForListing).toHaveBeenCalledWith('L1', { page: 2, limit: 5 });
    expect(out).toEqual({ items: [], total: 0 });
  });
});

