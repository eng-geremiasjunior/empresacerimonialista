-- ============================================================
-- Vela — Migração 055: libera o Template 4 (preto / dourado)
--
-- Amplia o CHECK de empresas.template_orcamento. Sem isso, escolher o
-- quarto na tela falharia com violação de constraint — como aconteceu
-- com o terceiro antes da 054.
--
-- Execute no SQL Editor do Supabase (depois da 054).
-- ============================================================

begin;

alter table public.empresas drop constraint if exists empresas_template_orcamento_check;
alter table public.empresas
  add constraint empresas_template_orcamento_check
  check (template_orcamento in ('template_1', 'template_2', 'template_3', 'template_4'));

commit;
