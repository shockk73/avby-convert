import { browserApi } from '../../shared/browser';
import { getSettings, setSettings, getRate, onConfigChanged } from '../../storage';
import type { DisplayMode, InsertionStyle } from '../../core/types';

const RATE_VALUE    = document.getElementById('rate-value') as HTMLDivElement;
const RATE_META     = document.getElementById('rate-meta')  as HTMLDivElement;
const SEGMENT       = document.getElementById('mode-segment') as HTMLDivElement;
const SNAP_SEGMENT  = document.getElementById('snap-segment') as HTMLDivElement;
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
  await setSettings({ usdFirst: raw === 'true' });
});

// ─── Style preview grid ────────────────────────────────────────
const BYN_SAMPLE = '11 444 р.';
const USD_SAMPLE = '~$4 058';

/** Helper: span with text + classes, all set safely via DOM API. */
function span(text: string, ...classes: string[]): HTMLSpanElement {
  const s = document.createElement('span');
  if (classes.length) s.className = classes.join(' ');
  s.textContent = text;
  return s;
}

/**
 * Each builder returns an HTMLElement whose subtree mirrors what the engine
 * inserter produces on a real page for that style WHEN usdFirst=false.
 * The shared usdFirst preview (`buildUsdFirstPreview`) is used regardless of
 * style when usdFirst=true (mirrors the unified renderUsdFirst handler).
 * Built via createElement + textContent — no innerHTML.
 */
type PreviewBuilder = () => HTMLElement;

const PREVIEW_BUILDERS: Record<InsertionStyle, PreviewBuilder> = {
  inline: () => {
    const wrap = document.createElement('span');
    wrap.appendChild(span(BYN_SAMPLE));
    wrap.appendChild(span('· ' + USD_SAMPLE, 'avby-usd', 'avby-usd--inline'));
    return wrap;
  },
  badge: () => {
    const wrap = document.createElement('span');
    wrap.appendChild(span(BYN_SAMPLE));
    wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--badge'));
    return wrap;
  },
  below: () => {
    const wrap = document.createElement('div');
    const top = document.createElement('div');
    top.appendChild(span(BYN_SAMPLE));
    wrap.appendChild(top);
    wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--below'));
    return wrap;
  },
  strikethrough: () => {
    const wrap = document.createElement('span');
    const host = document.createElement('span');
    host.className = 'avby-strike-host';
    const orig = span(BYN_SAMPLE);
    orig.setAttribute('data-avby-original', '');
    host.appendChild(orig);
    wrap.appendChild(host);
    wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--strike'));
    return wrap;
  },
  pill_double: () => {
    const wrap = document.createElement('span');
    const host = document.createElement('span');
    host.className = 'avby-pill-host';
    host.appendChild(span(BYN_SAMPLE));
    host.appendChild(span('· ' + USD_SAMPLE, 'avby-usd', 'avby-usd--inline'));
    wrap.appendChild(host);
    return wrap;
  },
};

/** Preview for usd_only mode: just the USD value with the style's secondary visual. */
const USD_ONLY_BUILDERS: Record<InsertionStyle, PreviewBuilder> = {
  inline:        () => span(USD_SAMPLE, 'avby-usd', 'avby-usd--replace'),
  badge:         () => span(USD_SAMPLE, 'avby-usd', 'avby-usd--badge'),
  below:         () => span(USD_SAMPLE, 'avby-usd', 'avby-usd--below'),
  strikethrough: () => span(USD_SAMPLE, 'avby-usd', 'avby-usd--strike'),
  pill_double:   () => {
    const wrap = document.createElement('span');
    wrap.className = 'avby-pill-host';
    wrap.appendChild(span(USD_SAMPLE));
    return wrap;
  },
};

function buildUsdFirstPreview(): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'avby-original-faded';
  wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--lead'));
  const orig = span(BYN_SAMPLE);
  orig.setAttribute('data-avby-original', '');
  wrap.appendChild(orig);
  return wrap;
}

const STYLE_ORDER: InsertionStyle[] = [
  'inline',
  'badge',
  'below',
  'strikethrough',
  'pill_double',
];

function clearChildren(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function buildPreview(style: InsertionStyle, mode: DisplayMode, usdFirst: boolean): HTMLElement {
  if (mode === 'usd_only') return USD_ONLY_BUILDERS[style]();
  if (usdFirst)            return buildUsdFirstPreview();
  return PREVIEW_BUILDERS[style]();
}

function renderStyleGrid(active: InsertionStyle, mode: DisplayMode, usdFirst: boolean): void {
  clearChildren(GRID);
  for (const id of STYLE_ORDER) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'style-card';
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', id === active ? 'true' : 'false');
    card.dataset.style = id;
    if (id === active) card.classList.add('active');

    const preview = document.createElement('div');
    preview.className = 'style-preview';
    preview.appendChild(buildPreview(id, mode, usdFirst));

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
  const style = target.dataset.style as InsertionStyle | undefined;
  if (!style) return;
  await setSettings({ insertionStyle: style });
});

// ─── Open options ──────────────────────────────────────────────
OPEN_OPTS.addEventListener('click', (e) => {
  e.preventDefault();
  browserApi.runtime.openOptionsPage();
});

// ─── Top-level render ──────────────────────────────────────────
async function renderAll(): Promise<void> {
  const s = await getSettings();
  renderMode(s.mode);
  renderSnap(s.snapTolerancePct);
  renderOrder(s.usdFirst);

  // Hide order + style blocks when extension is off — they're irrelevant.
  const off = s.mode === 'off';
  ORDER_BLOCK.style.display = off ? 'none' : '';
  STYLE_BLOCK.style.display = off ? 'none' : '';

  if (!off) {
    renderStyleGrid(s.insertionStyle, s.mode, s.usdFirst);
  }

  await renderRate();
}

onConfigChanged(() => { void renderAll(); });
void renderAll();
