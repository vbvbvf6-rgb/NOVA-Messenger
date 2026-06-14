# Деплой Nova: Vercel (фронтенд) + Render (бэкенд)

## Архитектура

```
Пользователь
    │
    ├─► Vercel ──── React/Vite фронтенд (CDN, быстро)
    │
    └─► Render ──── Express API + Socket.IO + PostgreSQL
```

Фронтенд знает адрес бэкенда через переменную `VITE_API_URL`.

---

## Шаг 1. Бэкенд — Render (без карты)

### 1.1 База данных — Supabase

1. [supabase.com](https://supabase.com) → **Start your project** (GitHub, без карты)
2. **New project** → имя, пароль, регион **Frankfurt**
3. Подожди ~2 минуты
4. **Settings → Database → Connection string → Transaction** (вкладка) → скопируй:
   ```
   postgresql://postgres.xxxx:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

### 1.2 Деплой API-сервера — Render

1. [render.com](https://render.com) → Sign Up (GitHub, без карты)
2. **New → Web Service**
3. Подключи GitHub репозиторий

| Поле | Значение |
|------|----------|
| **Runtime** | Node |
| **Build Command** | `npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps ./artifacts/api-server/dist/index.mjs` |
| **Instance Type** | Free |

4. **Environment** → добавь:

| Ключ | Значение |
|------|----------|
| `DATABASE_URL` | Строка из Supabase |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Нажми «Generate» или вставь 64 случайных символа |

5. **Create Web Service** → дождись деплоя (~5 мин)
6. Запомни URL сервиса: `https://nova-api.onrender.com` ← это `VITE_API_URL`

---

## Шаг 2. Фронтенд — Vercel (без карты)

1. [vercel.com](https://vercel.com) → Sign Up (GitHub, без карты)
2. **Add New → Project** → импортируй тот же GitHub репозиторий
3. Vercel сам найдёт `vercel.json` в корне репозитория

### Настройки проекта (если Vercel спросит)

| Поле | Значение |
|------|----------|
| **Framework Preset** | Other |
| **Root Directory** | `.` (корень) |
| **Build Command** | *(берётся из vercel.json автоматически)* |
| **Output Directory** | *(берётся из vercel.json автоматически)* |

### Переменные окружения

В Vercel → **Settings → Environment Variables** добавь:

| Ключ | Значение |
|------|----------|
| `VITE_API_URL` | URL твоего Render сервиса, например `https://nova-api.onrender.com` |

> ⚠️ Без `VITE_API_URL` фронтенд не будет знать где бэкенд и ничего не заработает.

4. **Deploy** → Vercel соберёт и задеплоит (~3–5 мин)

---

## Шаг 3. Не давать Render засыпать — cron-job.org

Render Free засыпает через 15 минут без запросов.

1. [cron-job.org](https://cron-job.org) → Sign Up → **Create cronjob**
2. URL: `https://nova-api.onrender.com/api/healthz`
3. Schedule: **Every 14 minutes** → Save

---

## Итог

| URL | Что |
|-----|-----|
| `https://nova-messenger.vercel.app` | Твой мессенджер (фронтенд) |
| `https://nova-api.onrender.com` | API-сервер (бэкенд) |

---

## Частые ошибки

### Белый экран / "Failed to fetch"
`VITE_API_URL` не задан в Vercel или задан неправильно.
- Проверь: Vercel → Settings → Environment Variables
- URL должен быть **без слеша в конце**: `https://nova-api.onrender.com` ✅ `https://nova-api.onrender.com/` ❌
- После изменения переменной → **Redeploy**

### `DATABASE_URL must be set` на Render
Переменная не добавлена в Render → Environment.
Добавь `DATABASE_URL` → **Save Changes** → **Manual Deploy**

### Звонки не работают (нет звука)
Встроенный TURN-сервер (openrelay) работает без регистрации.
Если всё равно не слышат друг друга — это проблема с сетью/NAT.
Можно улучшить добавив бесплатный TURN от [expressturn.com](https://expressturn.com) (только email, без карты):
- Render Environment: `TURN_URL`, `TURN_USER`, `TURN_CRED`

### Build failed на Vercel: "pnpm not found"
Vercel должен установить pnpm через build command.
Убедись что build command в `vercel.json` начинается с `npm install -g pnpm@10 &&`

### CORS ошибки в консоли браузера
Бэкенд уже настроен принимать запросы с любого домена (`cors: origin: true`).
Если видишь CORS — проверь что `VITE_API_URL` указывает на правильный Render URL.
