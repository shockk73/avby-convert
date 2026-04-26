import type { DisplayMode } from '../core/types';

const DATA_ATTR = 'data-avby-converted';
const HASH_ATTR = 'data-avby-orig-hash';
const ORIG_ATTR = 'data-avby-original';
const USD_NODE_CLASS = 'avby-usd';

const HOST_CLASSES = [
  'avby-original-hidden',
  'avby-original-faded',
];

function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return s.length + ':' + (h >>> 0).toString(36);
}

function ensureOriginalWrap(el: HTMLElement): HTMLSpanElement {
  const existing = el.querySelector<HTMLSpanElement>(`:scope > [${ORIG_ATTR}]`);
  if (existing) return existing;
  const wrap = document.createElement('span');
  wrap.setAttribute(ORIG_ATTR, '');
  for (const node of Array.from(el.childNodes)) {
    if (
      node.nodeType === 1 &&
      (node as HTMLElement).classList?.contains(USD_NODE_CLASS)
    ) continue;
    wrap.appendChild(node);
  }
  el.appendChild(wrap);
  return wrap;
}

function unwrapOriginal(el: HTMLElement): void {
  const wrap = el.querySelector<HTMLSpanElement>(`:scope > [${ORIG_ATTR}]`);
  if (!wrap) return;
  const parent = wrap.parentNode!;
  while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
  parent.removeChild(wrap);
}

function makeUsdNode(text: string, classes: string[]): HTMLSpanElement {
  const node = document.createElement('span');
  node.className = classes.join(' ');
  node.textContent = text;
  return node;
}

export function applyConversion(
  el: HTMLElement,
  ruleId: string,
  usdText: string,
  mode: DisplayMode,
  usdFirst: boolean,
): boolean {
  removeConversion(el);
  if (mode === 'off') return false;

  ensureOriginalWrap(el);
  el.setAttribute(HASH_ATTR, hashText(getOriginalText(el)));

  if (mode === 'usd_only') {
    el.classList.add('avby-original-hidden');
    el.insertAdjacentElement(
      'afterend',
      makeUsdNode(usdText, [USD_NODE_CLASS, 'avby-usd--replace']),
    );
  } else if (usdFirst) {
    // USD shown bold/prepended, BYN faded into parens.
    el.classList.add('avby-original-faded');
    const usdNode = makeUsdNode(usdText, [USD_NODE_CLASS, 'avby-usd--lead']);
    el.insertBefore(usdNode, el.firstChild);
  } else {
    // Default: inline · USD muted appended after BYN.
    el.appendChild(makeUsdNode(' · ' + usdText, [USD_NODE_CLASS, 'avby-usd--inline']));
  }

  el.setAttribute(DATA_ATTR, ruleId);
  return true;
}

export function removeConversion(el: HTMLElement): void {
  for (const cls of HOST_CLASSES) el.classList.remove(cls);
  el.removeAttribute(DATA_ATTR);
  el.removeAttribute(HASH_ATTR);

  for (const child of Array.from(el.querySelectorAll(`:scope > .${USD_NODE_CLASS}`))) {
    child.remove();
  }
  const next = el.nextElementSibling;
  if (next && next.classList.contains(USD_NODE_CLASS)) next.remove();

  unwrapOriginal(el);
}

export function isConverted(el: HTMLElement, ruleId: string): boolean {
  return el.getAttribute(DATA_ATTR) === ruleId;
}

export function getConvertedRuleId(el: HTMLElement): string | null {
  return el.getAttribute(DATA_ATTR);
}

export function getOriginalText(el: HTMLElement): string {
  const wrap = el.querySelector<HTMLSpanElement>(`:scope > [${ORIG_ATTR}]`);
  if (wrap) return wrap.textContent ?? '';
  return el.textContent ?? '';
}

export function originalTextChanged(el: HTMLElement): boolean {
  const stored = el.getAttribute(HASH_ATTR);
  if (stored === null) return false;
  return hashText(getOriginalText(el)) !== stored;
}

export function findAllConverted(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`));
}
