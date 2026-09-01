-- ============================================================
-- Vela — Migração 140: higiene da conferência de contrato
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A área de Contratos (/contratos) vai mostrar o histórico — quem
-- conferiu, quando conferiu, quando descartou. Duas dívidas pequenas da
-- 138 atrapalham isso:
--
--   1. `conferida_por` existe desde a 138 e o app nunca gravou — o
--      histórico não sabia dizer QUEM conferiu. (Conserto no app,
--      nesta mesma fatia; aqui só o comentário.)
--   2. O descarte reusava `conferida_em` para marcar quando foi
--      descartada — ambíguo numa tela que lista os dois estados.
--      Nasce `descartada_em`, e o backfill move o que estava no campo
--      errado.
--
-- Sem CHECK amarrando status a timestamp (uma re-execução parcial num
-- banco meio migrado quebraria — doutrina da 090: tudo convergente).
-- Sem `descartada_por`: descarte não move dinheiro; mínimo é mínimo.

alter table public.contrato_extracao
  add column if not exists descartada_em timestamptz;

-- move o que o app antigo gravou no campo errado
update public.contrato_extracao
set descartada_em = conferida_em,
    conferida_em  = null
where status = 'descartada'
  and descartada_em is null
  and conferida_em is not null;

comment on column public.contrato_extracao.descartada_em is
  'Quando a proposta foi descartada (nada aplicado). Separado de conferida_em: uma tela que lista os dois estados não pode adivinhar qual é qual.';

comment on column public.contrato_extracao.conferida_por is
  'Quem conferiu e aplicou. Existe desde a 138; o app passa a gravar a partir da área de Contratos (140).';

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a coluna descartada_em existe' as item,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public'
           and table_name = 'contrato_extracao'
           and column_name = 'descartada_em'
       ) as ok
union all
select 'nenhuma descartada continua com conferida_em preenchida',
       not exists (
         select 1 from public.contrato_extracao
         where status = 'descartada' and conferida_em is not null
       )
union all
select 'nenhuma conferida tem descartada_em preenchida',
       not exists (
         select 1 from public.contrato_extracao
         where status = 'conferida' and descartada_em is not null
       )
union all
select 'as quatro policies seguem de pé, nenhuma de anon',
       (select count(*) = 4 from pg_policies
        where schemaname = 'public' and tablename = 'contrato_extracao')
       and not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'contrato_extracao'
           and 'anon' = any(roles)
       );
