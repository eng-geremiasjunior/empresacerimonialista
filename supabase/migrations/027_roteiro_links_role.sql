-- ============================================================
-- Vela — Migração 027: papel (role) opcional no vínculo fornecedor↔evento
-- (Etapa 3 de 5 do módulo Fornecedores)
--
-- roteiro_links é a tabela de vínculo real fornecedor↔evento (alimenta
-- chat, confirmação por e-mail, link público e Saúde do Evento). Ganha
-- um campo `role` opcional (ex.: "Som da cerimônia") usado ao vincular
-- um fornecedor ao evento pela aba Fornecedores.
--
-- Execute no SQL Editor do Supabase (depois da 026).
-- ============================================================

alter table public.roteiro_links add column if not exists role text;
