-- ============================================================
-- Vela — Migração 020: financeiro da EMPRESA (business_transactions)
-- Execute no SQL Editor do Supabase (depois da 019).
--
-- Tabela SEPARADA do financeiro de eventos: `transactions` continua
-- exclusiva dos eventos (contrato, parcelas, despesas do evento);
-- `business_transactions` guarda receita própria e despesas
-- operacionais do negócio da cerimonialista. Nunca misturar as duas.
-- ============================================================

create table if not exists public.business_transactions (
  id                uuid primary key default gen_random_uuid(),
  cerimonialista_id uuid not null references auth.users (id) on delete cascade,
  type              text not null check (type in ('receita', 'despesa')),
  -- despesas: agua | luz | internet | impostos | funcionarios | combustivel
  --           | aluguel | alimentacao_manha | alimentacao_tarde | almoco | outro
  -- receitas: servico_prestado | consultoria | outro
  category          text not null,
  description       text,
  value             numeric not null check (value > 0),
  due_date          date,
  paid              boolean not null default false,
  paid_at           timestamptz,
  payment_method    text,
  -- despesas fixas mensais (aluguel, internet…) marcadas como recorrentes
  recurring         boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_business_tx_owner_date
  on public.business_transactions (cerimonialista_id, due_date desc);

alter table public.business_transactions enable row level security;

drop policy if exists "business_transactions_own" on public.business_transactions;
create policy "business_transactions_own" on public.business_transactions
  for all
  using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());
