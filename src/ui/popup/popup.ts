import { browserApi } from '../../shared/browser';
import { getSettings, setSettings, getRate, onConfigChanged } from '../../storage';
import type { DisplayMode } from '../../core/types';

const RATE_VALUE    = document.getElementById('rate-value') as HTMLDivElement;
const RATE_META     = document.getElementById('rate-meta')  as HTMLDivElement;
const SEGMENT       = document.getElementById('mode-segment') as HTMLDivElement;
const SNAP_SEGMENT  = document.getElementById('snap-segment') as HTMLDivElement;
const SNAP_BLOCK    = document.getElementById('snap-block') as HTMLElement;
const ORDER_SEGMENT = document.getElementById('order-segment') as HTMLDivElement;
const ORDER_BLOCK   = document.getElementById('order-block') as HTMLElement;
const OPEN_OPTS     = document.getElementById('open-options') as HTMLAnchorElement;

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Rate ──────────────────────────────────────────────────────
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
    RATE_VALUE.classList.add('muted');
    RATE_META.textContent = '';
    RATE_META.classList.remove('warn');
    return;
  }
  RATE_VALUE.classList.remove('muted');
  RATE_VALUE.textContent = `1 USD = ${cache.rate.toFixed(2)} BYN`;
  const stale = Date.now() - cache.fetchedAt > DAY_MS;
  RATE_META.classList.toggle('warn', stale);
  RATE_META.textContent = stale ? 'обновлён давно' : formatRelative(cache.fetchedAt);
}

// ─── Mode segmented control ────────────────────────────────────
function renderMode(mode: DisplayMode): void {
  for (const btn of SEGMENT.querySelectorAll<HTMLButtonElement>('button.segment')) {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }
}

SEGMENT.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest('button.segment') as HTMLButtonElement | null;
  if (!target) return;
  const mode = target.dataset.mode as DisplayMode | undefined;
  if (!mode) return;
  await setSettings({ mode });
});

// ─── Snap tolerance segmented control ──────────────────────────
function renderSnap(snapTolerancePct: number): void {
  for (const btn of SNAP_SEGMENT.querySelectorAll<HTMLButtonElement>('button.segment')) {
    const value = Number(btn.dataset.snap);
    const active = Math.abs(value - snapTolerancePct) < 1e-9;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }
}

SNAP_SEGMENT.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest('button.segment') as HTMLButtonElement | null;
  if (!target) return;
  const raw = target.dataset.snap;
  if (raw === undefined) return;
  const snapTolerancePct = Number(raw);
  if (!Number.isFinite(snapTolerancePct)) return;
  await setSettings({ snapTolerancePct });
});

// ─── Order (BYN→USD vs USD→BYN) segmented control ─────────────
function renderOrder(usdFirst: boolean): void {
  for (const btn of ORDER_SEGMENT.querySelectorAll<HTMLButtonElement>('button.segment')) {
    const value = btn.dataset.usdFirst === 'true';
    const active = value === usdFirst;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  }
}

ORDER_SEGMENT.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest('button.segment') as HTMLButtonElement | null;
  if (!target) return;
  const raw = target.dataset.usdFirst;
  if (raw === undefined) return;
  await setSettings({ usdFirst: raw === 'true' });
});

// ─── Open options ──────────────────────────────────────────────
OPEN_OPTS.addEventListener('click', (e) => {
  e.preventDefault();
  browserApi.runtime.openOptionsPage();
});

// ─── Top-level render ──────────────────────────────────────────
function setBlockEnabled(block: HTMLElement, enabled: boolean): void {
  block.classList.toggle('disabled', !enabled);
  for (const btn of block.querySelectorAll<HTMLButtonElement>('button')) {
    btn.disabled = !enabled;
  }
}

async function renderAll(): Promise<void> {
  const s = await getSettings();
  renderMode(s.mode);
  renderSnap(s.snapTolerancePct);
  renderOrder(s.usdFirst);

  const off = s.mode === 'off';
  setBlockEnabled(SNAP_BLOCK,  !off);
  setBlockEnabled(ORDER_BLOCK, s.mode === 'both');

  await renderRate();
}

onConfigChanged(() => { void renderAll(); });
void renderAll();
