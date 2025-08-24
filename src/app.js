import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { requestIdMiddleware, morganMiddleware, attachLogger } from './middlewares/loggingMiddleware.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { sanitizeBody } from './utils/validation.js';

const app = express();

app.set('trust proxy', 1);

app.use(requestIdMiddleware());
app.use(attachLogger());
app.use(morganMiddleware());

app.use(helmet());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                
    if (env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(mongoSanitize());
app.use(hpp());
app.use(sanitizeBody());

const windowMs = env.rateLimit.windowMin * 60 * 1000;
app.use(rateLimit({
  windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
