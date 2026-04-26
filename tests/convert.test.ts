import { describe, it, expect } from 'vitest';
import { bynToUsd, applyRoundingRule } from '../src/core/convert';

describe('bynToUsd', () => {
  it('divides amount by rate', () => {
    expect(bynToUsd(282, 2.82)).toBeCloseTo(100, 5);
    expect(bynToUsd(322730, 2.82)).toBeCloseTo(114443.26, 1);
  });

  it('returns 0 for zero amount', () => {
    expect(bynToUsd(0, 2.82)).toBe(0);
  });

  it('throws for non-positive rate', () => {
    expect(() => bynToUsd(100, 0)).toThrow();
    expect(() => bynToUsd(100, -1)).toThrow();
  });
});

describe('applyRoundingRule', () => {
  it('returns whole-number string for amounts >= 1000', () => {
    expect(applyRoundingRule(11444.26)).toBe('11444');
    expect(applyRoundingRule(1000)).toBe('1000');
    expect(applyRoundingRule(99999.9)).toBe('100000');
  });

  it('returns two-decimal string for amounts < 1000', () => {
    expect(applyRoundingRule(333)).toBe('333.00');
    expect(applyRoundingRule(0.5)).toBe('0.50');
    expect(applyRoundingRule(999.999)).toBe('1000');
  });

  it('handles 0 cleanly', () => {
    expect(applyRoundingRule(0)).toBe('0.00');
  });
});
