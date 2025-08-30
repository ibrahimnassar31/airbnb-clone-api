import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { errorHandler, notFound } from '../../src/middlewares/errorMiddleware.js';
import logger from '../../src/utils/logger.js';
import ApiError from '../../src/utils/ApiError.js';

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    status: vi.fn(function (code) { res.statusCode = code; return res; }),
    json: vi.fn(function (obj) { res.body = obj; return res; }),
    setHeader: vi.fn((k, v) => { res.headers[k] = v; }),
    get: vi.fn((k) => res.headers[k]),
  };
  return res;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('responds with ApiError status/message and logs with request context', () => {
    const err = ApiError.forbidden('Forbidden');
    const req = { requestId: 'rid', user: { id: 'U1' }, originalUrl: '/x', latency: 12, log: { error: vi.fn() } };
    const res = createRes();

    errorHandler(err, req, res, () => {});

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ success: false, message: 'Forbidden' });
    expect(req.log.error).toHaveBeenCalledTimes(1);
  });

  it('maps generic Error with status to ApiError and includes details', () => {
    const err = new Error('Bad Things');
    err.status = 418;
    err.details = { foo: 'bar' };
    const req = { requestId: 'rid2', originalUrl: '/y' };
    const res = createRes();

    errorHandler(err, req, res, () => {});

    expect(res.statusCode).toBe(418);
    expect(res.body.message).toBe('Bad Things');
    expect(res.body.details).toEqual({ foo: 'bar' });
    // Fallback logger used when req.log missing
    expect(logger.error).toHaveBeenCalled();
  });

  it('maps ZodError to 422 with details', () => {
    const zodErr = { name: 'ZodError', errors: [{ path: ['email'], message: 'Invalid email' }] };
    const res = createRes();
    errorHandler(zodErr, { originalUrl: '/z' }, res, () => {});
    expect(res.statusCode).toBe(422);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('maps Mongo duplicate key error to 409', () => {
    const dup = { name: 'MongoError', code: 11000 };
    const res = createRes();
    errorHandler(dup, { originalUrl: '/dup' }, res, () => {});
    expect(res.statusCode).toBe(409);
  });
});

describe('notFound', () => {
  it('returns 404 with message', () => {
    const res = createRes();
    notFound({}, res, () => {});
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: 'Route not found' });
  });
});
