import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, { dbName: 'airbnb_clone' });
    logger.info('MongoDB connected');
    return mongoose.connection;
  } catch (err) {
    logger.error('MongoDB connection error', { err });
    throw err;
  }
}

export default connectDB;
