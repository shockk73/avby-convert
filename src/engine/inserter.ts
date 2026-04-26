import type { InsertionStyle, DisplayMode } from '../core/types';

const DATA_ATTR = 'data-avby-converted';
const USD_NODE_CLASS = 'avby-usd';

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

  const usdNode = document.createElement('span');
  usdNode.className = USD_NODE_CLASS;
  if (mode === 'usd_only') {
    usdNode.classList.add(`${USD_NODE_CLASS}--replace`);
    el.classList.add('avby-original-hidden');
  } else {
    usdNode.classList.add(`${USD_NODE_CLASS}--${style}`);
  }
  usdNode.textContent = usdText;

  if (style === 'below' && mode === 'both') {
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
  const child = el.querySelector(`:scope > .${USD_NODE_CLASS}`);
  if (child) child.remove();
  const next = el.nextElementSibling;
  if (next && next.classList.contains(USD_NODE_CLASS)) next.remove();
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

export function findAllConverted(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`));
}
