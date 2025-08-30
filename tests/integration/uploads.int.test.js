import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signAccessToken } from '../../src/utils/jwt.js';

function makeToken(role = 'host', id = '507f1f77bcf86cd799439011', email = 'u@example.com') {
  return signAccessToken({ id, email, role });
}

describe('Uploads API', () => {
  it('rejects unauthenticated upload', async () => {
    const res = await request(app)
      .post('/api/uploads/photos')
      .attach('photos', Buffer.from([0xff, 0xd8, 0xff, 0xdb]), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('rejects guest upload (forbidden)', async () => {
    const guestToken = makeToken('guest', '507f1f77bcf86cd799439012', 'guest@example.com');
    const res = await request(app)
      .post('/api/uploads/photos')
      .set('Authorization', `Bearer ${guestToken}`)
      .attach('photos', Buffer.from([0xff, 0xd8, 0xff, 0xdb]), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(403);
  });

  it('uploads multiple photos as host and returns file paths', async () => {
    const token = makeToken('host', '507f1f77bcf86cd799439013', 'host@example.com');
    const res = await request(app)
      .post('/api/uploads/photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', Buffer.from([0xff, 0xd8, 0xff, 0xdb]), { filename: 'p1.jpg', contentType: 'image/jpeg' })
      .attach('photos', Buffer.from([0xff, 0xd8, 0xff, 0xdb]), { filename: 'p2.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBe(2);
    expect(res.body.files.every((f) => typeof f === 'string' && f.length > 0)).toBe(true);
  });

  it('rejects unsupported file types', async () => {
    const token = makeToken('host', '507f1f77bcf86cd799439014', 'host2@example.com');
    const res = await request(app)
      .post('/api/uploads/photos')
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect((res.body.message || '').toLowerCase()).toContain('unsupported');
  });
});
