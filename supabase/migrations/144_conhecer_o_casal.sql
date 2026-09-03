-- ============================================================
-- Vela — Migração 144: conhecer o casal
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A pesquisa de mercado sobre briefing de casamento achou uma coisa que
-- o Vela não tinha: os melhores profissionais coletam dois tipos de
-- matéria — dados logísticos (que o método já cobre inteiro) e
-- MATÉRIA-PRIMA EMOCIONAL (como se conheceram, o pedido, as pessoas que
-- importam, o que não pode faltar). É isso que separa um briefing de um
-- cadastro, e é o que a cerimonialista lê antes de qualquer reunião.
--
-- São cinco perguntas. Elas entram como campos do método, na decisão
-- nova "Conhecer o casal", com pergunta_cliente = true — então aparecem
-- sozinhas em "Perguntas do momento" no portal (na voz do casal) e as
-- respostas caem no drawer da decisão, no Planejamento, com o mesmo
-- "esperando conferência" e o mesmo diff de sempre.
--
-- O que esta migração NÃO faz: nenhuma tabela nova, nenhuma tela,
-- nenhum tipo de campo novo, e não toca portal_escrever_campo. O
-- formulário em blocos, o modo reunião e o perfil consolidado ficam
-- desenhados no plano, parados, esperando a testadora usar isto num
-- casamento real e dizer o que falta.
--
-- Efeito esperado (não é bug): a decisão nasce com prioridade 95 e
-- entra no progresso ponderado e no pódio de "Decidir agora" — está
-- certo, é a primeira conversa com o casal.

create or replace function public.semear_briefing_casal(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ------------------------------------------------------------
  -- 1) A decisão que hospeda as perguntas
  -- ------------------------------------------------------------
  -- Vive no objetivo 'estrutura' (as decisões-raiz) e é do casal
  -- ('noivos'): é essa marca que faz o portal enxergar (policies 089).
  -- Offset 350 dias = a conversa do começo. Prioridade 95 fica logo
  -- abaixo de prioridades (96) e acima do espaço (92).
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, descricao, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select o.id, p_empresa_id, 'casal_historia', 'Conhecer o casal',
         'A história, as pessoas e o que não pode faltar — o que faz este casamento ser o deles.',
         'noivos', 350, 300, 365, 95, 6
  from public.metodo_objetivo o
  where o.empresa_id = p_empresa_id
    and o.tipo_evento = 'casamento'
    and o.codigo = 'estrutura'
    and not exists (
      select 1 from public.metodo_decisao d
      where d.empresa_id = p_empresa_id and d.codigo = 'casal_historia'
    );

  -- ------------------------------------------------------------
  -- 2) As cinco perguntas
  -- ------------------------------------------------------------
  -- label = como a cerimonialista lê no Planejamento.
  -- label_portal = a mesma coisa na voz do casal, no portal.
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem,
     ativa_objetivo_codigo, ativa_quando, pergunta_cliente, label_portal)
  select d.id, p_empresa_id, c.codigo, c.label, 'texto',
         null, null, c.ordem, null, null, true, c.label_portal
  from (values
    ('como_se_conheceram',   'Como se conheceram',        'Como vocês se conheceram?',                          1),
    ('o_pedido',             'O pedido',                  'Como foi o pedido?',                                 2),
    ('pessoas_importantes',  'Pessoas mais importantes',  'As 7 pessoas mais importantes para vocês (vale pet)', 3),
    ('inegociaveis',         'Inegociáveis',              'O que não pode faltar de jeito nenhum?',              4),
    ('detestariam',          'O que detestariam',         'O que vocês detestariam ver no dia?',                 5)
  ) as c(codigo, label, label_portal, ordem)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = 'casal_historia'
  where not exists (
    select 1 from public.metodo_campo mc
    where mc.decisao_id = d.id and mc.codigo = c.codigo
  );
end;
$$;

revoke all on function public.semear_briefing_casal(uuid) from public, anon;

-- ------------------------------------------------------------
-- 3) Empresa nova já nasce com as perguntas; as existentes recebem agora
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
  perform public.semear_metodo_corporativo(new.id);
  -- as perguntas do casal vêm depois do método de casamento existir
  perform public.semear_briefing_casal(new.id);
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_checklist_dia_formatura(new.id);
  perform public.semear_checklist_dia_show(new.id);
  perform public.semear_checklist_dia_corporativo(new.id);
  perform public.semear_roteiro_padrao(new.id);
  perform public.semear_roteiro_show(new.id);
  perform public.semear_roteiro_corporativo(new.id);
  perform public.semear_recursos_metodo(new.id);
  perform public.semear_recursos_corporativo(new.id);
  return new;
end $$;

do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_briefing_casal(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4) Os casamentos VIVOS recebem a decisão e os campos vazios
-- ------------------------------------------------------------
-- instanciar_metodo_evento sai fora quando o evento já tem objetivo, e
-- no SQL Editor não há sessão de usuária: o INSERT é direto, guardado
-- por not exists (mesma costura da 133 e da 141). Concluídos e
-- cancelados ficam de fora — perguntar da história do casal depois da
-- festa é ruído.
insert into public.evento_decisao
  (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
   titulo, descricao, responsavel, offset_ideal_dias,
   offset_min_dias, offset_max_dias, prioridade, ordem)
select eo.id, eo.event_id, eo.empresa_id, d.id,
       d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias,
       d.offset_min_dias, d.offset_max_dias, d.prioridade, d.ordem
