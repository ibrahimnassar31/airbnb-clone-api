import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middlewares/validationMiddleware.js';

function runMiddleware(mw, reqProp = 'body', payload = {}) {
  const req = { [reqProp]: payload };
  const res = {};
  let nextArg;
  mw(req, res, (arg) => { nextArg = arg; });
  return { req, res, nextArg };
}

describe('validationMiddleware.validate', () => {
  it('validates and sanitizes nested strings and arrays', () => {
    const schema = z.object({
      name: z.string().min(1),
      tags: z.array(z.string()).default([]),
      nested: z.object({ note: z.string().optional() }).optional(),
    });
    const mw = validate(schema, 'body');
    const dirty = {
      name: '<b>John</b>',
      tags: ["<img src=x onerror='1'>", 'ok'],
      nested: { note: '<script>alert(1)</script>' },
    };
    const { req, nextArg } = runMiddleware(mw, 'body', dirty);

    expect(nextArg).toBeUndefined();
    // Sanitized: dangerous tags/attributes removed
    expect(req.body.name.toLowerCase()).not.toContain('<script');
    expect(req.body.tags.every((t) => !t.toLowerCase().includes('onerror'))).toBe(true);
    expect(req.body.nested.note.toLowerCase()).not.toContain('<script');
  });

  it('returns 422 with details on validation failure', () => {
    const schema = z.object({ email: z.string().email() });
    const mw = validate(schema, 'body');
    const { nextArg } = runMiddleware(mw, 'body', { email: 'not-an-email' });
    expect(nextArg).toBeInstanceOf(Error);
    expect(nextArg.status).toBe(422);
    expect(Array.isArray(nextArg.details)).toBe(true);
    expect(nextArg.details[0].path).toBe('email');
  });

  it('supports validating query params with coercion', () => {
    const schema = z.object({ page: z.coerce.number().int().min(1).default(1) });
    const mw = validate(schema, 'query');
    const { req, nextArg } = runMiddleware(mw, 'query', { page: '2' });
    expect(nextArg).toBeUndefined();
    expect(req.query.page).toBe(2);
  });
});
