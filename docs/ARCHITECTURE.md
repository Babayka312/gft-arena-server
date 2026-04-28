# Архитектура gft-arena

## Сервер (`/server`)
- `index.mjs` — Express: REST `/api/*`, хранение `data/*.json`, CORS, раздача `dist` в проде.
- **Не дублировать** игровую экономику в двух местах: истина по прогрессу и наградам — сейчас на сервере; клиент отображает ответы API.

## Клиент (`/src`)
- **UI и сценарии**: `App.tsx` (корневой экран), `screens/`, `ui/`, точка входа `main.tsx`.
- **API-слой**: `apiConfig.ts`, `playerProgress.ts`, `playerRegistry.ts`, `xaman.ts`, `xrplClient.ts`, `telegram.ts`.
- **Домен (данные)**: `cards/`, `artifacts/`, `zodiacAvatars.ts` и т.д.

## Расчёты / правила боя (`/src/game`, `/src/game/calculations`)
- Чистые функции: множители ботов PvP/PvE, в будущем — формулы урона, проверки (удобно тестировать и при желании вызывать с сервера).
- `game/battle.ts` — кубики, PvE-враги, урон, порядок ходов.
- `game/calculations/` — баланс «цифр» (множители, пороги), отдельно от React.

## Сборка
- `npm run build` — `Vite` + `.env.production` (`VITE_API_BASE` при отдельном API-домене).
- `dist/` отдаётся Nginx/статикой или `express.static` из `server/index.mjs`.

## Направление рефакторинга
- Постепенно вырезать из `App.tsx` экраны в `screens/`, тонкие хуки в `hooks/`, формулы — в `game/calculations/`, без изменения поведения.
