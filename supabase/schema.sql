-- Terrazea Client Zone schema
-- Provision this file in Supabase SQL editor or via `supabase db push`

-- ============================================================================
-- BLOCK 1: CLEANUP - Ejecutar primero para limpiar datos existentes
-- ============================================================================

-- Deshabilitar RLS temporalmente para limpieza
alter table if exists public.project_messages disable row level security;
alter table if exists public.project_payments disable row level security;
alter table if exists public.project_conversations disable row level security;
alter table if exists public.project_photos_summary disable row level security;
alter table if exists public.project_events disable row level security;
alter table if exists public.project_documents_summary disable row level security;
alter table if exists public.project_metrics disable row level security;
alter table if exists public.project_documents disable row level security;
alter table if exists public.project_photos disable row level security;
alter table if exists public.project_activity disable row level security;
alter table if exists public.project_phases disable row level security;
alter table if exists public.project_milestones disable row level security;
alter table if exists public.project_team_members disable row level security;
alter table if exists public.team_members disable row level security;
alter table if exists public.project_updates disable row level security;
alter table if exists public.projects disable row level security;
alter table if exists public.clients disable row level security;
alter table if exists public.app_users disable row level security;
alter table if exists public.project_notifications disable row level security;

-- Eliminar datos existentes (en orden correcto por foreign keys)
delete from public.project_messages;
delete from public.project_payments;
delete from public.project_conversations;
delete from public.project_photos_summary;
delete from public.project_events;
delete from public.project_documents_summary;
delete from public.project_metrics;
delete from public.project_documents;
delete from public.project_photos;
delete from public.project_activity;
delete from public.project_phases;
delete from public.project_milestones;
delete from public.project_team_members;
delete from public.team_members;
delete from public.project_updates;
delete from public.projects;
delete from public.clients;
delete from public.app_users;

-- Eliminar tablas existentes
drop table if exists public.project_messages cascade;
drop table if exists public.project_payments cascade;
drop table if exists public.project_conversations cascade;
drop table if exists public.project_photos_summary cascade;
drop table if exists public.project_events cascade;
drop table if exists public.project_documents_summary cascade;
drop table if exists public.project_metrics cascade;
drop table if exists public.project_documents cascade;
drop table if exists public.project_photos cascade;
drop table if exists public.project_activity cascade;
drop table if exists public.project_phases cascade;
drop table if exists public.project_milestones cascade;
drop table if exists public.project_team_members cascade;
drop table if exists public.team_members cascade;
drop table if exists public.project_updates cascade;
drop table if exists public.projects cascade;
drop table if exists public.clients cascade;
drop table if exists public.app_users cascade;
drop table if exists public.project_notifications cascade;

-- Eliminar tipos existentes
drop type if exists public.message_sender cascade;
drop type if exists public.document_status cascade;
drop type if exists public.activity_status cascade;
drop type if exists public.phase_status cascade;
drop type if exists public.milestone_status cascade;
drop type if exists public.update_type cascade;
drop type if exists public.payment_status cascade;
drop type if exists public.notification_audience cascade;

-- ============================================================================
-- BLOCK 2: SCHEMA COMPLETO - Ejecutar después del bloque de limpieza
-- ============================================================================

-- Asegurar extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Core domain tables --------------------------------------------------------

create type public.client_status as enum ('activo', 'inactivo', 'nuevo', 'con_incidencias');

create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null unique,
  stripe_customer_id text unique,
  phone text,
  client_type text,
  company text,
  status public.client_status not null default 'activo',
  address text,
  city text,
  country text,
  avatar_url text,
  tags text[] not null default '{}',
  last_active_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  password_initialized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_status_idx on public.clients(status);
create index clients_created_at_idx on public.clients(created_at desc);
create index clients_stripe_customer_idx on public.clients(stripe_customer_id);

