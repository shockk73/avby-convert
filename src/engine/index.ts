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
