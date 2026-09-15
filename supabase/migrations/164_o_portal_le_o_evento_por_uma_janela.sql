-- ============================================================
-- 164 — O portal lê o evento por uma janela, não pela tabela
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- FURO (achado em 15/09/2026, corrigido no mesmo dia). Desde a 086 a
-- conta do portal lia a linha INTEIRA do próprio evento em `events`,
-- porque "nenhuma coluna ali é segredo para ela — inclusive
-- contract_value, que é o contrato DELA". Isso valia quando o portal era
-- de uma pessoa só. Hoje a cerimonialista dá login a mais gente do mesmo
-- evento (noiva, noivo, debutante, mãe, pai, outro — 086 e 125), e a
-- linha tem dois valores que são só de quem contrata:
--   - contract_value: o honorário da assessoria (o valor assinado na
--     proposta, 112);
--   - verba_total: quanto a família pretende gastar no evento.
-- Nenhuma tela do portal mostra nenhum dos dois. Mas a tela não é a
-- fronteira: qualquer conta do portal pede a tabela ao PostgREST pelo
-- "inspecionar elemento" do navegador e lê os dois — a policy deixava.
-- Regra do dono: dado de pagamento e dado pessoal são só de quem
-- contrata (decisão de 15/09/2026, aplicada ao termo na 163).
--
-- O QUE PASSA A VALER
--
--   1. `portal_meus_eventos(p_event_id)` é a ÚNICA janela do portal para o
--      evento: devolve só o que as telas usam (cabeçalho, marca da
--      cerimonialista, dados do RSVP e o evento-pai da formatura). Sem
--      `select *`, sem valor nenhum. Filtra por auth.uid() e acesso ativo,
--      como eventos_da_cliente (089). p_event_id nulo = todos os eventos
--      da pessoa (a home); com id = aquele evento (as telas de dentro).
--      SEM default no parâmetro: o código manda sempre (nulo ou id).
--
--   2. A policy `portal_events_select` (086/089) é DERRUBADA. A conta do
--      portal deixa de ler `events` por qualquer caminho. O que precisa
--      do evento por dentro do banco continua funcionando sem ela:
--        - eventos_da_cliente() e sou_cliente_do_evento() leem
--          evento_acesso, não events;
--        - as RPCs portal_* são security definer;
--        - os gatilhos das tabelas que o portal escreve (convidados,
--          cortejo, inspirações, acompanhantes) ou são security definer
--          (fill_empresa_from_event 021, trg_convidado_defaults 098,
--          fill_dados_do_convidado 129, sincronizar_contagem 129) ou não
--          leem events (trg_cortejo_defaults 093, trg_inspiracao_defaults
--          096, trg_convidado_checkin_hash 148). Conferido um a um.
--
-- NÃO MUDA: as policies da equipe em events; o RLS de events; a leitura
-- da marca em empresas (portal_empresas_select, 089) — nome e logo não
-- são segredo e a janela também os devolve.
--
-- ORDEM DE DEPLOY: tanto faz. O código novo tenta a janela e, enquanto
-- ela não existe, cai na leitura antiga (que só funciona enquanto a
-- policy existe). Aplicada esta migração, só a janela responde.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) A janela
-- ------------------------------------------------------------
create or replace function public.portal_meus_eventos(p_event_id uuid)
returns table (
  id                 uuid,
  tipo               text,
  nome               text,
  data               date,
  hora               time,
  local_evento       text,
  cidade             text,
  papel              text,
  empresa_nome       text,
  empresa_logo_url   text,
  rsvp_hash          text,
  rsvp_aberto        boolean,
  rsvp_lembrete_dias int,
  evento_pai_id      uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id,
         e.type,
         e.name,
         e.date,
         e.time,
         e.location,
         e.city,
         ea.papel,
         emp.nome,
         emp.logo_url,
         e.rsvp_hash,
         e.rsvp_aberto,
         e.rsvp_lembrete_dias,
         e.evento_pai_id
  from public.evento_acesso ea
  join public.events e on e.id = ea.event_id
  left join public.empresas emp on emp.id = e.empresa_id
  where ea.user_id is not null
    and ea.user_id = auth.uid()
    and ea.status = 'ativo'
    and (p_event_id is null or ea.event_id = p_event_id)
  order by e.date;
$$;

revoke all on function public.portal_meus_eventos(uuid) from public, anon;
grant execute on function public.portal_meus_eventos(uuid) to authenticated;

comment on function public.portal_meus_eventos(uuid) is
  'A janela do Portal da Cliente para o evento: só cabeçalho, marca, RSVP e evento-pai. Nunca valor de contrato nem verba (164).';

-- ------------------------------------------------------------
-- 2) A conta do portal deixa de ler a tabela
-- ------------------------------------------------------------
drop policy if exists portal_events_select on public.events;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'events: a policy do portal não existe mais' as item,
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'events'
                      and policyname = 'portal_events_select') as ok

union all
select 'events: nenhuma policy restante cita o portal (eventos_da_cliente / sou_cliente_do_evento)',
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'events'
                      and (qual ilike '%eventos_da_cliente%'
                           or qual ilike '%sou_cliente_do_evento%'
                           or with_check ilike '%eventos_da_cliente%'
                           or with_check ilike '%sou_cliente_do_evento%'))

union all
select 'events: RLS continua ligada e a equipe continua com policies',
       (select relrowsecurity from pg_class where oid = 'public.events'::regclass)
       and exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'events')

union all
select 'portal_meus_eventos existe, security definer, search_path fixo',
       (select prosecdef and proconfig::text ilike '%search_path=public%'
          from pg_proc
         where proname = 'portal_meus_eventos'
           and pronamespace = 'public'::regnamespace)

union all
select 'portal_meus_eventos: nunca devolve valor de contrato, verba nem a linha inteira',
       (select prosrc not ilike '%contract_value%'
           and prosrc not ilike '%verba_total%'
           and prosrc not ilike '%select *%'
           and prosrc not ilike '%e.*%'
          from pg_proc
         where proname = 'portal_meus_eventos'
           and pronamespace = 'public'::regnamespace)

union all
select 'portal_meus_eventos: só a própria conta, com acesso ativo',
       (select prosrc ilike '%ea.user_id = auth.uid()%'
           and prosrc ilike '%ea.status = ''ativo''%'
          from pg_proc
         where proname = 'portal_meus_eventos'
           and pronamespace = 'public'::regnamespace)

union all
select 'portal_meus_eventos: só quem tem sessão executa (anon não)',
       has_function_privilege('authenticated', 'public.portal_meus_eventos(uuid)', 'EXECUTE')
       and not has_function_privilege('anon', 'public.portal_meus_eventos(uuid)', 'EXECUTE');