-- Tabla de usuarios de la aplicación con autenticación
create table public.app_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  role text not null default 'client' check (role in ('admin', 'client')),
  must_update_password boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_notes (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references public.app_users(id) on delete set null,
  title text,
  content text not null,
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_notes_client_id_idx on public.client_notes(client_id, created_at desc);

-- Presupuestos guardados ------------------------------------------------------

create table public.budgets (
  id uuid primary key default uuid_generate_v4(),
  title text,
  client_id uuid references public.clients(id) on delete set null,
  client_type text not null default 'existing' check (client_type in ('existing', 'new')),
  client_name text,
  client_email text,
  items jsonb,
  notes text,
  issue_date date,
  status text default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected', 'archived')),
  currency text default 'EUR',
  subtotal numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  total numeric(12,2) not null default 0,
  tax_rate numeric(5,2) default 21,
  message text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budgets_created_at_idx on public.budgets(created_at desc);

-- Catálogo maestro de productos/servicios reutilizables en presupuestos
create table public.budget_products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  unit_price numeric(12,2) not null default 0,
  image_path text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budget_products_created_at_idx on public.budget_products(created_at desc);

-- Líneas (items) de cada presupuesto
create table public.budget_items (
  id uuid primary key default uuid_generate_v4(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  product_id uuid references public.budget_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null default 0,
  quantity numeric(12,3) not null default 1,
  discount numeric(12,2) not null default 0,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budget_items_budget_id_idx on public.budget_items(budget_id, sort_order);

-- Eventos privados del admin (calendario personal, no visibles al cliente)
create table public.personal_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'personal',
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personal_events_user_idx on public.personal_events(user_id, starts_at);

create or replace function public.verify_password(password_input text, password_hash text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select crypt(password_input, password_hash) = password_hash;
$$;

create or replace function public.login_user_with_password(email_input text, password_input text)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  must_update_password boolean
)
language sql
security definer
set search_path = public
as $$
  select
    id,
    email,
    full_name,
    role,
    must_update_password
  from public.app_users
  where email = lower(email_input)
    and is_active = true
    and crypt(password_input, password_hash) = password_hash
  limit 1;
$$;

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  slug text not null unique,
  name text not null,
  code text,
  status text not null default 'en_progreso',
  progress_percent numeric(5,2) not null default 0,
  start_date date,
  estimated_delivery date,
  location_city text,
  location_notes text,
  map_url text,
  total_days integer,
  remaining_days integer,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.update_type as enum ('success', 'info', 'warning', 'message');

create type public.payment_status as enum ('draft', 'pending', 'paid', 'failed', 'canceled');
create type public.notification_audience as enum ('client', 'admin');

create table public.project_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  update_type public.update_type not null default 'info',
  occurred_at timestamptz not null default now()
);
create index project_updates_project_id_idx on public.project_updates(project_id, occurred_at desc);

create table public.team_members (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  role text not null,
  email text,
  phone_number text,
  avatar_url text,
  default_status text not null default 'offline',
  created_at timestamptz not null default now()
);

create table public.project_team_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  status text not null default 'offline',
  is_primary boolean not null default false,
  assigned_role text not null default 'member',
  primary key (project_id, team_member_id)
);

create type public.milestone_status as enum ('pending', 'in_progress', 'completed', 'delayed');

create table public.project_milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  summary text,
  scheduled_start date,
  scheduled_end date,
  actual_date date,
  weight numeric(6,2) not null default 1 check (weight >= 0.25 and mod(weight * 4, 1) = 0),
  progress_percent integer not null default 0,
  status public.milestone_status not null default 'pending',
  sort_order integer not null default 0
);
create index project_milestones_project_id_idx on public.project_milestones(project_id, sort_order);

create type public.phase_status as enum ('pending', 'in_progress', 'completed', 'delayed');

create table public.project_phases (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  summary text,
  expected_start date,
  expected_end date,
  actual_end date,
  weight numeric(6,2) not null default 1 check (weight >= 0.25 and mod(weight * 4, 1) = 0),
  progress_percent integer not null default 0,
  status public.phase_status not null default 'pending',
  sort_order integer not null default 0
);
create index project_phases_project_id_idx on public.project_phases(project_id, sort_order);

create type public.activity_status as enum ('completed', 'info', 'warning');

create table public.project_activity (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  title text not null,
  description text,
  event_type text not null default 'project',
  status public.activity_status not null default 'info'
);
create index project_activity_project_id_idx on public.project_activity(project_id, occurred_at desc);

create table public.client_activity (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb,
  related_project_id uuid references public.projects(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null
);
create index client_activity_client_id_idx on public.client_activity(client_id, occurred_at desc);

create type public.project_event_visibility as enum ('client_visible', 'internal');

create table public.project_events (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'general',
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_all_day boolean not null default false,
  visibility public.project_event_visibility not null default 'client_visible',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_events_project_id_idx on public.project_events(project_id, starts_at);
create index project_events_visibility_idx on public.project_events(project_id, visibility, starts_at);

create table public.project_photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  url text not null,
  caption text,
  taken_at date,
  sort_order integer not null default 0,
  storage_path text,
  tags text[] not null default '{}',
  is_cover boolean not null default false
);
create index project_photos_project_id_idx on public.project_photos(project_id, sort_order);

create type public.document_status as enum ('aprobado', 'vigente', 'actualizado');

create table public.project_documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  category text not null,
  file_type text not null,
  size_label text,
  uploaded_at date,
  status public.document_status not null default 'vigente',
  storage_path text,
  uploaded_by uuid references public.team_members(id) on delete set null,
  notify_client boolean not null default false,
  tags text[] not null default '{}',
  notes text
);
create index project_documents_project_id_idx on public.project_documents(project_id, uploaded_at desc);

create table public.client_documents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  category text not null,
  file_type text not null,
  size_label text,
  storage_path text,
  url text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.app_users(id) on delete set null,
  tags text[] not null default '{}',
  notes text,
  notify_client boolean not null default false
);
create index client_documents_client_id_idx on public.client_documents(client_id, uploaded_at desc);

