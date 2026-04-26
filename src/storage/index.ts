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
