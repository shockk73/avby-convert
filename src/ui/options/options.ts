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
