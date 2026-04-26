import { describe, it, expect } from 'vitest';
import { formatUsd, formatTemplate } from '../src/core/format';

describe('formatUsd', () => {
  it('whole dollars for amounts >= $1000', () => {
    expect(formatUsd(11444.26)).toBe('$11 444');
    expect(formatUsd(1000)).toBe('$1 000');
  });

  it('two decimals for amounts < $1000', () => {
    expect(formatUsd(333)).toBe('$333.00');
    expect(formatUsd(99.5)).toBe('$99.50');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('uses narrow no-break space as thousands separator', () => {
    expect(formatUsd(1234567)).toBe('$1 234 567');
  });

  it('does not snap when tolerance is 0 (default)', () => {
    expect(formatUsd(999.4)).toBe('$999.40');   // < 1000, decimals shown
    expect(formatUsd(1001)).toBe('$1 001');     // >= 1000, no decimals
  });

  it('snaps to power of 10 when within tolerance', () => {
    expect(formatUsd(999.5, 0.1)).toBe('$1 000');
    expect(formatUsd(1000.5, 0.1)).toBe('$1 000');
    expect(formatUsd(99.95, 0.1)).toBe('$100');
    expect(formatUsd(9999, 0.1)).toBe('$10 000');
    expect(formatUsd(100100, 0.1)).toBe('$100 000');
  });

  it('does not snap when outside tolerance', () => {
    expect(formatUsd(950, 0.1)).toBe('$950.00');
    expect(formatUsd(1050, 0.1)).toBe('$1 050');
    expect(formatUsd(100200, 0.1)).toBe('$100 200');
  });
});

describe('formatTemplate', () => {
  const rate = 2.82;

  it('substitutes a single {name|usd} token', () => {
    const out = formatTemplate('~{amount|usd}', { amount: '32 273' }, rate);
    expect(out).toBe('~$11 444');
  });

  it('substitutes multiple tokens', () => {
    const out = formatTemplate('~{min|usd} — {max|usd}', { min: '32 000', max: '47 999' }, rate);
    expect(out).toBe('~$11 348 — $17 021');
  });

  it('keeps surrounding text intact', () => {
    const out = formatTemplate('~{amount|usd} в месяц', { amount: '939.06' }, rate);
    expect(out).toBe('~$333.00 в месяц');
  });

  it('throws for unknown token name', () => {
    expect(() => formatTemplate('~{missing|usd}', { amount: '100' }, rate)).toThrow(/missing/);
  });

  it('throws for unknown filter', () => {
    expect(() => formatTemplate('{amount|eur}', { amount: '100' }, rate)).toThrow(/eur/);
  });

  it('passes snap tolerance to filter', () => {
    const out = formatTemplate('~{amount|usd}', { amount: '2 819.7' }, 2.82, 0.1);
    // 2819.7 / 2.82 = 999.89 → snaps to $1 000
    expect(out).toBe('~$1 000');
  });
});
