# avby-convert — Design

**Дата:** 2026-04-26
**Репозиторий:** https://github.com/shockk73/avby-convert
**Лицензия:** MIT
**Статус:** Дизайн утверждён, готов к написанию плана реализации.

## Контекст

В апреле 2026 в Беларуси на сайтах с объявлениями автомобилей был запрещён показ цен в долларах — оставлены только белорусские рубли (BYN). При этом весь рынок исторически выстроен вокруг USD: продавцы и покупатели мысленно привязывают цены к доллару, а отсутствие явного значения в USD сильно ухудшает UX.

`avby-convert` — бесплатное некоммерческое browser-расширение, которое автоматически дорисовывает к ценам в BYN их приблизительный эквивалент в USD на страницах `*.av.by`, используя курс который сам сайт публикует в шапке.

## Цели

1. На карточках в листинге, в шапке детальной страницы, в блоках лизинга и в диапазонах цен — рядом с BYN автоматически появляется `~$X` в выбранном пользователем стиле.
2. Курс читается с самого сайта (`.main-converter`) и кэшируется — работает и на страницах где блока нет.
3. Юзер может в один клик переключить режим (Both / USD only / Off) через попап.
4. Юзер может в options-странице включать/выключать конкретные правила или, в Advanced-режиме, править/добавлять свои селекторы и группы парсинга.
5. Дефолтные правила и группы обновляются с новой версией расширения, кастомные правила пользователя при этом сохраняются.
6. Корректно реагирует на динамическую подгрузку контента (бесконечный скролл, AJAX-фильтры).

## Нон-цели

- Не делаем конвертацию в другие валюты (только BYN→USD).
- Не делаем кастомный курс из внешних API — берём только то, что публикует av.by.
- Не собираем никакой телеметрии. **Расширение не делает вообще никаких сетевых запросов.**
- Не делаем per-domain настройки, аккаунтов, синхронизации настроек между браузерами.
- Не покрываем редкие/единичные блоки — фокус на 4 типах элементов (карточки, лизинг, finance, диапазоны).
- **Не поддерживаем iOS / iPadOS Safari** — формально расширения там работают, но Apple требует обёртку в нативный iOS-app и платный Apple Developer аккаунт ($99/год). Это противоречит главному принципу проекта: «инструмент полностью бесплатный для автора и пользователей». Если в будущем кто-то из контрибьюторов готов поддерживать iOS-сборку и платить — добавим.
- **Не поддерживаем Chrome для Android** (сам Google там расширения не разрешает) и любые не-Safari браузеры на iOS (Apple не разрешает).

## Поддерживаемые платформы

Цель: расширение работает **везде, где это бесплатно для автора и пользователя**.

| Платформа | Какой билд | Что нужно от нас |
|---|---|---|
| Chrome / Edge / Brave / Opera (desktop) | Chromium-билд | Публикация в Chrome Web Store ($5 разовая регистрация — единственная плата во всём проекте) |
| Firefox (desktop) | Firefox-билд | Публикация в `addons.mozilla.org` (бесплатно) |
| Firefox for Android | **Тот же Firefox-билд** | Та же публикация в `addons.mozilla.org` (расширение помечается «works on Android»). Никакого дополнительного кода. |
| Kiwi Browser, Yandex Browser, прочие Chromium-based на Android с поддержкой расширений | **Тот же Chromium-билд** | Юзер ставит из Chrome Web Store или unpacked'ом. Никакого дополнительного кода. |

## Целевая аудитория и UX-бар

Конечные пользователи — обычные белорусские покупатели машин на av.by, **не программисты**. Дефолтный UI должен быть тапни-и-готово понятным, без жаргона, без JSON, без «developer-tools»-ощущения. Power-user фичи (правка правил, JSON-конфиг, кастомные группы) спрятаны за «Advanced» disclosure — присутствуют, но не мешают.

## Технологический стек

