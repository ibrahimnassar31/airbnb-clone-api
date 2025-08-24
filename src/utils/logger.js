import fs from 'node:fs';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { env } from '../config/env.js';

if (!fs.existsSync(env.logDir)) fs.mkdirSync(env.logDir, { recursive: true });

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: 'info',
  levels: winston.config.npm.levels, 
  format: baseFormat,
  transports: [
    new winston.transports.Console({
      level: env.isProd ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...meta }) =>
          `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
        )
      ),
    }),
    new winston.transports.DailyRotateFile({
      level: 'info',
      dirname: env.logDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new winston.transports.DailyRotateFile({
      level: 'error',
      dirname: env.logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

export default logger;
