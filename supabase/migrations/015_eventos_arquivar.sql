-- ============================================================
-- Vela — Migração 015: arquivar evento
-- Execute no SQL Editor do Supabase (depois da 014).
--
-- "Arquivar" é um soft-hide: some da listagem sem apagar dados
-- (diferente de excluir, que já existia e é destrutivo).
-- ============================================================

alter table public.events
  add column if not exists archived boolean not null default false;

create index if not exists idx_events_archived on public.events (archived);
