import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Listing from '../../src/models/listing.model.js';
import Booking from '../../src/models/booking.model.js';
import { signAccessToken } from '../../src/utils/jwt.js';

let mongod;
let hostId;
let guestId;
let otherGuestId;
let guestToken;
let otherGuestToken;
let listing;
let bookingPast;
let bookingFuture;
let bookingOtherPast;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return new Date(d);
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return new Date(d);
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'testdb' });

  hostId = new mongoose.Types.ObjectId();
  guestId = new mongoose.Types.ObjectId();
  otherGuestId = new mongoose.Types.ObjectId();
  guestToken = signAccessToken({ id: guestId.toString(), email: 'guest@example.com', role: 'guest' });
  otherGuestToken = signAccessToken({ id: otherGuestId.toString(), email: 'other@example.com', role: 'guest' });

  listing = await Listing.create({
    host: hostId,
    title: 'Reviewable Listing',
    pricePerNight: 100,
    maxGuests: 2,
    isActive: true,
  });

  bookingPast = await Booking.create({
    listing: listing._id,
    guest: guestId,
    checkIn: daysAgo(10),
    checkOut: daysAgo(8),
    guestsCount: 1,
    totalPrice: 200,
    status: 'confirmed',
  });

  bookingFuture = await Booking.create({
    listing: listing._id,
    guest: guestId,
    checkIn: daysFromNow(5),
    checkOut: daysFromNow(7),
    guestsCount: 1,
    totalPrice: 200,
    status: 'confirmed',
  });

  bookingOtherPast = await Booking.create({
    listing: listing._id,
    guest: otherGuestId,
    checkIn: daysAgo(15),
    checkOut: daysAgo(13),
    guestsCount: 1,
    totalPrice: 200,
    status: 'confirmed',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Review API', () => {
  it('creates a review for a past booking and updates listing stats', async () => {
    const res = await request(app)
      .post('/api/reviews/booking')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: bookingPast._id.toString(), rating: 4, comment: 'Great stay!' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      booking: bookingPast._id.toString(),
      listing: listing._id.toString(),
      author: guestId.toString(),
      rating: 4,
    });

    const updatedListing = await Listing.findById(listing._id).lean();
    expect(updatedListing.reviewCount).toBe(1);
    expect(Math.round((updatedListing.averageRating || 0) * 10) / 10).toBe(4);
  });

  it('rejects duplicate review for the same booking', async () => {
    const res = await request(app)
      .post('/api/reviews/booking')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: bookingPast._id.toString(), rating: 5 });
    expect(res.status).toBe(409);
    expect((res.body.message || '')).toContain('already');
  });

  it('forbids reviewing someone else\'s booking', async () => {
    const res = await request(app)
      .post('/api/reviews/booking')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: bookingOtherPast._id.toString(), rating: 3 });
    expect(res.status).toBe(403);
  });

  it('rejects review if booking has not ended', async () => {
    const res = await request(app)
      .post('/api/reviews/booking')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: bookingFuture._id.toString(), rating: 5 });
    expect(res.status).toBe(403);
    expect((res.body.message || '').toLowerCase()).toContain('not ended');
  });

  it('deletes my review and updates listing stats', async () => {
    const del = await request(app)
      .delete(`/api/reviews/booking/${bookingPast._id}`)
      .set('Authorization', `Bearer ${guestToken}`);
    expect(del.status).toBe(200);
    expect(del.body).toMatchObject({ deleted: true });

    const updatedListing = await Listing.findById(listing._id).lean();
    expect(updatedListing.reviewCount).toBe(0);
    expect((updatedListing.averageRating || 0)).toBe(0);
  });
});
