-- 107 — Terceiro template de casamento (Praia, paleta Maré Alta)
--
-- Mesma coisa que a 105 fez pelo Convite Vivo: só amplia o check de
-- orcamentos.template_proposta com o slug novo. Lista fechada — sem
-- isto, salvar um orçamento com este template é recusado pelo banco.
--
-- Superconjunto da lista anterior: nenhum slug sai, nenhuma proposta já
-- enviada deixa de ser válida, e o padrão por tipo não muda (casamento
-- continua caindo no Clássico quando ninguém escolhe).
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
      'casamento_maison',
      'casamento_praia'
    )
  );

do $$
begin
  raise notice '107 aplicada: template_proposta aceita casamento_praia.';
end $$;
