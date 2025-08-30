import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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

const app = express();


app.use(helmet());
app.use(compression());
if (env.nodeEnv !== 'test') {
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: env.csp.defaultSrc,
      scriptSrc: env.csp.scriptSrc,
      imgSrc: env.csp.imgSrc,
      styleSrc: env.csp.styleSrc,
      connectSrc: env.csp.connectSrc,
      objectSrc: env.csp.objectSrc,
      upgradeInsecureRequests: env.csp.upgradeInsecureRequests ? [] : null,
    },
  }));
}

app.use(cors(env.corsAllowAll ? {
  origin: true,
  credentials: true,
} : {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = YAML.parse(readFileSync(path.join(__dirname, '../docs/openapi.yaml'), 'utf8'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));



app.set('trust proxy', 1);

app.use(requestIdMiddleware());
app.use(attachLogger());
app.use(morganMiddleware());



app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(mongoSanitize());
app.use(hpp());

const rateLimitJsonHandler = (_req, res, _next, options) => {
  const status = options?.statusCode ?? 429;
  const msg = typeof options?.message === 'string' ? options.message : 'Too many requests';
  res.status(status).json({ message: msg });
};

const windowMs = env.rateLimit.windowMin * 60 * 1000;
app.use(rateLimit({
  windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitJsonHandler,
}));

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
