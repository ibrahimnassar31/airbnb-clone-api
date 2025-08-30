import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import mongoose from 'mongoose';
import redisClient from './utils/redisClient.js';

let server;

async function start() {
  try {
    await connectDB();
    server = http.createServer(app);
    server.listen(env.port, () => {
      logger.info(`Server listening on http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    logger.error('Failed to start server', { err });
    process.exit(1);
  }
}

start();

async function shutdown(reason, code = 0) {
  logger.warn(`Shutting down: ${reason}`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
      logger.info('HTTP server closed');
    }
  } catch (e) {
    logger.error('Error closing HTTP server', { err: e });
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed');
    }
  } catch (e) {
    logger.error('Error closing MongoDB connection', { err: e });
  }

  try {
    if (typeof redisClient.quit === 'function') {
      await redisClient.quit();
      logger.info('Redis client closed');
    }
  } catch (e) {
    logger.error('Error closing Redis client', { err: e });
  }

  setTimeout(() => process.exit(code), 500).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { err });
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err });
  void shutdown('uncaughtException', 1);
});
