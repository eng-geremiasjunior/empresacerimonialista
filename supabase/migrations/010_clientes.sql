-- ============================================================
-- Vela — Migração 010: Cliente como CRM (pessoa)
-- Execute no SQL Editor do Supabase (depois da 009).
--
-- Inspeção prévia confirmou:
--   • events.client_id JÁ existe e todos os eventos estão vinculados
--     (nenhum órfão) — não há migração de dados a fazer.
--   • clients já existe com (name, phone, email, created_at) e RLS
--     "clients_own" — aqui apenas ENRIQUECEMOS a tabela (ADD COLUMN
--     IF NOT EXISTS preserva os dados existentes).
-- ============================================================

alter table public.clients
  add column if not exists whatsapp   text,
  add column if not exists cpf        text,
  add column if not exists instagram  text,
  add column if not exists address    text,
  add column if not exists city       text,
  add column if not exists birthday   date,
  add column if not exists notes      text,
  add column if not exists updated_at timestamptz not null default now();

-- updated_at automático em qualquer UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- A política RLS "clients_own" e a coluna events.client_id já existem
-- (schema.sql) — nada a recriar aqui.
