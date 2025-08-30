import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';
export function notFound(_req, res, _next) {
  const err = ApiError.notFound('Route not found');
  res.status(err.status).json({ success: false, message: err.message });
}

export function errorHandler(err, req, res, _next) {
  let apiErr = err instanceof ApiError ? err : null;
  if (!apiErr) {
    if (typeof err.status === 'number' && err.status >= 400 && err.status <= 599) {
      apiErr = new ApiError(err.message || 'Error', err.status, err.details);
    }
    else if (err.name === 'ValidationError' || err.name === 'ZodError') apiErr = ApiError.unprocessable('Validation failed', err.errors ?? err.issues ?? err.details);
    else if (err.name === 'CastError') apiErr = ApiError.badRequest('Invalid parameter');
    else if (err.name === 'MongoError' && err.code === 11000) apiErr = ApiError.conflict('Duplicate key error');
    else apiErr = ApiError.internal(err.message || getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR));
    if (err.details) apiErr.details = err.details;
  }

  const logEntry = {
    level: 'error',
    requestId: req.requestId,
    userId: req.user?.id,
    route: req.originalUrl,
    latency: req.latency,
    status: apiErr.status,
    error: apiErr.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    details: apiErr.details,
  };
  (req?.log ?? logger).error(JSON.stringify(logEntry));

  res.status(apiErr.status).json({
    success: false,
    message: apiErr.message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack, details: apiErr.details } : {}),
  });
}

export default { notFound, errorHandler };

