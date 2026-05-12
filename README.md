# avby → USD

🇧🇾 Бесплатное расширение для Chrome и Firefox: показывает примерные цены в USD рядом с BYN на av.by. Курс берётся с самого сайта. Без рекламы, без трекинга.

🌐 Free Chrome/Firefox extension that shows approximate USD prices next to BYN on av.by car listings.

## Установка

### Chrome / Edge / Brave / Opera
- скачать релиз с [Releases](https://github.com/shockk73/avby-convert/releases), распаковать zip, открыть `chrome://extensions/`, включить "Developer mode", нажать "Load unpacked" → выбрать папку.

### Firefox (десктоп и Android)
- скачать `avby-convert-firefox.zip` из Releases. На десктопе → `about:debugging` → "Load Temporary Add-on" → выбрать `manifest.json` внутри zip. На Android Firefox — установка возможна только через подписанный xpi (см. Releases).

## Как работает

1. Расширение читает курс USD/BYN из шапки av.by (элемент `.main-converter`).
2. Кэширует курс локально (`chrome.storage.local`).
3. Находит цены в BYN на странице по списку селекторов.
4. Дорисовывает рядом приблизительный эквивалент в USD.

**Расширение не делает никаких сетевых запросов**, не использует внешние API курсов, не собирает никакую телеметрию. Весь код открыт и проверяем.

## Настройки

- **Режим**: показывать BYN и USD / только USD / выключено.
- **Стиль вставки**: в скобках, бейджем, или под ценой.
- **Правила конвертации**: можно отключать любые отдельно.
- **Advanced**: в JSON-режиме можно править/добавлять селекторы и группы парсинга.

## Для разработчиков

```bash
git clone https://github.com/shockk73/avby-convert.git
cd avby-convert
npm install
npm run build
```

Затем загрузить `dist/chrome/` или `dist/firefox/` как unpacked extension. Для разработки: `npm run build:dev` (live rebuild).

### Тесты

```bash
npm test          # один прогон
npm run test:watch
npm run typecheck
```

### Структура

- `src/core/` — чистая логика (парсинг, форматирование, конвертация). Покрыто юнит-тестами.
- `src/config/` — дефолтные группы и правила, мерджинг с пользовательскими override'ами.
- `src/engine/` — content script: rate watcher, MutationObserver, DOM walker, inserter.
- `src/ui/` — popup и options-страница (vanilla DOM).
- `src/storage/` — типизированная обёртка над `chrome.storage.local`.

## FAQ

**Цены не конвертируются после обновления av.by — что делать?**
Зайти в Настройки → Дополнительно. В JSON-редакторе правил поправить устаревший селектор и сохранить. Также можно открыть [issue](https://github.com/shockk73/avby-convert/issues) — обновим в следующем релизе.

**Откуда берётся курс?**
С самой страницы av.by, элемент в шапке. Расширение не лезет ни в какие внешние API.

**Безопасно ли это?**
Расширение запрашивает только два разрешения: доступ к страницам `*.av.by/*` (для модификации DOM) и `storage` (для сохранения настроек). Никаких сетевых запросов, никакой телеметрии. Весь код открыт.

## Лицензия

[MIT](LICENSE)
