import type { Group } from './types';

const RATE_REGEX = /1\s*USD\s*=\s*([\d.,]+)\s*BYN/i;

export function parseRate(text: string): number | null {
  const match = RATE_REGEX.exec(text);
  if (!match) return null;
  const num = parseAmount(match[1]!);
  if (!Number.isFinite(num) || num <= 0 || num > 100) return null;
  return num;
}

export function parseAmount(raw: string): number {
  // Strip all whitespace (including NBSP U+00A0) and normalise comma -> dot.
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

const compiledCache = new WeakMap<Group, RegExp>();

function compileGroupRegex(group: Group): RegExp {
  let re = compiledCache.get(group);
  if (re) return re;
  re = new RegExp(group.match);
  compiledCache.set(group, re);
  return re;
}

export function applyGroupRegex(
  group: Group,
  text: string,
): Record<string, string> | null {
  const re = compileGroupRegex(group);
  const match = re.exec(text);
  if (!match) return null;
  const captureValues = match.slice(1);
  if (captureValues.length !== group.captures.length) {
    throw new Error(
      `group "${group.id}": regex has ${captureValues.length} capture(s), but captures array has ${group.captures.length}`,
    );
  }
  const out: Record<string, string> = {};
  for (let i = 0; i < group.captures.length; i++) {
    out[group.captures[i]!] = captureValues[i]!;
  }
  return out;
}
