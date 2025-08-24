import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { StatusCodes } from 'http-status-codes';

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  if (req.cookies?.at) return req.cookies.at; // اسم كوكي مقترح للـ Access Token
  return null;
}

export function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    const err = new Error('Unauthorized');
    err.status = StatusCodes.UNAUTHORIZED;
    return next(err);
  }
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub, ...payload };
    next();
  } catch {
    const err = new Error('Invalid or expired token');
    err.status = StatusCodes.UNAUTHORIZED;
    next(err);
  }
}

export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret);
      req.user = { id: payload.sub, ...payload };
    } catch { /* تجاهل */ }
  }
  next();
}

export default { requireAuth, optionalAuth };
