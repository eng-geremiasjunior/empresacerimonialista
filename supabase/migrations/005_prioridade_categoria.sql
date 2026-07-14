-- ============================================================
-- Vela — Migração 005: prioridade e categoria das tarefas
-- Execute no SQL Editor do Supabase (depois da 004_notificacoes.sql).
-- ============================================================

alter table public.tasks
  add column if not exists priority text not null default 'media'
    check (priority in ('alta', 'media', 'baixa')),
  add column if not exists category text not null default 'geral'
    check (category in (
      'som', 'buffet', 'decoracao', 'fotografia', 'bolo',
      'cerimonia', 'transporte', 'geral', 'presente', 'vestiario'
    ));