create table public.project_metrics (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  metric_code text not null,
  label text not null,
  value numeric not null,
  sublabel text,
  sort_order integer not null default 0
);
create unique index project_metrics_project_id_metric_code_idx on public.project_metrics(project_id, metric_code);

create table public.project_documents_summary (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  count integer not null default 0
);
create unique index project_documents_summary_project_id_category_idx on public.project_documents_summary(project_id, category);

create table public.project_photos_summary (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  total_photos integer not null default 0,
  last_update date
);

create type public.message_sender as enum ('client', 'team_member');

create table public.project_conversations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  unread_count integer not null default 0,
  last_message_preview text,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create index project_conversations_project_id_idx on public.project_conversations(project_id, last_message_at desc);

create table public.project_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.project_conversations(id) on delete cascade,
  sender_type public.message_sender not null,
  team_member_id uuid references public.team_members(id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now()
);
create index project_messages_conversation_id_idx on public.project_messages(conversation_id, sent_at);

create table public.project_tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',
  weight numeric(6,2) not null default 1 check (weight >= 0.25 and mod(weight * 4, 1) = 0),
  assignee_id uuid references public.team_members(id) on delete set null,
  start_date date,
  due_date date,
  position numeric not null default 0,
  created_by uuid references public.app_users(id) on delete set null,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_tasks_project_id_idx on public.project_tasks(project_id);
create index project_tasks_status_idx on public.project_tasks(status);

