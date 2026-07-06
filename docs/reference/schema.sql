-- ============================================================================
-- Stels CRM — схема базы данных (PostgreSQL / Supabase)
-- Соответствует docs/schema.md. Выполняется в Supabase SQL Editor.
-- Идемпотентно: можно прогонять повторно (DROP ... IF EXISTS в начале не делаем,
-- используем CREATE ... IF NOT EXISTS и ON CONFLICT при засеве справочников).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM-типы (фиксированные списки значений)
-- ---------------------------------------------------------------------------

-- Статусы заказа (12 значений, из справочника «Параметры»)
do $$ begin
  create type order_status as enum (
    'Ожидание','Проверка','В работе','В процессе','Постпресс',
    'Инженер','Макетка','ОТК','Готово','Монтаж','Отгружено','Отмена'
  );
exception when duplicate_object then null; end $$;

-- Статус этапа производства (пусто = NULL)
do $$ begin
  create type stage_status as enum ('В работе','В процессе','Выполнено');
exception when duplicate_object then null; end $$;

-- Роли сотрудников
do $$ begin
  create type user_role as enum (
    'manager','prepress','production','qc','director',
    'engineer','installer','assembler'
  );
exception when duplicate_object then null; end $$;

-- Тип этапа: галочка или текстовое значение (как ламинация)
do $$ begin
  create type stage_kind as enum ('checkbox','text');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Справочники
-- ---------------------------------------------------------------------------

-- 3. Типы этапов производства (Печать, Проварка, Ламинация, Резка, Фрезер, Сварка, Макетка)
create table if not exists stage_types (
  id          smallint generated always as identity primary key,
  name        text not null unique,
  kind        stage_kind not null default 'checkbox',
  sort_order  smallint not null default 0
);

-- 4. Клиенты (~1698)
create table if not exists clients (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- 5. Материалы (~94)
create table if not exists materials (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  is_active   boolean not null default true
);

-- 6. Сотрудники (связаны с Supabase Auth через auth_id)
create table if not exists users (
  id          bigint generated always as identity primary key,
  auth_id     uuid unique,               -- ссылка на auth.users (Supabase Auth), может быть NULL до приглашения
  full_name   text not null,
  role        user_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 8. Мелкие справочники (способ печати, оборудование, цвет, срочность, стороны …)
create table if not exists reference_values (
  id          bigint generated always as identity primary key,
  category    text not null,             -- 'print_method' | 'print_equipment' | 'color' | 'sides' | ...
  value       text not null,
  sort_order  smallint not null default 0,
  unique (category, value)
);

-- ---------------------------------------------------------------------------
-- 1. Заказы (центральная таблица)
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id                 bigint generated always as identity primary key,
  legacy_num         integer,                       -- старый «#» из таблицы (для сверки при импорте)
  client_id          bigint references clients(id),
  manager_id         bigint references users(id),   -- «Добавил»
  owner_id           bigint references users(id),   -- владелец/бронь (замена статусу «Ожидание»)
  status             order_status not null default 'Ожидание',

  description        text,
  source_link        text,                          -- ссылка на исходник (Z:\...)

  quantity           integer,
  width_mm           integer,
  height_mm          integer,
  -- Площадь печати м²: Ш×В×кол-во, считается автоматически (мм→м: /1000 /1000)
  print_area_m2      numeric(12,3) generated always as (
                       (coalesce(width_mm,0)::numeric / 1000)
                     * (coalesce(height_mm,0)::numeric / 1000)
                     * coalesce(quantity,0)
                     ) stored,

  material_id        bigint references materials(id),
  material_available boolean,                        -- наличие на складе (Да/Нет)
  print_method       text,                           -- УФ печать / Сольвент / Без печати
  print_equipment    text,                           -- УФ планшет / Сольвент 1,6 …
  sides              smallint,                        -- 0 / 1 / 2
  color              text,                            -- CMYK / CMYK+W / Белила

  file_name          text,                            -- Назв-е файла (кол. T)
  print_link         text,                            -- ссылка для печати (кол. U, V:\...)
  preview_url        text,                            -- превью (Supabase Storage / истор. Cloudinary)

  is_urgent          boolean not null default false,  -- «Срочно» (менеджер)
  is_fire            boolean not null default false,  -- «🔥» (руководитель производства)
  due_date           date,                            -- дата сдачи

  -- информационные флаги-пометки (не этапы)
  flag_scotch        boolean not null default false,  -- Нанесение скотча
  flag_vyborka       boolean not null default false,  -- Выборка
  flag_mount_film    boolean not null default false,  -- Монтажная пленка

  tech_notes         text,                            -- технические характеристики печати

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_orders_status     on orders(status);
create index if not exists idx_orders_client     on orders(client_id);
create index if not exists idx_orders_manager    on orders(manager_id);
create index if not exists idx_orders_created     on orders(created_at desc);
create index if not exists idx_orders_legacy_num on orders(legacy_num);

-- ---------------------------------------------------------------------------
-- 2. Этапы производства заказа (замена «парных колонок»)
-- ---------------------------------------------------------------------------
create table if not exists order_stages (
  id             bigint generated always as identity primary key,
  order_id       bigint not null references orders(id) on delete cascade,
  stage_type_id  smallint not null references stage_types(id),
  is_active      boolean not null default true,       -- нужен ли этап (старая «галочка»)
  sequence       smallint not null default 0,          -- порядок выполнения (перетаскиваемый)
  status         stage_status,                         -- NULL = не начат
  detail         text,                                 -- напр. Ламинация: Мат/Глянец
  assignee_id    bigint references users(id),          -- кто выполняет (задел на будущее)
  started_at     timestamptz,
  done_at        timestamptz,
  unique (order_id, stage_type_id)
);

create index if not exists idx_stages_order  on order_stages(order_id);
create index if not exists idx_stages_type   on order_stages(stage_type_id);
create index if not exists idx_stages_status on order_stages(status);

-- ---------------------------------------------------------------------------
-- 7. История изменений (нового не было в Sheets)
-- ---------------------------------------------------------------------------
create table if not exists order_history (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references orders(id) on delete cascade,
  user_id     bigint references users(id),
  field       text not null,        -- 'order.status' | 'stage.status' | ...
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_history_order on order_history(order_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Триггер: автообновление updated_at на orders
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Засев справочника типов этапов (6 активных этапов + Макетка)
-- ---------------------------------------------------------------------------
insert into stage_types (name, kind, sort_order) values
  ('Печать',     'checkbox', 10),
  ('Проварка',   'checkbox', 20),
  ('Ламинация',  'text',     30),
  ('Резка',      'checkbox', 40),
  ('Фрезер',     'checkbox', 50),
  ('Сварка',     'checkbox', 60),
  ('Макетка',    'checkbox', 70)
on conflict (name) do nothing;

-- Примечание: клиенты, материалы, сотрудники и reference_values засеваются
-- отдельным импортёром из data/*.csv (см. следующий шаг проекта).
