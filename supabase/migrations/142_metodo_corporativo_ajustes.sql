-- ============================================================
-- Vela — Migração 142: o que a revisão da 141 pegou por baixo da conferência
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A 141 passou na própria conferência e se comporta como desenhado, mas
-- dois revisores independentes acharam efeitos colaterais que nenhuma
-- linha de `true` mede. Tudo aqui é aditivo ou guardado pelo valor que
-- a 141 semeou (edição manual da proprietária sobrevive).
--
-- 1) O espelho da verba (121) dispara também no INSERT: instanciar ou
--    backfillar o campo verba_total VAZIO apagava events.verba_total.
--    Em produção nenhum evento perdeu valor (medido antes desta
--    migração: coluna = campo nos 22 eventos vivos), mas o precedente
--    (133, shows) e qualquer backfill futuro repetiriam o estrago.
--    Agora: campo nascendo vazio recebe a coluna; só campo com valor
--    espelha para a coluna.
-- 2) Tarefa com offset negativo devia vencer DEPOIS do evento, mas o
--    `least(v_data, …)` da 073 é um teto — as duas tarefas de pós-evento
--    nasciam no dia da festa. O teto passa a valer só para o "antes".
-- 3) Decisão de objetivo DESLIGADO (cenário/porte) não pode contar: o
--    portal já filtra (141), mas o motor de prazos (070) ainda a
--    distribuía e vencia. Passa a não ter prazo até o objetivo ligar.
-- 4) Corporativo em orçamento com data passada recebeu o mapa inteiro
--    "para hoje" — vira não se aplica (estado, nunca delete).
-- 5) Roteiro: encerramento e desmontagem colidiam com a entrega de
--    prêmios no mesmo minuto.
-- 6) Porte pequeno deixava offset ideal abaixo do mínimo em 3 decisões.
-- 7) Premiação gasta dinheiro (troféus) e não tinha faixa de verba.
-- 8) MC e materiais contratam fornecedor sem passar pelo padrão de
--    contrato — ganham as 4 tarefas.
-- 9) Régua: quatro campos pediam número que o sistema já conta (ou que
--    ninguém lê) e um recurso duplicava o contrato de AV. Saem — só os
--    vazios, sem escrita da cliente por trás.
-- 10) Copy: título que enumerava o formulário; unidade que repetia a
--    instrução da nota.
--
-- Efeito na conferência da 141, se ela for rodada de novo: "soma 100"
-- passa a 104 (a faixa da premiação) e "10 recursos" passa a 9 — as
-- duas linhas foram ajustadas lá para aceitar os dois estados.

-- ------------------------------------------------------------
-- 1) O espelho da verba nunca apaga a coluna
-- ------------------------------------------------------------
create or replace function public.espelhar_verba_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo <> 'verba_total' then
    return new;
  end if;

  -- Campo nascendo VAZIO (instanciação, backfill) não é decisão de
  -- ninguém: a coluna sobe para o campo. O UPDATE abaixo dispara este
  -- mesmo gatilho como UPDATE — que só espelha o valor igual e para.
  if tg_op = 'INSERT' and new.valor_numero is null then
    update public.evento_campo_valor cv
       set valor_numero = e.verba_total, updated_at = now()
      from public.events e
     where cv.id = new.id
       and e.id = new.event_id
       and e.verba_total is not null;
    return new;
  end if;

  update public.events
     set verba_total = new.valor_numero
   where id = new.event_id
     and verba_total is distinct from new.valor_numero;
  return new;
end;
$$;

-- Cura o que ainda dá para curar: campo vazio ao lado de coluna preenchida.
update public.evento_campo_valor cv
   set valor_numero = e.verba_total, updated_at = now()
  from public.events e
 where e.id = cv.event_id
   and cv.codigo = 'verba_total'
   and cv.valor_numero is null
   and e.verba_total is not null;

