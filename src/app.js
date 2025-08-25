import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import YAML from 'yaml';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { requestIdMiddleware, morganMiddleware, attachLogger } from './middlewares/loggingMiddleware.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { sanitizeBody } from './utils/validation.js';

const app = express();

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdn.example.com'],
    imgSrc: ["'self'", 'https://cdn.example.com', 'https://uploads.example.com', 'data:'],
    styleSrc: ["'self'", 'https://cdn.example.com'],
    connectSrc: ["'self'", 'https://api.example.com'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));

const allowedOrigins = ['http://localhost:3000'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = YAML.parse(readFileSync(path.join(__dirname, '../docs/openapi.yaml'), 'utf8'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));

app.use((req, res, next) => {
  res.cookie = ((name, value, options = {}) => {
    options.httpOnly = true;
    options.secure = process.env.NODE_ENV === 'production';
    options.sameSite = 'lax';
    res.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; HttpOnly;${options.secure ? ' Secure;' : ''} SameSite=Lax`);
  });
  next();
});

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
