-- ============================================================
-- 173 — O PORTAL QUE MOSTRA O TRABALHO DELA
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- A revisão de 23/09/2026 mediu: a Área do cliente foi aberta UMA vez em
-- 30 dias pelas contas de clientes. O motivo não era o portal ser feio —
-- a cerimonialista não convidava a noiva: o acesso nascia à mão, com uma
-- senha provisória para ela repassar. E quando a noiva entrava, a home
-- falava só do que era DELA fazer; o trabalho da cerimonialista — o que
-- a Aline Campos vende como "tranquilidade" — não aparecia em lugar
-- nenhum.
--
-- O que nasce aqui:
--   1) events.modalidade_assessoria — o pacote que ela vendeu:
--        completa  → ela conduz o que é "juntos"; a cliente participa só
--                    das escolhas finais (nulo = completa);
--        parcial   → a cliente executa o que é "juntos", ela orienta;
--        so_o_dia  → cerimonial do dia: o portal não mostra planejamento.
--   2) empresas.convidar_portal_no_aceite — o convite sai sozinho quando
--      a cliente aceita a proposta (padrão LIGADO, decisão do dono); ela
--      desliga em Configurações.
--   3) evento_acesso.convite_enviado_em — quando o e-mail saiu.
--   4) portal_quadro_do_evento(evento) — a home do portal: "com vocês",
--      "a {nome} está cuidando" e "fechado há pouco". Só título e data:
--      nada de valor, campo ou fornecedor (regra de 15/09/2026: dado de
--      pagamento e pessoal é só de quem contrata).
--
-- O que NÃO muda: portal_falta_decidir. Ela também decide quais
-- PERGUNTAS a cliente vê (o id da decisão filtra as perguntas); mexer
-- nela pela modalidade sumiria com perguntas das decisões "juntos".

-- ------------------------------------------------------------
-- 1) O pacote do evento
-- ------------------------------------------------------------
alter table public.events add column if not exists modalidade_assessoria text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_modalidade_assessoria_check') then
    alter table public.events add constraint events_modalidade_assessoria_check
      check (modalidade_assessoria is null
             or modalidade_assessoria in ('completa', 'parcial', 'so_o_dia'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) O convite automático, e quando ele saiu
-- ------------------------------------------------------------
alter table public.empresas
  add column if not exists convidar_portal_no_aceite boolean not null default true;
alter table public.evento_acesso
  add column if not exists convite_enviado_em timestamptz;

-- ------------------------------------------------------------
-- 3) A home do portal
-- ------------------------------------------------------------
create or replace function public.portal_quadro_do_evento(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mod text;
begin
  -- a mesma porta de portal_falta_decidir: a cliente do evento ou a equipe
  if not (public.sou_cliente_do_evento(p_event_id) or public.pode_ver_evento(p_event_id)) then
    return null;
  end if;

  select coalesce(modalidade_assessoria, 'completa') into v_mod
  from public.events where id = p_event_id;
  if v_mod is null then
    return null;
  end if;

  if v_mod = 'so_o_dia' then
    return jsonb_build_object('modalidade', v_mod,
      'com_voces', '[]'::jsonb, 'cuidando', '[]'::jsonb, 'fechado', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'modalidade', v_mod,
    -- o que é da cliente agora
    'com_voces', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo, 'prazo', x.prazo_previsto)
                       order by x.prazo_previsto nulls last, x.ordem)
      from (
        select ed.id, ed.titulo, ed.prazo_previsto, ed.ordem
        from public.evento_decisao ed
        join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
        where ed.event_id = p_event_id
          and ed.estado = 'pendente'
          and eo.ativo
          and (ed.responsavel = 'noivos' or (v_mod = 'parcial' and ed.responsavel = 'ambos'))
        order by ed.prazo_previsto nulls last, ed.ordem
        limit 5
      ) x
    ), '[]'::jsonb),
    -- o que a cerimonialista conduz nos próximos 60 dias (e o atrasado)
    'cuidando', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', x.titulo, 'prazo', x.prazo_previsto)
                       order by x.prazo_previsto nulls last, x.ordem)
      from (
        select ed.titulo, ed.prazo_previsto, ed.ordem
        from public.evento_decisao ed
        join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
        where ed.event_id = p_event_id
          and ed.estado = 'pendente'
          and eo.ativo
          and (ed.responsavel = 'cerimonialista' or (v_mod = 'completa' and ed.responsavel = 'ambos'))
          and (ed.prazo_previsto is null
               or ed.prazo_previsto <= (now() at time zone 'America/Sao_Paulo')::date + 60)
        order by ed.prazo_previsto nulls last, ed.ordem
        limit 6
      ) x
    ), '[]'::jsonb),
    -- o que ficou decidido há pouco (de quem for)
    'fechado', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', x.titulo, 'quando', x.decidida_em)
                       order by x.decidida_em desc)
      from (
        select ed.titulo, ed.decidida_em
        from public.evento_decisao ed
        join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
        where ed.event_id = p_event_id
          and ed.estado = 'decidida'
          and eo.ativo
          and ed.decidida_em >= now() - interval '30 days'
        order by ed.decidida_em desc
        limit 5
      ) x
    ), '[]'::jsonb)
  );
end $$;

revoke all on function public.portal_quadro_do_evento(uuid) from public, anon;
grant execute on function public.portal_quadro_do_evento(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Conferência: cada linha tem de voltar true
-- ------------------------------------------------------------
select 'o evento sabe a modalidade da assessoria' as verificacao,
       exists (select 1 from pg_constraint where conname = 'events_modalidade_assessoria_check') as aplicou
union all
select 'a empresa decide o convite automático',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'empresas'
                  and column_name = 'convidar_portal_no_aceite')
union all
select 'o acesso guarda quando o convite saiu',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'evento_acesso'
                  and column_name = 'convite_enviado_em')
union all
select 'a home do portal tem o quadro',
       to_regprocedure('public.portal_quadro_do_evento(uuid)') is not null
union all
select 'anônimo não lê o quadro',
       not has_function_privilege('anon', 'public.portal_quadro_do_evento(uuid)', 'execute');