-- ------------------------------------------------------------
-- 2) Tarefa de pós-evento vence depois do evento
-- ------------------------------------------------------------
-- Corpo da 073 com um ramo a mais: offset negativo = dias DEPOIS da data,
-- sem o teto nem o deslocamento da compressão (que só faz sentido antes).
create or replace function public.gerar_tarefas_da_decisao(p_evento_decisao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dec   public.evento_decisao%rowtype;
  v_emp   uuid;
  v_data  date;
  v_shift int := 0;
begin
  select * into v_dec from public.evento_decisao where id = p_evento_decisao_id;
  if not found or v_dec.decisao_template_id is null then
    return;
  end if;

  select empresa_id, date into v_emp, v_data
  from public.events where id = v_dec.event_id;

  if v_data is not null
     and v_dec.offset_ideal_dias is not null
     and v_dec.prazo_previsto is not null then
    v_shift := v_dec.prazo_previsto - (v_data - v_dec.offset_ideal_dias);
  end if;

  insert into public.tasks (
    event_id, empresa_id, title, status, category, priority,
    responsavel, evento_decisao_id, metodo_tarefa_id, vinculo_modulo, due_date
  )
  select
    v_dec.event_id, v_emp, mt.titulo, 'pendente', 'geral', 'media',
    mt.responsavel, v_dec.id, mt.id, mt.vinculo_modulo,
    case
      when v_data is null or mt.offset_ideal_dias is null then null
      when mt.offset_ideal_dias < 0 then v_data - mt.offset_ideal_dias  -- depois do evento
      else greatest(
             current_date,
             least(v_data, (v_data - mt.offset_ideal_dias) + v_shift)
           )
    end
  from public.metodo_tarefa mt
  where mt.decisao_id = v_dec.decisao_template_id
  on conflict (evento_decisao_id, metodo_tarefa_id)
    where evento_decisao_id is not null and metodo_tarefa_id is not null
    do nothing;
end $$;

-- As já geradas com offset negativo (qualquer tipo) vão para depois da data.
update public.tasks t
   set due_date = e.date - mt.offset_ideal_dias
  from public.metodo_tarefa mt, public.events e
 where mt.id = t.metodo_tarefa_id
   and e.id = t.event_id
   and mt.offset_ideal_dias < 0
   and e.date is not null
   and t.status <> 'concluido'
   and t.due_date is distinct from (e.date - mt.offset_ideal_dias);

-- ------------------------------------------------------------
-- 3) O motor de prazos ignora decisão de objetivo desligado
-- ------------------------------------------------------------
-- Corpo da 070 com o mesmo filtro que a 141 pôs no portal: decisão
-- pendente de objetivo inativo fica sem prazo e fora da contagem. Quando
-- o cenário liga o objetivo, aplicar_arquetipos_evento chama isto de
-- novo e ela ganha prazo.
create or replace function public.redistribuir_decisoes_evento(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje   date := current_date;
  v_data   date;
  v_dias   int;
  v_meses  int;
  v_total  int;               -- pendentes aplicáveis (a distribuir)
  v_cap    int;               -- teto de densidade por mês
  v_bucket int;               -- dias por mês/janela
  v_counts int[];             -- ocupação por mês (1-indexed)
  v_floor  int := 0;          -- piso de dependência (mês mínimo permitido)
  v_maxm   int := 0;          -- maior mês já alocado
  v_prev_prio int;            -- prioridade da decisão anterior
  v_tm     int;               -- mês ideal derivado do offset
  v_m      int;               -- mês final alocado
  v_comprimido boolean;
  v_prazo  date;
  r        record;
begin
  select date into v_data from public.events where id = p_event_id;

  -- nao_se_aplica não ocupa espaço: sem prazo.
  update public.evento_decisao
    set prazo_previsto = null
    where event_id = p_event_id and estado = 'nao_se_aplica';

  -- Objetivo desligado: as decisões dele não ocupam espaço nem vencem.
  update public.evento_decisao ed
     set prazo_previsto = null
    from public.evento_objetivo eo
   where eo.id = ed.evento_objetivo_id
     and ed.event_id = p_event_id
     and ed.estado = 'pendente'
     and not eo.ativo;

  -- Sem data do evento não há linha do tempo para distribuir.
  if v_data is null then
    update public.evento_decisao set prazo_previsto = null
      where event_id = p_event_id and estado = 'pendente';
    return;
  end if;

  v_dias := v_data - v_hoje;

  -- Evento hoje/no passado: tudo é para agora (a tela sinaliza atraso).
  if v_dias <= 0 then
    update public.evento_decisao ed set prazo_previsto = v_hoje
      from public.evento_objetivo eo
     where eo.id = ed.evento_objetivo_id and eo.ativo
       and ed.event_id = p_event_id and ed.estado = 'pendente';
    return;
  end if;

  -- Se o MÉTODO CABE (nenhum offset pendente estoura o prazo), respeita a
  -- data ideal do método — sem comprimir. É o caso dos ~12 meses.
  if not exists (
    select 1 from public.evento_decisao ed
    join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id and eo.ativo
    where ed.event_id = p_event_id and ed.estado = 'pendente'
      and ed.offset_ideal_dias is not null and ed.offset_ideal_dias > v_dias
  ) then
    update public.evento_decisao ed
      set prazo_previsto = case
        when ed.offset_ideal_dias is null then v_data
        else v_data - ed.offset_ideal_dias
      end
      from public.evento_objetivo eo
     where eo.id = ed.evento_objetivo_id and eo.ativo
       and ed.event_id = p_event_id and ed.estado = 'pendente';
    return;
  end if;

  -- ---- Compressão ----
  select count(*) into v_total
    from public.evento_decisao ed
    join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id and eo.ativo
    where ed.event_id = p_event_id and ed.estado = 'pendente';
  if v_total = 0 then return; end if;

  v_meses  := greatest(1, ceil(v_dias::numeric / 30)::int);
  v_cap    := greatest(1, ceil(v_total::numeric / v_meses)::int);
  v_bucket := greatest(1, floor(v_dias::numeric / v_meses)::int);
  v_counts := array_fill(0, array[v_meses]);

  -- Percorre as PENDENTES em ordem de prioridade (estruturante primeiro),
  -- desempatando por ordem do objetivo e da decisão — a mesma cadeia de
  -- desbloqueio do modelo.
  for r in
    select ed.id, ed.offset_ideal_dias as off, ed.prioridade as prio
    from public.evento_decisao ed
    join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
    where ed.event_id = p_event_id and ed.estado = 'pendente' and eo.ativo
    order by ed.prioridade desc, eo.ordem asc, ed.ordem asc
  loop
    -- Piso de dependência: ao descer de patamar de prioridade, nada pode
    -- cair antes das de prioridade maior já alocadas.
    if v_prev_prio is not null and r.prio < v_prev_prio then
      v_floor := v_maxm;
    end if;

    -- Mês ideal pelo offset (quando cabe); senão, o mais cedo possível.
    if r.off is not null and r.off <= v_dias then
      v_tm := floor((v_dias - r.off)::numeric / v_bucket)::int;
      if v_tm < 0 then v_tm := 0; end if;
      if v_tm > v_meses - 1 then v_tm := v_meses - 1; end if;
    else
      v_tm := 0; -- offset não cabe → comprime para a frente
    end if;

    -- Respeita o piso de dependência.
    if v_tm < v_floor then v_tm := v_floor; end if;

    -- Primeiro mês >= v_tm com capacidade; o último mês absorve o excesso.
    v_m := v_tm;
    while v_m < v_meses - 1 and v_counts[v_m + 1] >= v_cap loop
      v_m := v_m + 1;
    end loop;
    v_counts[v_m + 1] := v_counts[v_m + 1] + 1;
    if v_m > v_maxm then v_maxm := v_m; end if;
    v_prev_prio := r.prio;

    -- Comprimido = não coube no offset, ou foi deslocado do mês ideal.
    v_comprimido := (r.off is null) or (r.off > v_dias)
                    or (v_m <> floor((v_dias - r.off)::numeric / v_bucket)::int);

    if not v_comprimido then
      v_prazo := v_data - r.off;             -- mantém a data do método
    else
      v_prazo := least(v_data, v_hoje + (v_m * v_bucket)); -- data do bucket
    end if;

    update public.evento_decisao set prazo_previsto = v_prazo where id = r.id;
  end loop;
end $$;

-- Os eventos vivos com objetivo desligado passam pelo motor novo uma vez
-- (tira o prazo das decisões de objetivo inativo, recalcula o resto).
do $$
declare ev record;
begin
  for ev in
    select distinct e.id
    from public.events e
    join public.evento_objetivo eo on eo.event_id = e.id and not eo.ativo
    join public.evento_decisao ed on ed.evento_objetivo_id = eo.id and ed.estado = 'pendente'
    where e.status in ('orcamento', 'confirmado')
  loop
    perform public.redistribuir_decisoes_evento(ev.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4) Corporativo em orçamento com data passada: o mapa não vence hoje
-- ------------------------------------------------------------
update public.evento_decisao ed
   set estado = 'nao_se_aplica', prazo_previsto = null
  from public.events e
 where e.id = ed.event_id
   and e.type = 'corporativo'
   and e.status = 'orcamento'
   and e.date < current_date
   and ed.estado = 'pendente';

-- ------------------------------------------------------------
-- 5) Roteiro: encerramento e desmontagem depois da entrega de prêmios
-- ------------------------------------------------------------
-- Guardado pelo valor semeado: o que a proprietária já ajustou fica.
update public.metodo_roteiro_item
   set offset_min = 270
 where tipo_evento = 'corporativo' and codigo = 'encerramento' and offset_min = 225;

