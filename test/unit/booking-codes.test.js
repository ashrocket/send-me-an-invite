import { describe, it, expect } from 'vitest';
import { generateBookingCode, generateMagicToken, isValidBookingCode } from '../../lib/booking-codes.js';

describe('generateBookingCode', () => {
  it('returns a string matching AC-XXXX pattern', () => {
    const code = generateBookingCode();
    expect(code).toMatch(/^AC-[A-Z0-9]{4}$/);
  });

  it('generates unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateBookingCode()));
    expect(codes.size).toBe(100);
  });
});

describe('generateMagicToken', () => {
  it('returns a URL-safe string of at least 32 characters', () => {
    const token = generateMagicToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateMagicToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('isValidBookingCode', () => {
  it('returns true for valid codes', () => {
    expect(isValidBookingCode('AC-7K2F')).toBe(true);
    expect(isValidBookingCode('AC-ABCD')).toBe(true);
  });

  it('returns false for invalid codes', () => {
    expect(isValidBookingCode('XX-7K2F')).toBe(false);
    expect(isValidBookingCode('AC7K2F')).toBe(false);
    expect(isValidBookingCode('')).toBe(false);
    expect(isValidBookingCode('AC-7k2f')).toBe(false);
  });
});
