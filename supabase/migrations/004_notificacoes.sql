-- ============================================================
-- Vela — Migração 004: notificações de tarefas
-- Execute no SQL Editor do Supabase (depois da 003_tarefas.sql).
-- ============================================================

alter table public.tasks
  -- Horário de vencimento (opcional). Tarefas com horário geram
  -- alerta na app 5 minutos antes do vencimento.
  add column if not exists due_time time,
  -- Registro de quando a tarefa foi notificada (evita notificar 2x).
  add column if not exists notified_at timestamptz;
