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

export type Settings = {
  mode: DisplayMode;
  /** When true (and mode='both'): USD shown first/prominent, BYN faded. */
  usdFirst: boolean;
  /**
   * Snap-to-round tolerance for USD display, as a percentage.
   * If the converted USD value is within this tolerance of a "nice round"
   * target (multiples of 5×10^N or 10^N), it is nudged to that target for
   * prettier display. 0 disables snapping. Default 0.1.
   */
  snapTolerancePct: number;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: 'both',
  usdFirst: true,
  snapTolerancePct: 1,
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
