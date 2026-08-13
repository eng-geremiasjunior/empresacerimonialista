-- ============================================================
-- Vela — Migração 089: Portal da Cliente, leitura + performance
--
-- Duas coisas na mesma migração, de propósito (decisão do dono: validar
-- políticas separadas de layout):
--
--   LEITURA — abre para a cliente o mínimo que as telas da Fase 2 usam:
--   decisões dela (responsavel noivos/ambos), campos dessas decisões, e
--   três RPCs de leitura (contratados, investimento, linha do tempo).
--   evento_objetivo NÃO abre (decisão do dono): valor_previsto e a
--   reserva são leitura da cerimonialista; nada nas telas da F2 precisa
--   da tabela — categoria de contratado sai por RPC só com o nome.
--
--   PERFORMANCE — três frentes, todas medidas antes (fixture 4 cargos):
--   a) conserta a regressão da F1: portal_events_select rodava
--      sou_cliente_do_evento POR LINHA também nas consultas da equipe
--      (policy permissiva soma por OR). Vira InitPlan.
--   b) leva a otimização da 039 às tabelas do método que ficaram para
--      trás (evento_objetivo/decisao/guia/campo_valor, compromisso,
--      EFO/EFI): pode_ver_evento por linha → eventos_visiveis() uma vez
--      por consulta. Só SELECT — escrita não muda (mesma razão da 039).
--      Baseline medida em 2026-08-13 (mediana, fixture): Planejamento
--      completo 191ms proprietária / 185ms cerimonialista.
--   c) índice para o join das RPCs de investimento.
--
-- Equivalência da conversão (b): eventos_visiveis() (039) aplica os
-- MESMOS quatro braços de pode_ver_evento (037): proprietária/
-- coordenadora, responsável, criadora (cerimonialista_id) e
-- participante, dentro da mesma empresa. Verificado por contagem de
-- linhas com login real dos 4 cargos antes/depois.
--
-- IDEMPOTENTE: pode rodar de novo por cima dela mesma.
-- Execute no SQL Editor do Supabase (depois da 088).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) O InitPlan do portal: espelho de eventos_visiveis() para a cliente
-- ------------------------------------------------------------
-- Mesma regra de sou_cliente_do_evento (086), na forma de conjunto:
-- `event_id in (select ...)` é avaliado UMA vez por consulta e testado
-- por hash em cada linha. Coberto por idx_evento_acesso_user (086).
create or replace function public.eventos_da_cliente()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ea.event_id
  from public.evento_acesso ea
  where ea.user_id is not null
    and ea.user_id = auth.uid()
    and ea.status = 'ativo';
$$;

revoke all on function public.eventos_da_cliente() from public, anon;
grant execute on function public.eventos_da_cliente() to authenticated;

comment on function public.eventos_da_cliente() is
  'InitPlan do Portal da Cliente — mesma regra de sou_cliente_do_evento, como conjunto. Usar sempre como event_id in (select ...).';

-- ------------------------------------------------------------
-- 2) Regressão da F1: as policies do portal saem do caminho da equipe
-- ------------------------------------------------------------
-- Policies permissivas somam por OR: a forma correlacionada da 086
-- rodava para CADA linha que a equipe varria em events/empresas.
drop policy if exists portal_events_select on public.events;
create policy portal_events_select on public.events
  for select using (id in (select public.eventos_da_cliente()));

-- Subconsulta sem referência à linha externa → InitPlan. A leitura de
-- evento_acesso aqui passa pelo RLS da própria cliente (ela vê as
-- próprias linhas), o suficiente para resolver as empresas dela.
drop policy if exists portal_empresas_select on public.empresas;
create policy portal_empresas_select on public.empresas
  for select using (
    id in (
      select ea.empresa_id
      from public.evento_acesso ea
      where ea.user_id is not null
        and ea.user_id = auth.uid()
        and ea.status = 'ativo'
    )
  );

-- Braço barato primeiro; auth.uid() embrulhado em select vira InitPlan.
drop policy if exists evento_acesso_select on public.evento_acesso;
create policy evento_acesso_select on public.evento_acesso
  for select using (
    user_id = (select auth.uid())
    or public.pode_ver_evento(event_id)
  );

-- ------------------------------------------------------------
-- 3) Conversão 039 nas tabelas que ficaram para trás (SELECT da equipe)
-- ------------------------------------------------------------
drop policy if exists evento_objetivo_select on public.evento_objetivo;
create policy evento_objetivo_select on public.evento_objetivo
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists evento_decisao_select on public.evento_decisao;
create policy evento_decisao_select on public.evento_decisao
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists evento_guia_select on public.evento_guia;
create policy evento_guia_select on public.evento_guia
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists evento_campo_valor_select on public.evento_campo_valor;
create policy evento_campo_valor_select on public.evento_campo_valor
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "compromisso_select" on public.compromisso;
create policy "compromisso_select" on public.compromisso
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "efo_select" on public.evento_fornecedor_orcamento;
create policy "efo_select" on public.evento_fornecedor_orcamento
  for select using (event_id in (select public.eventos_visiveis()));

