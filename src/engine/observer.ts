const DEBOUNCE_MS = 150;

export type RescanFn = (changedRoots: HTMLElement[]) => void;

/**
 * Observe document.body for added/changed nodes. Coalesces bursts within
 * DEBOUNCE_MS into a single rescan call with the union of changed roots.
 * Returns a disposer.
 */
export function startObserver(rescan: RescanFn): () => void {
  let pending: Set<HTMLElement> = new Set();
  let timer: number | null = null;

  function flush() {
    timer = null;
    const roots = Array.from(pending);
    pending = new Set();
    rescan(roots);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) pending.add(node as HTMLElement);
      }
      if (m.type === 'characterData' && m.target.parentElement) {
        pending.add(m.target.parentElement);
      }
    }
    if (timer === null) {
      timer = window.setTimeout(flush, DEBOUNCE_MS);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    observer.disconnect();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
