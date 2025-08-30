
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import Listing from '../../src/models/listing.model.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'testdb' });
  await Listing.create({ host: new mongoose.Types.ObjectId(), title: 'Test', pricePerNight: 10, maxGuests: 2, isActive: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('GET /api/listings', () => {
  it('returns list', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
    expect(res.body.items?.length).toBeGreaterThan(0);
  });
});
