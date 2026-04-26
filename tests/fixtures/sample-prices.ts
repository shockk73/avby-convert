// Real-world strings observed on av.by, used for regression tests.
export const SAMPLE_RATE_TEXTS = [
  '1 USD = 2.82 BYN',
  '1 USD = 3.10 BYN',
  '1 USD  =  2.82  BYN', // extra spaces
];

export const SAMPLE_SINGLE_BYN_TEXTS: Array<[string, number]> = [
  ['322 730 р.', 322730],
  ['1 000 р.', 1000],
  ['322 730 р.', 322730], // NBSP separator
  ['322 730 BYN', 322730],
];

export const SAMPLE_LEASING_TEXTS: Array<[string, number]> = [
  ['1639 BYN в месяц', 1639],
  ['Лизинг от 939 BYN в месяц', 939],
  ['Лизинг от 939 BYN в месяц', 939], // NBSP separators
];

export const SAMPLE_RANGE_TEXTS: Array<[string, [number, number]]> = [
  ['32 000 — 47 999 BYN', [32000, 47999]],
  ['32000 - 47999 BYN', [32000, 47999]],
  ['1 000 — 2 000 BYN', [1000, 2000]],
];
