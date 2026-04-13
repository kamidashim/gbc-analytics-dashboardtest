GBC Analytics Dashboard
Мини-дашборд заказов с интеграцией RetailCRM → Supabase → Vercel + Telegram-бот.
Live demo: https://project-psi-three-20.vercel.app
GitHub: https://github.com/kamidashim/gbc-analytics-dashboardtest

Стек

Frontend: HTML/CSS/JS + Chart.js
База данных: Supabase (PostgreSQL)
CRM: RetailCRM v5 API
Deploy: Vercel
Бот: Telegram Bot API


Что сделано
Шаг 1. Зарегистрировал аккаунты: RetailCRM, Supabase, Vercel, Telegram Bot через BotFather.
Шаг 2. Загрузил 50 заказов из mock_orders.json в RetailCRM через API (scripts/upload_to_retailcrm.js).
Шаг 3. Написал скрипт синхронизации RetailCRM → Supabase (scripts/sync_to_supabase.js). Данные хранятся в таблице orders.
Шаг 4. Сделал дашборд с графиками (динамика заказов, источники трафика, выручка по дням, таблица заказов). Задеплоил на Vercel.
Шаг 5. Настроил Telegram-бот — отправляет уведомление когда заказ превышает 50 000 ₸.

Промпты которые давал Claude
Промпт 1:
Мне нужно сделать тестовое задание. Загрузить 50 заказов из mock_orders.json 
в RetailCRM через API, написать скрипт RetailCRM → Supabase, сделать дашборд 
с графиками, Telegram бот — уведомление при заказе > 50000 ₸. 
Создай полный проект со всеми скриптами и README.
Промпт 2:
Сделай красивый HTML дашборд для заказов интернет-магазина. Тёмная тема, 
KPI карточки, график динамики заказов, пончик-диаграмма источников трафика, 
таблица заказов с фильтрами. Chart.js, данные из JS массива.
Промпт 3:
Напиши Node.js скрипт для загрузки заказов в RetailCRM v5 API. 
Rate limiting, обработка ошибок, прогресс в консоли. Без внешних зависимостей.
Промпт 4:
Скрипт синхронизации RetailCRM → Supabase. Забрать все заказы с пагинацией, 
трансформировать в плоскую структуру, upsert через REST API.
Промпт 5:
Telegram бот — уведомления о заказах > 50000 ₸. Webhook режим для Vercel 
и polling режим для локального тестирования. Без внешних npm пакетов.

Где застрял и как решил
RetailCRM — тип заказа. При загрузке получал ошибку orderType does not exist. Решение — убрал поле orderType из запроса.
Node.js не читает .env. Скрипты не видели переменные окружения. Решение — установил dotenv и добавил require('dotenv').config() в начало каждого скрипта.
Путь к mock_orders.json. Скрипт искал файл в корне диска. Решение — заменил относительный путь на path.join(__dirname, '../mock_orders.json').
Telegram заблокирован в РФ. Уведомления не доходили. Решение — использовал VPN для тестирования.
Названия товаров undefined. RetailCRM возвращает название в поле offer.name, а не productName. Решение — i.offer?.name || i.productName.

Структура проекта
├── dashboard/index.html          # Дашборд
├── scripts/
│   ├── upload_to_retailcrm.js    # Загрузка заказов в CRM
│   ├── sync_to_supabase.js       # Синхронизация CRM → Supabase
│   └── supabase_schema.sql       # Схема таблицы
├── telegram-bot/webhook.js       # Telegram бот
├── mock_orders.json              # 50 тестовых заказов
└── vercel.json                   # Конфиг деплоя