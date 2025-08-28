export class ApiError extends Error {
  constructor(message, status = 500, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details) {
    return new ApiError(message, 400, details);
  }
  static unauthorized(message = 'Unauthorized', details) {
    return new ApiError(message, 401, details);
  }
  static forbidden(message = 'Forbidden', details) {
    return new ApiError(message, 403, details);
  }
  static notFound(message = 'Not Found', details) {
    return new ApiError(message, 404, details);
  }
  static conflict(message = 'Conflict', details) {
    return new ApiError(message, 409, details);
  }
  static unprocessable(message = 'Unprocessable Entity', details) {
    return new ApiError(message, 422, details);
  }
  static internal(message = 'Internal Server Error', details) {
    return new ApiError(message, 500, details);
  }

  static isApiError(err) {
    return err instanceof ApiError || (err && err.name === 'ApiError' && typeof err.status === 'number');
  }

  static from(err) {
    if (ApiError.isApiError(err)) return err;

    if (err?.name === 'ZodError' || err?.name === 'ValidationError') {
      const details = err?.errors ?? err?.issues ?? err?.details;
      return ApiError.unprocessable('Validation failed', details);
    }

    if (err?.name === 'CastError') {
      return ApiError.badRequest('Invalid parameter');
    }

    if ((err?.name === 'MongoError' || err?.codeName === 'DuplicateKey') && err?.code === 11000) {
      return ApiError.conflict('Duplicate key error');
    }

    const message = typeof err?.message === 'string' && err.message.length > 0 ? err.message : 'Internal Server Error';
    const api = ApiError.internal(message);
    if (err?.details) api.details = err.details;
    return api;
  }
}

export default ApiError;
