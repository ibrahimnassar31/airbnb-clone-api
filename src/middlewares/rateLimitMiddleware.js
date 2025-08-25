import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: req => req.user?.id || req.ip,
  message: 'Too many login attempts, please try again later.'
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: req => req.user?.id || req.ip,
  message: 'Too many password reset attempts, please try again later.'
});

export const presignUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: req => req.user?.id || req.ip,
  message: 'Too many upload requests, please try again later.'
});

export const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: req => req.user?.id || req.ip,
  message: 'Too many booking attempts, please try again later.'
});

export const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: req => req.user?.id || req.ip,
  message: 'Too many review attempts, please try again later.'
});