create table public.project_task_activity (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  actor_id uuid references public.app_users(id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index project_task_activity_task_id_idx on public.project_task_activity(task_id, created_at desc);

create table public.project_payments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  concept text not null,
  description text,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  status public.payment_status not null default 'draft',
  due_date date,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_invoice_id text,
  payment_link text,
  proposal_document_id uuid references public.project_documents(id) on delete set null,
  created_by uuid references public.app_users(id) on delete set null,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index project_payments_project_id_idx on public.project_payments(project_id, created_at desc);
create index project_payments_client_id_idx on public.project_payments(client_id, created_at desc);
create index project_payments_status_idx on public.project_payments(status, created_at desc);
create index project_payments_due_date_idx on public.project_payments(due_date);
create index project_payments_checkout_idx on public.project_payments(stripe_checkout_session_id);
create index project_payments_payment_intent_idx on public.project_payments(stripe_payment_intent_id);
create index project_payments_document_idx on public.project_payments(proposal_document_id);

create table public.project_notifications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  audience public.notification_audience not null default 'client',
  type text not null,
  title text not null,
  description text,
  link_url text,
  related_id text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index project_notifications_audience_idx on public.project_notifications(audience, created_at desc);
create index project_notifications_client_idx on public.project_notifications(client_id, created_at desc);
create index project_notifications_project_idx on public.project_notifications(project_id, created_at desc);

-- Enable RLS (service role used by Next.js server bypasses policies)
alter table public.app_users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.team_members enable row level security;
alter table public.project_team_members enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_phases enable row level security;
alter table public.project_activity enable row level security;
alter table public.project_events enable row level security;
alter table public.project_photos enable row level security;
alter table public.project_documents enable row level security;
alter table public.client_documents enable row level security;
alter table public.project_metrics enable row level security;
alter table public.project_documents_summary enable row level security;
alter table public.project_photos_summary enable row level security;
alter table public.project_conversations enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_task_activity enable row level security;
alter table public.project_payments enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_activity enable row level security;
alter table public.project_notifications enable row level security;

-- --------------------------------------------------------------------------
-- RLS policies: permitir acceso completo solo al service role y admin Terrazea
-- --------------------------------------------------------------------------

create policy service_role_full_access_app_users
  on public.app_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_app_users
  on public.app_users
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_clients
  on public.clients
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_clients
  on public.clients
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_projects
  on public.projects
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_projects
  on public.projects
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_events
  on public.project_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_events
  on public.project_events
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_documents
  on public.project_documents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_documents
  on public.project_documents
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_team_members
  on public.team_members
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_team_members
  on public.team_members
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_team_members
  on public.project_team_members
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_team_members
  on public.project_team_members
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_tasks
  on public.project_tasks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_tasks
  on public.project_tasks
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_task_activity
  on public.project_task_activity
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_task_activity
  on public.project_task_activity
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_payments
  on public.project_payments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_payments
  on public.project_payments
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

create policy service_role_full_access_project_notifications
  on public.project_notifications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy admin_email_full_access_project_notifications
  on public.project_notifications
  for all
  using (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com')
  with check (lower(coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'email') = 'aterrazea@gmail.com');

-- Seed data -----------------------------------------------------------------

-- Usuario administrador con contraseña hasheada
insert into public.app_users (id, email, password_hash, full_name, role)
values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'aterrazea@gmail.com',
  crypt('admin123', gen_salt('bf')),
  'Administrador Terrazea',
  'admin'
)
on conflict (id) do nothing;

-- Usuarios cliente de ejemplo
insert into public.app_users (email, password_hash, full_name, role)
values 
  ('juan@example.com', crypt('password123', gen_salt('bf')), 'Juan Pérez', 'client'),
  ('maria.garcia@example.com', crypt('password123', gen_salt('bf')), 'María García', 'client'),
  ('carlos.lopez@example.com', crypt('password123', gen_salt('bf')), 'Carlos López', 'client')
on conflict (email) do nothing;

insert into public.clients (id, full_name, email, phone, client_type, company, status, city, country, tags, last_active_at, password_initialized)
values (
  '4c0a5c7d-3b6c-4dcb-ab62-81af21d8ab8c',
  'Juan Pérez',
  'juan@example.com',
  '+34 600 123 456',
  'Residencial',
  null,
  'activo',
  'Barcelona',
  'España',
  ARRAY['terrazea','vip'],
  now() - interval '2 days',
  true
)
on conflict (id) do nothing;

-- Clientes adicionales
insert into public.clients (full_name, email, phone, client_type, company, status, city, country, tags, last_active_at, password_initialized)
values 
  ('María García', 'maria.garcia@example.com', '+34 600 222 111', 'Residencial', null, 'activo', 'Madrid', 'España', ARRAY['premium'], now() - interval '1 day', true),
  ('Carlos López', 'carlos.lopez@example.com', '+34 600 333 222', 'Corporativo', 'López Arquitectos', 'inactivo', 'Valencia', 'España', ARRAY['arquitectura'], now() - interval '15 days', true)
on conflict (email) do nothing;

insert into public.client_notes (client_id, title, content, tags, is_pinned)
values
  ('4c0a5c7d-3b6c-4dcb-ab62-81af21d8ab8c', 'Seguimiento inicial', 'Cliente interesado en extensión del proyecto a zona chill-out.', ARRAY['seguimiento'], true),
  ((select id from public.clients where email = 'maria.garcia@example.com'), 'Preferencias de diseño', 'Prefiere materiales sostenibles y acabado mate.', ARRAY['feedback'], false)
on conflict do nothing;

insert into public.client_activity (client_id, event_type, title, description, related_project_id, metadata)
values
  ('4c0a5c7d-3b6c-4dcb-ab62-81af21d8ab8c', 'project_created', 'Proyecto Terraza Mediterránea Premium', 'Se creó el proyecto principal para Juan Pérez.', 'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', jsonb_build_object('status', 'en_progreso')),
  ((select id from public.clients where email = 'maria.garcia@example.com'), 'message', 'Mensaje enviado', 'Se envió propuesta inicial al cliente.', null, jsonb_build_object('channel', 'email'))
on conflict do nothing;

insert into public.client_documents (client_id, project_id, name, category, file_type, size_label, storage_path, url, tags)
values
  ('4c0a5c7d-3b6c-4dcb-ab62-81af21d8ab8c', 'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Contrato Terrazea', 'Legal', 'application/pdf', '1.2 MB', null, '/static/docs/contrato-terrazea.pdf', ARRAY['contrato','legal'])
on conflict do nothing;

insert into public.projects (
  id,
  client_id,
  slug,
  name,
  code,
  status,
  progress_percent,
  start_date,
  estimated_delivery,
  location_city,
  location_notes,
  total_days,
  remaining_days,
  hero_image_url
)
values (
  'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7',
  '4c0a5c7d-3b6c-4dcb-ab62-81af21d8ab8c',
  'terraza-mediterranea-premium',
  'Terraza Mediterránea Premium',
  'TRZ-2024-089',
  'en_progreso',
  68,
  '2024-01-15',
  '2024-03-30',
  'Barcelona',
  'Zona residencial premium',
  75,
  24,
  null
)
on conflict (id) do nothing;

insert into public.project_metrics (project_id, metric_code, label, value, sublabel, sort_order)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'milestones_completed', 'Hitos Completados', 8, '12 totales', 1),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'documents_total', 'Documentos', 24, '3 nuevos esta semana', 2),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'messages_total', 'Mensajes', 5, '2 sin leer', 3),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'photos_total', 'Fotos del Progreso', 142, 'Última actualización hoy', 4)
on conflict (project_id, metric_code) do update
set value = excluded.value,
    sublabel = excluded.sublabel,
    sort_order = excluded.sort_order;

