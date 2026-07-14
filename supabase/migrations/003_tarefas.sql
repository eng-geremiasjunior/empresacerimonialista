-- ============================================================
-- Vela — Migração 003: módulo Tarefas
-- Execute no SQL Editor do Supabase (depois da 002_roteiro.sql).
-- ============================================================

alter table public.tasks
  add column if not exists description text,
  add column if not exists status text not null default 'pendente'
    check (status in ('pendente', 'em_progresso', 'concluido')),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_tasks_due_date on public.tasks (due_date);
