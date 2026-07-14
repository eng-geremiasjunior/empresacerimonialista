-- ============================================================
-- Vela — Migração 017: módulo Financeiro
-- Execute no SQL Editor do Supabase (depois da 016).
--
-- Estado prévio de transactions: id, event_id, type ('receita'|'despesa'),
-- value, due_date, paid (boolean). Faltavam os campos abaixo.
-- Obs.: a entrada do contrato NÃO é coluna de events — é uma transaction
-- de receita paga (padrão criado na migração 014 / wizard).
-- ============================================================

alter table public.transactions
  add column if not exists description text,
  add column if not exists category text not null default 'outro',
  -- despesas: buffet | decoracao | fotografia | som_dj | transporte | equipe | outro
  -- receitas: contrato | entrada | outro
  add column if not exists installment_number int,
  add column if not exists installment_total int,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text,
  -- pix | dinheiro | cartao | transferencia | boleto
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_transactions_due_date
  on public.transactions (due_date);

-- RLS: a política "transactions_own" (via events.cerimonialista_id) já
-- existe desde o schema.sql — nada a recriar aqui.
