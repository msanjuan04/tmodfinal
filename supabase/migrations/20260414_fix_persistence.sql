-- =============================================================================
-- Migración: Arreglo de persistencia de datos
-- Fecha: 2026-04-14
--
-- Objetivo: sincronizar el esquema de Supabase con lo que el código de la app
-- realmente intenta escribir. Antes de esta migración:
--   * public.budget_items no existía           → presupuestos no se podían crear
--   * public.budget_products no existía        → catálogo de productos fallaba
--   * public.personal_events no existía        → eventos privados del admin fallaban
--   * public.budgets tenía columnas NOT NULL   → los INSERTs reventaban
--     (title, items) que el código nunca pasa, y le faltaban columnas que
--     el código sí usa (issue_date, status, currency, subtotal, tax, message)
--   * public.projects no tenía la columna map_url que el código escribe
--
-- Esta migración es IDEMPOTENTE: puedes ejecutarla varias veces sin romper nada.
-- Pégala tal cual en el SQL Editor de Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. projects.map_url  (para el enlace/iframe de mapa de ubicación del proyecto)
-- -----------------------------------------------------------------------------
alter table public.projects
  add column if not exists map_url text;


-- -----------------------------------------------------------------------------
-- 2. budgets: alinear con lo que el código inserta / selecciona
-- -----------------------------------------------------------------------------

-- Añadir columnas que el código usa
alter table public.budgets add column if not exists issue_date date;
alter table public.budgets add column if not exists status     text;
alter table public.budgets add column if not exists currency   text;
alter table public.budgets add column if not exists subtotal   numeric(12,2);
alter table public.budgets add column if not exists tax        numeric(12,2);
alter table public.budgets add column if not exists message    text;

-- Valores por defecto y backfill de filas existentes
alter table public.budgets alter column status   set default 'draft';
alter table public.budgets alter column currency set default 'EUR';
alter table public.budgets alter column subtotal set default 0;
alter table public.budgets alter column tax      set default 0;

update public.budgets set status     = coalesce(status, 'draft');
update public.budgets set currency   = coalesce(currency, 'EUR');
update public.budgets set subtotal   = coalesce(subtotal, 0);
update public.budgets set tax        = coalesce(tax, 0);
update public.budgets set issue_date = coalesce(issue_date, (created_at at time zone 'utc')::date);

-- Quitar NOT NULL de columnas antiguas que el código no rellena
alter table public.budgets alter column title     drop not null;
alter table public.budgets alter column items     drop not null;
alter table public.budgets alter column tax_rate  drop not null;
alter table public.budgets alter column client_name drop not null; -- seguridad: si algún día falta

-- Restringir valores de status a un conjunto conocido
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'budgets_status_check'
  ) then
    alter table public.budgets
      add constraint budgets_status_check
      check (status in ('draft', 'sent', 'approved', 'rejected', 'archived'));
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 3. budget_items: líneas de un presupuesto (una fila por producto/servicio)
-- -----------------------------------------------------------------------------
create table if not exists public.budget_items (
  id            uuid primary key default uuid_generate_v4(),
  budget_id     uuid not null references public.budgets(id) on delete cascade,
  product_id    uuid,
  product_name  text not null,
  unit_price    numeric(12,2) not null default 0,
  quantity      numeric(12,3) not null default 1,
  discount      numeric(12,2) not null default 0,
  notes         text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists budget_items_budget_id_idx on public.budget_items(budget_id, sort_order);


-- -----------------------------------------------------------------------------
-- 4. budget_products: catálogo maestro de productos/servicios reutilizables
-- -----------------------------------------------------------------------------
create table if not exists public.budget_products (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  unit_price   numeric(12,2) not null default 0,
  image_path   text,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists budget_products_created_at_idx on public.budget_products(created_at desc);

-- Ahora que budget_products existe podemos declarar la FK opcional en budget_items
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'budget_items_product_id_fkey'
  ) then
    alter table public.budget_items
      add constraint budget_items_product_id_fkey
      foreign key (product_id) references public.budget_products(id) on delete set null;
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 5. personal_events: eventos privados del admin (calendario personal)
-- -----------------------------------------------------------------------------
create table if not exists public.personal_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.app_users(id) on delete cascade,
  title       text not null,
  description text,
  event_type  text not null default 'personal',
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  is_all_day  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists personal_events_user_idx on public.personal_events(user_id, starts_at);


-- -----------------------------------------------------------------------------
-- 6. Triggers de updated_at para las tablas nuevas
--    (si en tu proyecto ya tienes la función moddatetime o similar, reutilízala;
--     aquí creamos una genérica que no pisa nada)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'budget_items_set_updated_at') then
    create trigger budget_items_set_updated_at
      before update on public.budget_items
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'budget_products_set_updated_at') then
    create trigger budget_products_set_updated_at
      before update on public.budget_products
      for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'personal_events_set_updated_at') then
    create trigger personal_events_set_updated_at
      before update on public.personal_events
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- =============================================================================
-- Fin de la migración
-- =============================================================================
