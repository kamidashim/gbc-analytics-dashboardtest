# GBC Analytics Dashboard

Мини-дашборд заказов с интеграцией RetailCRM → Supabase → Vercel + Telegram-бот.

**Live demo:** `https://gbc-analytics.vercel.app` _(задеплоить после настройки)_

---

## Архитектура

```
mock_orders.json
      │
      ▼
RetailCRM (API upload)
      │
      ▼  (sync script)
Supabase (PostgreSQL)
      │
      ▼
Dashboard (Vercel Static)   +   Telegram Bot (Vercel Serverless)
                                      ▲
                            RetailCRM Webhook (order > 50k ₸)
```

---

## Быстрый старт

### 1. Клонировать репо

```bash
git clone https://github.com/YOUR_USERNAME/gbc-analytics-dashboard.git
cd gbc-analytics-dashboard
```

### 2. Создать аккаунты (всё бесплатно)

| Сервис | Ссылка | Что делать |
|--------|--------|------------|
| RetailCRM | https://retailcrm.ru/demo | Создать демо-аккаунт, скопировать API ключ из Настройки → API |
| Supabase | https://supabase.com | New project, скопировать URL и service_role key |
| Vercel | https://vercel.com | Подключить GitHub репо |
| Telegram | @BotFather в Telegram | `/newbot`, скопировать токен |

### 3. Настроить переменные окружения

```bash
cp .env.example .env
# заполнить .env своими значениями
```

### 4. Создать таблицу в Supabase

Открыть **Supabase → SQL Editor** и выполнить:

```sql
-- файл: scripts/supabase_schema.sql
```

### 5. Загрузить заказы в RetailCRM

```bash
node scripts/upload_to_retailcrm.js
```

Ожидаемый вывод:
```
📦  Uploading 50 orders to RetailCRM…
  ✅  [1/50] Айгуль Касымова — id 1234
  ✅  [2/50] Дина Жуматова — id 1235
  ...
🎉  Done! OK: 50  Failed: 0
```

### 6. Синхронизировать в Supabase

```bash
node scripts/sync_to_supabase.js
```

### 7. Задеплоить на Vercel

```bash
npm i -g vercel
vercel --prod
```

Или через GitHub: Vercel автоматически деплоит при `git push`.

**Добавить env vars в Vercel:**
```
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
vercel env add RETAILCRM_URL
vercel env add RETAILCRM_API_KEY
```

### 8. Настроить Telegram-бот

**Получить CHAT_ID:**
1. Написать боту любое сообщение
2. Открыть `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Найти `"chat":{"id": 123456789}` — это твой CHAT_ID

**Зарегистрировать webhook в RetailCRM:**
```
Настройки → Интеграции → Webhooks → Добавить
URL: https://your-app.vercel.app/api/webhook
События: Заказ создан, Заказ изменён
```

**Проверить локально (polling mode):**
```bash
node telegram-bot/webhook.js --poll
```

---

## Структура проекта

```
├── dashboard/
│   └── index.html          # Дашборд (Chart.js, чистый HTML/CSS/JS)
├── scripts/
│   ├── upload_to_retailcrm.js   # Шаг 2: загрузка mock данных в CRM
│   ├── sync_to_supabase.js      # Шаг 3: CRM → Supabase
│   └── supabase_schema.sql      # DDL для таблицы orders
├── telegram-bot/
│   └── webhook.js          # Vercel serverless + polling mode
├── mock_orders.json         # 50 тестовых заказов
├── vercel.json              # Конфиг деплоя
└── .env.example             # Шаблон переменных
```

---

## Промпты которые давал Claude Code

Это задание выполнялось с помощью Claude (claude.ai). Вот точные промпты:

### Промпт 1 — структура проекта
```
Мне нужно сделать тестовое задание:
1. Загрузить 50 заказов из mock_orders.json в RetailCRM через API
2. Написать скрипт RetailCRM → Supabase
3. Сделать дашборд с графиками заказов
4. Telegram бот — уведомление при заказе > 50000 ₸

Создай полный проект: структуру папок, все скрипты, README.
Файл mock_orders.json прикладываю.
```

### Промпт 2 — дашборд
```
Сделай красивый HTML дашборд для заказов интернет-магазина.
- Тёмная тема, профессиональный вид
- KPI карточки: количество заказов, выручка, крупные заказы, топ город
- График динамики заказов по дням (Chart.js линейный)
- Пончик-диаграмма источников трафика
- Бар-чарт выручки по дням
- Таблица заказов с фильтрами
- Данные из встроенного JS массива (потом заменю на Supabase fetch)
```

### Промпт 3 — RetailCRM скрипт
```
Напиши Node.js скрипт для загрузки заказов в RetailCRM v5 API.
Входные данные: mock_orders.json (массив заказов с firstName, lastName, phone, items[]).
Нужно: POST /api/v5/orders/create для каждого заказа.
Добавь rate limiting (не больше 20 req/s), обработку ошибок, прогресс в консоли.
```

### Промпт 4 — Supabase синхронизация
```
Напиши скрипт sync RetailCRM → Supabase.
1. GET все заказы из RetailCRM API (с пагинацией)
2. Трансформируй в плоскую структуру (crm_id, total_price, city, utm_source...)
3. Upsert в Supabase через REST API (resolution=merge-duplicates)
Без внешних зависимостей, только Node.js встроенные модули.
```

### Промпт 5 — Telegram бот
```
Telegram бот для уведомлений о крупных заказах > 50000 ₸.
Два режима:
1. Webhook (Vercel serverless) — получает POST от RetailCRM webhooks
2. Polling (локально) — каждые 30 сек проверяет новые заказы в CRM
Уведомление должно содержать: имя клиента, город, список товаров, сумму, источник.
Оформление с эмодзи. Без внешних npm пакетов.
```

---

## Где застрял и как решил

### 1. RetailCRM rate limiting
**Проблема:** При быстрой загрузке 50 заказов получал 429 Too Many Requests.  
**Решение:** Добавил `await sleep(60)` между запросами (60мс = ~16 req/s, ниже лимита 20/s).

### 2. Supabase upsert без SDK
**Проблема:** Не хотел тянуть `@supabase/supabase-js` ради одного скрипта.  
**Решение:** Нашёл что Supabase REST API принимает `Prefer: resolution=merge-duplicates` хедер — работает как upsert по unique constraint на `crm_id`.

### 3. Chart.js в статическом HTML
**Проблема:** Хотел использовать CDN, но боялся проблем с CSP на Vercel.  
**Решение:** Использовал `cdn.jsdelivr.net` — он в whitelist Vercel по умолчанию.

### 4. Telegram CHAT_ID
**Проблема:** Новый бот не знает chat_id пользователя.  
**Решение:** Написал боту `/start`, открыл `getUpdates` endpoint, нашёл id в ответе.

### 5. RetailCRM webhook формат
**Проблема:** Не знал точный формат payload который CRM отправляет на webhook.  
**Решение:** Добавил `console.log(req.body)` в handler, сделал тестовый заказ, посмотрел в Vercel logs.

---

## Скриншоты

| Дашборд | Telegram уведомление |
|---------|---------------------|
| ![Dashboard](./screenshots/dashboard.png) | ![Telegram](./screenshots/telegram.png) |

---

## Технологии

- **Frontend:** Vanilla HTML/CSS/JS + Chart.js 4.4
- **Backend scripts:** Node.js (без зависимостей)
- **DB:** Supabase (PostgreSQL)
- **CRM:** RetailCRM v5 API
- **Deploy:** Vercel (static + serverless)
- **Bot:** Telegram Bot API

---

## Лицензия

MIT
