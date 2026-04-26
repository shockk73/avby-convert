import { DEFAULT_GROUPS } from '../../config/default-groups';
import { DEFAULT_RULES } from '../../config/default-rules';
import { mergeGroups, mergeRules } from '../../config/merge';
import {
  getSettings, setSettings,
  getRuleOverrides, setRuleOverrides,
  getGroupOverrides, setGroupOverrides,
  onConfigChanged,
  resetToDefaults,
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

function clearChildren(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
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

  clearChildren(RULES_CONTAINER);
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

// ─── Advanced section ─────────────────────────────────────────────

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
    const patch: Partial<T> & { id: string } = { id: item.id } as Partial<T> & { id: string };
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