insert into public.team_members (id, full_name, role, email, phone_number, avatar_url, default_status)
values
  ('2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', 'María González', 'Directora de Proyecto', 'maria.gonzalez@terrazea.com', '+34 600 000 001', null, 'online'),
  ('0e4d54b3-5c9e-4d2f-8bb8-3b77540182c4', 'Carlos Ruiz', 'Arquitecto Principal', 'carlos.ruiz@terrazea.com', '+34 600 000 002', null, 'online'),
  ('e83467ab-7d86-4c9f-afbe-0a0f731f8ecb', 'Ana Martínez', 'Ingeniera Estructural', 'ana.martinez@terrazea.com', '+34 600 000 003', null, 'offline'),
  ('9f7a2395-8e6a-4ae1-81c8-3ceabca0b4f7', 'Roberto Silva', 'Maestro de Obra', 'roberto.silva@terrazea.com', '+34 600 000 004', null, 'online')
on conflict (id) do nothing;

insert into public.project_team_members (project_id, team_member_id, status, is_primary, assigned_role)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', 'online', true, 'director'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '0e4d54b3-5c9e-4d2f-8bb8-3b77540182c4', 'online', false, 'arquitecto'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'e83467ab-7d86-4c9f-afbe-0a0f731f8ecb', 'offline', false, 'ingeniero'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '9f7a2395-8e6a-4ae1-81c8-3ceabca0b4f7', 'online', false, 'instalador')
on conflict (project_id, team_member_id) do update
set status = excluded.status,
    is_primary = excluded.is_primary,
    assigned_role = excluded.assigned_role;

