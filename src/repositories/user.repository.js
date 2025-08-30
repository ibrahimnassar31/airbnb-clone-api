import User from '../models/user.model.js';
import mongoose from 'mongoose';

export async function findByEmail(email, { includeSecrets = false } = {}) {
  if (mongoose.connection.readyState !== 1) return null;
  const q = User.findOne({ email });
  if (includeSecrets) q.select('+passwordHash +refreshTokenHash');
  return q.exec();
}

export async function findById(id, { includeSecrets = false } = {}) {
  if (mongoose.connection.readyState !== 1) return null;
  const q = User.findById(id);
  if (includeSecrets) q.select('+passwordHash +refreshTokenHash');
  return q.exec();
}

export async function createUser({ email, passwordHash, name, role = 'guest' }) {
  const user = await User.create({ email, passwordHash, name, role });
  return user.toJSON();
}

export async function setRefreshTokenHash(userId, hash) {
  if (mongoose.connection.readyState !== 1) return;
  await User.updateOne({ _id: userId }, { $set: { refreshTokenHash: hash } }).exec();
}

export async function clearRefreshTokenHash(userId) {
  if (mongoose.connection.readyState !== 1) return;
  await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } }).exec();
}

export default {
  findByEmail, findById, createUser, setRefreshTokenHash, clearRefreshTokenHash,
};
