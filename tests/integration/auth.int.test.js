import request from 'supertest';
import app from '../../src/app.js';
import { describe, it, expect } from '@jest/globals';

describe('Auth API', () => {
  it('should rate limit login attempts', async () => {
    for (let i = 0; i < 11; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ message: expect.stringContaining('Too many login attempts') });
  });
});
