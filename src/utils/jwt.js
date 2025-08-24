import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  const payload = {
    sub: user.id || user._id?.toString(),
    role: user.role,
    email: user.email,
  };
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
}

export function signRefreshToken(user) {
  const payload = {
    sub: user.id || user._id?.toString(),
    tid: crypto.randomUUID(), 
  };
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
}

export function verifyAccess(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefresh(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}
