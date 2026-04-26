import type { Rule, Group, RuleOverride, GroupOverride } from '../core/types';

export function mergeRules(defaults: Rule[], overrides: RuleOverride[]): Rule[] {
  const byId = new Map<string, Rule>();
  for (const d of defaults) byId.set(d.id, { ...d });

  for (const o of overrides) {
    if (o.isCustom) {
      if (!o.selector || !o.groupId) continue;
      byId.set(o.id, {
        id: o.id,
        selector: o.selector,
        groupId: o.groupId,
        enabled: o.enabled ?? true,
        description: o.description,
      });
    } else {
      const existing = byId.get(o.id);
      if (!existing) continue;
      const { id: _id, isCustom: _ic, ...rest } = o;
      Object.assign(existing, rest);
    }
  }
  return [...byId.values()];
}

export function mergeGroups(defaults: Group[], overrides: GroupOverride[]): Group[] {
  const byId = new Map<string, Group>();
  for (const d of defaults) byId.set(d.id, { ...d });

  for (const o of overrides) {
    if (o.isCustom) {
      if (!o.match || !o.captures || !o.format || !o.description) continue;
      byId.set(o.id, {
        id: o.id,
        description: o.description,
        match: o.match,
        captures: o.captures,
        format: o.format,
      });
    } else {
      const existing = byId.get(o.id);
      if (!existing) continue;
      const { id: _id, isCustom: _ic, ...rest } = o;
      Object.assign(existing, rest);
    }
  }
  return [...byId.values()];
}
