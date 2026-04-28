# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Telegram Mini App (WebApp) запуск

Этот проект можно открыть как **Telegram Mini App** (игра внутри Telegram) через BotFather.

### Локальная разработка

Запуск dev-сервера:

```bash
npm run dev
```

Telegram **не откроет** `http://localhost:...` напрямую — нужен публичный HTTPS URL.

Самый простой способ на Windows:

- Подними dev-сервер `npm run dev`
- Прокинь его через туннель (например, ngrok / Cloudflare Tunnel) и получи `https://...`
- Укажи этот URL в BotFather как WebApp URL

### Настройка бота в BotFather

- Создай бота: `/newbot`
- Открой настройки бота → **Bot Settings** → **Menu Button** (или **Web App**)
- Укажи **HTTPS** ссылку на игру (например, на `https://<твой-домен>/`)

### Что уже интегрировано в коде

- В `index.html` подключен официальный скрипт Telegram WebApp: `https://telegram.org/js/telegram-web-app.js`
- В `src/telegram.ts` есть безопасные helper-функции для доступа к `window.Telegram.WebApp`
- В `src/App.tsx` игра:
  - вызывает `WebApp.ready()` / `WebApp.expand()` (если запущено внутри Telegram)
  - подтягивает имя пользователя из `initDataUnsafe.user` и подставляет его в “Создание героя”

## XRPL + Xaman (XUMM) подключение кошелька

### Важно про безопасность

Ключи Xaman (`XUMM_API_KEY` / `XUMM_API_SECRET`) **нельзя** хранить во фронтенде. Поэтому в репозитории добавлен простой backend в `server/`, который:

- создаёт `SignIn` payload для Xaman
- отдаёт deep-link (открывает Xaman на телефоне)
- позволяет фронту опрашивать статус payload и получить XRPL address после подписи

### Как запустить backend

1) Скопируй `.env.example` в `.env` и заполни ключи Xaman:

- `XUMM_API_KEY`
- `XUMM_API_SECRET`

2) Запусти API:

```bash
npm run dev:server
```

или фронт+api вместе:

```bash
npm run dev:all
```

### Как это работает в UI

В верхней панели (header) есть кнопка **Connect Xaman**:

- создаёт SignIn payload на backend
- открывает Xaman через deep-link
- после подписи сохраняет `xrpl_account` в `localStorage`
- подтягивает баланс XRP через публичный XRPL websocket

## Депозит/оплата в GFT (XRPL issued token)

Токен GFT берётся из Magnetic (XRPL DEX): [GFT на Magnetic](https://xmagnetic.org/ru/tokens/GFT+rn5SUAg2utJAcjvhBfQpLgtSqakxWESLBe?network=mainnet)

### Переменные окружения

В `.env` нужно указать:

- `TREASURY_XRPL_ADDRESS` — адрес, куда принимаем депозит
- `GFT_CURRENCY` — по умолчанию `GFT`
- `GFT_ISSUER` — `rn5SUAg2utJAcjvhBfQpLgtSqakxWESLBe`

### Флоу депозита

- фронт вызывает `POST /api/gft/deposit` с `amount`
- Xaman открывается и пользователь подписывает `Payment` в GFT на `TREASURY_XRPL_ADDRESS`
- фронт опрашивает `GET /api/gft/deposit/:uuid/verify`
- backend проверяет транзакцию по `txid` в XRPL (валидирована, `Destination` правильный, `Amount.currency/issuer` правильные)


Graphite PR test 2026-04-28T21:22:34
