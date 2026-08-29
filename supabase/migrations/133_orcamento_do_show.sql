-- ============================================================
-- Vela — Migração 133: o show ganha orçamento (e a faixa para de mentir)
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Bug medido em produção: no Planejamento de um evento `show`, digitar a
-- verba e clicar em OK não fazia nada. A tela chama salvarCampoPorCodigo
-- ('verba_total'), que faz `if (!campo) return` — e o método de show
-- (132) nasceu sem campo de verba. O clique morria em silêncio.
--
-- Duas causas, dois consertos. O da tela já foi (a faixa esconde verba e
-- arquétipo quando o método não os tem, e o caminho impossível vira log
-- em vez de silêncio). Este é o do dado: o produtor TEM orçamento, e o
-- método precisa ter onde guardá-lo.
--
-- Por que uma função nova em vez de reescrever semear_metodo_show: aquela
-- começa com `delete from metodo_objetivo ... tipo_evento='show'`, e o
-- delete cascateia. Os eventos de show que já existem perderiam o vínculo
-- com o template (objetivo_template_id vira null, por on delete set null)
-- — na prática, o mapa do evento vira órfão e o checklist do dia deixa de
-- casar por objetivo. Aqui tudo é ADITIVO e guardado por not-exists.

-- ------------------------------------------------------------
-- 1) O orçamento do show — objetivo, decisão e os dois campos
-- ------------------------------------------------------------
create or replace function public.semear_orcamento_show(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objetivo uuid;
  v_decisao  uuid;
begin
  -- 1.1) o objetivo (ordem 0: é a decisão-raiz, vem antes da atração)
  insert into public.metodo_objetivo
    (empresa_id, tipo_evento, codigo, nome, descricao, ordem,
     ativo_padrao, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_empresa_id, 'show', 'orcamento', 'Orçamento do evento',
         'Quanto se pode gastar e quanto fica de reserva.', 0,
         true, null::int, null::int, null::int
  where not exists (
    select 1 from public.metodo_objetivo o
    where o.empresa_id = p_empresa_id and o.tipo_evento = 'show'
      and o.codigo = 'orcamento'
  );

  select o.id into v_objetivo
  from public.metodo_objetivo o
  where o.empresa_id = p_empresa_id and o.tipo_evento = 'show'
    and o.codigo = 'orcamento';

  if v_objetivo is null then
    return; -- o método de show ainda não foi semeado nesta empresa
  end if;

  -- 1.2) a decisão que segura os campos
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select v_objetivo, p_empresa_id, 'show_orcamento_definir',
         'Definir o orçamento do evento', 'ambos', 150, 120, 240, 100, 1
  where not exists (
    select 1 from public.metodo_decisao d
    where d.empresa_id = p_empresa_id and d.codigo = 'show_orcamento_definir'
  );

  select d.id into v_decisao
  from public.metodo_decisao d
  where d.empresa_id = p_empresa_id and d.codigo = 'show_orcamento_definir';

  -- 1.3) os campos que a faixa de contexto procura por CÓDIGO
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem,
     ativa_objetivo_codigo, ativa_quando)
  select v_decisao, p_empresa_id, c.codigo, c.label, c.tipo,
         null, nullif(c.unidade, ''), c.ordem, null, null
  from (values
    ('verba_total', 'Verba total',              'moeda',  '',  1),
    ('reserva_pct', 'Reserva para imprevistos', 'numero', '%', 2)
  ) as c(codigo, label, tipo, unidade, ordem)
  where v_decisao is not null
    and not exists (
      select 1 from public.metodo_campo mc
      where mc.decisao_id = v_decisao and mc.codigo = c.codigo
    );

  -- 1.4) as faixas de referência, para "Sugerir distribuição" ter o que
  --      distribuir. Números de produção de evento de grande porte: o
  --      cachê come quase metade, estrutura vem logo atrás. Só grava onde
  --      ainda está nulo — índice ajustado pela dona sobrevive.
  update public.metodo_objetivo o
  set faixa_pct_min = v.pmin,
      faixa_pct_ideal = v.pideal,
      faixa_pct_max = v.pmax
  from (values
    ('artista',   30, 40, 55),
    ('estrutura', 18, 25, 35),
    ('bar',        8, 12, 20),
    ('licencas',   6, 10, 15),
    ('equipe',     4,  7, 12),
    ('portaria',   2,  4,  8),
    ('pos_evento', 1,  2,  5)
  ) as v(codigo, pmin, pideal, pmax)
  where o.empresa_id = p_empresa_id
    and o.tipo_evento = 'show'
    and o.codigo = v.codigo
    and o.faixa_pct_ideal is null;
end;
$$;

revoke all on function public.semear_orcamento_show(uuid) from public, anon;

-- ------------------------------------------------------------
-- 2) Empresa nova já nasce com ele
-- ------------------------------------------------------------
create or replace function public.trg_semear_metodo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_metodo_casamento(new.id);
  perform public.semear_tarefas_metodo_casamento(new.id);
  perform public.semear_tarefas_acao_casamento(new.id);
  perform public.semear_metodo_debutante(new.id);
  perform public.semear_metodo_formatura(new.id);
  perform public.semear_metodo_show(new.id);
  -- depois do show: acrescenta o orçamento sem destruir o que veio antes
  perform public.semear_orcamento_show(new.id);
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_checklist_dia_formatura(new.id);
  perform public.semear_checklist_dia_show(new.id);
  perform public.semear_roteiro_padrao(new.id);
  perform public.semear_roteiro_show(new.id);
  perform public.semear_recursos_metodo(new.id);
  return new;
