import { browserApi } from '../../shared/browser';
import { getSettings, setSettings, getRate, onConfigChanged } from '../../storage';
import type { DisplayMode } from '../../core/types';

const RATE_VALUE = document.getElementById('rate-value') as HTMLDivElement;
const RATE_META  = document.getElementById('rate-meta')  as HTMLDivElement;
const MODE       = document.getElementById('mode-select') as HTMLSelectElement;
const OPEN_OPTS  = document.getElementById('open-options') as HTMLAnchorElement;

function formatRelative(epoch: number): string {
  const diffMin = Math.round((Date.now() - epoch) / 60_000);
  if (diffMin < 1)   return 'обновлено только что';
  if (diffMin < 60)  return `обновлено ${diffMin} мин назад`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24)   return `обновлено ${diffHr} ч назад`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return 'обновлено вчера';
  return `обновлено ${diffDay} дн назад`;
}

async function renderRate(): Promise<void> {
  const cache = await getRate();
  if (!cache) {
    RATE_VALUE.textContent = 'Курс ещё не загружен';
    RATE_META.textContent = '';
    return;
  }
  RATE_VALUE.textContent = `1 USD = ${cache.rate.toFixed(2)} BYN`;
  RATE_META.textContent = formatRelative(cache.fetchedAt);
}

async function renderMode(): Promise<void> {
  const s = await getSettings();
  MODE.value = s.mode;
}

MODE.addEventListener('change', async () => {
  await setSettings({ mode: MODE.value as DisplayMode });
});

OPEN_OPTS.addEventListener('click', (e) => {
  e.preventDefault();
  browserApi.runtime.openOptionsPage();
});

onConfigChanged(() => {
  void renderRate();
  void renderMode();
});

void renderRate();
void renderMode();
