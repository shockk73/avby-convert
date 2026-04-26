import type { Rule, Group, Settings } from '../core/types';
import { applyGroupRegex } from '../core/parse';
import { formatTemplate } from '../core/format';
import {
  applyConversion,
  removeConversion,
  getConvertedRuleId,
  getOriginalText,
  originalTextChanged,
  findAllConverted,
} from './inserter';

export type WalkContext = {
  rules: Rule[];
  groupsById: Map<string, Group>;
  rate: number | null;
  settings: Settings;
};

/**
 * Walk the DOM (under root) and apply enabled rules. Idempotent — already
 * converted elements that match the same rule are skipped.
 */
export function walkAndConvert(ctx: WalkContext, root: ParentNode = document): void {
  if (ctx.settings.mode === 'off' || ctx.rate === null) return;

  for (const rule of ctx.rules) {
    if (!rule.enabled) continue;
    const group = ctx.groupsById.get(rule.groupId);
    if (!group) {
      console.warn(`[avby-convert] rule "${rule.id}" references unknown group "${rule.groupId}"`);
      continue;
    }

    let elements: HTMLElement[];
    try {
      elements = Array.from(root.querySelectorAll<HTMLElement>(rule.selector));
    } catch (e) {
      console.warn(`[avby-convert] invalid selector in rule "${rule.id}": ${rule.selector}`);
      continue;
    }

    for (const el of elements) {
      const existingRuleId = getConvertedRuleId(el);
      if (existingRuleId !== null && existingRuleId !== rule.id) {
        console.warn(
          `[avby-convert] element matched by multiple rules: "${existingRuleId}" wins over "${rule.id}"`,
        );
        continue;
      }

      // Use the preserved original text (inside [data-avby-original]) rather
      // than el.textContent, which would include any appended USD label.
      const text = getOriginalText(el);

      if (existingRuleId === rule.id) {
        // Already converted by this rule. Re-apply only if the underlying
        // BYN text changed (e.g. AJAX price update), otherwise it's idempotent.
        if (!originalTextChanged(el)) continue;
        removeConversion(el);
      }

      let captures: Record<string, string> | null;
      try {
        captures = applyGroupRegex(group, text);
      } catch (e) {
        console.warn(`[avby-convert] regex error in group "${group.id}":`, e);
        continue;
      }
      if (!captures) {
        continue;
      }

      let usdText: string;
      try {
        usdText = formatTemplate(group.format, captures, ctx.rate, ctx.settings.snapTolerancePct);
      } catch (e) {
        console.warn(`[avby-convert] format error in group "${group.id}":`, e);
        continue;
      }

      applyConversion(el, rule.id, usdText, ctx.settings.mode, ctx.settings.insertionStyle, ctx.settings.usdFirst);
    }
  }
}

/**
 * Remove all conversions from the DOM. Used when switching to mode: 'off' or
 * when the ruleset changes substantially.
 */
export function clearAllConversions(root: ParentNode = document): void {
  for (const el of findAllConverted(root)) {
    removeConversion(el);
  }
}