end $$;

do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_orcamento_show(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3) Os shows que já existem recebem o bloco
-- ------------------------------------------------------------
-- O guard de instanciar_metodo_evento ("já tem objetivo? sai") impede que
-- método enriquecido alcance evento vivo. Aqui o INSERT é direto, guardado
-- por not-exists — e é a mesma costura da 132 para os recursos.
insert into public.evento_objetivo
  (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem,
   ativo, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
select e.id, e.empresa_id, o.id, o.nome, o.descricao, o.ordem,
       o.ativo_padrao, o.faixa_pct_min, o.faixa_pct_ideal, o.faixa_pct_max
from public.events e
join public.metodo_objetivo o
  on o.empresa_id = e.empresa_id
 and o.tipo_evento = 'show'
 and o.codigo = 'orcamento'
where e.type = 'show'
  and exists (select 1 from public.evento_objetivo x where x.event_id = e.id)
  and not exists (
    select 1 from public.evento_objetivo x
    where x.event_id = e.id and x.objetivo_template_id = o.id
  );

insert into public.evento_decisao
  (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
   titulo, descricao, responsavel, offset_ideal_dias,
   offset_min_dias, offset_max_dias, prioridade, ordem)
select eo.id, eo.event_id, eo.empresa_id, d.id,
       d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias,
       d.offset_min_dias, d.offset_max_dias, d.prioridade, d.ordem
from public.evento_objetivo eo
join public.metodo_objetivo o
  on o.id = eo.objetivo_template_id and o.tipo_evento = 'show'
 and o.codigo = 'orcamento'
join public.metodo_decisao d on d.objetivo_id = o.id
where not exists (
  select 1 from public.evento_decisao x
  where x.evento_objetivo_id = eo.id and x.decisao_template_id = d.id
);

insert into public.evento_campo_valor
  (evento_decisao_id, event_id, empresa_id, campo_template_id,
   codigo, label, tipo, opcoes, unidade, ordem)
select ed.id, ed.event_id, ed.empresa_id, c.id,
       c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem
from public.evento_decisao ed
join public.metodo_decisao d
  on d.id = ed.decisao_template_id and d.codigo = 'show_orcamento_definir'
join public.metodo_campo c on c.decisao_id = d.id
where not exists (
  select 1 from public.evento_campo_valor x
  where x.evento_decisao_id = ed.id and x.codigo = c.codigo
);

-- As faixas novas descem para os eventos que já existem (a instância tem
-- cópia própria — é ela que a tela lê).
update public.evento_objetivo eo
set faixa_pct_min = o.faixa_pct_min,
    faixa_pct_ideal = o.faixa_pct_ideal,
    faixa_pct_max = o.faixa_pct_max
from public.metodo_objetivo o
where o.id = eo.objetivo_template_id
  and o.tipo_evento = 'show'
  and eo.faixa_pct_ideal is null
  and o.faixa_pct_ideal is not null;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'toda empresa tem o objetivo de orcamento no show' as item,
       not exists (
         select 1 from public.empresas em
         where not exists (
           select 1 from public.metodo_objetivo o
           where o.empresa_id = em.id and o.tipo_evento = 'show'
             and o.codigo = 'orcamento'
         )
       ) as ok
union all
select 'o show tem os campos verba_total e reserva_pct',
       not exists (
         select 1 from public.empresas em
         where (
           select count(*) from public.metodo_campo mc
           join public.metodo_decisao d on d.id = mc.decisao_id
           join public.metodo_objetivo o on o.id = d.objetivo_id
           where o.empresa_id = em.id and o.tipo_evento = 'show'
             and mc.codigo in ('verba_total', 'reserva_pct')
         ) <> 2
       )
union all
select 'as 7 categorias de gasto do show somam 100% no ideal',
       not exists (
         select 1 from public.empresas em
         where (
           select coalesce(sum(o.faixa_pct_ideal), 0)
           from public.metodo_objetivo o
           where o.empresa_id = em.id and o.tipo_evento = 'show'
         ) <> 100
       )
union all
select 'o objetivo de orcamento nao consome verba (faixa nula)',
       not exists (
         select 1 from public.metodo_objetivo o
         where o.tipo_evento = 'show' and o.codigo = 'orcamento'
           and o.faixa_pct_ideal is not null
       )
union all
select 'todo evento show com mapa recebeu o campo de verba',
       not exists (
         select 1 from public.events e
         where e.type = 'show'
           and exists (select 1 from public.evento_objetivo x where x.event_id = e.id)
           and not exists (
             select 1 from public.evento_campo_valor v
             where v.event_id = e.id and v.codigo = 'verba_total'
           )
       )
union all
select 'nenhum mapa de show ficou orfao do template',
       not exists (
         select 1 from public.evento_objetivo eo
         join public.events e on e.id = eo.event_id
         where e.type = 'show' and eo.objetivo_template_id is null
       )
union all
select 'empresa nova nasce com o orcamento do show',
       (select prosrc like '%semear_orcamento_show%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'trg_semear_metodo_empresa')
union all
select 'a funcao nova existe UMA vez (sem overload)',
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'semear_orcamento_show') = 1;