- **TypeScript** + минимальный **esbuild** (один скрипт `build.mjs`, ~50 строк), без UI-фреймворков.
- Vanilla DOM для popup и options.
- **vitest** для юнит-тестов чистой логики.
- Manifest V3.
- Универсально для **Chrome** (chromium-based: Edge, Brave, Opera) и **Firefox**. Два варианта manifest.json, один общий код.

## Архитектура

Четыре независимых модуля, каждый с одной ответственностью.

### `core/` — чистая бизнес-логика

Без DOM и без браузерных API. Тестируется юнит-тестами в Node.js.

- `parse.ts` — `applyGroupRegex`, `parseRate("1 USD = 2.82 BYN")`
- `format.ts` — `formatUsd(11444)` → `"$11 444"`, `formatTemplate(template, captures, rate, settings)` — токены `{name|usd}` подставляют `formatUsd(...)`. Префикс `~` (если нужен) задаётся в самом шаблоне.
- `convert.ts` — `bynToUsd(amount, rate)`, `applyRoundingRule`
- `types.ts` — `Rule`, `Group`, `Settings`, `Rate`, `ParsedValue`

### `config/` — декларативное описание правил конвертации

- `default-groups.ts` — bundled группы (`single_byn`, `leasing_monthly`, `range_byn`)
- `default-rules.ts` — bundled правила (9 селекторов с av.by)
- `merge.ts` — мерджит defaults + user overrides

### `engine/` — content script

- `index.ts` — оркестратор, подписывается на изменения настроек/курса
- `rate-watcher.ts` — следит за `.main-converter`, при появлении читает курс, пишет в storage
- `dom-walker.ts` — для каждого активного правила находит элементы, парсит → конвертит → вставляет
- `observer.ts` — `MutationObserver` на `document.body`, debounced на 150мс
- `inserter.ts` — три стиля вставки (parens / badge / below)
- `styles.css` — стили для вставленных USD-узлов

### `ui/` — попап и options

- `popup/` — HTML + TS, ~100 строк
- `options/` — HTML + TS, главный экран с галочками + Advanced JSON-редактор
- `storage/index.ts` — типизированная обёртка над `chrome.storage.local`
- `shared/browser.ts` — кросс-браузерный shim `globalThis.browser ?? globalThis.chrome`

### Поток данных

```
[Сайт av.by]
   │
   │ 1. .main-converter появился в DOM
   ▼
[rate-watcher] ──► storage.local: { rate: 2.82, fetchedAt: ... }
                         │
                         ▼ (storage.onChanged)
                   [engine/index.ts] ──► [dom-walker] ──► вставляет ~$X в DOM
                         ▲
[options/popup] ─────────┘ (меняет настройки → engine перерендерит)
```

## Жизненный цикл

### Сценарий 1: первая установка, юзер заходит на любую страницу av.by

1. Content script инжектится при `document_idle`.
2. `engine` читает из `storage.local` настройки и кэш курса. Кэша нет.
3. `rate-watcher` находит `.main-converter` → парсит → пишет в storage.
4. `dom-walker` ловит `storage.onChanged` → конвертит и вставляет USD рядом с BYN. Видимая задержка: ~10–50мс.

### Сценарий 2: повторные заходы

1. Кэш есть → `dom-walker` использует его сразу, USD появляются мгновенно.
2. Параллельно `rate-watcher` находит `.main-converter` → если курс изменился, обновляет storage → `dom-walker` пере-конвертит.

### Сценарий 3: курс не найден И кэша нет

Молча no-op. В попапе: «Курс ещё не загружен». **Никаких сетевых запросов.** Когда юзер откроет любую страницу с `.main-converter` — кэш заполнится.

### Сценарий 4: бесконечный скролл, AJAX-подгрузка

`MutationObserver` ловит новые ноды. `dom-walker` обрабатывает только их (старые помечены `data-avby-converted="<rule-id>"`).

### Сценарий 5: смена режима в попапе на `Off`

Попап пишет `mode: 'off'` в storage. Content script удаляет все вставленные USD-узлы (по `data-avby-converted`), `MutationObserver` остаётся живым но walker no-op'ит.