-- O item não tem event_id: resolve pelo pai, ainda sem referência à
-- linha externa dentro da subconsulta de eventos (InitPlan preservado).
drop policy if exists "efi_select" on public.evento_fornecedor_item;
create policy "efi_select" on public.evento_fornecedor_item
  for select using (
    evento_fornecedor_orcamento_id in (
      select o.id from public.evento_fornecedor_orcamento o
      where o.event_id in (select public.eventos_visiveis())
    )
  );

-- ------------------------------------------------------------
-- 4) Leitura aditiva do portal (mínimo que as telas da F2 usam)
-- ------------------------------------------------------------
-- evento_objetivo: SEM policy de portal (ver cabeçalho).

-- Decisões da cliente: só as que são dela. As de responsavel
-- 'cerimonialista' (plano B de chuva, ambulância…) são ruído operacional
-- e ficam invisíveis no portal.
drop policy if exists portal_decisao_select on public.evento_decisao;
create policy portal_decisao_select on public.evento_decisao
  for select using (
    event_id in (select public.eventos_da_cliente())
    and responsavel in ('noivos', 'ambos')
  );

-- Campos: a F3 (escrita) vai precisar esconder campo a campo — a coluna
-- nasce AGORA para a policy já sair na forma final (zero retrabalho).
-- Até a UI da F3 existir, o caminho manual de esconder um campo é:
--   update public.evento_campo_valor set visivel_portal = false
--    where event_id = '<evento>' and codigo = '<codigo do campo>';
alter table public.evento_campo_valor
  add column if not exists visivel_portal boolean not null default true;

comment on column public.evento_campo_valor.visivel_portal is
  'false = o campo não aparece no Portal da Cliente (nem leitura). A equipe segue vendo normalmente.';

drop policy if exists portal_campo_valor_select on public.evento_campo_valor;
create policy portal_campo_valor_select on public.evento_campo_valor
  for select using (
    event_id in (select public.eventos_da_cliente())
    and visivel_portal
    and evento_decisao_id in (
      select ed.id from public.evento_decisao ed
      where ed.event_id in (select public.eventos_da_cliente())
        and ed.responsavel in ('noivos', 'ambos')
    )
  );

-- ------------------------------------------------------------
-- 5) RPCs de leitura do portal
-- ------------------------------------------------------------
-- Guard duplo (cliente OU equipe) em todas: a mesma função serve o
-- portal e qualquer tela interna, e devolve VAZIO para quem não é nem
-- um nem outro — nunca erro, nunca dado alheio.
--
-- "Contratado" é conceito do Planejamento (decisão do dono): decisão
-- DECIDIDA com campo tipo 'fornecedor' preenchido — exatamente o gatilho
-- de sincronizar_orcamento_fornecedor (083). Cobre também decisões de
-- liberdade (sem template). roteiro_links não diz nada sobre contrato.

