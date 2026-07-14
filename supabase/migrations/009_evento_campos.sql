-- ============================================================
-- Vela — Migração 009: campos do evento (Central de Operações)
-- Execute no SQL Editor do Supabase (depois da 008).
--
-- Informações que pertencem ao EVENTO (projeto), não ao cliente:
-- horário, quantidade de convidados e valor do contrato.
-- ============================================================

alter table public.events
  add column if not exists time time,
  add column if not exists guests integer check (guests is null or guests >= 0),
  add column if not exists contract_value numeric(12, 2)
    check (contract_value is null or contract_value >= 0);
