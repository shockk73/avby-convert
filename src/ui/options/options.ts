import { DEFAULT_GROUPS } from '../../config/default-groups';
import { DEFAULT_RULES } from '../../config/default-rules';
import { mergeGroups, mergeRules } from '../../config/merge';
import {
  getRuleOverrides, setRuleOverrides,
  getGroupOverrides, setGroupOverrides,
  resetToDefaults,
  onConfigChanged,
} from '../../storage';
import type { Rule, Group, RuleOverride } from '../../core/types';

const RULES_CONTAINER = document.getElementById('rules-container') as HTMLDivElement;
const VERSION_LABEL   = document.getElementById('version') as HTMLSpanElement;
const GROUPS_JSON     = document.getElementById('groups-json')  as HTMLTextAreaElement;
const RULES_JSON      = document.getElementById('rules-json')   as HTMLTextAreaElement;
const GROUPS_ERROR    = document.getElementById('groups-error') as HTMLDivElement;
const RULES_ERROR     = document.getElementById('rules-error')  as HTMLDivElement;
const SAVE_GROUPS     = document.getElementById('save-groups')  as HTMLButtonElement;
const SAVE_RULES      = document.getElementById('save-rules')   as HTMLButtonElement;
const RESET_BTN       = document.getElementById('reset-btn')    as HTMLButtonElement;

const GROUP_DISPLAY_NAMES: Record<string, string> = {
  single_byn:      'Цены машин',
  leasing_monthly: 'Лизинг',
  range_byn:       'Диапазоны',
};

const GROUP_EMOJIS: Record<string, string> = {
  single_byn:      '💰',
  leasing_monthly: '📅',
  range_byn:       '📊',
};

function clearChildren(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ─── Rules tab ───────────────────────────────────────

function upsertOverride(list: RuleOverride[], patch: RuleOverride): RuleOverride[] {
  const next = list.filter(o => o.id !== patch.id);
  const existing = list.find(o => o.id === patch.id) ?? {};
  next.push({ ...existing, ...patch });
  return next;
}

function makeToggle(checked: boolean, onChange: (next: boolean) => void): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));

  const track = document.createElement('span');
  track.className = 'track';

  const knob = document.createElement('span');
  knob.className = 'knob';

  label.appendChild(input);
  label.appendChild(track);
  label.appendChild(knob);
  return label;
}

function renderGroupCard(group: Group, rules: Rule[], currentOverrides: RuleOverride[]): HTMLElement {
  const card = document.createElement('div');
  card.className = 'rule-group-card';

  const header = document.createElement('div');
  header.className = 'rule-group-header';
  const emoji = document.createElement('div');
  emoji.className = 'rule-group-emoji';
  emoji.textContent = GROUP_EMOJIS[group.id] ?? '🔧';
  const title = document.createElement('div');
  title.className = 'rule-group-title';
  title.textContent = GROUP_DISPLAY_NAMES[group.id] ?? group.id;
  header.appendChild(emoji);
  header.appendChild(title);
  card.appendChild(header);

  for (const rule of rules) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const text = document.createElement('div');
    text.className = 'rule-text';
    const desc = document.createElement('div');
    desc.className = 'rule-desc';
    desc.textContent = rule.description ?? rule.id;
    const sel = document.createElement('div');
    sel.className = 'rule-selector';
    sel.textContent = rule.selector;
    text.appendChild(desc);
    text.appendChild(sel);

    const toggle = makeToggle(rule.enabled, async (checked) => {
      const next = upsertOverride(currentOverrides, { id: rule.id, enabled: checked });
      await setRuleOverrides(next);
    });

    row.appendChild(text);
    row.appendChild(toggle);
    card.appendChild(row);
  }

  return card;
}

async function renderRulesTab(): Promise<void> {
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
    RULES_CONTAINER.appendChild(renderGroupCard(group, list, ruleOverrides));
  }
}

// ─── Advanced tab ────────────────────────────────────

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
    const patch = { id: item.id } as Partial<T> & { id: string };
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
  try { parsed = JSON.parse(GROUPS_JSON.value); }
  catch (e) { GROUPS_ERROR.textContent = `Невалидный JSON: ${(e as Error).message}`; return; }
  try { validateGroups(parsed); }
  catch (e) { GROUPS_ERROR.textContent = (e as Error).message; return; }
  const overrides = diffOverrides(DEFAULT_GROUPS, parsed) as any;
  await setGroupOverrides(overrides);
});

SAVE_RULES.addEventListener('click', async () => {
  RULES_ERROR.textContent = '';
  let parsed: unknown;
  try { parsed = JSON.parse(RULES_JSON.value); }
  catch (e) { RULES_ERROR.textContent = `Невалидный JSON: ${(e as Error).message}`; return; }

  const groupOverrides = await getGroupOverrides();
  const allGroups = mergeGroups(DEFAULT_GROUPS, groupOverrides);
  const groupIds = new Set(allGroups.map(g => g.id));

  try { validateRules(parsed, groupIds); }
  catch (e) { RULES_ERROR.textContent = (e as Error).message; return; }

  const overrides = diffOverrides(DEFAULT_RULES, parsed) as any;
  await setRuleOverrides(overrides);
});

RESET_BTN.addEventListener('click', async () => {
  if (!confirm('Все ваши изменения правил и групп будут удалены. Продолжить?')) return;
  await resetToDefaults();
});

// ─── Top-level ───────────────────────────────────────

VERSION_LABEL.textContent = chrome.runtime.getManifest().version;

async function renderAll(): Promise<void> {
  await renderRulesTab();
  await renderJsonEditors();
}

onConfigChanged(() => { void renderAll(); });
void renderAll();
