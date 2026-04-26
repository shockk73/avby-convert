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
export type InsertionStyle =
  | 'inline'
  | 'badge'
  | 'below'
  | 'strikethrough'
  | 'pill_double';

export type Settings = {
  mode: DisplayMode;
  insertionStyle: InsertionStyle;
  /**
   * Visual priority. When 'usd', USD is shown first/prominent and the
   * original BYN value is faded into a secondary role. Orthogonal to
   * insertionStyle — combinable with any style.
   */
  usdFirst: boolean;
  /**
   * Snap-to-round tolerance for USD display, as a percentage.
   * If the converted USD value is within this tolerance of a power of 10
   * (e.g., 100, 1000, 10000), it is nudged to that round number for prettier
   * display. 0 disables snapping. Default 0.1 (one-tenth of one percent).
   */
  snapTolerancePct: number;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: 'both',
  insertionStyle: 'inline',
  usdFirst: false,
  snapTolerancePct: 0.1,
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
