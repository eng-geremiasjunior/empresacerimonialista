-- 174 · O evento de exemplo (23/09/2026)
--
-- Pedido do dono: a conta nova não nasce vazia. No cadastro entra UM
-- evento de exemplo, todo preenchido e marcado como exemplo, que some
-- sozinho depois que ela passa pelas telas principais dele (ou quando
-- ela clica em apagar).
--
-- O exemplo é da conta dela (mesma empresa, mesma RLS), por isso cada
-- lugar que CONTA eventos precisa saber ignorá-lo:
--   * o limite do plano — o Gratuito de 1 evento continua livre para o
--     evento de verdade;
--   * o painel do dono — "criou evento", decisões, fornecedores e clientes
--     não podem virar ação da cliente;
--   * o guia do primeiro acesso — conduz o evento dela, não o exemplo.
-- O cliente e os fornecedores do exemplo também ganham a marca, para
-- saírem junto e não aparecerem como cadastro dela no painel.
--
-- Convergente: pode rodar de novo. As funções do painel e do guia são
-- cópias da 123 e da 160 com o filtro acrescentado (gerado por
-- ferramentas/sim/gerar-174.mjs).

begin;

-- 1) As marcas
alter table public.events    add column if not exists exemplo boolean not null default false;
alter table public.events    add column if not exists exemplo_visto text[] not null default '{}';
alter table public.clients   add column if not exists exemplo boolean not null default false;
alter table public.suppliers add column if not exists exemplo boolean not null default false;

comment on column public.events.exemplo is
  'Evento de exemplo criado no cadastro (174). Não conta no plano nem no painel do dono; some quando exemplo_visto cobre as telas principais.';
comment on column public.events.exemplo_visto is
  'Telas do evento de exemplo que a conta já abriu (resumo, planejamento, fornecedores, roteiro, financeiro, rsvp).';

-- 2) "Este evento é o exemplo?" — para as tabelas filhas
create or replace function public.eh_exemplo(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select e.exemplo from public.events e where e.id = p_event_id), false);
$$;

revoke all on function public.eh_exemplo(uuid) from public, anon;
grant execute on function public.eh_exemplo(uuid) to authenticated, service_role;

