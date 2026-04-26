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
