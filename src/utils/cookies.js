import { env } from '../config/env.js';

export function setRefreshCookie(res, token) {
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  const allowed = new Set(['lax','strict','none']);
  const sameSite = allowed.has(sameSiteEnv)
    ? sameSiteEnv
    : (env.isProd ? 'strict' : 'lax');
  const secure = env.isProd || sameSite === 'none';
  res.cookie('rt', token, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
}

export function clearRefreshCookie(res) {
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  const allowed = new Set(['lax','strict','none']);
  const sameSite = allowed.has(sameSiteEnv)
    ? sameSiteEnv
    : (env.isProd ? 'strict' : 'lax');
  const secure = env.isProd || sameSite === 'none';
  res.clearCookie('rt', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
  });
}
