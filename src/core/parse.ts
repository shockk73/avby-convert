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
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}