create or replace function public.portal_fornecedores_contratados(p_event_id uuid)
returns table (
  supplier_id uuid,
  fornecedor  text,
  categoria   text,
  decidida_em timestamptz,
  valor       numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select c.supplier_id, c.fornecedor, c.categoria, c.decidida_em, c.valor
  from (
    -- distinct on: uma linha por decisão, mesmo se ela tiver mais de um
    -- campo fornecedor (vale o primeiro pela ordem dos campos)
    select distinct on (ed.id)
      forn.valor_supplier_id as supplier_id,
      s.name  as fornecedor,
      eo.nome as categoria,
      ed.decidida_em,
      (select v.valor_numero
         from public.evento_campo_valor v
        where v.evento_decisao_id = ed.id
          and v.codigo = 'valor_contratado'
          and v.valor_numero is not null
        limit 1) as valor
    from public.evento_decisao ed
    join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
    join public.evento_campo_valor forn
      on forn.evento_decisao_id = ed.id
     and forn.tipo = 'fornecedor'
     and forn.valor_supplier_id is not null
    join public.suppliers s on s.id = forn.valor_supplier_id
    where ed.event_id = p_event_id
      and ed.estado = 'decidida'
    order by ed.id, forn.ordem
  ) c
  where public.sou_cliente_do_evento(p_event_id)
     or public.pode_ver_evento(p_event_id)
  order by c.decidida_em desc nulls last;
$$;

revoke all on function public.portal_fornecedores_contratados(uuid) from public, anon;
grant execute on function public.portal_fornecedores_contratados(uuid) to authenticated;

-- Investimento: os três números que a cliente vê. 'contratado' espelha
-- totalDoFornecedor (verba-fornecedores.ts): com itens vale a soma dos
-- negociados, sem itens vale valor_alocado (null = ainda sem contrato =
-- 0). Só conta='fornecedor' — honorários da assessoria NUNCA aparecem.
create or replace function public.portal_investimento(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not (public.sou_cliente_do_evento(p_event_id)
              or public.pode_ver_evento(p_event_id))
    then null
    else json_build_object(
      'contratado', coalesce((
        select sum(
          case
            when exists (select 1 from public.evento_fornecedor_item i
                          where i.evento_fornecedor_orcamento_id = o.id)
            then (select coalesce(sum(coalesce(i.valor_negociado, 0)), 0)
                    from public.evento_fornecedor_item i
                   where i.evento_fornecedor_orcamento_id = o.id)
            else coalesce(o.valor_alocado, 0)
          end)
        from public.evento_fornecedor_orcamento o
        where o.event_id = p_event_id), 0),
      'pago', coalesce((
        select sum(t.value)
        from public.transactions t
        where t.event_id = p_event_id
          and t.conta = 'fornecedor'
          and t.paid), 0),
      'parcelas', coalesce((
        select json_agg(json_build_object(
            'fornecedor', s.name,
            'descricao',  t.description,
            'valor',      t.value,
            'due_date',   t.due_date,
            'paid',       t.paid,
            'paid_at',    t.paid_at
          ) order by t.due_date, t.created_at)
        from public.transactions t
        left join public.suppliers s on s.id = t.supplier_id
        where t.event_id = p_event_id
          and t.conta = 'fornecedor'), '[]'::json)
    )
  end;
$$;

revoke all on function public.portal_investimento(uuid) from public, anon;
grant execute on function public.portal_investimento(uuid) to authenticated;

-- Linha do tempo: aceite da proposta + contratações + compromissos dos
-- noivos, num feed só, mais recente primeiro. SEM colunas de assinatura
-- do aceite. Compromisso com responsavel nulo (maioria do legado é de
-- fornecedor) fica fora — omissão honesta, não bug.
create or replace function public.portal_linha_do_tempo(p_event_id uuid)
returns table (
  tipo    text,
  titulo  text,
  detalhe text,
  valor   numeric,
  quando  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.tipo, t.titulo, t.detalhe, t.valor, t.quando
  from (
    -- 1) o aceite que deu origem ao evento
    select 'aceite'::text        as tipo,
           'Proposta aceita'::text as titulo,
           a.pacote_nome         as detalhe,
           a.valor_total         as valor,
           a.created_at          as quando
    from public.orcamentos o
    join public.orcamento_aceites a on a.orcamento_id = o.id
    where o.evento_gerado_id = p_event_id

    union all

    -- 2) contratações (mesma regra da RPC de contratados)
    select 'contratacao', c.titulo, c.fornecedor, c.valor, c.decidida_em
    from (
      select distinct on (ed.id)
        ed.titulo,
        s.name as fornecedor,
        ed.decidida_em,
        (select v.valor_numero
           from public.evento_campo_valor v
          where v.evento_decisao_id = ed.id
            and v.codigo = 'valor_contratado'
            and v.valor_numero is not null
          limit 1) as valor
      from public.evento_decisao ed
      join public.evento_campo_valor forn
        on forn.evento_decisao_id = ed.id
       and forn.tipo = 'fornecedor'
       and forn.valor_supplier_id is not null
      join public.suppliers s on s.id = forn.valor_supplier_id
      where ed.event_id = p_event_id
        and ed.estado = 'decidida'
      order by ed.id, forn.ordem
    ) c
    where c.decidida_em is not null

    union all

    -- 3) compromissos em que ela comparece (passado e futuro; cancelado
    --    fica fora). Meio-dia como hora neutra evita o dia "escorregar"
    --    na conversão de fuso quando hora é nula.
    select 'compromisso', co.titulo, co.local, null::numeric,
           (co.data + coalesce(co.hora, '12:00'::time))::timestamptz
    from public.compromisso co
    where co.event_id = p_event_id
      and co.responsavel in ('noivos', 'ambos')
      and co.estado <> 'cancelado'
  ) t
  where public.sou_cliente_do_evento(p_event_id)
     or public.pode_ver_evento(p_event_id)
  order by t.quando desc nulls last;
$$;

revoke all on function public.portal_linha_do_tempo(uuid) from public, anon;
grant execute on function public.portal_linha_do_tempo(uuid) to authenticated;

-- A função da 063 nasceu "para o Portal mais adiante" — o adiante chegou:
-- o guard ganha o braço da cliente. Corpo idêntico no resto.
create or replace function public.pagamentos_fornecedor_por_mes(p_event_id uuid)
returns table (
  supplier_id   uuid,
  fornecedor    text,
  mes           date,
  total_pago    numeric,
  qtd_parcelas  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.supplier_id,
    s.name as fornecedor,
    date_trunc('month', coalesce(t.paid_at::date, t.due_date))::date as mes,
    sum(t.value) as total_pago,
    count(*) as qtd_parcelas
  from public.transactions t
  join public.suppliers s on s.id = t.supplier_id
  where t.event_id = p_event_id
    and t.conta = 'fornecedor'
    and t.paid
    and (public.pode_ver_evento(p_event_id)
         or public.sou_cliente_do_evento(p_event_id))
  group by t.supplier_id, s.name, 3
  order by 3, s.name;
$$;

revoke all on function public.pagamentos_fornecedor_por_mes(uuid) from public, anon;
grant execute on function public.pagamentos_fornecedor_por_mes(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6) Índice novo (o único que os caminhos da F2 ainda não tinham)
-- ------------------------------------------------------------
create index if not exists idx_transactions_supplier
  on public.transactions (supplier_id);

commit;
