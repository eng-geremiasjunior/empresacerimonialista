-- 105 — Terceiro template de debutante (Convite Vivo, modelo 03)
--
-- Mesma coisa que a 060 fez pelo Maison: só amplia o check de
-- orcamentos.template_proposta com o slug novo. O check é uma lista
-- fechada — sem isto, salvar um orçamento com este template é recusado
-- pelo banco com "violates check constraint".
--
-- A lista abaixo é superconjunto da anterior: nenhum slug sai, então
-- nenhuma proposta já enviada deixa de ser válida. null continua sendo
-- "padrão do tipo" (casamento → clássico, debutante → clássico), e o
-- padrão não muda: o Convite Vivo só aparece quando a cerimonialista o
-- escolhe no orçamento.
--
-- Convergente: pode rodar mais de uma vez.
-- Execute no SQL Editor.

alter table public.orcamentos
  drop constraint if exists orcamentos_template_proposta_check;
alter table public.orcamentos
  add constraint orcamentos_template_proposta_check
  check (
    template_proposta is null
    or template_proposta in (
      'debutante_classico',
      'debutante_glam',
      'debutante_convite_vivo',
      'casamento_v2',
      'casamento_maison'
    )
  );

do $$
begin
  raise notice '105 aplicada: template_proposta aceita debutante_convite_vivo.';
end $$;
