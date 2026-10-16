-- 212: a triagem do Planejamento (16/10/2026)
--
-- Quem cadastra o evento perto da data encontra itens que o método
-- esperava resolvidos ANTES de ela chegar. A triagem pergunta, item a item
-- ou por grupo: "Já resolvido", "Não se aplica" ou "Ainda falta".
--
-- O que muda no banco:
--   1. evento_decisao.triagem guarda a resposta e triada_em quando — é o
--      que tira o item da triagem (inclusive o "Ainda falta", que continua
--      pendente, com o prazo que a compressão da 070 já calcula);
--   2. "Já resolvido" vira decidida SEM gerar as tarefas de contrato: o que
--      foi resolvido antes de ela entrar não pede "Registrar o valor" nem
--      "Assinar o contrato" (foi esse tipo de lista repetida que confundiu
--      a conta mais ativa). Decidir pelo caminho normal continua igual.
--
-- O corpo de trg_decisao_estado é o da 083, com uma condição a mais.
-- Convergente: pode rodar de novo por cima.

-- ------------------------------------------------------------
-- 1) A marca da triagem
-- ------------------------------------------------------------
alter table public.evento_decisao add column if not exists triagem text;
alter table public.evento_decisao add column if not exists triada_em timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evento_decisao_triagem_check') then
    alter table public.evento_decisao
      add constraint evento_decisao_triagem_check
      check (triagem is null or triagem in ('ja_resolvido', 'nao_se_aplica', 'ainda_falta'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) "Já resolvido" não gera as tarefas da decisão
-- ------------------------------------------------------------
create or replace function public.trg_decisao_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'decidida' and coalesce(old.estado, '') <> 'decidida' then
    -- resolvido antes de ela entrar no sistema: nada a fazer depois
    if coalesce(new.triagem, '') <> 'ja_resolvido' then
      perform public.gerar_tarefas_da_decisao(new.id);
    end if;
    perform public.sincronizar_orcamento_fornecedor(new.id);
  elsif old.estado = 'decidida' and new.estado <> 'decidida' then
    perform public.remover_tarefas_da_decisao(new.id);
  end if;
  return new;
end $$;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'evento_decisao tem triagem e triada_em' as verificacao,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_decisao'
           and column_name in ('triagem', 'triada_em')) = 2 as aplicou
union all
select 'triagem só aceita as três respostas',
       exists (select 1 from pg_constraint where conname = 'evento_decisao_triagem_check')
union all
select 'já resolvido não gera tarefas',
       pg_get_functiondef('public.trg_decisao_estado()'::regprocedure) like '%ja_resolvido%'
union all
select 'gatilho das decisões continua ligado',
       exists (select 1 from pg_trigger where tgname = 'trg_decisao_estado'
                  and tgrelid = 'public.evento_decisao'::regclass);