insert into public.project_events (project_id, title, description, event_type, starts_at, ends_at, is_all_day, visibility, created_by)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Visita del equipo de obra', 'Revisión general de estructura y pavimento', 'visita_obra', now() + interval '1 day 9 hours', now() + interval '1 day 11 hours', false, 'client_visible', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Entrega de iluminación perimetral', 'Recepción de luminarias decorativas y cableado', 'logistica', now() + interval '3 days 8 hours', null, false, 'client_visible', '9f7a2395-8e6a-4ae1-81c8-3ceabca0b4f7'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Coordinación interna proveedores', 'Planificación de entrega de mobiliario exterior', 'interno', now() + interval '5 days 10 hours', now() + interval '5 days 11 hours', false, 'internal', '0e4d54b3-5c9e-4d2f-8bb8-3b77540182c4'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Entrega estimada del proyecto', 'Fecha objetivo de entrega al cliente Terrazea', 'entrega', '2024-03-30 10:00:00+00', null, true, 'client_visible', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df')
on conflict do nothing;

insert into public.project_updates (project_id, title, description, update_type, occurred_at)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Instalación de pérgola completada', 'La estructura principal de la pérgola ha sido instalada exitosamente.', 'success', now() - interval '2 hours'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Nuevo documento disponible', 'Certificado de materiales - Madera tratada para exteriores', 'info', now() - interval '5 hours'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Cambio en el cronograma', 'La instalación del sistema de riego se adelanta 2 días.', 'warning', now() - interval '1 day'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Mensaje del arquitecto', 'Propuesta de ajuste en la iluminación perimetral.', 'message', now() - interval '2 days')
on conflict do nothing;

insert into public.project_milestones (project_id, title, summary, scheduled_start, scheduled_end, actual_date, weight, progress_percent, status, sort_order)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Instalación del sistema de riego', 'Montaje del sistema completo de riego automatizado', '2024-03-08', '2024-03-10', null, 1.5, 85, 'in_progress', 1),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Colocación de pavimento', 'Colocación de piedra natural en zona lounge', '2024-03-12', '2024-03-15', null, 1.25, 30, 'in_progress', 2),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Instalación de iluminación', 'Instalación de luminarias LED perimetrales', '2024-03-18', '2024-03-20', null, 1, 0, 'pending', 3),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Plantación de vegetación', 'Plantación de especies seleccionadas para bajo mantenimiento', '2024-03-22', '2024-03-25', null, 1, 0, 'pending', 4)
on conflict do nothing;

