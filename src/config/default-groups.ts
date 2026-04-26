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
