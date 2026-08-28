-- ============================================================
-- Vela — Migração 127: as válvulas do RSVP que não gravavam
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Duas actions do portal ("Encerrar confirmações" e o lembrete aos
-- convidados) faziam UPDATE em events com a sessão da CLIENTE — e não
-- existe policy de update do portal em events (a 086 decidiu de
-- propósito não estender as policies da equipe). O update afetava zero
-- linhas em silêncio e a tela dizia "ok": a cliente fechava o link e ele
-- continuava aberto; configurava o lembrete e ninguém nunca recebia,
-- porque o cron lê exatamente essa coluna.
--
-- O conserto segue o padrão da casa para escrita do portal em events:
-- RPC security definer com escopo de UMA coluna e gate explícito — nada
-- de policy larga de update numa tabela que carrega o financeiro.

-- ------------------------------------------------------------
-- 1) A válvula do link público
-- ------------------------------------------------------------
create or replace function public.portal_definir_rsvp_aberto(
  p_event_id uuid,
  p_aberto   boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not (public.sou_cliente_do_evento(p_event_id)
          or public.pode_editar_evento(p_event_id)) then
    raise exception 'sem permissão para este evento';
  end if;

  update public.events
     set rsvp_aberto = p_aberto
   where id = p_event_id;
end $$;

revoke all on function public.portal_definir_rsvp_aberto(uuid, boolean) from public, anon;
grant execute on function public.portal_definir_rsvp_aberto(uuid, boolean) to authenticated;

comment on function public.portal_definir_rsvp_aberto(uuid, boolean) is
  'A cliente (ou a equipe) abre/encerra as confirmações do link público. RPC porque o portal não tem policy de update em events — de propósito.';

-- ------------------------------------------------------------
-- 2) O lembrete aos convidados
-- ------------------------------------------------------------
create or replace function public.portal_definir_lembrete(
  p_event_id uuid,
  p_dias     int
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not (public.sou_cliente_do_evento(p_event_id)
          or public.pode_editar_evento(p_event_id)) then
    raise exception 'sem permissão para este evento';
  end if;
  -- null = sem lembrete automático; fora disso, a régua da 095 (1–60)
  if p_dias is not null and (p_dias < 1 or p_dias > 60) then
    raise exception 'escolha entre 1 e 60 dias';
  end if;

  update public.events
     set rsvp_lembrete_dias = p_dias
   where id = p_event_id;
end $$;

revoke all on function public.portal_definir_lembrete(uuid, int) from public, anon;
grant execute on function public.portal_definir_lembrete(uuid, int) to authenticated;

comment on function public.portal_definir_lembrete(uuid, int) is
  'Quantos dias antes do evento o lembrete sai (null = nenhum). RPC pelo mesmo motivo da válvula do RSVP.';

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'portal_definir_rsvp_aberto existe' as item,
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'portal_definir_rsvp_aberto') as ok
union all
select 'portal_definir_lembrete existe',
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'portal_definir_lembrete')
union all
select 'anon não executa nenhuma das duas',
       not has_function_privilege('anon', 'public.portal_definir_rsvp_aberto(uuid, boolean)', 'execute')
       and not has_function_privilege('anon', 'public.portal_definir_lembrete(uuid, int)', 'execute')
union all
select 'as duas têm gate de vínculo (sou_cliente ou equipe)',
       (pg_get_functiondef('public.portal_definir_rsvp_aberto(uuid, boolean)'::regprocedure)
          like '%sou_cliente_do_evento%')
       and (pg_get_functiondef('public.portal_definir_lembrete(uuid, int)'::regprocedure)
          like '%sou_cliente_do_evento%')
union all
select 'o lembrete valida a régua 1–60',
       (pg_get_functiondef('public.portal_definir_lembrete(uuid, int)'::regprocedure)
          like '%60%')
union all
select 'events continua SEM policy de update do portal (o desenho da 086)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'events'
           and cmd = 'UPDATE' and qual like '%eventos_da_cliente%'
       );