insert into public.project_phases (project_id, name, summary, expected_start, expected_end, actual_end, weight, progress_percent, status, sort_order)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Preparación del terreno', 'Limpieza y nivelación de la zona de trabajo', '2023-12-10', '2023-12-20', '2023-12-19', 1, 100, 'completed', 1),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Estructura y cimentación', 'Cimentación y estructura metálica de soporte', '2023-12-21', '2024-01-05', '2024-01-04', 1, 100, 'completed', 2),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Instalación de pérgola', 'Montaje y acabado de pérgola con tratamiento', '2024-01-06', '2024-01-20', '2024-01-19', 1.2, 100, 'completed', 3),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Sistema de riego', 'Instalación de tuberías, aspersores y automatización', '2024-02-01', '2024-02-15', null, 1.1, 85, 'in_progress', 4),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Pavimentación', 'Colocación de piedra y juntas drenantes', '2024-02-16', '2024-03-05', null, 1, 30, 'in_progress', 5),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Iluminación', 'Instalación de luminarias y control domótico', '2024-03-06', '2024-03-18', null, 0.8, 0, 'pending', 6),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Plantación', 'Selección y plantado de especies ornamentales', '2024-03-19', '2024-03-27', null, 0.9, 0, 'pending', 7),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Acabados finales', 'Detalles finales, limpieza y entrega', '2024-03-28', '2024-03-30', null, 0.5, 0, 'pending', 8)
on conflict do nothing;

insert into public.project_activity (project_id, occurred_at, title, description, event_type, status)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', now(), 'Instalación de pérgola completada', 'La estructura principal de la pérgola ha sido instalada y asegurada. Se procederá con el tratamiento de protección.', 'milestone', 'completed'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', now() - interval '2 hours', 'Inspección de calidad realizada', 'El inspector certificó la correcta instalación de la estructura metálica.', 'quality', 'completed'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', now() - interval '1 day', 'Materiales recibidos', 'Llegaron las baldosas de piedra natural para la pavimentación.', 'logistics', 'info'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', now() - interval '1 day 4 hours', 'Ajuste en cronograma', 'La instalación del sistema de riego se adelanta 2 días debido al buen clima.', 'schedule', 'warning')
on conflict do nothing;

insert into public.project_photos (project_id, url, caption, taken_at, sort_order, storage_path, tags, is_cover)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '/outdoor-terrace-construction-progress.jpg', 'Vista general del proyecto - Semana 8', '2024-03-05', 1, null, ARRAY['avance','general'], true),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '/pergola-installation-outdoor.jpg', 'Instalación de pérgola principal', '2024-03-04', 2, null, ARRAY['estructura'], false),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '/outdoor-paving-stones.jpg', 'Preparación de base para pavimento', '2024-03-02', 3, null, ARRAY['pavimento'], false),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '/irrigation-system-installation.jpg', 'Sistema de riego en proceso', '2024-03-01', 4, null, ARRAY['riego'], false)
on conflict do nothing;

insert into public.project_documents (project_id, name, category, file_type, size_label, uploaded_at, status, storage_path, uploaded_by, notify_client, tags, notes)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Licencia de obra municipal', 'Legal', 'application/pdf', '2.4 MB', '2024-01-10', 'aprobado', 'project-documents/dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7/licencia-obra.pdf', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', true, ARRAY['legal','licencia'], 'Licencia validada por el ayuntamiento.'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Plano arquitectónico - Terraza', 'Planos', 'application/pdf', '8.1 MB', '2024-01-12', 'vigente', 'project-documents/dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7/plano-arquitectonico.pdf', '0e4d54b3-5c9e-4d2f-8bb8-3b77540182c4', false, ARRAY['planos'], null),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Especificaciones técnicas pérgola', 'Técnico', 'application/pdf', '1.2 MB', '2024-01-15', 'vigente', 'project-documents/dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7/spec-pergola.pdf', 'e83467ab-7d86-4c9f-afbe-0a0f731f8ecb', false, ARRAY['estructura'], null),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Certificado materiales - Piedra', 'Certificados', 'application/pdf', '890 KB', '2024-01-20', 'vigente', 'project-documents/dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7/certificado-piedra.pdf', '9f7a2395-8e6a-4ae1-81c8-3ceabca0b4f7', false, ARRAY['materiales','calidad'], 'Certificado emitido por proveedor oficial.'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Presupuesto detallado', 'Financiero', 'XLSX', '456 KB', '2024-01-08', 'aprobado'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Cronograma de obra', 'Planificación', 'PDF', '1.8 MB', '2024-01-10', 'actualizado'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Informe de inspección estructural', 'Certificados', 'PDF', '3.2 MB', '2024-01-25', 'aprobado'),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'Garantía sistema de riego', 'Garantías', 'PDF', '720 KB', '2024-03-01', 'vigente')
on conflict do nothing;

