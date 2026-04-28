# Настройка GFT Arena на Render

У тебя один **Web Service** (Node) с `node server/index.mjs`: он отдаёт **API** и **собранный фронт** из `dist/`. URL вида `https://api.gftarenatest.cc`.

## 1. Environment (Dashboard → Environment)

Добавь (имена **строго** как в таблице). Значения не коммить — только в Render.

| Переменная | Обязательно | Значение |
|------------|-------------|----------|
| `FRONTEND_ORIGIN` | Да (для CORS) | `https://gftarenatest.cc,https://www.gftarenatest.cc` (добавь `http://localhost:5173` для локальной отладки к прод-API, если нужно) |
| `XUMM_API_KEY` | Для Xaman | Из https://apps.xumm.dev/ |
| `XUMM_API_SECRET` | Для Xaman | То же |
| `TREASURY_XRPL_ADDRESS` | Для депозита GFT | Адрес казны `r...` |
| `GFT_ISSUER` | Для GFT | Напр. `rn5SUAg2utJAcjvhBfQpLgtSqakxWESLBe` (см. Magnetic) |
| `GFT_CURRENCY` | Обычно | `GFT` |
| `ADMIN_TOKEN` | Рекомендуется | Длинная случайная строка для `/api/admin/*` |
| `TELEGRAM_BOT_TOKEN` | Для Telegram Mini App | Токен бота из @BotFather для проверки подписи `initData` |
| `TELEGRAM_AUTH_MAX_AGE_SECONDS` | По желанию | Срок жизни `initData`, по умолчанию `86400` |
| `TON_TREASURY_ADDRESS` | Для магазина TON | `UQ...` / `EQ...`; без — TON-оплата отключена |
| `DATA_DIR` | Рекомендуется на проде | `/data` **только если** подключён **Persistent Disk** (платно), см. `render.yaml` |
| `NODE_VERSION` | По желанию | `20.18.0` или `20` |

**Не задавай** `PORT` вручную — Render подставит свой (в логах будет 10000 и т.д.). Код читает `process.env.PORT`.

После правок: **Save** → **Manual Deploy** (или Clear build cache + deploy).

## 2. Build / Start (уже должны совпадать)

- **Build command:** `npm ci && npm run build` (собирает `dist/` + `bundle:server`).
- **Start command:** `node server/index.mjs`.

**Health check path:** `/api/health` (см. `server/index.mjs`).

## 3. Персистентные данные (`data/`)

Без **Persistent Disk** папка `data/` на Render **не сохранится** между деплоями/соном воркера. Варианты:

- Подключить **Disk** в настройках сервиса, `mountPath` = `/data`, в Environment: `DATA_DIR=/data`.
- Или позже вынести в БД; для бета/теста иногда оставляют как есть, понимая риск.

Free tier: инстанс **засыпает** — первый запрос после простоя может быть **~50+ секунд**.

## 4. Кастомный домен `api.gftarenatest.cc`

1. В Render: **Settings → Custom Domains** — добавь `api.gftarenatest.cc`, следуй инструкции (CNAME на `xxx.onrender.com` или что выдаст Render).
2. У регистратора домена: **CNAME** `api` → хост, который дал Render (часто что-то вроде `gft-arena-xxx.onrender.com`). Дождись DNS (иногда до часа+).

## 5. Сайт на apex `gftarenatest.cc` (браузер открывает игру без `api.`)

Сейчас API живёт на **поддомене** — это нормально. Варианты **фронта** на `gftarenatest.cc`:

**A) Отдельный Static Site на Render** (или Cloudflare Pages / Netlify): корень = содержимое `dist/` после `npm run build` с `VITE_API_BASE=https://api.gftarenatest.cc` (в репо уже есть `.env.production` — проверь, что билд делается с ним). DNS: **A/ALIAS/ANAME** apex на провайдера **или** хостинг по их инструкции.

**B) Только API-сервис** (как сейчас): игру открывают по `https://api.gftarenatest.cc` — криво для пользователя, зато проще. Лучше сделать A.

Код на фронте для прод-доменов: `src/apiConfig.ts` → `https://api.gftarenatest.cc` при hostname `gftarenatest.cc` / `www`.

## 6. Проверка

```bash
curl -sS https://api.gftarenatest.cc/api/health
```

Ожидается JSON `ok: true` (или аналог из хендлера).

Проверка CORS: с открытой **в браузере** страницы `https://gftarenatest.cc` (когда она заработает) в DevTools → Network — запросы к `api.gftarenatest.cc` без ошибки CORS, если `FRONTEND_ORIGIN` верный.

## 7. Локальный `.env`

Секреты дублируй только в **Render Dashboard**; локальный `.env` не пуши в git.

См. также: `deploy/gftarenatest.cc.env.example`, `.env.example`, `render.yaml`.
