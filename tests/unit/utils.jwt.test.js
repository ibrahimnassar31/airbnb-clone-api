import { describe, it, expect } from 'vitest';
import * as jwtUtil from '../../src/utils/jwt.js';

describe('utils/jwt', () => {
  const user = { id: '507f1f77bcf86cd799439011', email: 'u@example.com', role: 'guest' };

  it('signs and verifies access token with payload', () => {
    const token = jwtUtil.signAccessToken(user);
    expect(typeof token).toBe('string');
    const payload = jwtUtil.verifyAccess(token);
    expect(payload.sub).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.role).toBe(user.role);
    expect(payload.exp).toBeDefined();
  });

  it('signs and verifies refresh token with unique tid', () => {
    const t1 = jwtUtil.signRefreshToken(user);
    const t2 = jwtUtil.signRefreshToken(user);
    const p1 = jwtUtil.verifyRefresh(t1);
    const p2 = jwtUtil.verifyRefresh(t2);
    expect(p1.sub).toBe(user.id);
    expect(p1.tid).toBeDefined();
    expect(p2.tid).toBeDefined();
    expect(p1.tid).not.toBe(p2.tid);
  });

  it('verifyAccess throws for invalid token', () => {
    expect(() => jwtUtil.verifyAccess('not-a-token')).toThrow();
  });
});
