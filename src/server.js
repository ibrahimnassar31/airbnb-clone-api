import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

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

function shutdown(reason, code = 0) {
  logger.warn(`Shutting down: ${reason}`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(code);
    });
    setTimeout(() => process.exit(code), 10_000).unref();
  } else {
    process.exit(code);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { err });
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err });
  shutdown('uncaughtException', 1);
});
