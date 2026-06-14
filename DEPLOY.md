# Деплой Nova на Render + Supabase (бесплатно, без карты)

## Что получится

| Сервис | Роль | Карта? | Ограничение |
|--------|------|--------|-------------|
| **Supabase** | PostgreSQL | ❌ Нет | 500 MB, 2 проекта |
| **Render** | Node.js сервер | ❌ Нет | Засыпает после 15 мин |
| **cron-job.org** | Пинг каждые 14 мин | ❌ Нет | Предотвращает сон |
| **metered.ca** | TURN-сервер для звонков | ❌ Нет | 50 GB/мес |

---

## Шаг 1. База данных — Supabase

1. Зарегистрируйся на [supabase.com](https://supabase.com) → GitHub или email, **без карты**
2. **New project** → придумай название, пароль для БД, регион **Frankfurt** (EU, ближе к СНГ)
3. Дождись запуска (~2 минуты)
4. Слева → **Settings → Database → Connection string → URI (Transaction mode)**
5. Скопируй строку:
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   Замени `[YOUR-PASSWORD]` на свой пароль — это и есть `DATABASE_URL`.

> **Важно**: используй **Transaction mode** (порт 6543), а не прямое соединение.
> Render — serverless-окружение, connection pooler работает надёжнее.

---

## Шаг 2. TURN-сервер для звонков — metered.ca

> Без TURN звонки работают только в одной сети. С TURN — везде.

1. Зарегистрируйся на [metered.ca](https://metered.ca) → **Sign Up** (email, без карты)
2. **Dashboard → TURN** → запиши:
   - **Host** → `turn:relay.metered.ca:80`
   - **Username** и **Credential** из таблицы

---

## Шаг 3. Деплой на Render

### Вариант А — через render.yaml (рекомендуется)

В проекте уже есть файл `render.yaml`. Render подхватит его автоматически.

1. Загрузи проект на GitHub (если ещё нет)
2. Зарегистрируйся на [render.com](https://render.com) → **New → Blueprint**
3. Подключи репозиторий → Render сам найдёт `render.yaml` и создаст сервис

### Вариант Б — вручную (New → Web Service)

| Поле | Значение |
|------|----------|
| **Runtime** | `Docker` |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | `Free` |

---

## Шаг 4. Переменные окружения в Render

В Render → твой сервис → **Environment** → добавь:

| Ключ | Значение |
|------|----------|
| `DATABASE_URL` | Строка из Supabase (шаг 1) |
| `JWT_SECRET` | Любая случайная строка ≥64 символа |
| `NODE_ENV` | `production` |
| `TURN_URL` | `turn:relay.metered.ca:80` |
| `TURN_USER` | Username из metered.ca |
| `TURN_CRED` | Credential из metered.ca |

> Переменные `TURN_*` подставляются на сервере и **никогда не попадают в JS-бандл**.
> `JWT_SECRET` можно сгенерировать командой: `openssl rand -hex 64`

После сохранения → **Manual Deploy → Deploy latest commit**

---

## Шаг 5. Не давать Render засыпать — cron-job.org

1. [cron-job.org](https://cron-job.org) → **Sign up** → **Create cronjob**
2. **URL**: `https://nova-messenger.onrender.com/api/healthz`
   (замени `nova-messenger` на своё имя сервиса)
3. **Schedule**: `Every 14 minutes`

---

## Частые ошибки

### `DATABASE_URL must be set`

Причина: не добавлена переменная в Render → **Environment**.
Решение: добавь `DATABASE_URL` со строкой из Supabase и нажми **Save Changes** → **Manual Deploy**.

### `SSL connection required` / `SSL off`

Причина: Supabase требует SSL. В коде уже настроен `ssl: { rejectUnauthorized: false }` для production.
Если ошибка всё равно есть — добавь `?sslmode=require` в конец `DATABASE_URL`:
```
postgresql://postgres.xxxx:password@host:6543/postgres?sslmode=require
```

### Звонки соединяются но нет звука

1. Проверь переменные `TURN_URL`, `TURN_USER`, `TURN_CRED` — они должны быть заданы
2. Убедись что логин/пароль взяты из metered.ca Dashboard → TURN (не STUN)
3. Открой DevTools → Console во время звонка — ищи `iceConnectionState`

### Приложение не открывается (холодный старт)

Render Free засыпает. Первый запрос после сна занимает 20-30 секунд.
Настрой cron-job.org (шаг 5) чтобы этого не происходило.

---

## Итог

После всех шагов Nova будет на:
```
https://nova-messenger.onrender.com
```
