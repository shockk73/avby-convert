import { describe, it, expect } from 'vitest';
import { parseRate, parseAmount, applyGroupRegex } from '../src/core/parse';
import type { Group } from '../src/core/types';
import {
  SAMPLE_RATE_TEXTS,
  SAMPLE_SINGLE_BYN_TEXTS,
  SAMPLE_LEASING_TEXTS,
  SAMPLE_RANGE_TEXTS,
} from './fixtures/sample-prices';

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

const SINGLE_BYN: Group = {
  id: 'single_byn',
  description: '',
  match: '([\\d\\s\\u00A0]+)\\s*(?:р\\.|BYN|руб)',
  captures: ['amount'],
  format: '~{amount|usd}',
};

const LEASING: Group = {
  id: 'leasing_monthly',
  description: '',
  match: '([\\d\\s\\u00A0]+)\\s*BYN\\s*в\\s*месяц',
  captures: ['amount'],
  format: '~{amount|usd} в месяц',
};

const RANGE: Group = {
  id: 'range_byn',
  description: '',
  match: '([\\d\\s\\u00A0]+)\\s*[—–-]\\s*([\\d\\s\\u00A0]+)\\s*BYN',
  captures: ['min', 'max'],
  format: '~{min|usd} — {max|usd}',
};

describe('applyGroupRegex', () => {
  it.each(SAMPLE_SINGLE_BYN_TEXTS)(
    'single_byn parses "%s"',
    (text, expected) => {
      const captures = applyGroupRegex(SINGLE_BYN, text);
      expect(captures).not.toBeNull();
      expect(captures!.amount).toBeDefined();
      expect(Number(captures!.amount.replace(/[\s ]/g, ''))).toBe(expected);
    },
  );

  it.each(SAMPLE_LEASING_TEXTS)('leasing_monthly parses "%s"', (text, expected) => {
    const captures = applyGroupRegex(LEASING, text);
    expect(captures).not.toBeNull();
    expect(Number(captures!.amount.replace(/[\s ]/g, ''))).toBe(expected);
  });

  it.each(SAMPLE_RANGE_TEXTS)('range_byn parses "%s"', (text, [min, max]) => {
    const captures = applyGroupRegex(RANGE, text);
    expect(captures).not.toBeNull();
    expect(Number(captures!.min.replace(/[\s ]/g, ''))).toBe(min);
    expect(Number(captures!.max.replace(/[\s ]/g, ''))).toBe(max);
  });

  it('returns null on no match', () => {
    expect(applyGroupRegex(SINGLE_BYN, 'no number here')).toBeNull();
  });

  it('throws when group has wrong number of captures', () => {
    const broken: Group = { ...SINGLE_BYN, captures: ['a', 'b'] };
    expect(() => applyGroupRegex(broken, '100 р.')).toThrow(/captures/);
  });
});
