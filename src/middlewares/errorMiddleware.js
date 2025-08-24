import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import logger from '../utils/logger.js';

export function notFound(_req, res, _next) {
  res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Route not found' });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || getReasonPhrase(status);

  (req?.log ?? logger).error(message, {
    status,
    stack: err.stack,
    name: err.name,
    path: req.originalUrl,
  });

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack, details: err.details } : {}),
  });
}

export default { notFound, errorHandler };