### Сценарий 6: смена правила в options

Storage меняется → engine пересобирает активный список правил → удаляет вставки от выключенных правил, вставляет для включенных.

### Ключевые инварианты

- **Идемпотентность**: повторный вызов `dom-walker` не дублирует USD (через `data-avby-converted`).
- **Reversibility**: всё что вставлено — снимается чисто (через wrapping в `<span class="avby-usd">`). Оригинальный текст страницы не модифицируется.
- **Никаких сетевых запросов вообще.** Никакой телеметрии.

## Конфигурация: группы и правила

Декларативная, JSON-сериализуемая. Юзер редактирует через UI или напрямую через Advanced JSON-режим.

### Группы — «как парсить и форматировать»

Описывается тремя полями: `match` (regex), `captures` (имена групп), `format` (шаблон с подстановкой).

```ts
type Group = {
  id: string;              // 'single_byn', 'leasing_monthly', 'range_byn', user-defined
  description: string;
  match: string;           // regex (как строка, чтобы хранить в JSON)
  captures: string[];      // имена capture-групп по индексу
  format: string;          // шаблон с токенами {name|filter}
};
```

#### Дефолтные группы

```json
[
  {
    "id": "single_byn",
    "description": "Одна цена в BYN — например \"322 730 р.\"",
    "match":   "([\\d\\s\\u00A0]+)\\s*(?:р\\.|BYN|руб)",
    "captures": ["amount"],
    "format":  "~{amount|usd}"
  },
  {
    "id": "leasing_monthly",
    "description": "Ежемесячный платёж лизинга — например \"1639 BYN в месяц\"",
    "match":   "([\\d\\s\\u00A0]+)\\s*BYN\\s*в\\s*месяц",
    "captures": ["amount"],
    "format":  "~{amount|usd} в месяц"
  },
  {
    "id": "range_byn",
    "description": "Диапазон цен в BYN — например \"32 000 — 47 999 BYN\"",
    "match":   "([\\d\\s\\u00A0]+)\\s*[—–-]\\s*([\\d\\s\\u00A0]+)\\s*BYN",
    "captures": ["min", "max"],
    "format":  "~{min|usd} — {max|usd}"
  }
]
```

#### Шаблонный мини-DSL

Один фильтр — `usd`:
- Берёт значение по имени, парсит как число BYN (стрипает пробелы и NBSP)
- Делит на текущий курс
- Округляет: ≥ $1000 — без центов; < $1000 — с двумя десятичными
- Форматирует с разделителями тысяч (узким пробелом) и знаком доллара

Примеры:
- `amount="322 730"`, `rate=2.82` → `$11 444` (целое, ≥ $1000)
- `amount="939"`, `rate=2.82` → `$333.00` (с центами, < $1000)
- В шаблоне `~{amount|usd}` → `~$11 444` / `~$333.00` соответственно. Префикс `~` — часть шаблона, не фильтра.

Расширение DSL новыми фильтрами — по мере нужды (YAGNI).

### Правила — «где искать значения»

```ts
type Rule = {
  id: string;
  selector: string;
  groupId: string;          // ссылка на существующую группу
  enabled: boolean;
  description?: string;
};
```

#### Дефолтные правила