update public.metodo_roteiro_item
   set offset_min = 285
 where tipo_evento = 'corporativo' and codigo = 'desmontagem' and offset_min = 240;

-- ------------------------------------------------------------
-- 6) Porte pequeno: o mínimo acompanha o ideal
-- ------------------------------------------------------------
insert into public.metodo_arquetipo_delta
  (arquetipo_id, empresa_id, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
select a.id, a.empresa_id, 'decisao', v.cod, 'set_offset_min', v.val, v.ord
from (values
  ('corp_orcamento_definir', 60::numeric, 11),
  ('corp_briefing',          60,          12),
  ('corp_programa_definir',  30,          13)
) as v(cod, val, ord)
join public.metodo_arquetipo a
  on a.tipo_evento = 'corporativo' and a.eixo = 'escala' and a.codigo = 'ate_100'
where not exists (
  select 1 from public.metodo_arquetipo_delta x
  where x.arquetipo_id = a.id and x.alvo_tipo = 'decisao'
    and x.alvo_codigo = v.cod and x.operacao = 'set_offset_min'
);

-- ------------------------------------------------------------
-- 7) Premiação tem verba (troféus e placas)
-- ------------------------------------------------------------
update public.metodo_objetivo
   set faixa_pct_min = 2, faixa_pct_ideal = 4, faixa_pct_max = 8
 where tipo_evento = 'corporativo' and codigo = 'premiacao'
   and faixa_pct_ideal is null;

