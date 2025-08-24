import { env } from '../config/env.js';

export function setRefreshCookie(res, token) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'lax' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie('rt', {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'lax' : 'lax',
    path: '/api/auth',
  });
}
