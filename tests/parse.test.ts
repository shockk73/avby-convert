import { describe, it, expect } from 'vitest';
import { parseRate, parseAmount } from '../src/core/parse';
import { SAMPLE_RATE_TEXTS } from './fixtures/sample-prices';

describe('parseRate', () => {
  it.each(SAMPLE_RATE_TEXTS)('parses "%s"', (text) => {
    const rate = parseRate(text);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(100);
  });

  it('returns null for unparseable text', () => {
    expect(parseRate('hello world')).toBeNull();
    expect(parseRate('')).toBeNull();
    expect(parseRate('1 EUR = 3.5 BYN')).toBeNull();
  });

  it('extracts the BYN value as a number', () => {
    expect(parseRate('1 USD = 2.82 BYN')).toBe(2.82);
    expect(parseRate('1 USD = 3.10 BYN')).toBe(3.1);
  });

  it('rejects implausible rates (<= 0 or > 100)', () => {
    expect(parseRate('1 USD = 0 BYN')).toBeNull();
    expect(parseRate('1 USD = 1000 BYN')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('strips spaces and NBSPs', () => {
    expect(parseAmount('322 730')).toBe(322730);
    expect(parseAmount('322 730')).toBe(322730);
    expect(parseAmount('  1 000  ')).toBe(1000);
  });

  it('returns NaN for non-numeric', () => {
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
  });

  it('handles decimals', () => {
    expect(parseAmount('2.82')).toBe(2.82);
    expect(parseAmount('2,82')).toBe(2.82); // comma as decimal separator
  });
});
