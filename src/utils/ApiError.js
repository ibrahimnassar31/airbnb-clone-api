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
}

export default ApiError;
