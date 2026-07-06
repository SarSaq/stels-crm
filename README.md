# Stels CRM

Производственная CRM для компании широкоформатной печати. Заменяет Google-таблицу
«Заказы 2026»: заказы, этапы производства, машина состояний, канбан, аналитика.

**Live:** https://stels-crm.vercel.app

## Стек

- **Next.js 15** (App Router, TypeScript, Tailwind) на Vercel
- **Supabase** (PostgreSQL + Storage + Auth)
- Автодеплой: push в `main` → сборка на Vercel

## Структура

```
src/
  app/            # страницы: список (/), канбан (/board), карточка (/orders/[id])
  components/     # UI: таблица, канбан, фильтры, контролы статусов
  lib/
    supabase/     # клиенты (server/browser)
    state-machine.ts  # логика статусов заказа/этапов (из Apps Script)
    actions.ts    # Server Actions: смена статусов + история
    queries.ts    # выборки из БД
docs/             # доменная модель, схема БД
scripts/          # импорт данных, тесты логики
```

## Разработка

```bash
npm install
npm run dev        # http://localhost:3000
```

Переменные окружения — см. `.env.example` (URL и anon-ключ Supabase).

## Данные

Импорт истории из CSV: `node scripts/import-all.mjs` (требует service_role в `.env.local`).
Тест машины состояний: `node scripts/test-state-machine.mjs`.