```json
[
  { "id": "listing_card_price",   "selector": ".listing-item__price-primary",  "groupId": "single_byn",      "enabled": true, "description": "Цена в карточке листинга" },
  { "id": "card_price_button",    "selector": ".card__price-button",           "groupId": "single_byn",      "enabled": true, "description": "Цена-кнопка на детальной" },
  { "id": "listing_top_price",    "selector": ".listing-top__price-primary span", "groupId": "single_byn",   "enabled": true, "description": "Цена в шапке листинга" },
  { "id": "listing_index_price",  "selector": ".listing-index__price",         "groupId": "single_byn",      "enabled": true, "description": "Цена в индексной карточке" },
  { "id": "side_finance_lead",    "selector": ".side-finance__lead",           "groupId": "leasing_monthly", "enabled": true, "description": "Лизинг — боковая панель" },
  { "id": "finance_item_subtitle","selector": ".finance-item__subtitle",       "groupId": "leasing_monthly", "enabled": true, "description": "Лизинг — подпись" },
  { "id": "listing_item_finance", "selector": ".listing-item__finance a",      "groupId": "leasing_monthly", "enabled": true, "description": "Лизинг в карточке листинга" },
  { "id": "card_finance_desc",    "selector": ".card-finance__description",    "groupId": "single_byn",      "enabled": true, "description": "Финансирование — описание (общая сумма)" },
  { "id": "finance_item_sum",     "selector": ".finance-item__sum",            "groupId": "range_byn",       "enabled": true, "description": "Диапазон цен" }
]
```

### Источник курса

```ts
const RATE_SELECTOR = '.main-converter div';
// Текст: "1 USD = 2.82 BYN"
// regex: /1\s*USD\s*=\s*([\d.,]+)\s*BYN/
```

### Мерджинг defaults + user overrides

Storage хранит **только override'ы**, не полную копию. Формат:

```ts
type StoredConfig = {
  groupOverrides?: GroupOverride[];
  ruleOverrides?: RuleOverride[];
  settings?: Settings;
  rateCache?: { rate: number; fetchedAt: number };
};

type RuleOverride = Partial<Rule> & { id: string; isCustom?: boolean };
type GroupOverride = Partial<Group> & { id: string; isCustom?: boolean };
```

Алгоритм при загрузке:
1. Берём bundled defaults как базу.
2. Для каждого override'а с известным `id`: `Object.assign(default, override)`.
3. Для `isCustom: true` overrides: добавляем как новые сущности.
4. Override'ы с неизвестным `id` (default удалён в новой версии) — игнорируем.

**Поведение при апдейте расширения:**
- Новые default правила/группы появляются автоматом (overrides на них нет).
- Кастомные правила юзера сохраняются.
- Изменения юзером enabled/selector/format на default правилах сохраняются.
- «Reset to defaults» = очистить overrides в storage.

## Настройки пользователя

```ts
type Settings = {
  mode: 'both' | 'usd_only' | 'off';     // дефолт: 'both'
  insertionStyle: 'parens' | 'badge' | 'below';  // дефолт: 'parens'
};
```

**Правила округления зашиты в формат-фильтре `usd`** (не настраиваются):
- ≥ $1000 → без центов: `~$11 444`
- < $1000 → с двумя десятичными: `~$333.69`
- Всегда префикс `~` (показывает что значение приблизительное)

## UI

### Попап (~320×280px, наследует системную тему)

```
┌──────────────────────────────────────┐
│  av.by → USD                         │
│                                      │
│  Курс                                │
│  ┌────────────────────────────────┐  │
│  │  1 USD  =  2.82 BYN            │  │
│  │  обновлено 5 минут назад       │  │
│  └────────────────────────────────┘  │
│                                      │
│  Режим                               │
│  ┌────────────────────────────────┐  │
│  │  ● Показывать BYN и USD     ▾  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ⚙ Настройки     ⓘ GitHub            │
└──────────────────────────────────────┘
```

**Состояния курса:**
- Норм: «1 USD = 2.82 BYN» + «обновлено N минут назад»
- Кэш старше суток: то же значение, «обновлено вчера» серым
- Кэша нет: «Курс ещё не загружен» серым, без призывов к действию

**Dropdown «Режим»:**
- «Показывать BYN и USD» (default)
- «Показывать только USD»
- «Выключено»

**Ссылка «GitHub»** ведёт на `https://github.com/shockk73/avby-convert`.

### Options-страница (~600px)

Секции сверху вниз:

