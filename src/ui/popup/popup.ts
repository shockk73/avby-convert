import { browserApi } from '../../shared/browser';
import { getSettings, setSettings, getRate, onConfigChanged } from '../../storage';
import type { DisplayMode, BothStyle, UsdOnlyStyle, Settings } from '../../core/types';

const RATE_VALUE    = document.getElementById('rate-value') as HTMLDivElement;
const RATE_META     = document.getElementById('rate-meta')  as HTMLDivElement;
const SEGMENT       = document.getElementById('mode-segment') as HTMLDivElement;
const SNAP_SEGMENT  = document.getElementById('snap-segment') as HTMLDivElement;
const SNAP_BLOCK    = document.getElementById('snap-block') as HTMLElement;
const ORDER_SEGMENT = document.getElementById('order-segment') as HTMLDivElement;
const ORDER_BLOCK   = document.getElementById('order-block') as HTMLElement;
const STYLE_BLOCK   = document.getElementById('style-block') as HTMLElement;
const GRID          = document.getElementById('style-grid')   as HTMLDivElement;
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
  await setSettings({ bothUsdFirst: raw === 'true' });
});

// ─── Style preview grid ────────────────────────────────────────
const BYN_SAMPLE = '11 444 р.';
const USD_SAMPLE = '~$4 058';

function span(text: string, ...classes: string[]): HTMLSpanElement {
  const s = document.createElement('span');
  if (classes.length) s.className = classes.join(' ');
  s.textContent = text;
  return s;
}

function clearChildren(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ─── Both-mode previews (5 styles, both orientations) ─────────
function previewBothMode(style: BothStyle, usdFirst: boolean): HTMLElement {
  const wrap = document.createElement(style === 'below' ? 'div' : 'span');
  switch (style) {
    case 'inline': {
      if (usdFirst) {
        wrap.appendChild(span(USD_SAMPLE + ' · ', 'avby-usd', 'avby-usd--inline'));
        wrap.appendChild(span(BYN_SAMPLE));
      } else {
        wrap.appendChild(span(BYN_SAMPLE));
        wrap.appendChild(span(' · ' + USD_SAMPLE, 'avby-usd', 'avby-usd--inline'));
      }
      return wrap;
    }
    case 'badge': {
      if (usdFirst) {
        wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--badge'));
        wrap.appendChild(span(' ' + BYN_SAMPLE));
      } else {
        wrap.appendChild(span(BYN_SAMPLE));
        wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--badge'));
      }
      return wrap;
    }
    case 'below': {
      if (usdFirst) {
        wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--below'));
        const bynLine = document.createElement('div');
        bynLine.appendChild(span(BYN_SAMPLE));
        wrap.appendChild(bynLine);
      } else {
        const bynLine = document.createElement('div');
        bynLine.appendChild(span(BYN_SAMPLE));
        wrap.appendChild(bynLine);
        wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--below'));
      }
      return wrap;
    }
    case 'strikethrough': {
      const host = document.createElement('span');
      host.className = 'avby-strike-host';
      const orig = span(BYN_SAMPLE);
      orig.setAttribute('data-avby-original', '');
      host.appendChild(orig);
      if (usdFirst) {
        wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--strike'));
        wrap.appendChild(host);
      } else {
        wrap.appendChild(host);
        wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--strike'));
      }
      return wrap;
    }
  }
}

// ─── Usd-only previews (only inline/badge) ────────────────────
function previewUsdOnlyMode(style: UsdOnlyStyle): HTMLElement {
  const wrap = document.createElement('span');
  if (style === 'badge') {
    wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--badge'));
  } else {
    wrap.appendChild(span(USD_SAMPLE));
  }
  return wrap;
}

const BOTH_STYLE_ORDER: BothStyle[] = [
  'inline',
  'badge',
  'below',
  'strikethrough',
];
const USD_ONLY_STYLE_ORDER: UsdOnlyStyle[] = ['inline', 'badge'];

function renderStyleGrid(s: Settings, isUsdOnlyView: boolean): void {
  clearChildren(GRID);
  const ids = isUsdOnlyView ? USD_ONLY_STYLE_ORDER : BOTH_STYLE_ORDER;
  const active = isUsdOnlyView ? s.usdOnlyStyle : s.bothStyle;

  for (const id of ids) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'style-card';
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', id === active ? 'true' : 'false');
    card.dataset.style = id;
    card.dataset.scope = isUsdOnlyView ? 'usdOnly' : 'both';
    if (id === active) card.classList.add('active');

    const preview = document.createElement('div');
    preview.className = 'style-preview';
    preview.appendChild(
      isUsdOnlyView
        ? previewUsdOnlyMode(id as UsdOnlyStyle)
        : previewBothMode(id as BothStyle, s.bothUsdFirst),
    );

    const name = document.createElement('div');
    name.className = 'style-name';
    name.textContent = id;

    card.appendChild(preview);
    card.appendChild(name);
    GRID.appendChild(card);
  }
}

GRID.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest('.style-card') as HTMLElement | null;
  if (!target) return;
  const style = target.dataset.style;
  const scope = target.dataset.scope;
  if (!style || !scope) return;
  if (scope === 'usdOnly') {
    await setSettings({ usdOnlyStyle: style as UsdOnlyStyle });
  } else {
    await setSettings({ bothStyle: style as BothStyle });
  }
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
  renderOrder(s.bothUsdFirst);

  const off = s.mode === 'off';
  // In `off` mode everything is greyed but visible. Elsewhere enable per applicability.
  setBlockEnabled(SNAP_BLOCK,  !off);
  setBlockEnabled(ORDER_BLOCK, s.mode === 'both');
  setBlockEnabled(STYLE_BLOCK, !off);

  // Style grid: in off, show 'both' grid (more useful preview). In usd_only show subset.
  // In both, show full set.
  const isUsdOnlyView = s.mode === 'usd_only';
  renderStyleGrid(s, isUsdOnlyView);

  await renderRate();
}

onConfigChanged(() => { void renderAll(); });
void renderAll();
