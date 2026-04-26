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

/** Styles available when both BYN and USD are shown together. */
export type BothStyle =
  | 'inline'
  | 'badge'
  | 'below'
  | 'strikethrough';

/** Styles available when only USD is shown (BYN hidden). Subset that visually makes sense. */
export type UsdOnlyStyle = 'inline' | 'badge';

/** Union — used by inserter (it consumes whichever applies). */
export type InsertionStyle = BothStyle;

export type Settings = {
  mode: DisplayMode;
  /** Selected style for `mode === 'both'`. Independent of usd_only. */
  bothStyle: BothStyle;
  /** When true (and mode='both'): USD shown first/prominent, BYN faded. */
  bothUsdFirst: boolean;
  /** Selected style for `mode === 'usd_only'`. Limited to inline/badge. */
  usdOnlyStyle: UsdOnlyStyle;
  /**
   * Snap-to-round tolerance for USD display, as a percentage.
   * If the converted USD value is within this tolerance of a power of 10
   * (e.g., 100, 1000, 10000), it is nudged to that round number for prettier
   * display. 0 disables snapping. Default 0.1.
   */
  snapTolerancePct: number;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: 'both',
  bothStyle: 'inline',
  bothUsdFirst: false,
  usdOnlyStyle: 'inline',
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
