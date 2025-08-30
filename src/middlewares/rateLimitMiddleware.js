import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const jsonHandler = (_req, res, _next, options) => {
  const status = options?.statusCode ?? 429;
  const msg = typeof options?.message === 'string' ? options.message : 'Too many requests';
  res.status(status).json({ message: msg });
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${ipKeyGenerator(req)}:${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: req => req.user?.id || ipKeyGenerator(req),
  message: 'Too many password reset attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const presignUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: req => req.user?.id || ipKeyGenerator(req),
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});

export const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: req => req.user?.id || ipKeyGenerator(req),
  message: 'Too many booking attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  skip: () => process.env.NODE_ENV === 'test',
});

export const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: req => req.user?.id || ipKeyGenerator(req),
  message: 'Too many review attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
});
