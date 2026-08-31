-- ============================================================
-- Vela — Migração 134: o log do gateway (a caixa-preta da cobrança)
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Três cobranças recusadas foram diagnosticadas por PRINT do painel do
-- Pagar.me, porque o detalhe do erro morria no console da Vercel — que o
-- dono não abre. O WooCommerce resolve isso com uma tela de log; aqui
-- nasce a mesma coisa.
--
-- A metade que já existia: gateway_evento guarda o que ELES nos mandam
-- (webhooks). A metade que faltava é esta: o que NÓS mandamos e o que
-- voltou — cada chamada à API, com status e com o corpo do erro.
--
-- Sem policy nenhuma de propósito: só o service role escreve (a função
-- chamar() do servidor) e só o painel do dono lê, atrás do gate de
-- SUPER_ADMIN_EMAILS — o mesmo desenho das tabelas da 123.

create table if not exists public.gateway_log (
  id          uuid primary key default gen_random_uuid(),
  gateway     text not null default 'pagarme',
  -- o que foi pedido
  metodo      text not null,
  caminho     text not null,
  -- o que voltou
  status      int,
  ok          boolean not null default false,
  -- o corpo da resposta quando NÃO deu certo — é aqui que mora o
  -- "The customer Document is required" que ninguém via
  resposta    jsonb,
  -- rede caiu, timeout: não houve resposta, houve exceção
  excecao     text,
  duracao_ms  int,
  created_at  timestamptz not null default now()
);

create index if not exists idx_gateway_log_recentes
  on public.gateway_log (created_at desc);

alter table public.gateway_log enable row level security;
-- RLS ligada e ZERO policies: anon e authenticated não leem nem escrevem.
-- Quem passa é só o service role, que ignora RLS.

-- Faxina automática: log de integração não é histórico contábil. Uma
-- função que o próprio INSERT chama de vez em quando manteria gatilho
-- em tabela quente; melhor um limite simples que a tela respeita e uma
-- limpeza que qualquer rotina pode chamar.
create or replace function public.limpar_gateway_log(p_dias int default 90)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_n int;
begin
  delete from public.gateway_log
  where created_at < now() - make_interval(days => greatest(p_dias, 7));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.limpar_gateway_log(int) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'gateway_log existe com RLS ligada' as item,
       (select c.relrowsecurity from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'gateway_log') as ok
union all
select 'gateway_log nao tem NENHUMA policy (so service role passa)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'gateway_log'
       )
union all
select 'as colunas do log estao completas',
       (select count(*) = 8 from information_schema.columns
        where table_schema = 'public' and table_name = 'gateway_log'
          and column_name in ('gateway','metodo','caminho','status','ok',
                              'resposta','excecao','duracao_ms'))
union all
select 'a faxina existe e nao e executavel por usuaria',
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'limpar_gateway_log')
       and not exists (
         select 1 from information_schema.routine_privileges
         where routine_schema = 'public' and routine_name = 'limpar_gateway_log'
           and grantee in ('anon', 'authenticated')
       );