-- 3) O limite do plano não vê o exemplo (as duas contagens da 147)
create or replace function public.eventos_que_contam(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.events e
  where e.empresa_id = p_empresa_id
    and e.status in ('orcamento', 'confirmado')
    and coalesce(e.archived, false) = false
    and not e.exemplo;
$$;

create or replace function public.eventos_da_vida(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.events e
  where e.empresa_id = p_empresa_id
    and not e.exemplo;
$$;

-- 4) O painel do dono (cópia da 123 + filtro do exemplo)
create or replace function public.admin_acoes_da_equipe(
  p_empresa_id uuid default null,
  p_desde      timestamptz default null
)
returns table (empresa_id uuid, em timestamptz, tipo text)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with equipe as (
    select m.empresa_id as empresa, m.user_id as pessoa
      from public.membros_equipe m
     where m.user_id is not null
       and (p_empresa_id is null or m.empresa_id = p_empresa_id)
  ),
  todas as (
    select x.empresa_id as empresa, x.created_at as quando, 'evento'::text as oque
      from public.events x
     where not x.exemplo
       and not exists (select 1 from public.activities a
                        where a.event_id = x.id and a.type = 'evento_criado'
                          and a.autor = 'Sistema')
    union all
    select x.empresa_id, x.created_at, 'evento'
      from public.activities x
     where x.autor is not null and x.autor <> 'Sistema'
       and x.type <> 'evento_criado'
       and not public.eh_exemplo(x.event_id)
    union all
    select x.empresa_id, x.decidida_em, 'decisao'
      from public.evento_decisao x
     where x.decidida_em is not null
       and not public.eh_exemplo(x.event_id)
    union all
    select x.empresa_id, x.created_at, 'tarefa'
      from public.tasks x
      join public.events ev on ev.id = x.event_id
     where not ev.exemplo and x.created_at > ev.created_at + interval '2 minutes'
    union all
    select x.empresa_id, x.created_at, 'fornecedor'
      from public.suppliers x
     where not x.exemplo
    union all
    select x.empresa_id, x.created_at, 'fornecedor'
      from public.roteiro_links x
     where not public.eh_exemplo(x.event_id)
    union all
    select x.empresa_id, x.created_at, 'cliente'
      from public.clients x
     where not x.exemplo
       and not exists (select 1 from public.events ev
                        where ev.client_id = x.id
                          and ev.created_at between x.created_at - interval '2 minutes'
                                                and x.created_at + interval '2 minutes')
    union all
    select x.empresa_id, x.created_at, 'proposta'
      from public.orcamentos x
    union all
    select x.empresa_id, x.enviado_em, 'proposta'
      from public.orcamentos x
     where x.enviado_em is not null
    union all
    select x.empresa_id, coalesce(x.respondido_em, x.encerrado_em), 'pedido'
      from public.pedido_orcamento x
     where coalesce(x.respondido_em, x.encerrado_em) is not null
    union all
    select x.empresa_id, x.updated_at, 'vitrine'
      from public.empresa_pagina x
     where x.atualizado_por is not null
    union all
    select x.empresa_id, x.created_at, 'financeiro'
      from public.transactions x
      join public.events ev on ev.id = x.event_id
     where not ev.exemplo and x.created_at > ev.created_at + interval '2 minutes'
    union all
    select x.empresa_id, x.paid_at, 'financeiro'
      from public.transactions x
      join public.events ev on ev.id = x.event_id
     where not ev.exemplo and x.paid_at is not null
       and x.paid_at > ev.created_at + interval '2 minutes'
       and x.paid_at > x.created_at + interval '2 minutes'
    union all
    select x.empresa_id, x.created_at, 'roteiro'
      from public.roteiro_items x
      join public.events ev on ev.id = x.event_id
     where not ev.exemplo and x.created_at > ev.created_at + interval '2 minutes'
    union all
    select ev.empresa_id, x.created_at, 'nota'
      from public.event_notes x
      join public.events ev on ev.id = x.event_id
     where not ev.exemplo
    union all
    select x.empresa_id, x.created_at, 'equipe'
      from public.membros_equipe x
     where not x.is_owner
    union all
    select x.empresa_id, x.created_at, 'convidado'
      from public.evento_convidado x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'convidado'
      from public.evento_convidado_relacao x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'portal'
      from public.evento_acesso x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_mesa x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_salao x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_elemento x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_recurso x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_recepcao_posto x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_cortejo_pessoa x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.evento_inspiracao x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.evento_guia_estilo x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.decisao_curadoria x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.paleta_biblioteca x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
  )
  select t.empresa, t.quando, t.oque
    from todas t
   where t.quando is not null
     and t.empresa is not null
     and t.quando <= now() + interval '5 minutes'
     and (p_empresa_id is null or t.empresa = p_empresa_id)
     and (p_desde is null or t.quando >= p_desde);
end $$;

create or replace function public.admin_resumo_contas(p_empresa_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  return (
    with
    acoes as (
      select a.empresa_id as empresa, a.em as quando, a.tipo as oque
        from public.admin_acoes_da_equipe(p_empresa_id, null) a
    ),
    ultima as (
      select distinct on (a.empresa) a.empresa, a.quando, a.oque
        from acoes a
       order by a.empresa, a.quando desc
    ),
    dias_acao as (
      select a.empresa,
             count(distinct (a.quando at time zone 'America/Sao_Paulo')::date)
               filter (where (a.quando at time zone 'America/Sao_Paulo')::date > v_hoje - 7) as d7,
             count(distinct (a.quando at time zone 'America/Sao_Paulo')::date)
               filter (where (a.quando at time zone 'America/Sao_Paulo')::date > v_hoje - 30) as d30
        from acoes a
       group by a.empresa
    ),
    por_tipo as (
      select p.empresa,
             jsonb_object_agg(p.oque, jsonb_build_object(
               'n', p.n, 'primeira', p.primeira, 'ultima', p.ultima)) as tipos
        from (select a.empresa, a.oque, count(*) as n,
                     min(a.quando) as primeira, max(a.quando) as ultima
                from acoes a
               group by a.empresa, a.oque) p
       group by p.empresa
    ),
    uso as (
      select u.empresa_id as empresa,
             count(distinct u.dia) filter (where u.dia > v_hoje - 7)  as dias7,
             count(distinct u.dia) filter (where u.dia > v_hoje - 30) as dias30,
             coalesce(sum(u.minutos) filter (where u.dia > v_hoje - 7), 0)  as min7,
             coalesce(sum(u.minutos) filter (where u.dia > v_hoje - 30), 0) as min30,
             count(distinct u.dia) as dias_total,
             max(u.dia) as ultimo_dia
        from public.uso_diario u
       where p_empresa_id is null or u.empresa_id = p_empresa_id
       group by u.empresa_id
    )
    select coalesce(jsonb_agg(z.linha order by z.criada_em desc), '[]'::jsonb)
    from (
      select e.created_at as criada_em,
        jsonb_build_object(
          'empresa_id', e.id,
          'nome', e.nome,
          'criada_em', e.created_at,
          'da_casa', exists (select 1 from public.contas_da_casa c where c.empresa_id = e.id),
          'dona', jsonb_build_object(
            'user_id', e.owner_user_id,
            'nome', dona.nome,
            'whatsapp', dona.whatsapp,
            'guia_dispensado_em', dona.guia_dispensado_em,
            'guia_concluido_em', dona.guia_concluido_em,
            'email', du.email,
            'ultimo_login', du.last_sign_in_at,
            'banida_ate', du.banned_until,
            'eventos_3_meses', du.raw_user_meta_data ->> 'eventos_3_meses',
            'instagram', du.raw_user_meta_data ->> 'instagram'
          ),
          'equipe', jsonb_build_object(
            'pessoas', eq.pessoas,
            'convidadas', eq.convidadas,
            'primeiro_convite_em', eq.primeiro_convite_em,
            'ultimo_login', eq.ultimo_login,
            'cargos', eq.cargos
          ),
          'assinatura', case when a.id is null then null
            else (to_jsonb(a) - 'gateway_customer_id' - 'gateway_subscription_id')
                 || jsonb_build_object('tem_gateway', a.gateway_subscription_id is not null)
          end,
          'congelada', public.conta_congelada(e.id),
          'congela_em', public.conta_congela_em(e.id),
          'historico', jsonb_build_object(
            'convertida_em', hist.convertida_em,
            'ultimo_cancelamento_em', hist.ultimo_cancelamento_em,
            'linhas', hist.linhas
          ),
          'eventos', jsonb_build_object(
            'total', ev.total,
            'em_andamento', ev.em_andamento,
            'concluidos', ev.concluidos,
            'proximos_30', ev.proximos_30,
            'primeiro_em', ev.primeiro_em,
            'contexto', coalesce(ev.contexto, false),
            'convidados_previstos', ev.convidados_previstos,
            'cidades', to_jsonb(ev.cidades)
          ),
          'proximo_evento', case when prox.dia is null then null
            else jsonb_build_object('data', prox.dia, 'tipo', prox.tipo, 'cidade', prox.cidade)
          end,
          'decisoes', jsonb_build_object('tomadas', decs.tomadas, 'primeira_em', decs.primeira_em),
          'tarefas', jsonb_build_object(
            'total', tar.total,
            'de_decisao', tar.de_decisao,
            'primeira_de_decisao_em', tar.primeira_de_decisao_em,
            'andamento', coalesce(tar.andamento, false)
          ),
          'fornecedores', jsonb_build_object(
            'total', forn.total,
            'primeiro_em', forn.primeiro_em,
            'vinculos', forn.vinculos,
            'responderam', forn.responderam
          ),
          'clientes', cli.total,
          'convidados', conv.total,
          'propostas', jsonb_build_object(
            'total', orc.total,
            'enviadas', orc.enviadas,
            'aceitas', orc.aceitas,
            'primeira_enviada_em', orc.primeira_enviada_em
          ),
          'acoes', jsonb_build_object(
            'ultima_em', ult.quando,
            'ultima_tipo', ult.oque,
            'dias_7', coalesce(da.d7, 0),
            'dias_30', coalesce(da.d30, 0),
            'por_tipo', coalesce(pt.tipos, '{}'::jsonb)
          ),
          'acesso', jsonb_build_object(
            'ultimo_sinal', pres.visto_em,
            'dias_7', coalesce(uso.dias7, 0),
            'dias_30', coalesce(uso.dias30, 0),
            'dias_total', coalesce(uso.dias_total, 0),
            'minutos_7', coalesce(uso.min7, 0),
            'minutos_30', coalesce(uso.min30, 0),
            'ultimo_dia', uso.ultimo_dia
          ),
          'suporte', jsonb_build_object(
            'mensagens_30d', sup.mensagens_30d,
            'nao_lidas', sup.nao_lidas,
            'ultima_em', sup.ultima_em,
            'sem_resposta', sr.conversas,
            'esperando_desde', sr.desde
          ),
          'origem', case when oc.empresa_id is null then null
            else jsonb_build_object(
              'utm_source', oc.utm_source,
              'utm_medium', oc.utm_medium,
              'utm_campaign', oc.utm_campaign,
              'gclid', oc.gclid is not null,
              'user_agent', left(oc.user_agent, 300)
            )
          end
        ) as linha
      from public.empresas e
      left join auth.users du on du.id = e.owner_user_id
      left join lateral (
        select m.nome, m.whatsapp, m.guia_dispensado_em, m.guia_concluido_em
          from public.membros_equipe m
         where m.empresa_id = e.id and m.user_id = e.owner_user_id
         order by m.created_at
         limit 1
      ) dona on true
      left join lateral (
        select count(*) filter (where m.status = 'ativo') as pessoas,
               count(*) filter (where not m.is_owner) as convidadas,
               min(m.created_at) filter (where not m.is_owner) as primeiro_convite_em,
               max(u.last_sign_in_at) as ultimo_login,
               jsonb_agg(jsonb_build_object('cargo', m.cargo, 'dona', m.is_owner,
                                            'status', m.status, 'ultimo_login', u.last_sign_in_at)
                         order by m.is_owner desc, m.created_at) as cargos
          from public.membros_equipe m
          left join auth.users u on u.id = m.user_id
         where m.empresa_id = e.id
      ) eq on true
      left join public.assinaturas a on a.empresa_id = e.id
      left join lateral (
        select min(h.em) filter (where h.tipo = 'inicio') as convertida_em,
               max(h.em) filter (where h.tipo = 'cancelamento') as ultimo_cancelamento_em,
               count(*) as linhas
          from public.assinatura_eventos h
         where h.empresa_id = e.id
      ) hist on true
      left join lateral (
        select count(*) as total,
               count(*) filter (where x.status in ('orcamento', 'confirmado')
                                  and coalesce(x.archived, false) = false) as em_andamento,
               count(*) filter (where x.status = 'concluido') as concluidos,
               count(*) filter (where x.date between v_hoje and v_hoje + 30
                                  and x.status in ('orcamento', 'confirmado')
                                  and coalesce(x.archived, false) = false) as proximos_30,
               min(x.created_at) as primeiro_em,
               bool_or(x.escala is not null and x.cenario is not null) as contexto,
               coalesce(sum(x.guests), 0) as convidados_previstos,
               array_remove(array_agg(distinct nullif(btrim(x.city), '')), null) as cidades
          from public.events x
         where x.empresa_id = e.id
           and not x.exemplo
      ) ev on true
      left join lateral (
        select x.date as dia, x.type as tipo, x.city as cidade
          from public.events x
         where x.empresa_id = e.id
           and not x.exemplo
           and x.date >= v_hoje
           and x.status in ('orcamento', 'confirmado')
           and coalesce(x.archived, false) = false
         order by x.date
         limit 1
      ) prox on true
      left join lateral (
        select count(*) as tomadas, min(d.decidida_em) as primeira_em
          from public.evento_decisao d
         where d.empresa_id = e.id and not public.eh_exemplo(d.event_id) and d.estado = 'decidida'
      ) decs on true
      left join lateral (
        select count(*) as total,
               count(*) filter (where t.evento_decisao_id is not null) as de_decisao,
               min(t.created_at) filter (where t.evento_decisao_id is not null) as primeira_de_decisao_em,
               bool_or(t.status is not null and t.status <> 'pendente') as andamento
          from public.tasks t
         where t.empresa_id = e.id and not public.eh_exemplo(t.event_id)
      ) tar on true
      left join lateral (
        select (select count(*) from public.suppliers s where s.empresa_id = e.id and not s.exemplo) as total,
               (select min(s.created_at) from public.suppliers s where s.empresa_id = e.id and not s.exemplo) as primeiro_em,
               (select count(*) from public.roteiro_links l where l.empresa_id = e.id and not public.eh_exemplo(l.event_id)) as vinculos,
               -- fornecedor que confirmou pelo link ou abriu a central dele:
               -- prova de que o link chegou a alguém (clique nosso não prova)
               (select count(*) from public.roteiro_links l
                 where l.empresa_id = e.id and coalesce(l.confirmed, false)
                   and not public.eh_exemplo(l.event_id))
               + (select count(*) from public.fornecedor_acesso f
                   where f.empresa_id = e.id and f.aberturas > 0) as responderam
      ) forn on true
      left join lateral (
        select count(*) as total from public.clients c where c.empresa_id = e.id and not c.exemplo
      ) cli on true
      left join lateral (
        select count(*) as total from public.evento_convidado c where c.empresa_id = e.id and not public.eh_exemplo(c.event_id)
      ) conv on true
      left join lateral (
        select count(*) as total,
               count(*) filter (where o.status <> 'rascunho') as enviadas,
               count(*) filter (where o.status = 'aprovado') as aceitas,
               min(coalesce(o.enviado_em,
                            case when o.status <> 'rascunho' then o.created_at end)) as primeira_enviada_em
          from public.orcamentos o
         where o.empresa_id = e.id
      ) orc on true
      left join ultima ult on ult.empresa = e.id
      left join dias_acao da on da.empresa = e.id
      left join por_tipo pt on pt.empresa = e.id
      left join uso on uso.empresa = e.id
      left join lateral (
        select max(p.visto_em) as visto_em from public.presenca p where p.empresa_id = e.id
      ) pres on true
      left join lateral (
        select count(*) filter (where s.autor = 'cliente'
                                  and s.created_at > now() - interval '30 days') as mensagens_30d,
               count(*) filter (where s.autor = 'cliente'
                                  and s.lida_pelo_suporte_em is null) as nao_lidas,
               max(s.created_at) as ultima_em
          from public.suporte_mensagem s
         where s.empresa_id = e.id
      ) sup on true
      left join lateral (
        -- sem resposta: a última mensagem da conversa é dela
        select count(*) as conversas, min(u.created_at) as desde
          from (select distinct on (s.user_id) s.user_id, s.autor, s.created_at
                  from public.suporte_mensagem s
                 where s.empresa_id = e.id and s.user_id is not null
                 order by s.user_id, s.created_at desc) u
         where u.autor = 'cliente'
      ) sr on true
      left join public.origem_do_clique oc on oc.empresa_id = e.id
      where p_empresa_id is null or e.id = p_empresa_id
    ) z
  );
end $$;

-- 5) O guia do primeiro acesso (cópia da 160 + filtro do exemplo)
create or replace function public.meu_guia()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_membro  public.membros_equipe%rowtype;
  v_evento  uuid;
begin
  if auth.uid() is null then return null; end if;

  select * into v_membro
    from public.membros_equipe m
   where m.user_id = auth.uid() and m.status = 'ativo'
   order by m.created_at asc
   limit 1;

  if not found then return null; end if;
  v_empresa := v_membro.empresa_id;

  select e.id into v_evento
    from public.events e
   where e.empresa_id = v_empresa
     and coalesce(e.archived, false) = false
     and not e.exemplo
   order by e.created_at desc
   limit 1;

  return json_build_object(
    'dispensado_em', v_membro.guia_dispensado_em,
    'concluido_em',  v_membro.guia_concluido_em,
    'evento_id',     v_evento,
    -- PASSO 1 — existe evento?
    'criou_evento',  v_evento is not null,
    -- PASSO 2 — o contexto que muda as sugestões do método
    'definiu_contexto', coalesce((
      select e.escala is not null and e.cenario is not null
        from public.events e where e.id = v_evento
    ), false),
    -- PASSO 3 — decidiu alguma coisa. QUALQUER decisão serve: se ela
    -- decidir outra que não a que o guia apontou, o passo vence igual.
    'decidiu', coalesce((
      select exists (
        select 1 from public.evento_decisao d
         where d.event_id = v_evento and d.estado = 'decidida'
      )
    ), false),
    -- PASSO 4 — a tarefa NASCEU DE UMA DECISÃO. Tarefa digitada à mão não
    -- serve aqui: o que o passo prova é o vínculo decisão → trabalho.
    'tarefa_nasceu', coalesce((
      select exists (
        select 1 from public.tasks t
         where t.event_id = v_evento and t.evento_decisao_id is not null
      )
    ), false),
    -- PASSO 5 — deu andamento. Responsável e prazo NÃO servem de prova:
    -- a tarefa já nasce com os dois preenchidos (medido: 166 de 166).
    -- O que só a pessoa faz é mover o estado.
    'deu_andamento', coalesce((
      select exists (
        select 1 from public.tasks t
         where t.event_id = v_evento
           and t.status is not null
           and t.status <> 'pendente'
      )
    ), false)
  );
end $$;

commit;

-- Conferência: 4 linhas de coluna (clients.exemplo, events.exemplo,
-- events.exemplo_visto, suppliers.exemplo) e 5 funções com filtra_exemplo = true.
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public' and column_name in ('exemplo', 'exemplo_visto')
 order by 1, 2;
select p.proname, position('exemplo' in pg_get_functiondef(p.oid)) > 0 as filtra_exemplo
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('eventos_que_contam', 'eventos_da_vida', 'admin_acoes_da_equipe', 'admin_resumo_contas', 'meu_guia')
 order by 1;
