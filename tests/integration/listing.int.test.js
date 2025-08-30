import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Listing from '../../src/models/listing.model.js';
import { signAccessToken } from '../../src/utils/jwt.js';

let mongod;
let hostA;
let hostB;
let guest;
let hostAToken;
let hostBToken;
let guestToken;
let sfListing; 
let laListing; 

function oid() { return new mongoose.Types.ObjectId().toString(); }

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'testdb' });

  hostA = oid();
  hostB = oid();
  guest = oid();
  hostAToken = signAccessToken({ id: hostA, email: 'hostA@example.com', role: 'host' });
  hostBToken = signAccessToken({ id: hostB, email: 'hostB@example.com', role: 'host' });
  guestToken = signAccessToken({ id: guest, email: 'guest@example.com', role: 'guest' });

  const [sf, la, ny] = await Listing.create([
    { 
      host: hostA,
      title: 'SF Downtown Loft',
      description: 'Cozy loft near Embarcadero',
      address: { city: 'San Francisco', country: 'USA', street: 'Market St' },
      coordinates: { lat: 37.7749, lng: -122.4194 },
      pricePerNight: 180,
      maxGuests: 3,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['wifi','kitchen'],
      isActive: true,
    },
    { 
      host: hostA,
      title: 'LA Beach House',
      description: 'Steps from the beach',
      address: { city: 'Los Angeles', country: 'USA', street: 'Ocean Ave' },
      coordinates: { lat: 34.0195, lng: -118.4912 },
      pricePerNight: 220,
      maxGuests: 5,
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['wifi','pool'],
      isActive: true,
    },
    { 
      host: hostB,
      title: 'NYC Midtown',
      description: 'Skyscraper views',
      address: { city: 'New York', country: 'USA', street: '5th Ave' },
      coordinates: { lat: 40.758, lng: -73.9855 },
      pricePerNight: 300,
      maxGuests: 2,
      amenities: ['wifi'],
      isActive: false,
    },
  ]);
  sfListing = sf;
  laListing = la;
  await Listing.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Listings API', () => {
  it('lists public listings with pagination', async () => {
    const res = await request(app).get('/api/listings?limit=10&page=1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some((i) => i.title.includes('NYC'))).toBe(false);
  });

  it('filters by city and minPrice/maxPrice', async () => {
    const res = await request(app).get('/api/listings?city=Los%20Angeles&minPrice=200&maxPrice=250');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((i) => i.address.city === 'Los Angeles' && i.pricePerNight >= 200 && i.pricePerNight <= 250)).toBe(true);
  });

  it('filters by guests and amenities', async () => {
    const res = await request(app).get('/api/listings?guests=4&amenities=wifi,pool');
    expect(res.status).toBe(200);
    expect(res.body.items.some((i) => String(i._id || i.id) === laListing.id)).toBe(true);
  });

  it('text searches by q and sorts by price', async () => {
    const res = await request(app).get('/api/listings?q=beach&sort=priceDesc');
    expect(res.status).toBe(200);
    expect(res.body.items[0].title).toContain('LA');
  });

  it('supports geo search near', async () => {
    const res = await request(app).get('/api/listings?near=37.7749,-122.4194&radiusKm=10'); // near SF
    expect(res.status).toBe(200);
    expect(res.body.items.some((i) => String(i._id || i.id) === sfListing.id)).toBe(true);
  });

  it('supports geo search bbox', async () => {
    const res = await request(app).get('/api/listings?bbox=37.7,-122.5;37.8,-122.3');
    expect(res.status).toBe(200);
    expect(res.body.items.some((i) => String(i._id || i.id) === sfListing.id)).toBe(true);
    expect(res.body.items.some((i) => String(i._id || i.id) === laListing.id)).toBe(false);
  });

  it('supports geo search polygon', async () => {
    const res = await request(app).get('/api/listings?polygon=34.015,-118.50|34.025,-118.48|34.01,-118.47');
    expect(res.status).toBe(200);
    expect(res.body.items.some((i) => String(i._id || i.id) === laListing.id)).toBe(true);
    expect(res.body.items.some((i) => String(i._id || i.id) === sfListing.id)).toBe(false);
  });

  it('gets a single listing with ETag/304', async () => {
    const first = await request(app).get(`/api/listings/${sfListing.id}`).set('Cache-Control', 'no-cache');
    expect(first.status).toBe(200);
    const etag = first.headers['etag'];
    expect(etag).toBeTruthy();
    const second = await request(app).get(`/api/listings/${sfListing.id}`).set('If-None-Match', etag).set('Cache-Control', 'no-cache');
    expect(second.status).toBe(304);
  });

  it('host can create, update, and delete own listing; others forbidden', async () => {
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${hostAToken}`)
      .send({ title: 'Host A Cabin', pricePerNight: 90, maxGuests: 2, address: { city: 'Portland' } });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const guestPatch = await request(app)
      .patch(`/api/listings/${id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ pricePerNight: 95 });
    expect(guestPatch.status).toBe(403);

    const otherHostPatch = await request(app)
      .patch(`/api/listings/${id}`)
      .set('Authorization', `Bearer ${hostBToken}`)
      .send({ pricePerNight: 95 });
    expect(otherHostPatch.status).toBe(403);

    const ownerPatch = await request(app)
      .patch(`/api/listings/${id}`)
      .set('Authorization', `Bearer ${hostAToken}`)
      .send({ pricePerNight: 95, title: 'Updated Cabin' });
    expect(ownerPatch.status).toBe(200);
    expect(ownerPatch.body.pricePerNight).toBe(95);
    expect(ownerPatch.body.title).toBe('Updated Cabin');

    const otherDel = await request(app)
      .delete(`/api/listings/${id}`)
      .set('Authorization', `Bearer ${hostBToken}`);
    expect(otherDel.status).toBe(403);

    const ownerDel = await request(app)
      .delete(`/api/listings/${id}`)
      .set('Authorization', `Bearer ${hostAToken}`);
    expect(ownerDel.status).toBe(200);
    expect(ownerDel.body).toMatchObject({ deleted: true });

    const notFound = await request(app).get(`/api/listings/${id}`);
    expect(notFound.status).toBe(404);
  });
});
