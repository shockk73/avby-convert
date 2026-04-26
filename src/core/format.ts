import { bynToUsd, applyRoundingRule } from './convert';
import { parseAmount } from './parse';

const NARROW_NBSP = ' ';

function withThousands(integerStr: string): string {
  return integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
}

/**
 * If `usd` is within `tolerancePct` percent of the nearest power of 10
 * (e.g., 100, 1000, 10000), return that power of 10. Otherwise return
 * `usd` unchanged. Used by formatUsd for prettier display of "almost-round"
 * prices like $999.50 → $1 000 or $9 998 → $10 000.
 */
function snapToRound(usd: number, tolerancePct: number): { value: number; snapped: boolean } {
  if (tolerancePct <= 0 || usd <= 0 || !Number.isFinite(usd)) {
    return { value: usd, snapped: false };
  }
  const order = Math.round(Math.log10(usd));
  const target = Math.pow(10, order);
  const distance = Math.abs(usd - target) / target;
  const tolerance = tolerancePct / 100;
  if (distance <= tolerance) return { value: target, snapped: true };
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
