import { describe, it, expect } from 'vitest';
import { mergeRules, mergeGroups } from '../src/config/merge';
import type { Rule, Group, RuleOverride, GroupOverride } from '../src/core/types';

const baseRules: Rule[] = [
  { id: 'a', selector: '.a', groupId: 'single_byn', enabled: true,  description: 'A' },
  { id: 'b', selector: '.b', groupId: 'single_byn', enabled: true,  description: 'B' },
];

const baseGroups: Group[] = [
  { id: 'single_byn', description: 'd', match: 'm', captures: ['amount'], format: '~{amount|usd}' },
];

describe('mergeRules', () => {
  it('returns defaults when no overrides', () => {
    const merged = mergeRules(baseRules, []);
    expect(merged).toEqual(baseRules);
  });

  it('applies enabled override', () => {
    const overrides: RuleOverride[] = [{ id: 'a', enabled: false }];
    const merged = mergeRules(baseRules, overrides);
    expect(merged.find(r => r.id === 'a')!.enabled).toBe(false);
    expect(merged.find(r => r.id === 'b')!.enabled).toBe(true);
  });

  it('applies selector override but keeps other fields', () => {
    const overrides: RuleOverride[] = [{ id: 'a', selector: '.a-new' }];
    const merged = mergeRules(baseRules, overrides);
    const a = merged.find(r => r.id === 'a')!;
    expect(a.selector).toBe('.a-new');
    expect(a.description).toBe('A');
    expect(a.enabled).toBe(true);
  });

  it('appends custom rules with isCustom flag', () => {
    const overrides: RuleOverride[] = [
      { id: 'custom1', selector: '.x', groupId: 'single_byn', enabled: true, isCustom: true, description: 'C' },
    ];
    const merged = mergeRules(baseRules, overrides);
    expect(merged).toHaveLength(3);
    expect(merged.find(r => r.id === 'custom1')!.selector).toBe('.x');
  });

  it('ignores override with unknown non-custom id', () => {
    const overrides: RuleOverride[] = [{ id: 'ghost', enabled: false }];
    const merged = mergeRules(baseRules, overrides);
    expect(merged).toHaveLength(2);
  });

  it('keeps user customisations when defaults change selectors', () => {
    const newDefaults: Rule[] = [
      { id: 'a', selector: '.a-updated', groupId: 'single_byn', enabled: true, description: 'A' },
    ];
    const overrides: RuleOverride[] = [{ id: 'a', enabled: false }];
    const merged = mergeRules(newDefaults, overrides);
    const a = merged.find(r => r.id === 'a')!;
    expect(a.selector).toBe('.a-updated');  // new default selector picked up
    expect(a.enabled).toBe(false);          // user-disabled state preserved
  });
});

describe('mergeGroups', () => {
  it('returns defaults when no overrides', () => {
    expect(mergeGroups(baseGroups, [])).toEqual(baseGroups);
  });

  it('applies format override', () => {
    const overrides: GroupOverride[] = [{ id: 'single_byn', format: '{amount|usd}' }];
    const merged = mergeGroups(baseGroups, overrides);
    expect(merged.find(g => g.id === 'single_byn')!.format).toBe('{amount|usd}');
  });

  it('appends custom groups', () => {
    const overrides: GroupOverride[] = [
      {
        id: 'rental_per_day',
        description: 'Аренда',
        match: '([\\d\\s]+)\\s*BYN\\s*в\\s*сутки',
        captures: ['amount'],
        format: '~{amount|usd} в сутки',
        isCustom: true,
      },
    ];
    const merged = mergeGroups(baseGroups, overrides);
    expect(merged).toHaveLength(2);
    expect(merged.find(g => g.id === 'rental_per_day')!.format).toBe('~{amount|usd} в сутки');
  });
});
