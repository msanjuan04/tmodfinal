-- ⚠️  SOLO DESARROLLO. NUNCA EJECUTAR EN PRODUCCIÓN.
--
-- Este fichero BORRA TODAS LAS TABLAS Y DATOS de Terrazea ClientZone.
-- Se separó de schema.sql para que nadie lo ejecute por accidente al
-- "aplicar el esquema". Úsalo únicamente para reiniciar una base de datos
-- local o de pruebas, y después ejecuta schema.sql.

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