1. **Отображение** — radio-выбор стиля вставки (parens / badge / below) с примерами визуально.
2. **Правила конвертации** — сгруппированы заголовками по `groupId` («Цены машин», «Лизинг», «Диапазоны»). Каждое правило: галочка `enabled` + человеческое `description` + под ним мелким моноширинным шрифтом сам `selector`.
3. **Дополнительно** (свёрнуто по умолчанию):
   - Кнопка `+ Добавить группу` (мини-форма: id, description, match, captures, format)
   - Кнопка `+ Добавить правило` (мини-форма: id, selector, group dropdown, description)
   - Textarea с JSON групп
   - Textarea с JSON правил
   - Кнопка `↺ Сбросить к дефолтам` (с confirm)
4. **О расширении** — версия, лицензия (MIT), ссылка на GitHub, абзац про «не делает сетевых запросов».

### UX-принципы

- Никаких слов «селектор», «парсер», «config» в основном UI. CSS-селектор виден под description мелким моноширинным шрифтом серым.
- Все настройки сохраняются автоматически при изменении (галочка → сохранилось). Кнопка «Сохранить» только в JSON-редакторе (нужна валидация).
- Тексты на русском, единый стиль («показывать»/«выключено», не «display»/«off»).
- Ссылка на GitHub видна и в попапе, и в options-странице — для прозрачности и contribution path.

## Edge-кейсы

### Курс / `.main-converter`

| Ситуация | Поведение |
|---|---|
| `.main-converter` не найден, кэша нет | No-op. В попапе «Курс ещё не загружен». |
| `.main-converter` найден, текст не парсится | Лог в консоль. Если есть кэш — используем. В попапе tooltip «не удалось обновить». |
| Кэш старше 7 дней | Используем, в попапе подпись «обновлён давно» серым. |
| Курс ≤ 0 или > 100 (аномалия) | Игнорируем, как «не парсится». |

### DOM / правила

| Ситуация | Поведение |
|---|---|
| Селектор не находит ничего | No-op (правило применимо к части страниц). |
| Regex группы не матчится | Лог в консоль один раз на element+rule (через WeakSet). |
| Текст элемента изменился после вставки | `MutationObserver` ловит → удаляем старую вставку → пере-конвертим. |
| Элемент совпадает с несколькими селекторами | Применяется первое подходящее правило в порядке списка. Warning в консоль. |
| `mode: 'off'` | Никаких изменений в DOM, observer работает но no-op'ит. |

### Конфиг / storage

| Ситуация | Поведение |
|---|---|
| Битый JSON | Кнопка «Сохранить» не пишет в storage, под textarea красным сообщение. |
| Невалидный regex в группе | Аналогично — не сохраняем, сообщение «Ошибка в группе `X`: невалидный regex». |
| Правило ссылается на несуществующий `groupId` | Не сохраняем, сообщение об ошибке. |
| Storage corrupted | `try/catch` при загрузке, fallback на bundled defaults, warning в консоль. |
| Апдейт расширения с новыми правилами | Появляются автоматом (мерджинг). Кастомные сохраняются. |
| Апдейт с удалённым правилом, которое юзер кастомизировал | Override игнорируется. Правило с `isCustom: true` остаётся. |

### Производительность

| Ситуация | Поведение |
|---|---|
| 100+ карточек на странице | Один проход — единицы миллисекунд. Только новые ноды обрабатываются. |
| Быстрая смена режима | Каждое изменение → один проход. UI instant. |
| Tab в фоне | `MutationObserver` живёт, мутаций мало. Polling логики нет. Фоновое потребление ≈ ноль. |

### Безопасность и совместимость

| Ситуация | Поведение |
|---|---|
| Юзер пишет вредоносный regex (ReDoS) | Документируем в README, без runtime-защиты (YAGNI). |
| Permissions | Только `matches: ["*://*.av.by/*"]`. Никаких `<all_urls>`, `host_permissions`, `tabs`. |
| Storage | Только `chrome.storage.local`, не `sync`. |
| Старые версии браузера | `minimum_chrome_version` / `strict_min_version` в манифесте. Не установится. |

### Что специально не обрабатываем

- Iframes (контент-скрипт только в top-level).
- Shadow DOM.
- Цены в JSON-LD / data-атрибутах.

