// Cross-browser shim: Firefox exposes `browser`, Chrome exposes `chrome`.
// Both implement the same MV3 API surface for what we use.
export const browserApi: typeof chrome =
  (typeof globalThis !== 'undefined' && (globalThis as any).browser)
    ? (globalThis as any).browser
    : chrome;
