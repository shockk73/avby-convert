import { bynToUsd, applyRoundingRule } from './convert';
import { parseAmount } from './parse';

const NARROW_NBSP = ' ';

function withThousands(integerStr: string): string {
  return integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
}

/**
 * If `usd` is within `tolerancePct` percent of a "nice round" target
 * (multiples of progressively-smaller pretty steps relative to the value's
 * magnitude — power of 10, half-power, then multiples of 10^(order-1)),
 * return the prettiest target that fits. Otherwise return `usd` unchanged.
 *
 * Examples (with 1% tolerance):
 *   $999.50  → $1 000   (within 0.05% of $1 000)
 *   $20 100  → $20 000  (within 0.5% of $20 000)
 *   $24 238  → $24 000  (within 0.99% of $24 000)
 *   $24 555  → unchanged (1.78% off $25 000, no closer pretty target within 1%)
 */
function snapToRound(usd: number, tolerancePct: number): { value: number; snapped: boolean } {
  if (tolerancePct <= 0 || usd <= 0 || !Number.isFinite(usd)) {
    return { value: usd, snapped: false };
  }
  const tolerance = tolerancePct / 100;
  const order = Math.floor(Math.log10(usd));
  // Try increasingly less-pretty (smaller) snap steps. The first match wins,
  // so the prettiest snap that fits the tolerance is chosen.
  const steps = [
    Math.pow(10, order + 1),      // next power up
    5 * Math.pow(10, order),      // half-power
    Math.pow(10, order),          // current power
    5 * Math.pow(10, order - 1),  // tenth × 5
    Math.pow(10, order - 1),      // tenth (multiples of 10^(order-1))
  ];
  for (const step of steps) {
    const target = Math.round(usd / step) * step;
    if (target <= 0) continue;
    const distance = Math.abs(usd - target) / target;
    // Skip "snap to self" — only count it as a snap when the target nudges
    // the value to a different (prettier) number.
    if (distance > 0 && distance <= tolerance) return { value: target, snapped: true };
  }
  return { value: usd, snapped: false };
}

export function formatUsd(usd: number, snapTolerancePct: number = 0): string {
  const { value, snapped } = snapToRound(usd, snapTolerancePct);
  // When snapped to a power of 10, always render as a whole number (no decimals)
  // even if value < $1000, since the whole point of snapping is the prettier
  // round display.
  const formatted = snapped ? String(Math.round(value)) : applyRoundingRule(value);
  if (formatted.includes('.')) {
    const [intPart, decPart] = formatted.split('.');
    return `$${withThousands(intPart!)}.${decPart}`;
  }
  return `$${withThousands(formatted)}`;
}

const TOKEN_REGEX = /\{(\w+)\|(\w+)\}/g;

type FilterFn = (rawValue: string, rate: number, snapTolerancePct: number) => string;

const FILTERS: Record<string, FilterFn> = {
  usd: (raw, rate, snapTolerancePct) => {
    const byn = parseAmount(raw);
    if (!Number.isFinite(byn)) throw new Error(`cannot parse amount "${raw}"`);
    return formatUsd(bynToUsd(byn, rate), snapTolerancePct);
  },
};

export function formatTemplate(
  template: string,
  captures: Record<string, string>,
  rate: number,
  snapTolerancePct: number = 0,
): string {
  return template.replace(TOKEN_REGEX, (_, name: string, filter: string) => {
    if (!(name in captures)) throw new Error(`unknown capture name: ${name}`);
    const fn = FILTERS[filter];
    if (!fn) throw new Error(`unknown filter: ${filter}`);
    return fn(captures[name]!, rate, snapTolerancePct);
  });
}
