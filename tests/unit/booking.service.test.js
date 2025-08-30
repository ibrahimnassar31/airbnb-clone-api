import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../src/repositories/listing.repository.js', () => ({
  findListingById: vi.fn(),
}));
vi.mock('../../src/repositories/booking.repository.js', () => ({
  createBooking: vi.fn(),
  findBookingsByGuest: vi.fn(),
  findBookingById: vi.fn(),
  hasOverlap: vi.fn(),
}));
vi.mock('../../src/middlewares/cacheMiddleware.js', () => ({
  invalidateCache: vi.fn(),
}));
vi.mock('../../src/utils/lock.js', () => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
}));
vi.mock('../../src/models/review.model.js', () => ({
  default: { find: vi.fn() },
}));

import * as bookingService from '../../src/services/booking.service.js';
import * as listingRepo from '../../src/repositories/listing.repository.js';
import * as bookingRepo from '../../src/repositories/booking.repository.js';
import { invalidateCache } from '../../src/middlewares/cacheMiddleware.js';
import * as lockUtil from '../../src/utils/lock.js';
import Review from '../../src/models/review.model.js';

function iso(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

describe('Booking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a booking successfully', async () => {
    const listing = { id: 'L1', _id: 'L1', isActive: true, host: 'H1', pricePerNight: 100, maxGuests: 2 };
    listingRepo.findListingById.mockResolvedValue(listing);
    lockUtil.acquireLock.mockResolvedValue({ key: 'k', token: 't' });
    bookingRepo.hasOverlap.mockResolvedValue(false);
    const bookingDoc = { toJSON: () => ({ id: 'B1', listing: 'L1', guest: 'G1', totalPrice: 200, status: 'confirmed' }) };
    bookingRepo.createBooking.mockResolvedValue(bookingDoc);

    const out = await bookingService.bookListing({ listingId: 'L1', guestId: 'G1', checkIn: iso(10), checkOut: iso(12), guestsCount: 2 });
    expect(out).toMatchObject({ id: 'B1', totalPrice: 200, status: 'confirmed' });
    expect(bookingRepo.createBooking).toHaveBeenCalledWith(expect.objectContaining({ totalPrice: 200 }));
    expect(invalidateCache).toHaveBeenCalledWith('booking:');
    expect(lockUtil.releaseLock).toHaveBeenCalled();
  });

  it('rejects when listing not found or inactive', async () => {
    listingRepo.findListingById.mockResolvedValue(null);
    await expect(bookingService.bookListing({ listingId: 'X', guestId: 'G', checkIn: iso(1), checkOut: iso(2), guestsCount: 1 }))
      .rejects.toMatchObject({ status: 404 });

    listingRepo.findListingById.mockResolvedValue({ id: 'L', isActive: false });
    await expect(bookingService.bookListing({ listingId: 'L', guestId: 'G', checkIn: iso(1), checkOut: iso(2), guestsCount: 1 }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('rejects host booking own listing', async () => {
    listingRepo.findListingById.mockResolvedValue({ id: 'L', isActive: true, host: 'G', pricePerNight: 50, maxGuests: 2 });
    await expect(bookingService.bookListing({ listingId: 'L', guestId: 'G', checkIn: iso(1), checkOut: iso(2), guestsCount: 1 }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('rejects invalid date range and too many guests', async () => {
    listingRepo.findListingById.mockResolvedValue({ id: 'L', isActive: true, host: 'H', pricePerNight: 50, maxGuests: 2 });
    await expect(bookingService.bookListing({ listingId: 'L', guestId: 'G', checkIn: iso(3), checkOut: iso(2), guestsCount: 1 }))
      .rejects.toMatchObject({ status: 400 });

    await expect(bookingService.bookListing({ listingId: 'L', guestId: 'G', checkIn: iso(2), checkOut: iso(3), guestsCount: 5 }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('rejects overlapping dates and lock contention', async () => {
    listingRepo.findListingById.mockResolvedValue({ id: 'L', isActive: true, host: 'H', pricePerNight: 50, maxGuests: 2 });
    lockUtil.acquireLock.mockResolvedValue({ key: 'k', token: 't' });
    bookingRepo.hasOverlap.mockResolvedValue(true);
    await expect(bookingService.bookListing({ listingId: 'L', guestId: 'G', checkIn: iso(2), checkOut: iso(3), guestsCount: 1 }))
      .rejects.toMatchObject({ status: 409 });

    bookingRepo.hasOverlap.mockResolvedValue(false);
    lockUtil.acquireLock.mockResolvedValue(null);
    await expect(bookingService.bookListing({ listingId: 'L', guestId: 'G', checkIn: iso(2), checkOut: iso(3), guestsCount: 1 }))
      .rejects.toMatchObject({ status: 409 });
  });

  it('cancels a booking with refund', async () => {
    const checkIn = new Date(iso(10));
    const bookingDoc = {
      guest: { toString: () => 'G' },
      status: 'confirmed',
      checkIn,
      totalPrice: 300,
      toJSON: () => ({ id: 'B', status: 'cancelled', refundAmount: 300 }),
      save: vi.fn().mockResolvedValue(),
    };
    bookingRepo.findBookingById.mockResolvedValue(bookingDoc);
    const out = await bookingService.cancelBooking('B', 'G', 'reason');
    expect(out).toMatchObject({ status: 'cancelled', refundAmount: 300 });
    expect(invalidateCache).toHaveBeenCalledWith('booking:');
  });

  it('cancel returns immediately if already cancelled', async () => {
    const bookingDoc = { guest: { toString: () => 'G' }, status: 'cancelled', toJSON: () => ({ id: 'B', status: 'cancelled' }) };
    bookingRepo.findBookingById.mockResolvedValue(bookingDoc);
    const out = await bookingService.cancelBooking('B', 'G', 'reason');
    expect(out.status).toBe('cancelled');
  });

  it('cancel rejects when not found or forbidden', async () => {
    bookingRepo.findBookingById.mockResolvedValue(null);
    await expect(bookingService.cancelBooking('X', 'G', 'r')).rejects.toMatchObject({ status: 404 });

    const doc = { guest: { toString: () => 'OTHER' } };
    bookingRepo.findBookingById.mockResolvedValue(doc);
    await expect(bookingService.cancelBooking('X', 'G', 'r')).rejects.toMatchObject({ status: 403 });
  });

  it('lists my bookings with attached myReview', async () => {
    const items = [{ _id: 'B1' }, { _id: 'B2' }];
    bookingRepo.findBookingsByGuest.mockResolvedValue({ items, total: 2, page: 1, limit: 20 });
    // Return a review only for B2
    Review.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([{ booking: 'B2', rating: 5 }]) });

    const out = await bookingService.listMyBookings('G');
    expect(out.items.find(i => i._id === 'B2')?.myReview?.rating).toBe(5);
    expect(out.items.find(i => i._id === 'B1')?.myReview).toBeNull();
  });
});
