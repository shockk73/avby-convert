# avby-convert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free Chrome/Firefox browser extension that displays approximate USD prices next to BYN prices on `*.av.by` car listing pages, with a configurable, fully data-driven rule engine.

**Architecture:** Pure TypeScript, four independent layers — `core/` (parsing/formatting/conversion logic, fully unit-tested), `config/` (default groups + rules + merge logic), `engine/` (content script: rate watcher + DOM walker + MutationObserver + inserter), `ui/` (vanilla DOM popup and options page). Storage via `chrome.storage.local` (typed wrapper). One esbuild script (`build.mjs`) produces two builds (Chrome MV3 service worker, Firefox MV3 background scripts) from one source tree.

**Tech Stack:** TypeScript 5, esbuild, vitest, Manifest V3, vanilla DOM. No frameworks.

**Reference spec:** [docs/superpowers/specs/2026-04-26-avby-convert-design.md](../specs/2026-04-26-avby-convert-design.md)

---

## Phase 1 — Foundation

### Task 1: Initialise repository and tooling

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `LICENSE`
- Create: `README.md` (placeholder, will be filled in Task 22)

- [ ] **Step 1: Initialise git**

```bash
git init
git config user.name "shockk73"
git config user.email "<your-email>"
```

(Skip the config commands if global git config is already set.)

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
*.zip
.DS_Store
*.log
.env
.vscode/
.idea/
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "avby-convert",
  "version": "0.1.0",
  "description": "Free Chrome/Firefox extension that shows approximate USD prices next to BYN on av.by car listings.",
  "private": true,
  "type": "module",
  "license": "MIT",
  "homepage": "https://github.com/shockk73/avby-convert",
  "repository": {
    "type": "git",
    "url": "https://github.com/shockk73/avby-convert.git"
  },
  "scripts": {
    "build": "node build.mjs",
    "build:dev": "node build.mjs --dev --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "node build.mjs && node scripts/zip.mjs"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.270",
    "@types/firefox-webext-browser": "^120.0.4",
    "@types/node": "^20.12.0",
    "esbuild": "^0.21.5",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome", "node", "vitest/globals"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "tests/**/*", "build.mjs", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 shockk73

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 7: Create placeholder `README.md`**

```markdown
# avby-convert

Free Chrome/Firefox extension that shows approximate USD prices next to BYN on av.by car listings.

Full README will be added at the end of implementation.
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

Expected: dependencies install without error, `node_modules/` and `package-lock.json` appear.

- [ ] **Step 9: Verify typecheck passes (no source files yet, so should be no-op)**

```bash
npx tsc --noEmit
```

Expected: exits 0 with no output.

- [ ] **Step 10: Initial commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vitest.config.ts LICENSE README.md
git commit -m "chore: initialise project tooling"
```

---

### Task 2: Manifests and source skeleton

**Files:**
- Create: `src/manifest/chrome.json`
- Create: `src/manifest/firefox.json`
- Create: `src/background/index.ts`
- Create: `src/shared/browser.ts`

- [ ] **Step 1: Create `src/manifest/chrome.json`**

```json
{
  "manifest_version": 3,
  "name": "avby → USD",
  "version": "0.1.0",
  "description": "Показывает примерные цены в USD рядом с BYN на av.by",
  "minimum_chrome_version": "109",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    },
    "default_title": "avby → USD"
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["*://*.av.by/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage"]
}
```

- [ ] **Step 2: Create `src/manifest/firefox.json`**

```json
{
  "manifest_version": 3,
  "name": "avby → USD",
  "version": "0.1.0",
  "description": "Показывает примерные цены в USD рядом с BYN на av.by",
  "browser_specific_settings": {
    "gecko": {
      "id": "avby-convert@shockk73.github.io",
      "strict_min_version": "115.0"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    },
    "default_title": "avby → USD"
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "background": {
    "scripts": ["background.js"]
  },
  "content_scripts": [
    {
      "matches": ["*://*.av.by/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage"]
}
```

(Note: icons referenced now so manifests are valid; placeholder PNGs created in Task 19.)

- [ ] **Step 3: Create `src/background/index.ts`**

```ts
// MV3 requires a background entry point but we don't need any logic.
// Engine + UI talk directly to chrome.storage.local.
export {};
```

- [ ] **Step 4: Create `src/shared/browser.ts`**

```ts
// Cross-browser shim: Firefox exposes `browser`, Chrome exposes `chrome`.
// Both implement the same MV3 API surface for what we use.
export const browserApi: typeof chrome =
  (typeof globalThis !== 'undefined' && (globalThis as any).browser)
    ? (globalThis as any).browser
    : chrome;
```

- [ ] **Step 5: Verify typecheck still passes**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/manifest src/background src/shared
git commit -m "chore: add manifest skeletons and browser shim"
```

---

## Phase 2 — Core logic (TDD)

### Task 3: Core types

**Files:**
- Create: `src/core/types.ts`

- [ ] **Step 1: Create `src/core/types.ts`**

```ts
export type Group = {
  id: string;
  description: string;
  match: string;        // regex source
  captures: string[];
  format: string;       // template with {name|filter} tokens
};

export type Rule = {
  id: string;
  selector: string;
  groupId: string;
  enabled: boolean;
  description?: string;
};

export type GroupOverride = Partial<Group> & { id: string; isCustom?: boolean };
export type RuleOverride  = Partial<Rule>  & { id: string; isCustom?: boolean };

export type DisplayMode = 'both' | 'usd_only' | 'off';
export type InsertionStyle = 'parens' | 'badge' | 'below';

export type Settings = {
  mode: DisplayMode;
  insertionStyle: InsertionStyle;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: 'both',
  insertionStyle: 'parens',
};

export type RateCache = {
  rate: number;          // BYN per 1 USD
  fetchedAt: number;     // epoch ms
};

export type StoredConfig = {
  groupOverrides?: GroupOverride[];
  ruleOverrides?: RuleOverride[];
  settings?: Settings;
  rateCache?: RateCache;
};
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat(core): add shared type definitions"
```

---

### Task 4: Convert (BYN → USD with rounding)

**Files:**
- Create: `src/core/convert.ts`
- Create: `tests/convert.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/convert.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bynToUsd, applyRoundingRule } from '../src/core/convert';

describe('bynToUsd', () => {
  it('divides amount by rate', () => {
    expect(bynToUsd(282, 2.82)).toBeCloseTo(100, 5);
    expect(bynToUsd(322730, 2.82)).toBeCloseTo(114443.26, 1);
  });

  it('returns 0 for zero amount', () => {
    expect(bynToUsd(0, 2.82)).toBe(0);
  });

  it('throws for non-positive rate', () => {
    expect(() => bynToUsd(100, 0)).toThrow();
    expect(() => bynToUsd(100, -1)).toThrow();
  });
});

