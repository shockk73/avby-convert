import { parseRate } from '../core/parse';
import { setRate } from '../storage';
import { RATE_SELECTOR } from '../config/default-rules';

let lastSeenRate: number | null = null;

/**
 * Look at the current DOM for a rate element. If found and the rate differs
 * from the last seen value, persist it to storage.
 */
export async function checkRate(): Promise<void> {
  const el = document.querySelector(RATE_SELECTOR);
  if (!el) return;
  const text = el.textContent ?? '';
  const rate = parseRate(text);
  if (rate === null) {
    console.warn(`[avby-convert] failed to parse rate: "${text}"`);
    return;
  }
  if (rate === lastSeenRate) return;
  lastSeenRate = rate;
  await setRate(rate);
}

/**
 * Set up a one-shot check now plus reactive checks whenever the rate element
 * itself changes. Returns a disposer.
 */
export function startRateWatcher(): () => void {
  void checkRate();

  const observer = new MutationObserver(() => {
    void checkRate();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  return () => observer.disconnect();
}
