import { describe, it, expect } from 'vitest';
import { computeRefund } from '../../src/services/booking.service.js';

describe('computeRefund', () => {
  it('100% if >= 7 days (boundary)', () => {
    const now = new Date('2025-01-01T12:00:00Z');
    const checkIn = new Date('2025-01-08T12:00:00Z'); 
    expect(computeRefund(checkIn, 1000, now)).toBe(1000);
  });
  it('50% if 3-6 days (boundary at 3 days)', () => {
    const now = new Date('2025-01-01T12:00:00Z');
    const checkIn = new Date('2025-01-04T12:00:00Z'); 
    expect(computeRefund(checkIn, 1000, now)).toBe(500);
  });
  it('0% if < 3 days (just under)', () => {
    const now = new Date('2025-01-01T12:00:00Z');
    const checkIn = new Date('2025-01-03T11:59:59Z');
    expect(computeRefund(checkIn, 1000, now)).toBe(0);
  });
});