describe('applyRoundingRule', () => {
  it('returns whole-number string for amounts >= 1000', () => {
    expect(applyRoundingRule(11444.26)).toBe('11444');
    expect(applyRoundingRule(1000)).toBe('1000');
    expect(applyRoundingRule(99999.9)).toBe('100000');
  });

  it('returns two-decimal string for amounts < 1000', () => {
    expect(applyRoundingRule(333)).toBe('333.00');
    expect(applyRoundingRule(0.5)).toBe('0.50');
    expect(applyRoundingRule(999.999)).toBe('1000');
  });

  it('handles 0 cleanly', () => {
    expect(applyRoundingRule(0)).toBe('0.00');
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx vitest run tests/convert.test.ts
```

Expected: FAIL with "Failed to load url ../src/core/convert".

- [ ] **Step 3: Implement `src/core/convert.ts`**

```ts
export function bynToUsd(amountByn: number, rate: number): number {
  if (rate <= 0) throw new Error(`invalid rate: ${rate}`);
  return amountByn / rate;
}

export function applyRoundingRule(usd: number): string {
  const rounded = Math.round(usd);
  if (rounded >= 1000) return String(rounded);
  return usd.toFixed(2);
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
npx vitest run tests/convert.test.ts
```

Expected: PASS, 7/7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/core/convert.ts tests/convert.test.ts
git commit -m "feat(core): BYN→USD conversion and rounding rule"
```

---

### Task 5: Parse — rate and BYN amount

**Files:**
- Create: `src/core/parse.ts`
- Create: `tests/parse.test.ts`
- Create: `tests/fixtures/sample-prices.ts`

- [ ] **Step 1: Create fixtures `tests/fixtures/sample-prices.ts`**

```ts
// Real-world strings observed on av.by, used for regression tests.
export const SAMPLE_RATE_TEXTS = [
  '1 USD = 2.82 BYN',
  '1 USD = 3.10 BYN',
  '1 USD  =  2.82  BYN',  // extra spaces
];

export const SAMPLE_SINGLE_BYN_TEXTS: Array<[string, number]> = [
  ['322 730 р.', 322730],
  ['1 000 р.', 1000],
  ['322 730 р.', 322730],   // NBSP separator
  ['322 730 BYN', 322730],
];

export const SAMPLE_LEASING_TEXTS: Array<[string, number]> = [
  ['1639 BYN в месяц', 1639],
  ['Лизинг от 939 BYN в месяц', 939],
  ['Лизинг от 939 BYN в месяц', 939],
];

export const SAMPLE_RANGE_TEXTS: Array<[string, [number, number]]> = [
  ['32 000 — 47 999 BYN', [32000, 47999]],
  ['32000 - 47999 BYN', [32000, 47999]],
  ['1 000 — 2 000 BYN', [1000, 2000]],
];
```

- [ ] **Step 2: Write failing tests for `parseRate` and `parseAmount`**

Create `tests/parse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRate, parseAmount } from '../src/core/parse';
import { SAMPLE_RATE_TEXTS } from './fixtures/sample-prices';

describe('parseRate', () => {
  it.each(SAMPLE_RATE_TEXTS)('parses "%s"', (text) => {
    const rate = parseRate(text);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(100);
  });

  it('returns null for unparseable text', () => {
    expect(parseRate('hello world')).toBeNull();
    expect(parseRate('')).toBeNull();
    expect(parseRate('1 EUR = 3.5 BYN')).toBeNull();
  });

  it('extracts the BYN value as a number', () => {
    expect(parseRate('1 USD = 2.82 BYN')).toBe(2.82);
    expect(parseRate('1 USD = 3.10 BYN')).toBe(3.10);
  });

  it('rejects implausible rates (≤ 0 or > 100)', () => {
    expect(parseRate('1 USD = 0 BYN')).toBeNull();
    expect(parseRate('1 USD = 1000 BYN')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('strips spaces and NBSPs', () => {
    expect(parseAmount('322 730')).toBe(322730);
    expect(parseAmount('322 730')).toBe(322730);
    expect(parseAmount('  1 000  ')).toBe(1000);
  });

  it('returns NaN for non-numeric', () => {
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
  });

  it('handles decimals', () => {
    expect(parseAmount('2.82')).toBe(2.82);
    expect(parseAmount('2,82')).toBe(2.82);  // comma as decimal separator
  });
});
```

- [ ] **Step 3: Run tests, verify FAIL**

```bash
npx vitest run tests/parse.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Implement `src/core/parse.ts` (partial — only `parseRate` and `parseAmount`)**

```ts
const RATE_REGEX = /1\s*USD\s*=\s*([\d.,]+)\s*BYN/i;

export function parseRate(text: string): number | null {
  const match = RATE_REGEX.exec(text);
  if (!match) return null;
  const num = parseAmount(match[1]!);
  if (!Number.isFinite(num) || num <= 0 || num > 100) return null;
  return num;
}

export function parseAmount(raw: string): number {
  // Strip all whitespace (including NBSP) and normalise comma → dot.
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.');
  if (cleaned === '') return NaN;
  return Number(cleaned);
}
```

- [ ] **Step 5: Run tests, verify PASS**

```bash
npx vitest run tests/parse.test.ts
```

Expected: PASS for all parseRate / parseAmount tests.

- [ ] **Step 6: Commit**

```bash
git add src/core/parse.ts tests/parse.test.ts tests/fixtures/sample-prices.ts
git commit -m "feat(core): parse exchange rate and numeric amounts"
```

---

### Task 6: Format — template engine and formatUsd

**Files:**
- Create: `src/core/format.ts`
- Create: `tests/format.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatUsd, formatTemplate } from '../src/core/format';

describe('formatUsd', () => {
  it('whole dollars for amounts >= $1000', () => {
    expect(formatUsd(11444.26)).toBe('$11 444');
    expect(formatUsd(1000)).toBe('$1 000');
  });

  it('two decimals for amounts < $1000', () => {
    expect(formatUsd(333)).toBe('$333.00');
    expect(formatUsd(99.5)).toBe('$99.50');
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('uses narrow no-break space as thousands separator', () => {
    expect(formatUsd(1234567)).toBe('$1 234 567');
  });
});

describe('formatTemplate', () => {
  const rate = 2.82;

  it('substitutes a single {name|usd} token', () => {
    const out = formatTemplate('~{amount|usd}', { amount: '322 730' }, rate);
    expect(out).toBe('~$11 444');
  });

  it('substitutes multiple tokens', () => {
    const out = formatTemplate('~{min|usd} — {max|usd}', { min: '32 000', max: '47 999' }, rate);
    expect(out).toBe('~$11 348 — $17 021');
  });

  it('keeps surrounding text intact', () => {
    const out = formatTemplate('~{amount|usd} в месяц', { amount: '939' }, rate);
    expect(out).toBe('~$333.00 в месяц');
  });

  it('throws for unknown token name', () => {
    expect(() => formatTemplate('~{missing|usd}', { amount: '100' }, rate)).toThrow(/missing/);
  });

  it('throws for unknown filter', () => {
    expect(() => formatTemplate('{amount|eur}', { amount: '100' }, rate)).toThrow(/eur/);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

```bash
npx vitest run tests/format.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/core/format.ts`**

```ts
import { bynToUsd, applyRoundingRule } from './convert';
import { parseAmount } from './parse';

const NARROW_NBSP = ' ';

function withThousands(integerStr: string): string {
  return integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
}

export function formatUsd(usd: number): string {
  const formatted = applyRoundingRule(usd);
  if (formatted.includes('.')) {
    const [intPart, decPart] = formatted.split('.');
    return `$${withThousands(intPart!)}.${decPart}`;
  }
  return `$${withThousands(formatted)}`;
}

const TOKEN_REGEX = /\{(\w+)\|(\w+)\}/g;

const FILTERS: Record<string, (rawValue: string, rate: number) => string> = {
  usd: (raw, rate) => {
    const byn = parseAmount(raw);
    if (!Number.isFinite(byn)) throw new Error(`cannot parse amount "${raw}"`);
    return formatUsd(bynToUsd(byn, rate));
  },
};

export function formatTemplate(
  template: string,
  captures: Record<string, string>,
  rate: number,
): string {
  return template.replace(TOKEN_REGEX, (_, name: string, filter: string) => {
    if (!(name in captures)) throw new Error(`unknown capture name: ${name}`);
    const fn = FILTERS[filter];
    if (!fn) throw new Error(`unknown filter: ${filter}`);
    return fn(captures[name]!, rate);
  });
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
npx vitest run tests/format.test.ts
```

Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/format.ts tests/format.test.ts
git commit -m "feat(core): USD formatting and template engine"
```

---

### Task 7: Parse — applyGroupRegex (the engine entry point)

**Files:**
- Modify: `src/core/parse.ts`
- Modify: `tests/parse.test.ts`

- [ ] **Step 1: Write failing tests** — append to `tests/parse.test.ts`:

```ts
import { applyGroupRegex } from '../src/core/parse';
import type { Group } from '../src/core/types';
import {
  SAMPLE_SINGLE_BYN_TEXTS,
  SAMPLE_LEASING_TEXTS,
  SAMPLE_RANGE_TEXTS,
} from './fixtures/sample-prices';

const SINGLE_BYN: Group = {
  id: 'single_byn',
  description: '',
  match: '([\\d\\s\\u00A0]+)\\s*(?:р\\.|BYN|руб)',
  captures: ['amount'],
  format: '~{amount|usd}',
};

const LEASING: Group = {
  id: 'leasing_monthly',
  description: '',
  match: '([\\d\\s\\u00A0]+)\\s*BYN\\s*в\\s*месяц',
  captures: ['amount'],
  format: '~{amount|usd} в месяц',
};

const RANGE: Group = {
  id: 'range_byn',
  description: '',
  match: '([\\d\\s\\u00A0]+)\\s*[—–-]\\s*([\\d\\s\\u00A0]+)\\s*BYN',
  captures: ['min', 'max'],
  format: '~{min|usd} — {max|usd}',
};

describe('applyGroupRegex', () => {
  it.each(SAMPLE_SINGLE_BYN_TEXTS)(
    'single_byn parses "%s"',
    (text, expected) => {
      const captures = applyGroupRegex(SINGLE_BYN, text);
      expect(captures).not.toBeNull();
      expect(captures!.amount).toBeDefined();
      expect(Number(captures!.amount.replace(/[\s ]/g, ''))).toBe(expected);
    },
  );

  it.each(SAMPLE_LEASING_TEXTS)('leasing_monthly parses "%s"', (text, expected) => {
    const captures = applyGroupRegex(LEASING, text);
    expect(captures).not.toBeNull();
    expect(Number(captures!.amount.replace(/[\s ]/g, ''))).toBe(expected);
  });

  it.each(SAMPLE_RANGE_TEXTS)('range_byn parses "%s"', (text, [min, max]) => {
    const captures = applyGroupRegex(RANGE, text);
    expect(captures).not.toBeNull();
    expect(Number(captures!.min.replace(/[\s ]/g, ''))).toBe(min);
    expect(Number(captures!.max.replace(/[\s ]/g, ''))).toBe(max);
  });

  it('returns null on no match', () => {
    expect(applyGroupRegex(SINGLE_BYN, 'no number here')).toBeNull();
  });

  it('throws when group has wrong number of captures', () => {
    const broken: Group = { ...SINGLE_BYN, captures: ['a', 'b'] };  // expects 2, regex has 1
    expect(() => applyGroupRegex(broken, '100 р.')).toThrow(/captures/);
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

```bash
npx vitest run tests/parse.test.ts -t applyGroupRegex
```

Expected: FAIL.

- [ ] **Step 3: Implement `applyGroupRegex` — append to `src/core/parse.ts`**

```ts
import type { Group } from './types';

const compiledCache = new WeakMap<Group, RegExp>();

function compileGroupRegex(group: Group): RegExp {
  let re = compiledCache.get(group);
  if (re) return re;
  re = new RegExp(group.match);
  compiledCache.set(group, re);
  return re;
}

export function applyGroupRegex(
  group: Group,
  text: string,
): Record<string, string> | null {
  const re = compileGroupRegex(group);
  const match = re.exec(text);
  if (!match) return null;
  const captureValues = match.slice(1);
  if (captureValues.length !== group.captures.length) {
    throw new Error(
      `group "${group.id}": regex has ${captureValues.length} capture(s), but captures array has ${group.captures.length}`,
    );
  }
  const out: Record<string, string> = {};
  for (let i = 0; i < group.captures.length; i++) {
    out[group.captures[i]!] = captureValues[i]!;
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
npx vitest run tests/parse.test.ts
```

Expected: ALL pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/parse.ts tests/parse.test.ts
git commit -m "feat(core): applyGroupRegex extracts named captures"
```

---

## Phase 3 — Configuration

### Task 8: Default groups and rules

**Files:**
- Create: `src/config/default-groups.ts`
- Create: `src/config/default-rules.ts`

- [ ] **Step 1: Create `src/config/default-groups.ts`**

```ts
import type { Group } from '../core/types';

export const DEFAULT_GROUPS: Group[] = [
  {
    id: 'single_byn',
    description: 'Одна цена в BYN — например "322 730 р." или "322 730 BYN"',
    match: '([\\d\\s\\u00A0]+)\\s*(?:р\\.|BYN|руб)',
    captures: ['amount'],
    format: '~{amount|usd}',
  },
  {
    id: 'leasing_monthly',
    description: 'Ежемесячный платёж лизинга — например "1639 BYN в месяц"',
    match: '([\\d\\s\\u00A0]+)\\s*BYN\\s*в\\s*месяц',
    captures: ['amount'],
    format: '~{amount|usd} в месяц',
  },
  {
    id: 'range_byn',
    description: 'Диапазон цен в BYN — например "32 000 — 47 999 BYN"',
    match: '([\\d\\s\\u00A0]+)\\s*[—–-]\\s*([\\d\\s\\u00A0]+)\\s*BYN',
    captures: ['min', 'max'],
    format: '~{min|usd} — {max|usd}',
  },
];
```

- [ ] **Step 2: Create `src/config/default-rules.ts`**

```ts
import type { Rule } from '../core/types';

export const DEFAULT_RULES: Rule[] = [
  // Цены машин (single_byn)
  { id: 'listing_card_price',     selector: '.listing-item__price-primary',       groupId: 'single_byn',      enabled: true, description: 'Цена в карточке листинга' },
  { id: 'card_price_button',      selector: '.card__price-button',                groupId: 'single_byn',      enabled: true, description: 'Цена-кнопка на детальной' },
  { id: 'listing_top_price',      selector: '.listing-top__price-primary span',   groupId: 'single_byn',      enabled: true, description: 'Цена в шапке листинга' },
  { id: 'listing_index_price',    selector: '.listing-index__price',              groupId: 'single_byn',      enabled: true, description: 'Цена в индексной карточке' },

  // Лизинг (leasing_monthly + одно single_byn)
  { id: 'side_finance_lead',      selector: '.side-finance__lead',                groupId: 'leasing_monthly', enabled: true, description: 'Лизинг — боковая панель' },
  { id: 'finance_item_subtitle',  selector: '.finance-item__subtitle',            groupId: 'leasing_monthly', enabled: true, description: 'Лизинг — подпись' },
  { id: 'listing_item_finance',   selector: '.listing-item__finance a',           groupId: 'leasing_monthly', enabled: true, description: 'Лизинг в карточке листинга' },
  { id: 'card_finance_desc',      selector: '.card-finance__description',         groupId: 'single_byn',      enabled: true, description: 'Финансирование — описание (общая сумма)' },

  // Диапазоны
  { id: 'finance_item_sum',       selector: '.finance-item__sum',                 groupId: 'range_byn',       enabled: true, description: 'Диапазон цен' },
];

export const RATE_SELECTOR = '.main-converter div';
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/config/default-groups.ts src/config/default-rules.ts
git commit -m "feat(config): add default groups, rules, and rate selector"
```

---

### Task 9: Merge defaults with user overrides

**Files:**
- Create: `src/config/merge.ts`
- Create: `tests/merge.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeRules, mergeGroups } from '../src/config/merge';
import type { Rule, Group, RuleOverride, GroupOverride } from '../src/core/types';

const baseRules: Rule[] = [
  { id: 'a', selector: '.a', groupId: 'single_byn', enabled: true,  description: 'A' },
  { id: 'b', selector: '.b', groupId: 'single_byn', enabled: true,  description: 'B' },
];

const baseGroups: Group[] = [
  { id: 'single_byn', description: 'd', match: 'm', captures: ['amount'], format: '~{amount|usd}' },
];

describe('mergeRules', () => {
  it('returns defaults when no overrides', () => {
    const merged = mergeRules(baseRules, []);
    expect(merged).toEqual(baseRules);
  });

  it('applies enabled override', () => {
    const overrides: RuleOverride[] = [{ id: 'a', enabled: false }];
    const merged = mergeRules(baseRules, overrides);
    expect(merged.find(r => r.id === 'a')!.enabled).toBe(false);
    expect(merged.find(r => r.id === 'b')!.enabled).toBe(true);
  });

  it('applies selector override but keeps other fields', () => {
    const overrides: RuleOverride[] = [{ id: 'a', selector: '.a-new' }];
    const merged = mergeRules(baseRules, overrides);
    const a = merged.find(r => r.id === 'a')!;
    expect(a.selector).toBe('.a-new');
    expect(a.description).toBe('A');
    expect(a.enabled).toBe(true);
  });

  it('appends custom rules with isCustom flag', () => {
    const overrides: RuleOverride[] = [
      { id: 'custom1', selector: '.x', groupId: 'single_byn', enabled: true, isCustom: true, description: 'C' },
    ];
    const merged = mergeRules(baseRules, overrides);
    expect(merged).toHaveLength(3);
    expect(merged.find(r => r.id === 'custom1')!.selector).toBe('.x');
  });

  it('ignores override with unknown non-custom id', () => {
    const overrides: RuleOverride[] = [{ id: 'ghost', enabled: false }];
    const merged = mergeRules(baseRules, overrides);
    expect(merged).toHaveLength(2);
  });

  it('keeps user customisations when defaults change selectors', () => {
    const newDefaults: Rule[] = [
      { id: 'a', selector: '.a-updated', groupId: 'single_byn', enabled: true, description: 'A' },
    ];
    const overrides: RuleOverride[] = [{ id: 'a', enabled: false }];
    const merged = mergeRules(newDefaults, overrides);
    const a = merged.find(r => r.id === 'a')!;
    expect(a.selector).toBe('.a-updated');  // new default selector picked up
    expect(a.enabled).toBe(false);          // user-disabled state preserved
  });
});

describe('mergeGroups', () => {
  it('returns defaults when no overrides', () => {
    expect(mergeGroups(baseGroups, [])).toEqual(baseGroups);
  });

  it('applies format override', () => {
    const overrides: GroupOverride[] = [{ id: 'single_byn', format: '{amount|usd}' }];
    const merged = mergeGroups(baseGroups, overrides);
    expect(merged.find(g => g.id === 'single_byn')!.format).toBe('{amount|usd}');
  });

  it('appends custom groups', () => {
    const overrides: GroupOverride[] = [
      {
        id: 'rental_per_day',
        description: 'Аренда',
        match: '([\\d\\s]+)\\s*BYN\\s*в\\s*сутки',
        captures: ['amount'],
        format: '~{amount|usd} в сутки',
        isCustom: true,
      },
    ];
    const merged = mergeGroups(baseGroups, overrides);
    expect(merged).toHaveLength(2);
    expect(merged.find(g => g.id === 'rental_per_day')!.format).toBe('~{amount|usd} в сутки');
  });
});
```

- [ ] **Step 2: Run tests, verify FAIL**

```bash
npx vitest run tests/merge.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `src/config/merge.ts`**

```ts
import type { Rule, Group, RuleOverride, GroupOverride } from '../core/types';

export function mergeRules(defaults: Rule[], overrides: RuleOverride[]): Rule[] {
  const byId = new Map<string, Rule>();
  for (const d of defaults) byId.set(d.id, { ...d });

  for (const o of overrides) {
    if (o.isCustom) {
      if (!o.selector || !o.groupId) continue;
      byId.set(o.id, {
        id: o.id,
        selector: o.selector,
        groupId: o.groupId,
        enabled: o.enabled ?? true,
        description: o.description,
      });
    } else {
      const existing = byId.get(o.id);
      if (!existing) continue;
      const { id: _id, isCustom: _ic, ...rest } = o;
      Object.assign(existing, rest);
    }
  }
  return [...byId.values()];
}

export function mergeGroups(defaults: Group[], overrides: GroupOverride[]): Group[] {
  const byId = new Map<string, Group>();
  for (const d of defaults) byId.set(d.id, { ...d });

  for (const o of overrides) {
    if (o.isCustom) {
      if (!o.match || !o.captures || !o.format || !o.description) continue;
      byId.set(o.id, {
        id: o.id,
        description: o.description,
        match: o.match,
        captures: o.captures,
        format: o.format,
      });
    } else {
      const existing = byId.get(o.id);
      if (!existing) continue;
      const { id: _id, isCustom: _ic, ...rest } = o;
      Object.assign(existing, rest);
    }
  }
  return [...byId.values()];
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
npx vitest run tests/merge.test.ts
```

Expected: ALL pass.

- [ ] **Step 5: Commit**

```bash
git add src/config/merge.ts tests/merge.test.ts
git commit -m "feat(config): merge defaults with user overrides"
```

---

## Phase 4 — Storage

### Task 10: Typed storage wrapper

**Files:**
- Create: `src/storage/index.ts`

- [ ] **Step 1: Implement `src/storage/index.ts`**

```ts
import { browserApi } from '../shared/browser';
import type { StoredConfig, Settings, RateCache, RuleOverride, GroupOverride } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';

const STORAGE_KEY = 'avby-convert';

export async function loadConfig(): Promise<StoredConfig> {
  try {
    const result = await browserApi.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    if (!stored || typeof stored !== 'object') return {};
    return stored as StoredConfig;
  } catch {
    console.warn('[avby-convert] storage corrupted, using defaults');
    return {};
  }
}

export async function saveConfig(patch: Partial<StoredConfig>): Promise<void> {
  const current = await loadConfig();
  const next: StoredConfig = { ...current, ...patch };
  await browserApi.storage.local.set({ [STORAGE_KEY]: next });
}

export async function getSettings(): Promise<Settings> {
  const cfg = await loadConfig();
  return { ...DEFAULT_SETTINGS, ...(cfg.settings ?? {}) };
}

export async function setSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await saveConfig({ settings: { ...current, ...settings } });
}

export async function getRate(): Promise<RateCache | null> {
  const cfg = await loadConfig();
  return cfg.rateCache ?? null;
}

export async function setRate(rate: number): Promise<void> {
  await saveConfig({ rateCache: { rate, fetchedAt: Date.now() } });
}

export async function getRuleOverrides(): Promise<RuleOverride[]> {
  return (await loadConfig()).ruleOverrides ?? [];
}

export async function setRuleOverrides(overrides: RuleOverride[]): Promise<void> {
  await saveConfig({ ruleOverrides: overrides });
}

export async function getGroupOverrides(): Promise<GroupOverride[]> {
  return (await loadConfig()).groupOverrides ?? [];
}

export async function setGroupOverrides(overrides: GroupOverride[]): Promise<void> {
  await saveConfig({ groupOverrides: overrides });
}

export async function resetToDefaults(): Promise<void> {
  await browserApi.storage.local.remove(STORAGE_KEY);
}

export function onConfigChanged(callback: (config: StoredConfig) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local') return;
    const change = changes[STORAGE_KEY];
    if (!change) return;
    callback((change.newValue as StoredConfig) ?? {});
  };
  browserApi.storage.onChanged.addListener(listener);
  return () => browserApi.storage.onChanged.removeListener(listener);
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/storage/index.ts
git commit -m "feat(storage): typed wrapper over chrome.storage.local"
```

---

## Phase 5 — Engine (content script)

### Task 11: Inserter (DOM insertion strategies)

**Files:**
- Create: `src/engine/inserter.ts`
- Create: `src/engine/styles.css`

- [ ] **Step 1: Create `src/engine/styles.css`**

```css
.avby-usd {
  color: rgba(0, 0, 0, 0.55);
  font-weight: normal;
  margin-left: 0.35em;
  white-space: nowrap;
}

.avby-usd--badge {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 0.5em;
  border-radius: 4px;
  background: rgba(34, 139, 34, 0.12);
  color: rgb(34, 100, 34);
  font-size: 0.85em;
}

.avby-usd--below {
  display: block;
  margin-left: 0;
  margin-top: 2px;
  font-size: 0.85em;
}

.avby-usd--replace {
  /* full replacement: USD shown alone, original BYN hidden via .avby-original-hidden */
}

.avby-original-hidden {
  display: none !important;
}

@media (prefers-color-scheme: dark) {
  .avby-usd {
    color: rgba(255, 255, 255, 0.6);
  }
  .avby-usd--badge {
    background: rgba(80, 200, 80, 0.18);
    color: rgb(140, 220, 140);
  }
}
```

- [ ] **Step 2: Implement `src/engine/inserter.ts`**

```ts
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

export function findAllConverted(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_ATTR}]`));
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/engine/inserter.ts src/engine/styles.css
git commit -m "feat(engine): inserter handles three display modes and styles"
```

---

### Task 12: Rate watcher

**Files:**
- Create: `src/engine/rate-watcher.ts`

- [ ] **Step 1: Implement `src/engine/rate-watcher.ts`**

```ts
import { parseRate } from '../core/parse';
import { setRate } from '../storage';
import { RATE_SELECTOR } from '../config/default-rules';

let lastSeenRate: number | null = null;

/**
 * Look at the current DOM for a rate element. If found and the rate differs
 * from the last seen value, persist it to storage.
 */
export async function checkRate(): Promise<void> {
  const el = document.querySelector(RATE_SELECTOR);
  if (!el) return;
  const text = el.textContent ?? '';
  const rate = parseRate(text);
  if (rate === null) {
    console.warn(`[avby-convert] failed to parse rate: "${text}"`);
    return;
  }
  if (rate === lastSeenRate) return;
  lastSeenRate = rate;
  await setRate(rate);
}

/**
 * Set up a one-shot check now plus reactive checks whenever the rate element
 * itself changes. Returns a disposer.
 */
export function startRateWatcher(): () => void {
  void checkRate();

  const observer = new MutationObserver(() => {
    void checkRate();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  return () => observer.disconnect();
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/engine/rate-watcher.ts
git commit -m "feat(engine): watch and persist exchange rate from page"
```

---

### Task 13: DOM walker

**Files:**
- Create: `src/engine/dom-walker.ts`

- [ ] **Step 1: Implement `src/engine/dom-walker.ts`**

```ts
import type { Rule, Group, Settings } from '../core/types';
import { applyGroupRegex } from '../core/parse';
import { formatTemplate } from '../core/format';
import { applyConversion, removeConversion, isConverted, findAllConverted } from './inserter';

const failedMatches = new WeakSet<HTMLElement>();

export type WalkContext = {
  rules: Rule[];
  groupsById: Map<string, Group>;
  rate: number | null;
  settings: Settings;
};

/**
 * Walk the DOM (under root) and apply enabled rules. Idempotent — already
 * converted elements that match the same rule are skipped.
 */
export function walkAndConvert(ctx: WalkContext, root: ParentNode = document): void {
  if (ctx.settings.mode === 'off' || ctx.rate === null) return;

  for (const rule of ctx.rules) {
    if (!rule.enabled) continue;
    const group = ctx.groupsById.get(rule.groupId);
    if (!group) {
      console.warn(`[avby-convert] rule "${rule.id}" references unknown group "${rule.groupId}"`);
      continue;
    }

    let elements: HTMLElement[];
    try {
      elements = Array.from(root.querySelectorAll<HTMLElement>(rule.selector));
    } catch (e) {
      console.warn(`[avby-convert] invalid selector in rule "${rule.id}": ${rule.selector}`);
      continue;
    }

    for (const el of elements) {
      if (isConverted(el, rule.id)) continue;
      if (failedMatches.has(el)) continue;

      const text = el.textContent ?? '';
      let captures: Record<string, string> | null;
      try {
        captures = applyGroupRegex(group, text);
      } catch (e) {
        console.warn(`[avby-convert] regex error in group "${group.id}":`, e);
        continue;
      }
      if (!captures) {
        failedMatches.add(el);
        continue;
      }

      let usdText: string;
      try {
        usdText = formatTemplate(group.format, captures, ctx.rate);
      } catch (e) {
        console.warn(`[avby-convert] format error in group "${group.id}":`, e);
        continue;
      }

      applyConversion(el, rule.id, usdText, ctx.settings.mode, ctx.settings.insertionStyle);
    }
  }
}

/**
 * Remove all conversions from the DOM. Used when switching to mode: 'off' or
 * when the ruleset changes substantially.
 */
export function clearAllConversions(root: ParentNode = document): void {
  for (const el of findAllConverted(root)) {
    removeConversion(el);
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/engine/dom-walker.ts
git commit -m "feat(engine): walk DOM and apply conversion rules"
```

---

### Task 14: MutationObserver wrapper

**Files:**
- Create: `src/engine/observer.ts`

- [ ] **Step 1: Implement `src/engine/observer.ts`**

```ts
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
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/engine/observer.ts
git commit -m "feat(engine): debounced MutationObserver"
```

---

### Task 15: Engine orchestrator (content script entry)

**Files:**
- Create: `src/engine/index.ts`

- [ ] **Step 1: Implement `src/engine/index.ts`**

```ts
import { DEFAULT_GROUPS } from '../config/default-groups';
import { DEFAULT_RULES } from '../config/default-rules';
import { mergeGroups, mergeRules } from '../config/merge';
import { loadConfig, onConfigChanged } from '../storage';
import { walkAndConvert, clearAllConversions, type WalkContext } from './dom-walker';
import { startObserver } from './observer';
import { startRateWatcher } from './rate-watcher';
import { DEFAULT_SETTINGS, type StoredConfig } from '../core/types';

let context: WalkContext = {
  rules: [],
  groupsById: new Map(),
  rate: null,
  settings: DEFAULT_SETTINGS,
};

function rebuildContext(stored: StoredConfig): void {
  const rules  = mergeRules (DEFAULT_RULES,  stored.ruleOverrides  ?? []);
  const groups = mergeGroups(DEFAULT_GROUPS, stored.groupOverrides ?? []);
  const groupsById = new Map(groups.map(g => [g.id, g]));
  const settings = { ...DEFAULT_SETTINGS, ...(stored.settings ?? {}) };
  const rate = stored.rateCache?.rate ?? null;
  context = { rules, groupsById, rate, settings };
}

function rerenderEverything(): void {
  clearAllConversions();
  walkAndConvert(context);
}

async function init(): Promise<void> {
  const stored = await loadConfig();
  rebuildContext(stored);

  walkAndConvert(context);

  onConfigChanged((next) => {
    rebuildContext(next);
    rerenderEverything();
  });

  startObserver((roots) => {
    if (context.rate === null) return;
    if (roots.length === 0) {
      walkAndConvert(context);
    } else {
      for (const root of roots) walkAndConvert(context, root);
    }
  });

  startRateWatcher();
}

void init();
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/engine/index.ts
git commit -m "feat(engine): orchestrator wires storage, observer, walker, rate watcher"
```

---

## Phase 6 — UI

### Task 16: Popup

**Files:**
- Create: `src/ui/popup/popup.html`
- Create: `src/ui/popup/popup.css`
- Create: `src/ui/popup/popup.ts`

- [ ] **Step 1: Create `src/ui/popup/popup.html`**

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>av.by → USD</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <header>
    <h1>av.by → USD</h1>
  </header>

  <section>
    <h2>Курс</h2>
    <div class="rate" id="rate-box">
      <div class="rate-value" id="rate-value">Курс ещё не загружен</div>
      <div class="rate-meta" id="rate-meta"></div>
    </div>
  </section>

  <section>
    <h2>Режим</h2>
    <select id="mode-select" aria-label="Режим отображения">
      <option value="both">Показывать BYN и USD</option>
      <option value="usd_only">Показывать только USD</option>
      <option value="off">Выключено</option>
    </select>
  </section>

  <footer>
    <a href="#" id="open-options">⚙ Настройки</a>
    <a href="https://github.com/shockk73/avby-convert" target="_blank" rel="noopener">ⓘ GitHub</a>
  </footer>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/ui/popup/popup.css`**

```css
* { box-sizing: border-box; }
body {
  width: 320px;
  margin: 0;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 14px;
  background: #fff;
  color: #1a1a1a;
}
header h1 {
  font-size: 16px;
  margin: 0 0 12px;
}
section { margin-bottom: 12px; }
section h2 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #666;
  margin: 0 0 6px;
}
.rate {
  background: #f4f4f5;
  border-radius: 6px;
  padding: 10px 12px;
}
.rate-value { font-size: 15px; font-weight: 500; }
.rate-meta  { font-size: 12px; color: #888; margin-top: 2px; }
#mode-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
}
footer {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}
footer a { color: #2563eb; text-decoration: none; font-size: 13px; }
footer a:hover { text-decoration: underline; }

@media (prefers-color-scheme: dark) {
  body { background: #1a1a1a; color: #f4f4f5; }
  section h2 { color: #a1a1aa; }
  .rate { background: #2a2a2a; }
  .rate-meta { color: #a1a1aa; }
  #mode-select { background: #2a2a2a; color: #f4f4f5; border-color: #3f3f46; }
  footer { border-color: #2a2a2a; }
  footer a { color: #60a5fa; }
}
```

- [ ] **Step 3: Create `src/ui/popup/popup.ts`**

```ts
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
```

- [ ] **Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/ui/popup
git commit -m "feat(ui): popup with rate, mode toggle, settings link"
```

---

### Task 17: Options page — main view (rules grouped)

**Files:**
- Create: `src/ui/options/options.html`
- Create: `src/ui/options/options.css`
- Create: `src/ui/options/options.ts`

- [ ] **Step 1: Create `src/ui/options/options.html`**

```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Настройки — av.by → USD</title>
  <link rel="stylesheet" href="options.css" />
</head>
<body>
  <main>
    <h1>Настройки av.by → USD</h1>

    <section>
      <h2>Отображение</h2>
      <p class="hint">Стиль вставки USD рядом с BYN:</p>
      <div class="radio-group" id="style-group">
        <label><input type="radio" name="style" value="parens" /> В скобках:  322 730 р. (~$11 444)</label>
        <label><input type="radio" name="style" value="badge"  /> Бейджем:    322 730 р. <span class="example-badge">~$11 444</span></label>
        <label><input type="radio" name="style" value="below"  /> Под ценой:  322 730 р. + ~$11 444 ниже</label>
      </div>
    </section>

    <section>
      <h2>Правила конвертации</h2>
      <div id="rules-container"></div>
    </section>

    <section>
      <details id="advanced-section">
        <summary>Дополнительно</summary>
        <div class="advanced-body">
          <div class="advanced-actions">
            <button type="button" id="reset-btn">↺ Сбросить к дефолтам</button>
          </div>

          <h3>Группы (как парсить значения)</h3>
          <textarea id="groups-json" rows="14" spellcheck="false"></textarea>
          <div class="json-error" id="groups-error"></div>
          <button type="button" id="save-groups">Сохранить группы</button>

          <h3>Правила (где искать значения)</h3>
          <textarea id="rules-json" rows="14" spellcheck="false"></textarea>
          <div class="json-error" id="rules-error"></div>
          <button type="button" id="save-rules">Сохранить правила</button>
        </div>
      </details>
    </section>

    <section class="about">
      <h2>О расширении</h2>
      <p>Версия <span id="version"></span> · Лицензия MIT</p>
      <p>Открытый код:
        <a href="https://github.com/shockk73/avby-convert" target="_blank" rel="noopener">github.com/shockk73/avby-convert</a>
      </p>
      <p class="muted">
        Курс берётся с самого сайта av.by. Расширение не делает сетевых запросов и не собирает никаких данных.
      </p>
    </section>
  </main>

  <script type="module" src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/ui/options/options.css`**

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 14px;
  background: #fafafa;
  color: #1a1a1a;
}
main { max-width: 640px; margin: 0 auto; }
h1 { font-size: 20px; margin: 0 0 24px; }
h2 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #666;
  margin: 24px 0 8px;
}
h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
section { margin-bottom: 24px; }
.hint { color: #666; margin: 0 0 8px; }

.radio-group { display: flex; flex-direction: column; gap: 6px; }
.radio-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.example-badge {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 4px;
  border-radius: 4px;
  background: rgba(34, 139, 34, 0.12);
  color: rgb(34, 100, 34);
  font-size: 0.85em;
}

.rule-group {
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.rule-group h3 { margin-top: 0; }
.rule-row { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; }
.rule-row + .rule-row { border-top: 1px solid #f4f4f5; }
.rule-row input[type="checkbox"] { margin-top: 2px; }
.rule-row .rule-text { flex: 1; min-width: 0; }
.rule-row .rule-desc { font-weight: 500; }
.rule-row .rule-selector {
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 12px;
  color: #888;
  word-break: break-all;
  margin-top: 2px;
}

details summary { cursor: pointer; font-weight: 500; color: #2563eb; }
.advanced-body { margin-top: 12px; }
.advanced-actions { margin-bottom: 12px; }
button {
  padding: 6px 12px;
  border: 1px solid #d4d4d8;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
button:hover { background: #f4f4f5; }
textarea {
  width: 100%;
  padding: 10px;
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 12px;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  resize: vertical;
}
.json-error { color: #dc2626; font-size: 12px; margin: 4px 0 8px; min-height: 16px; }
.about p { margin: 4px 0; }
.about .muted { color: #888; font-size: 13px; margin-top: 8px; }

@media (prefers-color-scheme: dark) {
  body { background: #18181b; color: #f4f4f5; }
  h2, .hint, .about .muted { color: #a1a1aa; }
  .rule-group { background: #1f1f23; border-color: #2a2a2e; }
  .rule-row + .rule-row { border-color: #27272a; }
  .rule-row .rule-selector { color: #71717a; }
  textarea, button { background: #1f1f23; color: #f4f4f5; border-color: #2a2a2e; }
  button:hover { background: #27272a; }
  details summary { color: #60a5fa; }
}
```

- [ ] **Step 3: Create `src/ui/options/options.ts`** (main view only — Advanced JSON wired in Task 18)

```ts
import { DEFAULT_GROUPS } from '../../config/default-groups';
import { DEFAULT_RULES } from '../../config/default-rules';
import { mergeGroups, mergeRules } from '../../config/merge';
import {
  getSettings, setSettings,
  getRuleOverrides, setRuleOverrides,
  getGroupOverrides,
  onConfigChanged,
} from '../../storage';
import type { Rule, Group, InsertionStyle, RuleOverride } from '../../core/types';

const STYLE_GROUP        = document.getElementById('style-group') as HTMLDivElement;
const RULES_CONTAINER    = document.getElementById('rules-container') as HTMLDivElement;
const VERSION_LABEL      = document.getElementById('version') as HTMLSpanElement;

const GROUP_DISPLAY_NAMES: Record<string, string> = {
  single_byn:     'Цены машин',
  leasing_monthly: 'Лизинг',
  range_byn:      'Диапазоны',
};

function setStyleRadio(value: InsertionStyle): void {
  for (const input of STYLE_GROUP.querySelectorAll<HTMLInputElement>('input[name="style"]')) {
    input.checked = input.value === value;
  }
}

STYLE_GROUP.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  if (target.name !== 'style') return;
  await setSettings({ insertionStyle: target.value as InsertionStyle });
});

function upsertOverride(list: RuleOverride[], patch: RuleOverride): RuleOverride[] {
  const next = list.filter(o => o.id !== patch.id);
  const existing = list.find(o => o.id === patch.id) ?? {};
  next.push({ ...existing, ...patch });
  return next;
}

function renderGroupBlock(group: Group, rules: Rule[], currentOverrides: RuleOverride[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'rule-group';
  const heading = document.createElement('h3');
  heading.textContent = GROUP_DISPLAY_NAMES[group.id] ?? group.id;
  wrap.appendChild(heading);

  for (const rule of rules) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = rule.enabled;
    cb.id = `rule-${rule.id}`;
    cb.addEventListener('change', async () => {
      const next = upsertOverride(currentOverrides, { id: rule.id, enabled: cb.checked });
      await setRuleOverrides(next);
    });

    const text = document.createElement('label');
    text.className = 'rule-text';
    text.htmlFor = cb.id;
    const desc = document.createElement('div');
    desc.className = 'rule-desc';
    desc.textContent = rule.description ?? rule.id;
    const sel = document.createElement('div');
    sel.className = 'rule-selector';
    sel.textContent = rule.selector;
    text.appendChild(desc);
    text.appendChild(sel);

    row.appendChild(cb);
    row.appendChild(text);
    wrap.appendChild(row);
  }

  return wrap;
}

async function renderRules(): Promise<void> {
  const ruleOverrides  = await getRuleOverrides();
  const groupOverrides = await getGroupOverrides();
  const rules  = mergeRules (DEFAULT_RULES,  ruleOverrides);
  const groups = mergeGroups(DEFAULT_GROUPS, groupOverrides);

  const byGroup = new Map<string, Rule[]>();
  for (const r of rules) {
    if (!byGroup.has(r.groupId)) byGroup.set(r.groupId, []);
    byGroup.get(r.groupId)!.push(r);
  }

  RULES_CONTAINER.innerHTML = '';
  for (const group of groups) {
    const list = byGroup.get(group.id);
    if (!list || list.length === 0) continue;
    RULES_CONTAINER.appendChild(renderGroupBlock(group, list, ruleOverrides));
  }
}

async function renderAll(): Promise<void> {
  const s = await getSettings();
  setStyleRadio(s.insertionStyle);
  await renderRules();
}

VERSION_LABEL.textContent = chrome.runtime.getManifest().version;

onConfigChanged(() => { void renderAll(); });
void renderAll();
```

- [ ] **Step 4: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/ui/options
git commit -m "feat(ui): options page — main view with grouped rule toggles"
```

---

### Task 18: Options page — Advanced JSON editor

**Files:**
- Modify: `src/ui/options/options.ts` (append Advanced wiring at the end)

- [ ] **Step 1: Append Advanced section wiring to `src/ui/options/options.ts`**

Add after the existing `void renderAll();` line (end of file):

```ts
// ─── Advanced section ─────────────────────────────────────────────

import { setGroupOverrides, resetToDefaults } from '../../storage';

const GROUPS_JSON   = document.getElementById('groups-json')  as HTMLTextAreaElement;
const RULES_JSON    = document.getElementById('rules-json')   as HTMLTextAreaElement;
const GROUPS_ERROR  = document.getElementById('groups-error') as HTMLDivElement;
const RULES_ERROR   = document.getElementById('rules-error')  as HTMLDivElement;
const SAVE_GROUPS   = document.getElementById('save-groups')  as HTMLButtonElement;
const SAVE_RULES    = document.getElementById('save-rules')   as HTMLButtonElement;
const RESET_BTN     = document.getElementById('reset-btn')    as HTMLButtonElement;

async function renderJsonEditors(): Promise<void> {
  const ruleOverrides  = await getRuleOverrides();
  const groupOverrides = await getGroupOverrides();
  const rules  = mergeRules (DEFAULT_RULES,  ruleOverrides);
  const groups = mergeGroups(DEFAULT_GROUPS, groupOverrides);
  GROUPS_JSON.value = JSON.stringify(groups, null, 2);
  RULES_JSON.value  = JSON.stringify(rules,  null, 2);
  GROUPS_ERROR.textContent = '';
  RULES_ERROR.textContent  = '';
}

function validateGroups(parsed: unknown): asserts parsed is Group[] {
  if (!Array.isArray(parsed)) throw new Error('Ожидается массив');
  for (const g of parsed) {
    if (typeof g !== 'object' || g === null) throw new Error('Элемент не объект');
    const grp = g as Record<string, unknown>;
    for (const f of ['id', 'description', 'match', 'format'] as const) {
      if (typeof grp[f] !== 'string') throw new Error(`Поле "${f}" должно быть строкой в группе ${grp.id ?? '?'}`);
    }
    if (!Array.isArray(grp.captures) || grp.captures.some(c => typeof c !== 'string')) {
      throw new Error(`captures должен быть массивом строк в группе ${grp.id}`);
    }
    try {
      new RegExp(grp.match as string);
    } catch (e) {
      throw new Error(`Невалидный regex в группе ${grp.id}: ${(e as Error).message}`);
    }
  }
}

function validateRules(parsed: unknown, groupIds: Set<string>): asserts parsed is Rule[] {
  if (!Array.isArray(parsed)) throw new Error('Ожидается массив');
  for (const r of parsed) {
    if (typeof r !== 'object' || r === null) throw new Error('Элемент не объект');
    const rule = r as Record<string, unknown>;
    for (const f of ['id', 'selector', 'groupId'] as const) {
      if (typeof rule[f] !== 'string') throw new Error(`Поле "${f}" должно быть строкой в правиле ${rule.id ?? '?'}`);
    }
    if (typeof rule.enabled !== 'boolean') throw new Error(`enabled должен быть boolean в правиле ${rule.id}`);
    if (!groupIds.has(rule.groupId as string)) {
      throw new Error(`Правило ${rule.id} ссылается на несуществующую группу "${rule.groupId}"`);
    }
  }
}

function diffOverrides<T extends { id: string }>(
  defaults: T[],
  edited: T[],
): Array<Partial<T> & { id: string; isCustom?: boolean }> {
  const defaultsById = new Map(defaults.map(d => [d.id, d]));
  const out: Array<Partial<T> & { id: string; isCustom?: boolean }> = [];
  for (const item of edited) {
    const def = defaultsById.get(item.id);
    if (!def) {
      out.push({ ...item, isCustom: true });
      continue;
    }
    const patch: Partial<T> & { id: string } = { id: item.id };
    let differs = false;
    for (const key of Object.keys(item) as Array<keyof T>) {
      if (key === 'id') continue;
      if (JSON.stringify(item[key]) !== JSON.stringify(def[key])) {
        (patch as any)[key] = item[key];
        differs = true;
      }
    }
    if (differs) out.push(patch);
  }
  return out;
}

SAVE_GROUPS.addEventListener('click', async () => {
  GROUPS_ERROR.textContent = '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(GROUPS_JSON.value);
  } catch (e) {
    GROUPS_ERROR.textContent = `Невалидный JSON: ${(e as Error).message}`;
    return;
  }
  try {
    validateGroups(parsed);
  } catch (e) {
    GROUPS_ERROR.textContent = (e as Error).message;
    return;
  }
  const overrides = diffOverrides(DEFAULT_GROUPS, parsed) as any;
  await setGroupOverrides(overrides);
});

SAVE_RULES.addEventListener('click', async () => {
  RULES_ERROR.textContent = '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(RULES_JSON.value);
  } catch (e) {
    RULES_ERROR.textContent = `Невалидный JSON: ${(e as Error).message}`;
    return;
  }

  const groupOverrides = await getGroupOverrides();
  const allGroups = mergeGroups(DEFAULT_GROUPS, groupOverrides);
  const groupIds = new Set(allGroups.map(g => g.id));

  try {
    validateRules(parsed, groupIds);
  } catch (e) {
    RULES_ERROR.textContent = (e as Error).message;
    return;
  }
  const overrides = diffOverrides(DEFAULT_RULES, parsed) as any;
  await setRuleOverrides(overrides);
});

RESET_BTN.addEventListener('click', async () => {
  if (!confirm('Все ваши изменения правил и групп будут удалены. Продолжить?')) return;
  await resetToDefaults();
});

onConfigChanged(() => { void renderJsonEditors(); });
void renderJsonEditors();
```

NOTE: the new `import` statement above must be **moved to the top of the file** (TypeScript doesn't allow imports mid-file). When applying this diff, merge it into the existing import block at the top of `options.ts`.

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/ui/options/options.ts
git commit -m "feat(ui): options page — Advanced JSON editor with validation"
```

---

## Phase 7 — Build, packaging, CI, docs

### Task 19: Build script and placeholder icons

**Files:**
- Create: `build.mjs`
- Create: `scripts/zip.mjs`
- Create: `src/icons/icon-16.png`, `src/icons/icon-48.png`, `src/icons/icon-128.png` (placeholder PNGs)

- [ ] **Step 1: Create placeholder icons**

Use any image tool (Paint, Preview, online generator) to create three solid-color square PNGs:
- `src/icons/icon-16.png` — 16×16
- `src/icons/icon-48.png` — 48×48
- `src/icons/icon-128.png` — 128×128

Color/design doesn't matter for v0.1.0 — these are visual placeholders. Real icon design is Task 21 (deferrable).

Alternatively, generate via Node script `scripts/make-placeholder-icons.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'src', 'icons');
fs.mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);  len.writeUInt32BE(data.length, 0);
  const tbuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tbuf, data])), 0);
  return Buffer.concat([len, tbuf, data, crcBuf]);
}

function makePng(size, [r, g, b, a]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;          // bit depth
  ihdr[9] = 6;          // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;  // filter type
    for (let x = 0; x < size; x++) {
      row[1 + x * 4 + 0] = r;
      row[1 + x * 4 + 1] = g;
      row[1 + x * 4 + 2] = b;
      row[1 + x * 4 + 3] = a;
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const COLOR = [0x22, 0x8b, 0x22, 0xff];  // forest green
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), makePng(size, COLOR));
  console.log(`wrote icon-${size}.png`);
}
```

Run once: `node scripts/make-placeholder-icons.mjs`. After that, the script can be deleted or kept for future regeneration.

- [ ] **Step 2: Create `build.mjs`**

```js
import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const watch = process.argv.includes('--watch');

const TARGETS = ['chrome', 'firefox'];

const ENTRY_POINTS = [
  { in: 'src/engine/index.ts',         out: 'content' },
  { in: 'src/background/index.ts',     out: 'background' },
  { in: 'src/ui/popup/popup.ts',       out: 'popup/popup' },
  { in: 'src/ui/options/options.ts',   out: 'options/options' },
];

async function buildTarget(target) {
  const outdir = path.join(__dirname, 'dist', target);
  await fs.rm(outdir, { recursive: true, force: true });
  await fs.mkdir(outdir, { recursive: true });

  const ctx = await esbuild.context({
    entryPoints: ENTRY_POINTS,
    bundle: true,
    minify: !dev,
    sourcemap: dev,
    target: 'es2022',
    outdir,
    format: 'iife',
    logLevel: 'info',
  });

  if (watch) {
    await ctx.watch();
    console.log(`[${target}] watching...`);
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  // Copy manifest
  await fs.copyFile(`src/manifest/${target}.json`, path.join(outdir, 'manifest.json'));

  // Copy popup HTML/CSS
  await fs.mkdir(path.join(outdir, 'popup'), { recursive: true });
  await fs.copyFile('src/ui/popup/popup.html', path.join(outdir, 'popup/popup.html'));
  await fs.copyFile('src/ui/popup/popup.css',  path.join(outdir, 'popup/popup.css'));

  // Copy options HTML/CSS
  await fs.mkdir(path.join(outdir, 'options'), { recursive: true });
  await fs.copyFile('src/ui/options/options.html', path.join(outdir, 'options/options.html'));
  await fs.copyFile('src/ui/options/options.css',  path.join(outdir, 'options/options.css'));

  // Copy engine styles (referenced by content_scripts.css in manifest)
  await fs.copyFile('src/engine/styles.css', path.join(outdir, 'styles.css'));

  // Copy icons
  await fs.mkdir(path.join(outdir, 'icons'), { recursive: true });
  for (const size of [16, 48, 128]) {
    await fs.copyFile(`src/icons/icon-${size}.png`, path.join(outdir, `icons/icon-${size}.png`));
  }

  console.log(`[${target}] built → ${outdir}`);
}

await Promise.all(TARGETS.map(buildTarget));
if (!watch) console.log('build complete');
```

- [ ] **Step 3: Create `scripts/zip.mjs`** (uses `execFileSync` — no shell, no injection risk)

```js
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

for (const target of ['chrome', 'firefox']) {
  const distDir = path.join(root, 'dist', target);
  if (!fs.existsSync(distDir)) {
    console.error(`no dist/${target} — run "npm run build" first`);
    process.exit(1);
  }
  const outZip = path.join(root, `avby-convert-${target}.zip`);
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

  if (process.platform === 'win32') {
    // PowerShell's Compress-Archive. Args go through execFile (no shell parsing of these strings).
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path (Join-Path -Path $args[0] -ChildPath '*') -DestinationPath $args[1] -Force`,
        '-args',
        distDir,
        outZip,
      ],
      { stdio: 'inherit' },
    );
  } else {
    // `zip` from inside dist dir; cwd ensures contents (not the dir itself) end up at archive root.
    execFileSync('zip', ['-r', outZip, '.'], { cwd: distDir, stdio: 'inherit' });
  }
  console.log(`packaged → ${outZip}`);
}
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: produces `dist/chrome/` and `dist/firefox/` each containing `manifest.json`, `content.js`, `background.js`, `popup/popup.html`+`.css`+`.js`, `options/options.html`+`.css`+`.js`, `styles.css`, `icons/`.

- [ ] **Step 5: Manual smoke — load unpacked in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked", select `dist/chrome/`
4. Open `https://cars.av.by/`
5. Verify USD prices appear next to BYN prices on car cards
6. Click extension icon → verify popup shows current rate and mode dropdown
7. Open extension's options page → verify rule list renders, checkboxes work

- [ ] **Step 6: Manual smoke — load temporary in Firefox**

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `dist/firefox/manifest.json`
4. Same verifications as Chrome

- [ ] **Step 7: Commit**

```bash
git add build.mjs scripts/ src/icons
git commit -m "feat(build): esbuild script + zip packaging for both browsers"
```

---

### Task 20: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "chore(ci): typecheck, test, build on every push"
```

---

### Task 21: Real icons (optional polish, deferrable)

**Files:**
- Replace: `src/icons/icon-16.png`, `src/icons/icon-48.png`, `src/icons/icon-128.png`

- [ ] **Step 1: Design or find icons**

Suggested concept: simple `$` glyph on green/blue background, or `BYN ↔ $` pictogram. Sizes 16×16, 48×48, 128×128 PNG.

- [ ] **Step 2: Replace placeholder PNGs in `src/icons/`**

- [ ] **Step 3: Run build, verify icons appear**

```bash
npm run build
```

Re-load unpacked extension; verify icon shows in toolbar at all sizes.

- [ ] **Step 4: Commit**

```bash
git add src/icons
git commit -m "feat(icons): add proper extension icons"
```

(This task may be deferred to a future release — placeholder green squares are fine for v0.1.0 development.)

---

### Task 22: README

**Files:**
- Modify: `README.md` (replace placeholder)

- [ ] **Step 1: Replace `README.md` content**

```markdown
# avby → USD

🇧🇾 Бесплатное расширение для Chrome и Firefox: показывает примерные цены в USD рядом с BYN на av.by. Курс берётся с самого сайта. Без рекламы, без трекинга.

🌐 Free Chrome/Firefox extension that shows approximate USD prices next to BYN on av.by car listings.

## Установка

### Chrome / Edge / Brave / Opera
- *(после публикации)* Через Chrome Web Store: ссылка появится здесь.
- Сейчас: скачать релиз с [Releases](https://github.com/shockk73/avby-convert/releases), распаковать zip, открыть `chrome://extensions/`, включить "Developer mode", нажать "Load unpacked" → выбрать папку.

### Firefox (десктоп и Android)
- *(после публикации)* Через `addons.mozilla.org`: ссылка появится здесь.
- Сейчас: скачать `avby-convert-firefox.zip` из Releases. На десктопе → `about:debugging` → "Load Temporary Add-on" → выбрать `manifest.json` внутри zip. На Android Firefox — установка возможна только через подписанный xpi (см. Releases).

## Как работает

1. Расширение читает курс USD/BYN из шапки av.by (элемент `.main-converter`).
2. Кэширует курс локально (`chrome.storage.local`).
3. Находит цены в BYN на странице по списку селекторов.
4. Дорисовывает рядом приблизительный эквивалент в USD.

**Расширение не делает никаких сетевых запросов**, не использует внешние API курсов, не собирает никакую телеметрию. Весь код открыт и проверяем.

## Настройки

- **Режим**: показывать BYN и USD / только USD / выключено.
- **Стиль вставки**: в скобках, бейджем, или под ценой.
- **Правила конвертации**: можно отключать любые отдельно.
- **Advanced**: в JSON-режиме можно править/добавлять селекторы и группы парсинга.

## Для разработчиков

```bash
git clone https://github.com/shockk73/avby-convert.git
cd avby-convert
npm install
npm run build
```

Затем загрузить `dist/chrome/` или `dist/firefox/` как unpacked extension. Для разработки: `npm run build:dev` (live rebuild).

### Тесты

```bash
npm test          # один прогон
npm run test:watch
npm run typecheck
```

### Структура

- `src/core/` — чистая логика (парсинг, форматирование, конвертация). Покрыто юнит-тестами.
- `src/config/` — дефолтные группы и правила, мерджинг с пользовательскими override'ами.
- `src/engine/` — content script: rate watcher, MutationObserver, DOM walker, inserter.
- `src/ui/` — popup и options-страница (vanilla DOM).
- `src/storage/` — типизированная обёртка над `chrome.storage.local`.

## FAQ

**Цены не конвертируются после обновления av.by — что делать?**
Зайти в Настройки → Дополнительно. В JSON-редакторе правил поправить устаревший селектор и сохранить. Также можно открыть [issue](https://github.com/shockk73/avby-convert/issues) — обновим в следующем релизе.

**Откуда берётся курс?**
С самой страницы av.by, элемент в шапке. Расширение не лезет ни в какие внешние API.

**Безопасно ли это?**
Расширение запрашивает только два разрешения: доступ к страницам `*.av.by/*` (для модификации DOM) и `storage` (для сохранения настроек). Никаких сетевых запросов, никакой телеметрии. Весь код открыт.

**Поддержка iOS?**
Нет. Apple требует $99/год Apple Developer аккаунт для публикации Safari-расширений в App Store. Это противоречит принципу «полностью бесплатный инструмент». Если кто-то из контрибьюторов готов поддерживать сборку для iOS — PR welcome.

## Лицензия

[MIT](LICENSE)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: full README with install, dev, FAQ"
```

---

## Phase 8 — Verification

### Task 23: End-to-end smoke test against live av.by

This task is **manual** — no code changes. Run the smoke checklist from the spec to verify everything works against the real site.

- [ ] **Step 1: Build production bundle**

```bash
npm run build
```

- [ ] **Step 2: Load `dist/chrome/` as unpacked in Chrome**

- [ ] **Step 3: Smoke checklist**

Tick off each:

- [ ] Visit `https://cars.av.by/` (главная) — USD labels visible next to listing-card prices.
- [ ] Open any single car detail page — USD label appears in the header price button (`.card__price-button`) and in the leasing block (`.side-finance__lead` / `.finance-item__subtitle`).
- [ ] Open a brand/model page with a price-range banner (`.finance-item__sum`) — USD range visible.
- [ ] Scroll a long listing for 30+ new cards to load — new cards also show USD.
- [ ] Apply a filter (price/year/etc.) — newly loaded results show USD.
- [ ] Open extension popup → switch mode to "Выключено" — all USD labels disappear, BYN remains.
- [ ] Switch popup mode to "Показывать только USD" — BYN prices hidden, USD shown alone.
- [ ] Switch back to "Показывать BYN и USD" — both visible.
- [ ] Open Options → uncheck `listing_card_price` — USD next to listing cards disappears; check it back → returns.
- [ ] In Options → Дополнительно → modify the JSON of a rule selector, save → page updates.
- [ ] Click "Сбросить к дефолтам" → confirm → all custom changes reverted.
- [ ] Reload page (F5) — settings persist (mode, style, enabled rules).

- [ ] **Step 4: Same checklist (abbreviated) in Firefox**

Load `dist/firefox/manifest.json` via `about:debugging` and run items 1, 2, 6, 8 from above.

- [ ] **Step 5: Mobile check (optional, if Android device available)**

Install `avby-convert-firefox.zip` (signed) on Firefox for Android. Open `cars.av.by` — verify USD labels visible. Open popup — verify it fits within ≤360px viewport without horizontal scroll.

- [ ] **Step 6: If all green — commit final smoke completion note**

```bash
git commit --allow-empty -m "chore: smoke test passed for v0.1.0"
git tag v0.1.0
```

---

## Open follow-ups (post-v0.1.0)

These are deliberate non-tasks for v0.1.0:

- Real icon design (Task 21 leaves placeholders).
- Publication to Chrome Web Store and addons.mozilla.org.
- Signed Firefox xpi for Android distribution outside AMO.
- Adding more selectors as av.by changes layout — community PRs / issues.
- Optional: more template filters (`|raw`, `|cents`) if requested.
