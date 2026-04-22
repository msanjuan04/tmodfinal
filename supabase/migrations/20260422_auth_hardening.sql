-- Migración: endurecimiento del flujo de auth (sesión del 2026-04-22).
--
-- Ejecutar en el SQL editor de Supabase. Es idempotente: se puede volver a
-- ejecutar sin romper nada si ya está aplicada.
--
-- Cambios:
--   1. app_users.password_hash admite NULL para que los clientes puedan
--      activar su cuenta con el código Terrazea y definir su propia
--      contraseña después.
--   2. Nueva tabla password_reset_tokens para tokens de restablecimiento
--      (se guardan hasheados con SHA-256, son de un solo uso y caducan
--      rápido).

-- 1) password_hash nullable ------------------------------------------------

alter table public.app_users
  alter column password_hash drop not null;

-- 2) tabla password_reset_tokens -------------------------------------------

create table if not exists public.password_reset_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens(user_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens(expires_at);

-- RLS: sólo el service_role (usado por el backend) puede leer/escribir.
-- No habilitamos políticas públicas porque el flujo entero va por el backend.
alter table public.password_reset_tokens enable row level security;

-- (Opcional) Si quieres una política explícita que deniegue a anon/auth:
-- create policy "deny all" on public.password_reset_tokens
--   for all to anon, authenticated using (false) with check (false);
