-- ============================================================
-- 221 — O prazo de resposta do RSVP na aba da equipe (22/10/2026)
-- ============================================================
-- Até aqui o prazo só existia no site do casal (evento_site.rsvp_prazo,
-- 129), e desde a 186 a equipe não escreve mais em evento_site: a
-- cerimonialista não tinha onde pôr a data-limite das confirmações.
--
-- Coluna nova em events, escrita pela equipe pela RLS que já vale para o
-- evento (a mesma de mudar o nome ou a data). A aba RSVP usa este prazo
-- e, sem ele, o do site do casal. Nada no site público muda.
--
-- Aditiva e convergente. Sem cópia dos prazos do site: o código faz o
-- "este, senão o do site", e um UPDATE em massa em events dispararia os
-- gatilhos do evento sem necessidade.
--
-- events já tem acesso por tabela (não por coluna): a coluna nova herda
-- o mesmo acesso. A conferência confirma.
--
-- Termina com a conferência (tudo true).

begin;

alter table public.events
  add column if not exists rsvp_prazo date;

alter table public.events drop constraint if exists events_rsvp_prazo_check;
alter table public.events add constraint events_rsvp_prazo_check
  check (rsvp_prazo is null or rsvp_prazo between date '2020-01-01' and date '2100-12-31');

comment on column public.events.rsvp_prazo is
  'Data-limite das confirmações, definida pela equipe na aba RSVP (221). Sem ela, vale evento_site.rsvp_prazo.';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar true.
-- ------------------------------------------------------------
select 'a coluna existe e é date' as item,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'events'
                  and column_name = 'rsvp_prazo' and data_type = 'date') as ok
union all
select 'a equipe lê e escreve a coluna (acesso da tabela)',
       has_column_privilege('authenticated', 'public.events', 'rsvp_prazo', 'SELECT')
       and has_column_privilege('authenticated', 'public.events', 'rsvp_prazo', 'UPDATE')
union all
select 'a RLS de events continua ligada',
       (select c.relrowsecurity from pg_class c where c.oid = 'public.events'::regclass)
union all
select 'a trava de data existe',
       exists (select 1 from pg_constraint where conname = 'events_rsvp_prazo_check');