update public.evento_objetivo eo
   set faixa_pct_min = o.faixa_pct_min,
       faixa_pct_ideal = o.faixa_pct_ideal,
       faixa_pct_max = o.faixa_pct_max
  from public.metodo_objetivo o
 where o.id = eo.objetivo_template_id
   and o.tipo_evento = 'corporativo' and o.codigo = 'premiacao'
   and eo.faixa_pct_ideal is null
   and o.faixa_pct_ideal is not null;

-- ------------------------------------------------------------
-- 8) MC e materiais também contratam: as 4 tarefas de contrato
-- ------------------------------------------------------------
insert into public.metodo_tarefa
  (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
select d.id, d.empresa_id, t.titulo, 'cerimonialista', d.offset_ideal_dias, t.ord, t.vinc
from public.metodo_decisao d
join public.metodo_objetivo o
  on o.id = d.objetivo_id and o.tipo_evento = 'corporativo'
cross join (values
  ('Solicitar e receber o contrato',               1, null::text),
  ('Analisar as cláusulas do contrato',            2, null),
  ('Assinar e arquivar o contrato',                3, null),
  ('Registrar o valor no financeiro (1ª parcela)', 4, 'financeiro')
) as t(titulo, ord, vinc)
where d.codigo in ('corp_mc_definir', 'corp_materiais_definir')
  and not exists (
    select 1 from public.metodo_tarefa mt
    where mt.decisao_id = d.id and mt.titulo = t.titulo
  );

-- ------------------------------------------------------------
-- 9) Régua: sai o que pede número que o sistema já conta
-- ------------------------------------------------------------
-- formato (ninguém lê; "transmissão" já pergunta o que importa),
-- participantes_confirmados (publico_do_evento já conta), internet_ok
-- (pergunta de convenção híbrida), presentes (a presença é o toque na
-- lista — coluna presente_em). Só instâncias VAZIAS e sem escrita da
-- cliente por trás; se alguém já preencheu, fica.
delete from public.evento_campo_valor v
 using public.metodo_campo c, public.metodo_decisao d
 where c.id = v.campo_template_id
   and d.id = c.decisao_id
   and (d.codigo, c.codigo) in (
     ('corp_briefing', 'formato'),
     ('corp_alimentacao_confirmar_numero', 'participantes_confirmados'),
     ('corp_espaco_vt', 'internet_ok'),
     ('corp_pos_fechar', 'presentes')
   )
   and v.valor_texto is null and v.valor_numero is null and v.valor_bool is null
   and v.valor_data is null and v.valor_opcao is null and v.valor_supplier_id is null
   and v.valor_hora is null
   and not exists (
     select 1 from public.evento_campo_escrita w where w.campo_id = v.id
   );

