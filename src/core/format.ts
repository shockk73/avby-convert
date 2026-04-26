import { bynToUsd, applyRoundingRule } from './convert';
import { parseAmount } from './parse';

const NARROW_NBSP = ' ';

function withThousands(integerStr: string): string {
  return integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
}

export function formatUsd(usd: number): string {
  const formatted = applyRoundingRule(usd);
  if (formatted.includes('.')) {
    const [intPart, decPart] = formatted.split('.');
    return `$${withThousands(intPart!)}.${decPart}`;
  }
  return `$${withThousands(formatted)}`;
}

const TOKEN_REGEX = /\{(\w+)\|(\w+)\}/g;

const FILTERS: Record<string, (rawValue: string, rate: number) => string> = {
  usd: (raw, rate) => {
    const byn = parseAmount(raw);
    if (!Number.isFinite(byn)) throw new Error(`cannot parse amount "${raw}"`);
    return formatUsd(bynToUsd(byn, rate));
  },
};

export function formatTemplate(
  template: string,
  captures: Record<string, string>,
  rate: number,
): string {
  return template.replace(TOKEN_REGEX, (_, name: string, filter: string) => {
    if (!(name in captures)) throw new Error(`unknown capture name: ${name}`);
    const fn = FILTERS[filter];
    if (!fn) throw new Error(`unknown filter: ${filter}`);
    return fn(captures[name]!, rate);
  });
}