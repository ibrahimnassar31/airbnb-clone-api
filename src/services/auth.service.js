import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../utils/jwt.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookies.js';
import {
  findByEmail,
  createUser,
  setRefreshTokenHash,
  clearRefreshTokenHash,
  findById,
} from '../repositories/user.repository.js';
import crypto from 'node:crypto';
import { sendMail, buildLink } from '../utils/mailer.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

export async function register({ email, password, name }, res) {
  const exists = await findByEmail(email, { includeSecrets: false });
  if (exists) throw ApiError.conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ email, passwordHash, name });

  const at = signAccessToken(user);
  const rt = signRefreshToken(user);

  const rtHash = await bcrypt.hash(rt, 10);
  await setRefreshTokenHash(user.id, rtHash);

  setRefreshCookie(res, rt);
  return { user: publicUser(user), accessToken: at };
}

export async function login({ email, password }, res) {
  const user = await findByEmail(email, { includeSecrets: true });
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const safe = user.toJSON(); 
  const at = signAccessToken(safe);
  const rt = signRefreshToken(safe);

  const rtHash = await bcrypt.hash(rt, 10);
  await setRefreshTokenHash(safe.id, rtHash);

  setRefreshCookie(res, rt);
  return { user: publicUser(safe), accessToken: at };
}

export async function refresh(req, res) {
  const token = req.cookies?.rt;
  if (!token) throw ApiError.unauthorized('No refresh token');

  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const user = await findById(payload.sub, { includeSecrets: true });
  if (!user?.refreshTokenHash) throw ApiError.unauthorized('Refresh token not recognized');

  const match = await bcrypt.compare(token, user.refreshTokenHash);
  if (!match) {
    await clearRefreshTokenHash(user.id);
    throw ApiError.unauthorized('Refresh token mismatch');
  }

  const safe = user.toJSON();
  const newAt = signAccessToken(safe);
  const newRt = signRefreshToken(safe);

  const newRtHash = await bcrypt.hash(newRt, 10);
  await setRefreshTokenHash(safe.id, newRtHash);

  setRefreshCookie(res, newRt);
  return { accessToken: newAt };
}

export async function logout(req, res) {
  const token = req.cookies?.rt;
  if (token && req.user?.id) {
    await clearRefreshTokenHash(req.user.id);
  }
  clearRefreshCookie(res);
  return { success: true };
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function requestEmailVerification(userId) {
  const user = await User.findById(userId).select('+verifyEmailTokenHash +verifyEmailTokenExpires');
  if (!user) throw ApiError.notFound('User not found');
  if (user.isVerified) return { alreadyVerified: true };

  const token = randomToken();
  const hash = await bcrypt.hash(token, 10);
  user.verifyEmailTokenHash = hash;
  user.verifyEmailTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await user.save();

  const url = buildLink(`/api/auth/verify/confirm?token=${encodeURIComponent(token)}&uid=${user.id}`);
  await sendMail({
    to: user.email,
    subject: 'Verify your email',
    html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`,
    text: `Verify: ${url}`,
  });

  return { sent: true };
}

export async function confirmEmailVerification({ uid, token }) {
  const user = await User.findById(uid).select('+verifyEmailTokenHash +verifyEmailTokenExpires');
  if (!user) throw ApiError.notFound('User not found');
  if (!user.verifyEmailTokenHash || !user.verifyEmailTokenExpires) throw ApiError.badRequest('No verification pending');
  if (user.verifyEmailTokenExpires < new Date()) throw ApiError.badRequest('Verification token expired');
  const ok = await bcrypt.compare(token, user.verifyEmailTokenHash);
  if (!ok) throw ApiError.badRequest('Invalid verification token');

  user.isVerified = true;
  user.verifyEmailTokenHash = undefined;
  user.verifyEmailTokenExpires = undefined;
  await user.save();

  return { verified: true };
}

export async function requestPasswordReset(email) {
  const user = await findByEmail(email, { includeSecrets: true });
  if (user) {
    const token = randomToken();
    const hash = await bcrypt.hash(token, 10);
    user.resetPasswordTokenHash = hash;
    user.resetPasswordTokenExpires = new Date(Date.now() + 1000 * 60 * 30); // 30m
    await user.save();

    const url = buildLink(`/api/auth/password/confirm?token=${encodeURIComponent(token)}&uid=${user.id}`);
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      html: `<p>Click to reset your password:</p><p><a href="${url}">${url}</a></p>`,
      text: `Reset: ${url}`,
    });
  }
  return { sent: true };
}

export async function confirmPasswordReset({ uid, token, password }) {
  const user = await User.findById(uid).select('+resetPasswordTokenHash +resetPasswordTokenExpires +passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  if (!user.resetPasswordTokenHash || !user.resetPasswordTokenExpires) throw ApiError.badRequest('No reset pending');
  if (user.resetPasswordTokenExpires < new Date()) throw ApiError.badRequest('Reset token expired');
  const ok = await bcrypt.compare(token, user.resetPasswordTokenHash);
  if (!ok) throw ApiError.badRequest('Invalid reset token');

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();

  await clearRefreshTokenHash(user.id);

  return { reset: true };
}

export default { register, login, refresh, logout, requestEmailVerification, confirmEmailVerification, requestPasswordReset, confirmPasswordReset };
