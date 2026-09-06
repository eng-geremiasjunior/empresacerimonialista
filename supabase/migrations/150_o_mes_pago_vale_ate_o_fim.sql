-- ============================================================
-- 150 — O mês pago vale até o fim, e o catálogo se lê sem conta
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- DUAS COISAS, as duas nascidas da página /planos (06/09/2026):
--
-- 1) OS TERMOS PROMETEM O QUE O BANCO NÃO FAZIA. A /termos (aceita com
--    registro em termos_aceite) diz: "o período que você já pagou
--    continua disponível até o fim dele". Mas teto_do_plano (147) só
--    considera pagante quem está 'ativa', 'inadimplente' ou 'pausada' —
--    'cancelada' cai para 1 evento / 1 login NO MESMO DIA, mesmo com o
--    mês pago até o dia 30. Quem cancelava no dia 5 perdia 25 dias que
--    já tinha pagado. Um cético apontou; a página /planos foi corrigida
--    para não repetir a promessa; aqui o banco passa a cumpri-la.
--
--    A regra: assinatura 'cancelada' com proximo_vencimento hoje ou no
--    futuro continua PAGANTE, com os tetos do plano dela, até essa data.
--    Depois dela, a regra de conta sem plano (o primeiro evento é por
--    nossa conta) — como já era. `proximo_vencimento` é o fim do ciclo
--    pré-pago (assinar() grava next_billing_at / current_cycle.end_at, e
--    o webhook o mantém em dia), e cancelar() não o apaga.
--
--    Nada muda para ativa/inadimplente/pausada, nem para quem nunca
--    assinou. Só quem cancelou dentro do mês pago ganha o resto do mês.
--
-- 2) O CATÁLOGO ERA SÓ PARA LOGADO. A policy da 147 dá SELECT em
--    plano_catalogo a `authenticated` — a única leitora era a tela de
--    assinatura, dentro da conta. A /planos existe para quem AINDA NÃO
--    tem conta, e preço de plano é exatamente o que ela mostra. Uma
--    policy de leitura para `anon`, só do que está à venda. Sem
--    escrita: preço continua mudando pelo service role.
--
-- Aditiva. Conferência no fim, tudo `true`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) teto_do_plano: cancelada dentro do mês pago ainda é pagante
-- ------------------------------------------------------------
-- `create or replace` não muda a forma de uma função `returns table`; a
-- forma aqui é a mesma da 147, mas o drop fica por segurança de
-- re-execução. Nada depende dela por objeto (só por nome, dentro de
-- pode_criar_evento, pode_adicionar_login, minha_assinatura e dos
-- gatilhos), então dropar é seguro.
drop function if exists public.teto_do_plano(uuid);
create function public.teto_do_plano(p_empresa_id uuid)
returns table (eventos int, logins int, plano text, plano_nome text, pagante boolean)
language sql
stable
security definer
set search_path = public
as $$
  with conta as (
    select
      a.plano,
      a.status,
      -- pagante: em dia, atrasada, cortesia — OU cancelada com o mês
      -- pago ainda correndo
      coalesce(
        a.status in ('ativa', 'inadimplente', 'pausada')
        or (a.status = 'cancelada'
            and a.proximo_vencimento is not null
            and a.proximo_vencimento >= current_date),
        false
      ) as pagante
    from (select p_empresa_id as id) e
    left join public.assinaturas a on a.empresa_id = e.id
  )
  select
    case when k.pagante
      then case when c.codigo is null then null else c.eventos_em_andamento end
      else 1
    end as eventos,
    case when k.pagante
      then case when c.codigo is null then null else c.logins end
      else 1
    end as logins,
    coalesce(k.plano, 'piloto') as plano,
    coalesce(c.nome, initcap(coalesce(k.plano, 'piloto'))) as plano_nome,
    k.pagante
  from conta k
  left join public.plano_catalogo c on c.codigo = k.plano;
$$;

revoke all on function public.teto_do_plano(uuid) from public, anon;
grant execute on function public.teto_do_plano(uuid) to authenticated;

comment on function public.teto_do_plano(uuid) is
  'Tetos da conta pelo plano. Pagante = ativa/inadimplente/pausada, ou cancelada com proximo_vencimento >= hoje (o mês pago vale até o fim, como dizem os termos). Fora disso, 1 evento na vida / 1 login.';

-- ------------------------------------------------------------
-- 2) O catálogo à venda, legível sem conta
-- ------------------------------------------------------------
drop policy if exists plano_catalogo_leitura_publica on public.plano_catalogo;
create policy plano_catalogo_leitura_publica
  on public.plano_catalogo for select
  to anon
  using (ativo);

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'teto_do_plano existe uma vez' as item,
       (select count(*) = 1 from pg_proc
        where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace) as ok
union all
select 'teto_do_plano considera cancelada dentro do mês pago',
       (select prosrc ilike '%cancelada%' and prosrc ilike '%proximo_vencimento >= current_date%'
        from pg_proc where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'anon não executa teto_do_plano',
       not has_function_privilege('anon', 'public.teto_do_plano(uuid)', 'execute')
union all
select 'authenticated executa teto_do_plano',
       has_function_privilege('authenticated', 'public.teto_do_plano(uuid)', 'execute')
union all
select 'catálogo: policy de leitura para anon existe',
       exists (select 1 from pg_policies
               where schemaname = 'public' and tablename = 'plano_catalogo'
                 and policyname = 'plano_catalogo_leitura_publica'
                 and 'anon' = any(roles))
union all
select 'catálogo: anon só lê o que está à venda',
       (select qual ilike '%ativo%' from pg_policies
        where schemaname = 'public' and tablename = 'plano_catalogo'
          and policyname = 'plano_catalogo_leitura_publica')
union all
select 'catálogo: nenhuma policy de escrita',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'plano_catalogo'
                     and cmd in ('INSERT', 'UPDATE', 'DELETE'));
