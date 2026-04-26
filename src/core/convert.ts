export function bynToUsd(amountByn: number, rate: number): number {
  if (rate <= 0) throw new Error(`invalid rate: ${rate}`);
  return amountByn / rate;
}

export function applyRoundingRule(usd: number): string {
  const rounded = Math.round(usd);
  if (rounded >= 1000) return String(rounded);
  return usd.toFixed(2);
}