delete from public.metodo_campo c
 using public.metodo_decisao d
 where d.id = c.decisao_id
   and (d.codigo, c.codigo) in (
     ('corp_briefing', 'formato'),
     ('corp_alimentacao_confirmar_numero', 'participantes_confirmados'),
     ('corp_espaco_vt', 'internet_ok'),
     ('corp_pos_fechar', 'presentes')
   );

-- Recurso "microfones fixo 3" duplicava o campo do contrato de AV (que é
-- a verdade) e ninguém compra microfone por pessoa.
delete from public.evento_recurso r
 using public.metodo_recurso mr, public.metodo_objetivo o
 where mr.id = r.recurso_template_id
   and o.id = mr.objetivo_id
   and o.tipo_evento = 'corporativo'
   and mr.codigo = 'microfones'
   and r.comprado is null and r.entrada is null and r.sobra is null
   and r.custo_unitario is null;

delete from public.metodo_recurso mr
 using public.metodo_objetivo o
 where o.id = mr.objetivo_id
   and o.tipo_evento = 'corporativo'
   and mr.codigo = 'microfones';

-- ------------------------------------------------------------
-- 10) Copy
-- ------------------------------------------------------------
-- O título enumerava o próprio formulário; a unidade repetia a instrução.
update public.metodo_decisao
   set titulo = 'Fechar o briefing do evento'
 where codigo = 'corp_briefing' and titulo like 'Fechar o briefing:%';

update public.evento_decisao ed
   set titulo = 'Fechar o briefing do evento'
  from public.metodo_decisao d
 where d.id = ed.decisao_template_id
   and d.codigo = 'corp_briefing'
   and ed.titulo like 'Fechar o briefing:%';

update public.metodo_campo c
   set unidade = null
  from public.metodo_decisao d
 where d.id = c.decisao_id and d.codigo = 'corp_pos_fechar'
   and c.codigo = 'nps' and c.unidade = 'de 0 a 10';

