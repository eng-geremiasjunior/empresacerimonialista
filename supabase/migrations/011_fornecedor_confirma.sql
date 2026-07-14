-- ============================================================
-- Vela — Migração 011: confirmação de fornecedor por evento
-- Execute no SQL Editor do Supabase (depois da 010).
--
-- Os fornecedores de um evento vêm do Roteiro (roteiro_links, um por
-- evento+fornecedor). Aqui adicionamos o status de confirmação usado
-- pelo Copiloto (Saúde do Evento) e pela aba Fornecedores.
-- ============================================================

alter table public.roteiro_links
  add column if not exists confirmed boolean not null default false;
