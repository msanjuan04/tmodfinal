-- Migración: tabla de contraseñas de sección del panel (Presupuestos / Facturación).
--
-- El backend ya verificaba contra esta tabla (lib/supabase/admin-section-passwords.ts)
-- pero nunca se creó, así que las secciones eran indesbloqueables. Idempotente.

create table if not exists public.admin_section_passwords (
  section text primary key check (section in ('budgets', 'payments')),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_section_passwords enable row level security;
-- Sin políticas: solo el service_role del backend puede leer o escribir.

-- Para fijar o cambiar una contraseña, ejecuta en el SQL editor (sustituye el valor):
--
--   insert into public.admin_section_passwords (section, password_hash)
--   values ('payments', crypt('CAMBIA-ESTA-CONTRASEÑA', gen_salt('bf', 10)))
--   on conflict (section) do update
--     set password_hash = excluded.password_hash, updated_at = now();
--
-- pgcrypto genera hashes $2a$ compatibles con bcryptjs.
