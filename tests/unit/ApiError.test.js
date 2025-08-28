import ApiError from '../../src/utils/ApiError.js';

describe('ApiError', () => {
  it('should create an error with default status 500', () => {
    const err = new ApiError('fail');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(500);
    expect(err.message).toBe('fail');
    expect(err.name).toBe('ApiError');
  });

  it('should create error with custom status and details', () => {
    const err = new ApiError('bad', 400, { foo: 'bar' });
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ foo: 'bar' });
  });

  it('should use static helpers', () => {
    expect(ApiError.badRequest().status).toBe(400);
    expect(ApiError.unauthorized().status).toBe(401);
    expect(ApiError.forbidden().status).toBe(403);
    expect(ApiError.notFound().status).toBe(404);
    expect(ApiError.conflict().status).toBe(409);
    expect(ApiError.unprocessable().status).toBe(422);
    expect(ApiError.internal().status).toBe(500);
  });

  it('should detect ApiError with isApiError', () => {
    const err = ApiError.badRequest();
    expect(ApiError.isApiError(err)).toBe(true);
    expect(ApiError.isApiError(new Error('no'))).toBe(false);
  });

  it('should convert ZodError/ValidationError to ApiError', () => {
    const zodErr = { name: 'ZodError', errors: [{ path: ['foo'], message: 'bad' }] };
    const apiErr = ApiError.from(zodErr);
    expect(apiErr.status).toBe(422);
    expect(apiErr.details).toBeDefined();
  });

  it('should convert CastError to ApiError', () => {
    const castErr = { name: 'CastError' };
    const apiErr = ApiError.from(castErr);
    expect(apiErr.status).toBe(400);
  });

  it('should convert MongoError to ApiError', () => {
    const mongoErr = { name: 'MongoError', code: 11000 };
    const apiErr = ApiError.from(mongoErr);
    expect(apiErr.status).toBe(409);
  });

  it('should fallback to internal error', () => {
    const err = { message: 'fail' };
    const apiErr = ApiError.from(err);
    expect(apiErr.status).toBe(500);
    expect(apiErr.message).toBe('fail');
  });
});
