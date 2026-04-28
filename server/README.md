# Backend

- **Вход:** `index.mjs` — `node server/index.mjs` или `npm run dev:server`.
- **Переменные:** корневой `.env` (см. `.env.example`): `PORT`, `FRONTEND_ORIGIN`, ключи Xumm/XRPL по необходимости.
- **Данные:** каталог `data/` рядом с репозиторием (не в git).

Игровые правила начисления наград реализованы здесь; клиентские «расчёты» в `src/game/calculations/` — только для отображения боя; при расхождении приоритет у API.