## Структура репозитория

```
avby-convert/
├── README.md
├── LICENSE                         (MIT)
├── package.json
├── tsconfig.json
├── build.mjs                       (esbuild entry)
├── .github/workflows/ci.yml
│
├── src/
│   ├── manifest/
│   │   ├── chrome.json
│   │   └── firefox.json
│   ├── core/
│   │   ├── parse.ts
│   │   ├── format.ts
│   │   ├── convert.ts
│   │   └── types.ts
│   ├── config/
│   │   ├── default-groups.ts
│   │   ├── default-rules.ts
│   │   └── merge.ts
│   ├── engine/
│   │   ├── index.ts
│   │   ├── rate-watcher.ts
│   │   ├── dom-walker.ts
│   │   ├── observer.ts
│   │   ├── inserter.ts
│   │   └── styles.css
│   ├── background/index.ts
│   ├── ui/
│   │   ├── popup/{popup.html,popup.ts,popup.css}
│   │   └── options/{options.html,options.ts,options.css}
│   ├── storage/index.ts
│   └── shared/browser.ts
│
├── tests/
│   ├── parse.test.ts
│   ├── format.test.ts
│   ├── convert.test.ts
│   ├── merge.test.ts
│   └── fixtures/sample-prices.ts
│
└── docs/
    ├── superpowers/specs/2026-04-26-avby-convert-design.md
    └── selectors.md                 (гайд для контрибьюторов)
```

## Билд

`build.mjs` (~50 строк через esbuild):
1. Читает `src/manifest/{chrome,firefox}.json`.
2. Бандлит entry-points (`content`, `background`, `popup`, `options`) — IIFE для контента/фона, ESM для UI.
3. Копирует HTML, CSS, манифесты в `dist/{chrome,firefox}/`.
4. Минификация в production, sourcemaps в dev.
5. `--watch` режим.

### npm-скрипты

```json
{
  "build":      "node build.mjs",
  "build:dev":  "node build.mjs --dev --watch",
  "typecheck":  "tsc --noEmit",
  "test":       "vitest run",
  "test:watch": "vitest",
  "package":    "node build.mjs && node scripts/zip.mjs"
}
```

## Тестирование

### Юнит-тесты (vitest, без браузера)

- `parse`: все строки из примеров + центы, NBSP-разделители, отсутствующие пробелы
- `format`: округление на границе $1000, локализация чисел
- `convert`: BYN→USD при разных курсах, диапазоны, краевые случаи (0, очень большие)
- `merge`: defaults + overrides, новый default появляется автоматом, кастомные сохраняются

### Не покрываем юнит-тестами

- Реальный DOM / `MutationObserver` (слишком много мокинга, низкая выгода).
- UI попапа/опций (ручное тестирование).

### Smoke-чеклист перед релизом

Прогоняется в каждом таргет-браузере: Chrome (desktop), Firefox (desktop). Дополнительно — Firefox for Android и любой Chromium-based на Android (например Kiwi) хотя бы по укороченной программе пунктов 1, 2, 6.

1. `cars.av.by` (главная) — рядом с ценами карточек видны USD.
2. Детальная карточка — в шапке видна USD, в блоке лизинга тоже.
3. Страница с диапазоном — видна USD-вилка.
4. Бесконечный скролл — новые карточки конвертятся.
5. AJAX-фильтр — новые результаты конвертятся.
6. Попап → Off: USD исчезают; попап → USD only: BYN скрываются.
7. Options → выключить правило: USD исчезает; включить: возвращается.
8. Перезагрузка страницы — состояние сохранилось.
9. Очистка storage — defaults применились.
10. На узком экране (≤ 360px) попап и options-страница не ломаются по вёрстке (для Android Firefox).

### CI (GitHub Actions)

На push в любую ветку: `npm ci`, `typecheck`, `test`, `build`. Без авто-деплоя — публикация в сторы вручную через `npm run package`.

## Открытые вопросы

Нет — все решения подтверждены в брейншторме.