insert into public.project_documents_summary (project_id, category, count)
values
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'total', 24),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'planos', 8),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'certificados', 6),
  ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'garantias', 4)
on conflict (project_id, category) do update set count = excluded.count;

insert into public.project_photos_summary (project_id, total_photos, last_update)
values ('dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 142, '2024-03-06')
on conflict (project_id) do update set total_photos = excluded.total_photos, last_update = excluded.last_update;

insert into public.project_conversations (id, project_id, team_member_id, unread_count, last_message_preview, last_message_at)
values
  ('7d6fba0c-3f49-4a0d-bcfa-4f62fd46f2c2', 'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', 2, 'El informe de progreso está listo para revisión', now() - interval '30 minutes'),
  ('a52a6ddf-0247-4e66-92de-6ffb0b54883a', 'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '0e4d54b3-5c9e-4d2f-8bb8-3b77540182c4', 0, 'He actualizado los planos según tus comentarios', now() - interval '1 day'),
  ('30d1e7f0-9c8c-4c71-90d7-8f3a2d3af0fb', 'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', 'e83467ab-7d86-4c9f-afbe-0a0f731f8ecb', 0, 'La inspección está programada para el viernes', now() - interval '1 day'),
  ('2df2b3c6-3c42-4a65-ba85-38db22ad3afc', 'dd0518f1-52c3-4f6c-9f7f-71fc9c94b9a7', '9f7a2395-8e6a-4ae1-81c8-3ceabca0b4f7', 1, 'Fotos del progreso de hoy adjuntas', now() - interval '2 days')
on conflict (id) do update
set unread_count = excluded.unread_count,
    last_message_preview = excluded.last_message_preview,
    last_message_at = excluded.last_message_at;

insert into public.project_messages (conversation_id, sender_type, team_member_id, content, sent_at)
values
  ('7d6fba0c-3f49-4a0d-bcfa-4f62fd46f2c2', 'team_member', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', 'Hola Juan, espero que estés bien. Quería informarte que hemos completado la instalación de la pérgola.', now() - interval '1 hour 15 minutes'),
  ('7d6fba0c-3f49-4a0d-bcfa-4f62fd46f2c2', 'client', null, 'Excelente noticia! ¿Cuándo podré ver el resultado?', now() - interval '1 hour 10 minutes'),
  ('7d6fba0c-3f49-4a0d-bcfa-4f62fd46f2c2', 'team_member', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', 'Te he enviado algunas fotos al apartado de galería. La estructura quedó perfecta y ya aplicamos el tratamiento de protección.', now() - interval '1 hour 5 minutes'),
  ('7d6fba0c-3f49-4a0d-bcfa-4f62fd46f2c2', 'client', null, 'Las fotos se ven increíbles! Estoy muy contento con el resultado.', now() - interval '1 hour'),
  ('7d6fba0c-3f49-4a0d-bcfa-4f62fd46f2c2', 'team_member', '2ea6d40a-5a1c-4b92-90fe-2f4f7888e9df', 'Me alegra mucho que te guste. Ahora comenzaremos con el sistema de riego. El informe de progreso está listo para revisión.', now() - interval '30 minutes')
on conflict do nothing;
