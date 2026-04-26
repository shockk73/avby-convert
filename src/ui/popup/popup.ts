import { browserApi } from '../../shared/browser';
import { getSettings, setSettings, getRate, onConfigChanged } from '../../storage';
import type { DisplayMode, InsertionStyle } from '../../core/types';

const RATE_VALUE = document.getElementById('rate-value') as HTMLDivElement;
const RATE_META  = document.getElementById('rate-meta')  as HTMLDivElement;
const SEGMENT    = document.getElementById('mode-segment') as HTMLDivElement;
const GRID       = document.getElementById('style-grid')   as HTMLDivElement;
const OPEN_OPTS  = document.getElementById('open-options') as HTMLAnchorElement;

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
 * inserter produces on a real page for that style. Built via createElement
 * + textContent — no innerHTML, no XSS surface.
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
  inverted: () => {
    const wrap = document.createElement('span');
    wrap.className = 'avby-original-faded';
    wrap.appendChild(span(USD_SAMPLE, 'avby-usd', 'avby-usd--lead'));
    const orig = span(BYN_SAMPLE);
    orig.setAttribute('data-avby-original', '');
    wrap.appendChild(orig);
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

const STYLE_ORDER: InsertionStyle[] = [
  'inline',
  'badge',
  'below',
  'inverted',
  'strikethrough',
  'pill_double',
];

function clearChildren(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function renderStyleGrid(active: InsertionStyle): void {
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
    preview.appendChild(PREVIEW_BUILDERS[id]());

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
  renderStyleGrid(s.insertionStyle);
  await renderRate();
}

onConfigChanged(() => { void renderAll(); });
void renderAll();
