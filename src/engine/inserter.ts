import type { InsertionStyle, DisplayMode } from '../core/types';

const DATA_ATTR = 'data-avby-converted';
const HASH_ATTR = 'data-avby-orig-hash';
const ORIG_ATTR = 'data-avby-original';
const USD_NODE_CLASS = 'avby-usd';

/**
 * Cheap DJB2 hash. We only need to detect "did the original text change",
 * collisions on short price strings are extremely unlikely and the consequence
 * of a collision is a missed re-render — not corruption.
 */
function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return s.length + ':' + (h >>> 0).toString(36);
}

/**
 * Wrap el's existing non-USD children inside a <span data-avby-original> marker
 * so that subsequent passes can read the original text without picking up the
 * appended USD label. No-op if the marker already exists.
 */
function ensureOriginalWrap(el: HTMLElement): HTMLSpanElement {
  const existing = el.querySelector<HTMLSpanElement>(`:scope > [${ORIG_ATTR}]`);
  if (existing) return existing;
  const wrap = document.createElement('span');
  wrap.setAttribute(ORIG_ATTR, '');
  // Move every current child into the wrap, except any prior USD node (there
  // shouldn't be one since applyConversion calls removeConversion first, but
  // be defensive).
  const children = Array.from(el.childNodes);
  for (const node of children) {
    if (
      node.nodeType === 1 &&
      (node as HTMLElement).classList?.contains(USD_NODE_CLASS)
    ) {
      continue;
    }
    wrap.appendChild(node);
  }
  el.appendChild(wrap);
  return wrap;
}

/**
 * Reverse of ensureOriginalWrap: move the marker's children back inline and
 * remove the marker span. Safe to call when no marker is present.
 */
function unwrapOriginal(el: HTMLElement): void {
  const wrap = el.querySelector<HTMLSpanElement>(`:scope > [${ORIG_ATTR}]`);
  if (!wrap) return;
  const parent = wrap.parentNode!;
  while (wrap.firstChild) parent.insertBefore(wrap.firstChild, wrap);
  parent.removeChild(wrap);
}

/**
 * Insert (or update) the USD label next to/below an original element.
 * Returns true if the element now has a USD label, false if it was removed.
 *
 * mode === 'off'      — remove any existing label, hide nothing.
 * mode === 'usd_only' — replace: hide original via class, show USD label only.
 * mode === 'both'     — show both; insertion style governs placement.
 */
export function applyConversion(
  el: HTMLElement,
  ruleId: string,
  usdText: string,
  mode: DisplayMode,
  style: InsertionStyle,
): boolean {
  removeConversion(el);

  if (mode === 'off') return false;

  // Wrap the original content first so subsequent passes can detect text
  // changes without confusing them with the USD label we are about to add.
  const wrap = ensureOriginalWrap(el);
  el.setAttribute(HASH_ATTR, hashText(wrap.textContent ?? ''));

  const usdNode = document.createElement('span');
  usdNode.className = USD_NODE_CLASS;
  if (mode === 'usd_only') {
    usdNode.classList.add(`${USD_NODE_CLASS}--replace`);
    el.classList.add('avby-original-hidden');
  } else {
    usdNode.classList.add(`${USD_NODE_CLASS}--${style}`);
  }
  usdNode.textContent = usdText;

  // For usd_only the original element is hidden via .avby-original-hidden
  // (display:none !important), so the USD node must live OUTSIDE el to remain
  // visible. For 'both' + 'below' we also insert as a sibling. Otherwise
  // (badge / inline) we append inside.
  if (mode === 'usd_only' || (style === 'below' && mode === 'both')) {
    el.insertAdjacentElement('afterend', usdNode);
  } else {
    el.appendChild(usdNode);
  }

  el.setAttribute(DATA_ATTR, ruleId);
  return true;
}

export function removeConversion(el: HTMLElement): void {
  el.classList.remove('avby-original-hidden');
  el.removeAttribute(DATA_ATTR);
  el.removeAttribute(HASH_ATTR);
  const child = el.querySelector(`:scope > .${USD_NODE_CLASS}`);
  if (child) child.remove();
  const next = el.nextElementSibling;
  if (next && next.classList.contains(USD_NODE_CLASS)) next.remove();
  unwrapOriginal(el);
}

export function isConverted(el: HTMLElement, ruleId: string): boolean {
  return el.getAttribute(DATA_ATTR) === ruleId;
}

/**
 * Return the rule id that previously converted this element, or null if none.
 * Used by the walker to enforce first-rule-wins across rules without leaking
 * the data-attribute name out of this module.
 */
export function getConvertedRuleId(el: HTMLElement): string | null {
  return el.getAttribute(DATA_ATTR);
}

/**
 * Read the element's "original" text — the BYN content as it stood at the
 * moment of first conversion (preserved inside [data-avby-original]). For
 * elements that have not yet been converted, falls back to the element's full
 * textContent. Either way, the returned string excludes any USD label that
 * applyConversion may have appended.
 */
export function getOriginalText(el: HTMLElement): string {
  const wrap = el.querySelector<HTMLSpanElement>(`:scope > [${ORIG_ATTR}]`);
  if (wrap) return wrap.textContent ?? '';
  return el.textContent ?? '';
}

/**
 * Returns true when the original text under [data-avby-original] no longer
 * matches the hash that was stored when the conversion was applied. Indicates
 * the element should be re-converted (e.g. AJAX price update).
 */
export function originalTextChanged(el: HTMLElement): boolean {
  const stored = el.getAttribute(HASH_ATTR);
  if (stored === null) return false;
  return hashText(getOriginalText(el)) !== stored;
}

export function findAllConverted(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`));
}
