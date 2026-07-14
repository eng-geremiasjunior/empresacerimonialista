-- ============================================================
-- Vela — Migração 012: expansão de tipos + campos do evento
-- Execute no SQL Editor do Supabase (depois da 011).
-- Substitui a 009 (que não chegou a ser aplicada) — aqui os campos
-- vêm com IF NOT EXISTS, então é seguro rodar de qualquer forma.
-- ============================================================

-- 1) Expandir os tipos aceitos (Passo 1 do wizard: 9 tipos)
alter table public.events drop constraint if exists events_type_check;
alter table public.events
  add constraint events_type_check check (type in (
    'casamento', 'debutante', 'formatura', 'aniversario',
    'corporativo', 'cha_revelacao', 'batizado', 'bodas', 'outro'
  ));

-- 2) Campos que pertencem ao EVENTO (projeto)
alter table public.events
  add column if not exists time           time,
  add column if not exists city           text,
  add column if not exists guests         integer
    check (guests is null or guests >= 0),
  add column if not exists contract_value numeric(12, 2)
    check (contract_value is null or contract_value >= 0);

-- 3) Timeline sugerida entra sem horário definido ("A definir"),
--    então roteiro_items.time passa a aceitar null.
alter table public.roteiro_items alter column time drop not null;
