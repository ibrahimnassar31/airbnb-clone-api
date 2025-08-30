import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import logger from '../../src/utils/logger.js';
import { env } from '../../src/config/env.js';

describe('utils/logger', () => {
  it('exposes standard logging methods and writes without throwing', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    logger.info('unit: info log', { scope: 'test' });
    logger.warn('unit: warn log');
    logger.error('unit: error log', { err: new Error('boom') });
  });

  it('creates log directory and supports child loggers', () => {
    expect(fs.existsSync(env.logDir)).toBe(true);
    const child = logger.child({ requestId: 'rid-123' });
    expect(typeof child.info).toBe('function');
    child.info('child log');
  });
});