from public.evento_objetivo eo
join public.events e on e.id = eo.event_id
join public.metodo_objetivo o
  on o.id = eo.objetivo_template_id
 and o.tipo_evento = 'casamento' and o.codigo = 'estrutura'
join public.metodo_decisao d
  on d.objetivo_id = o.id and d.codigo = 'casal_historia'
where e.type = 'casamento'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_decisao x
    where x.evento_objetivo_id = eo.id and x.decisao_template_id = d.id
  );

insert into public.evento_campo_valor
  (evento_decisao_id, event_id, empresa_id, campo_template_id,
   codigo, label, tipo, opcoes, unidade, ordem,
   pergunta_cliente, label_portal)
select ed.id, ed.event_id, ed.empresa_id, c.id,
       c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem,
       c.pergunta_cliente, c.label_portal
from public.evento_decisao ed
join public.events e on e.id = ed.event_id
join public.metodo_decisao d
  on d.id = ed.decisao_template_id and d.codigo = 'casal_historia'
join public.metodo_campo c on c.decisao_id = d.id
where e.type = 'casamento'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_campo_valor x
    where x.evento_decisao_id = ed.id and x.codigo = c.codigo
  );

-- A decisão nova precisa de prazo como as outras (a distribuição da 070,
-- já com o filtro de objetivo ativo da 142).
do $$
declare ev record;
begin
  for ev in
    select distinct ed.event_id as id
    from public.evento_decisao ed
    join public.metodo_decisao d
      on d.id = ed.decisao_template_id and d.codigo = 'casal_historia'
    where ed.prazo_previsto is null and ed.estado = 'pendente'
  loop
    perform public.redistribuir_decisoes_evento(ev.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'toda empresa tem a decisão de conhecer o casal, e ela é do casal' as item,
       not exists (
         select 1 from public.empresas em
         where not exists (
           select 1 from public.metodo_decisao d
           join public.metodo_objetivo o on o.id = d.objetivo_id
           where o.empresa_id = em.id and o.tipo_evento = 'casamento'
             and d.codigo = 'casal_historia' and d.responsavel = 'noivos'
         )
       ) as ok
union all
select 'a decisão vive nas decisões-raiz (objetivo estrutura)',
       not exists (
         select 1 from public.metodo_decisao d
         join public.metodo_objetivo o on o.id = d.objetivo_id
         where d.codigo = 'casal_historia' and o.codigo <> 'estrutura'
       )
union all
select 'toda empresa tem as 5 perguntas, todas texto e todas do portal',
       not exists (
         select 1 from public.empresas em
         where (
           select count(*) from public.metodo_campo c
           join public.metodo_decisao d on d.id = c.decisao_id
           join public.metodo_objetivo o on o.id = d.objetivo_id
           where o.empresa_id = em.id and d.codigo = 'casal_historia'
             and c.tipo = 'texto' and c.pergunta_cliente
             and coalesce(c.label_portal, '') <> ''
         ) <> 5
       )
union all
select 'as 5 perguntas têm os códigos combinados',
       not exists (
         select 1 from public.empresas em
         cross join (values ('como_se_conheceram'), ('o_pedido'),
                            ('pessoas_importantes'), ('inegociaveis'), ('detestariam')) as k(codigo)
         where not exists (
           select 1 from public.metodo_campo c
           join public.metodo_decisao d on d.id = c.decisao_id
           join public.metodo_objetivo o on o.id = d.objetivo_id
           where o.empresa_id = em.id and d.codigo = 'casal_historia'
             and c.codigo = k.codigo
         )
       )
union all
select 'nenhuma pergunta nasceu sensível (elas saem no portal)',
       not exists (
         select 1 from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         where d.codigo = 'casal_historia' and c.sensibilidade <> 'normal'
       )
union all
select 'todo casamento vivo tem a decisão instanciada com prazo',
       not exists (
         select 1 from public.events e
         where e.type = 'casamento' and e.status in ('orcamento', 'confirmado')
           and not exists (
             select 1 from public.evento_decisao ed
             join public.metodo_decisao d
               on d.id = ed.decisao_template_id and d.codigo = 'casal_historia'
             where ed.event_id = e.id
           )
       )
       and not exists (
         select 1 from public.evento_decisao ed
         join public.metodo_decisao d
           on d.id = ed.decisao_template_id and d.codigo = 'casal_historia'
         join public.events e on e.id = ed.event_id
         where ed.estado = 'pendente' and ed.prazo_previsto is null
           and e.date is not null
       )
union all
select 'todo casamento vivo tem os 5 campos instanciados e vazios ou respondidos',
       not exists (
         select 1 from public.evento_decisao ed
         join public.metodo_decisao d
           on d.id = ed.decisao_template_id and d.codigo = 'casal_historia'
         where (select count(*) from public.evento_campo_valor v
                where v.evento_decisao_id = ed.id) <> 5
       )
union all
select 'os outros tipos de evento não ganharam nada',
       not exists (
         select 1 from public.evento_decisao ed
         join public.metodo_decisao d
           on d.id = ed.decisao_template_id and d.codigo = 'casal_historia'
         join public.events e on e.id = ed.event_id
         where e.type <> 'casamento'
       )
union all
select 'empresa nova nasce com as perguntas (gatilho)',
       (select prosrc like '%semear_briefing_casal%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'trg_semear_metodo_empresa')
union all
select 'a função existe UMA vez (sem overload) e não alcança anon',
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'semear_briefing_casal')
       and not exists (
         select 1 from information_schema.role_routine_grants
         where routine_schema = 'public' and routine_name = 'semear_briefing_casal'
           and grantee in ('anon', 'PUBLIC')
       );
