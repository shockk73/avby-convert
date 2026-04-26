import type { Rule } from '../core/types';

export const DEFAULT_RULES: Rule[] = [
  // Цены машин (single_byn)
  { id: 'listing_card_price',     selector: '.listing-item__price-primary',       groupId: 'single_byn',      enabled: true, description: 'Цена в карточке листинга' },
  { id: 'card_price_button',      selector: '.card__price-button',                groupId: 'single_byn',      enabled: true, description: 'Цена-кнопка на детальной' },
  { id: 'listing_top_price',      selector: '.listing-top__price-primary span',   groupId: 'single_byn',      enabled: true, description: 'Цена в шапке листинга' },
  { id: 'listing_index_price',    selector: '.listing-index__price',              groupId: 'single_byn',      enabled: true, description: 'Цена в индексной карточке' },

  // Лизинг (leasing_monthly + одно single_byn)
  { id: 'side_finance_lead',      selector: '.side-finance__lead',                groupId: 'leasing_monthly', enabled: true, description: 'Лизинг — боковая панель' },
  { id: 'finance_item_subtitle',  selector: '.finance-item__subtitle',            groupId: 'leasing_monthly', enabled: true, description: 'Лизинг — подпись' },
  { id: 'listing_item_finance',   selector: '.listing-item__finance a',           groupId: 'leasing_monthly', enabled: true, description: 'Лизинг в карточке листинга' },
  { id: 'card_finance_desc',      selector: '.card-finance__description',         groupId: 'single_byn',      enabled: true, description: 'Финансирование — описание (общая сумма)' },

  // Диапазоны
  { id: 'finance_item_sum',       selector: '.finance-item__sum',                 groupId: 'range_byn',       enabled: true, description: 'Диапазон цен' },
];

export const RATE_SELECTOR = '.main-converter div';
