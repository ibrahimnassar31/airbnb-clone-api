import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Listing from '../../src/models/listing.model.js';
import { signAccessToken } from '../../src/utils/jwt.js';

let mongod;
let listing;
let hostId;
let guestId;
let guestToken;

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'testdb' });

  hostId = new mongoose.Types.ObjectId().toString();
  guestId = new mongoose.Types.ObjectId().toString();
  guestToken = signAccessToken({ id: guestId, email: 'guest@example.com', role: 'guest' });

  listing = await Listing.create({
    host: hostId,
    title: 'Cozy place',
    pricePerNight: 100,
    maxGuests: 2,
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Booking API', () => {
  it('creates a booking successfully', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        listingId: listing.id,
        checkIn: daysFromNow(10),
        checkOut: daysFromNow(12),
        guestsCount: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      listing: listing._id.toString(),
      guest: guestId,
      status: 'confirmed',
      totalPrice: 200,
    });
  });

  it('rejects host booking own listing', async () => {
    const hostToken = signAccessToken({ id: hostId, email: 'host@example.com', role: 'host' });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ listingId: listing.id, checkIn: daysFromNow(15), checkOut: daysFromNow(16), guestsCount: 1 });
    expect(res.status).toBe(403);
    expect(res.body?.message || '').toContain('Hosts cannot book');
  });

  it('rejects invalid date range', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ listingId: listing.id, checkIn: daysFromNow(5), checkOut: daysFromNow(4), guestsCount: 1 });
    expect(res.status).toBe(400);
    expect(res.body?.message || '').toContain('Invalid date range');
  });

  it('rejects too many guests', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ listingId: listing.id, checkIn: daysFromNow(20), checkOut: daysFromNow(21), guestsCount: 5 });
    expect(res.status).toBe(400);
    expect(res.body?.message || '').toContain('Too many guests');
  });

  it('prevents overlapping bookings', async () => {
    const first = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ listingId: listing.id, checkIn: daysFromNow(30), checkOut: daysFromNow(32), guestsCount: 1 });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ listingId: listing.id, checkIn: daysFromNow(31), checkOut: daysFromNow(33), guestsCount: 1 });
    expect(second.status).toBe(409);
    expect(second.body?.message || '').toContain('Dates not available');
  });

  it('lists my bookings and can cancel with refund when far in advance', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ listingId: listing.id, checkIn: daysFromNow(40), checkOut: daysFromNow(42), guestsCount: 1 });
    expect(create.status).toBe(201);
    const bookingId = create.body.id;

    const list = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.items)).toBe(true);
    expect(list.body.items.some((b) => (b.id || b._id) === bookingId)).toBe(true);

    const cancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ reason: 'change of plans' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');
    expect(cancel.body.refundAmount).toBeGreaterThan(0);
  });
});
