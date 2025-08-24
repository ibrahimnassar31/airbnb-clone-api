import { describe, it, expect, vi } from 'vitest';

function computeRefund(checkIn, totalPrice, now = new Date()) {
  const ms = new Date(checkIn) - now;
  const days = ms / (1000*60*60*24);
  if (days >= 7) return totalPrice;
  if (days >= 3) return Math.round(totalPrice * 0.5);
  return 0;
}

describe('computeRefund', () => {
  it('100% if >= 7 days', () => {
    const now = new Date('2025-01-01');
    const checkIn = new Date('2025-01-09'); 
    expect(computeRefund(checkIn, 1000, now)).toBe(1000);
  });
  it('50% if 3-6 days', () => {
    const now = new Date('2025-01-01');
    const checkIn = new Date('2025-01-04'); 
    expect(computeRefund(checkIn, 1000, now)).toBe(500);
  });
  it('0% if < 3 days', () => {
    const now = new Date('2025-01-01');
    const checkIn = new Date('2025-01-03');
    expect(computeRefund(checkIn, 1000, now)).toBe(0);
  });
});
