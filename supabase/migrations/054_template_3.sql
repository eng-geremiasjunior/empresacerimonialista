-- ============================================================
-- Vela — Migração 054: libera o Template 3 (vinho / dourado)
--
-- A 051 criou um CHECK restrito a template_1 e template_2. Sem ampliar,
-- escolher o terceiro na tela falharia com violação de constraint.
--
-- Execute no SQL Editor do Supabase (depois da 053).
-- ============================================================

begin;

alter table public.empresas drop constraint if exists empresas_template_orcamento_check;
alter table public.empresas
  add constraint empresas_template_orcamento_check
  check (template_orcamento in ('template_1', 'template_2', 'template_3'));

commit;