update public.evento_campo_valor
   set unidade = null
 where codigo = 'nps' and unidade = 'de 0 a 10';

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'o espelho da verba trata o campo vazio no INSERT' as item,
       (select prosrc like '%tg_op = ''INSERT''%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'espelhar_verba_evento') as ok
union all
select 'nenhum evento tem verba na coluna e campo vazio',
       not exists (
         select 1 from public.events e
         join public.evento_campo_valor v on v.event_id = e.id and v.codigo = 'verba_total'
         where e.verba_total is not null and v.valor_numero is null
       )
union all
select 'tarefa com offset negativo vence depois do evento',
       (select prosrc like '%offset_ideal_dias < 0%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'gerar_tarefas_da_decisao')
       and not exists (
         select 1 from public.tasks t
         join public.metodo_tarefa mt on mt.id = t.metodo_tarefa_id
         join public.events e on e.id = t.event_id
         where mt.offset_ideal_dias < 0 and e.date is not null
           and t.status <> 'concluido' and t.due_date <= e.date
       )
union all
select 'o motor de prazos ignora objetivo desligado',
       (select prosrc like '%eo.ativo%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'redistribuir_decisoes_evento')
       and not exists (
         select 1 from public.evento_decisao ed
         join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
         join public.events e on e.id = ed.event_id
         where e.status in ('orcamento', 'confirmado')
           and ed.estado = 'pendente' and not eo.ativo
           and ed.prazo_previsto is not null
       )
union all
select 'corporativo em orçamento com data passada não tem decisão pendente',
       not exists (
         select 1 from public.evento_decisao ed
         join public.events e on e.id = ed.event_id
         where e.type = 'corporativo' and e.status = 'orcamento'
           and e.date < current_date and ed.estado = 'pendente'
       )
union all
select 'encerramento e desmontagem vêm depois da entrega de prêmios',
       not exists (
         select 1 from public.empresas em
         where not exists (select 1 from public.metodo_roteiro_item r
                           where r.empresa_id = em.id and r.tipo_evento = 'corporativo'
                             and r.codigo = 'encerramento' and r.offset_min >= 270)
            or not exists (select 1 from public.metodo_roteiro_item r
                           where r.empresa_id = em.id and r.tipo_evento = 'corporativo'
                             and r.codigo = 'desmontagem' and r.offset_min >= 285)
       )
union all
select 'porte pequeno tem os 3 mínimos',
       not exists (
         select 1 from public.metodo_arquetipo a
         where a.tipo_evento = 'corporativo' and a.eixo = 'escala' and a.codigo = 'ate_100'
           and (select count(*) from public.metodo_arquetipo_delta x
                where x.arquetipo_id = a.id and x.operacao = 'set_offset_min') < 3
       )
union all
select 'premiação tem faixa de verba (template e instâncias)',
       not exists (
         select 1 from public.metodo_objetivo o
         where o.tipo_evento = 'corporativo' and o.codigo = 'premiacao'
           and o.faixa_pct_ideal is distinct from 4
       )
       and not exists (
         select 1 from public.evento_objetivo eo
         join public.metodo_objetivo o on o.id = eo.objetivo_template_id
         where o.tipo_evento = 'corporativo' and o.codigo = 'premiacao'
           and eo.faixa_pct_ideal is null
       )
union all
select 'MC e materiais têm as 4 tarefas de contrato',
       not exists (
         select 1 from public.metodo_decisao d
         where d.codigo in ('corp_mc_definir', 'corp_materiais_definir')
           and (select count(*) from public.metodo_tarefa t where t.decisao_id = d.id) < 4
       )
union all
select 'os 4 campos de ruído saíram do método',
       not exists (
         select 1 from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         where (d.codigo, c.codigo) in (
           ('corp_briefing', 'formato'),
           ('corp_alimentacao_confirmar_numero', 'participantes_confirmados'),
           ('corp_espaco_vt', 'internet_ok'),
           ('corp_pos_fechar', 'presentes')
         )
       )
union all
select 'o recurso microfones saiu do método corporativo',
       not exists (
         select 1 from public.metodo_recurso mr
         join public.metodo_objetivo o on o.id = mr.objetivo_id
         where o.tipo_evento = 'corporativo' and mr.codigo = 'microfones'
       )
union all
select 'copy: título do briefing e unidade da nota',
       not exists (
         select 1 from public.metodo_decisao d
         where d.codigo = 'corp_briefing' and d.titulo like 'Fechar o briefing:%'
       )
       and not exists (
         select 1 from public.metodo_campo c
         where c.codigo = 'nps' and c.unidade = 'de 0 a 10'
       )
union all
select 'todo arquétipo de escala/cenário cabe no CHECK de events (todos os tipos)',
       not exists (
         select 1 from public.metodo_arquetipo a
         where a.eixo in ('escala', 'cenario')
           and not exists (
             select 1 from pg_constraint con
             where con.conrelid = 'public.events'::regclass
               and con.conname = 'events_' || a.eixo || '_check'
               and pg_get_constraintdef(con.oid) like '%''' || a.codigo || '''%'
           )
       )
union all
select 'toda opção dos campos escala/cenário existe como arquétipo (sem esconder campo sem opções)',
       not exists (
         select 1
         from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         join public.metodo_objetivo o on o.id = d.objetivo_id
         left join lateral unnest(c.opcoes) as op(token) on true
         where c.codigo in ('escala', 'cenario')
           and (op.token is null
                or not exists (
                  select 1 from public.metodo_arquetipo a
                  where a.empresa_id = o.empresa_id and a.tipo_evento = o.tipo_evento
                    and a.eixo = c.codigo and a.codigo = op.token))
       )
union all
select 'as funções reescritas existem UMA vez (sem overload)',
       not exists (
         select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('espelhar_verba_evento', 'gerar_tarefas_da_decisao',
                             'redistribuir_decisoes_evento')
         group by p.proname having count(*) <> 1
       );
