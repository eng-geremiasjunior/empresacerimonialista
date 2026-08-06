-- 070 — Motor de compressão do método por prazo (etapa 4D)
--
-- Fecha o modelo Planejamento/Organização. O método é calibrado para ~12
-- meses (offset_ideal por decisão). Um casal que contrata com 6 meses, 3
-- meses ou 93 dias não tem espaço para os itens de offset alto — eles
-- cairiam no passado. A 4D redistribui preservando a INTELIGÊNCIA do
-- método: as decisões estruturantes primeiro, sem quebrar dependência.
--
-- MODELAGEM (o schema não tem campo de dependência explícito):
--   * dependência = PRIORIDADE. Maior prioridade = mais estruturante = o
--     pré-requisito (fechar local/buffet antes de orçar decoração). A 4A já
--     separou prioridade de offset_ideal justamente para isto.
--   * a data recalculada de cada decisão pendente vai em prazo_previsto.
--     decidida/nao_se_aplica não são tocadas (nao_se_aplica sai da conta).
--
-- REGRA (determinística, sem IA):
--   * Se o método CABE (todo offset pendente <= dias disponíveis), usa a
--     data ideal (data_evento - offset). É o caso dos ~12 meses: ~1 por mês
--     seguindo o método.
--   * Se NÃO cabe, comprime: densidade = decisões ÷ meses; distribui em
--     ordem de prioridade (estruturante primeiro), teto de densidade por
--     mês, empurrando as menos críticas para frente. offset é ignorado
--     quando não cabe — a prioridade manda a ordem.
--   * DEPENDÊNCIA > DENSIDADE: nunca alocar uma decisão antes de uma de
--     prioridade maior, mesmo que estoure a densidade-alvo do mês (piso
--     monotônico ao descer de patamar de prioridade).

-- ------------------------------------------------------------
-- 1) Onde guardar a data recalculada
-- ------------------------------------------------------------
alter table public.evento_decisao
  add column if not exists prazo_previsto date;

comment on column public.evento_decisao.prazo_previsto is
  'Data recalculada pela compressão (4D). Só para decisões pendentes; '
  'null em nao_se_aplica. decidida mantém o que tiver.';

-- ------------------------------------------------------------
-- 2) Motor de redistribuição
-- ------------------------------------------------------------
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

  -- Sem data do evento não há linha do tempo para distribuir.
  if v_data is null then
    update public.evento_decisao set prazo_previsto = null
      where event_id = p_event_id and estado = 'pendente';
    return;
  end if;

  v_dias := v_data - v_hoje;

  -- Evento hoje/no passado: tudo é para agora (a tela sinaliza atraso).
  if v_dias <= 0 then
    update public.evento_decisao set prazo_previsto = v_hoje
      where event_id = p_event_id and estado = 'pendente';
    return;
  end if;

  -- Se o MÉTODO CABE (nenhum offset pendente estoura o prazo), respeita a
  -- data ideal do método — sem comprimir. É o caso dos ~12 meses.
  if not exists (
    select 1 from public.evento_decisao
    where event_id = p_event_id and estado = 'pendente'
      and offset_ideal_dias is not null and offset_ideal_dias > v_dias
  ) then
    update public.evento_decisao
      set prazo_previsto = case
        when offset_ideal_dias is null then v_data
        else v_data - offset_ideal_dias
      end
      where event_id = p_event_id and estado = 'pendente';
    return;
  end if;

  -- ---- Compressão ----
  select count(*) into v_total
    from public.evento_decisao
    where event_id = p_event_id and estado = 'pendente';
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
    where ed.event_id = p_event_id and ed.estado = 'pendente'
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

-- ------------------------------------------------------------
-- 3) Quando recalcular
-- ------------------------------------------------------------
-- (a) Ao criar o evento: no fim da instanciação do método, quando as
--     decisões já existem e events.date já está gravado.
create or replace function public.instanciar_metodo_evento(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_tipo    text;
begin
  select empresa_id, type into v_empresa, v_tipo
  from public.events where id = p_event_id;

  if v_empresa is null or v_tipo is null then
    return;
  end if;

  if exists (select 1 from public.evento_objetivo where event_id = p_event_id) then
    return;
  end if;

  insert into public.evento_objetivo
    (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem)
  select p_event_id, v_empresa, o.id, o.nome, o.descricao, o.ordem
  from public.metodo_objetivo o
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  insert into public.evento_decisao
    (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
     titulo, descricao, responsavel, offset_ideal_dias, prioridade, ordem)
  select eo.id, p_event_id, v_empresa, d.id,
         d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias, d.prioridade, d.ordem
  from public.metodo_decisao d
  join public.metodo_objetivo o on o.id = d.objetivo_id
  join public.evento_objetivo eo
    on eo.event_id = p_event_id and eo.objetivo_template_id = o.id
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  insert into public.evento_guia
    (evento_decisao_id, event_id, empresa_id, texto, ordem)
  select ed.id, p_event_id, v_empresa, g.texto, g.ordem
  from public.metodo_guia g
  join public.evento_decisao ed
    on ed.event_id = p_event_id and ed.decisao_template_id = g.decisao_id;

  -- 4D: distribui as decisões no prazo real do casal já na criação.
  perform public.redistribuir_decisoes_evento(p_event_id);
end $$;

-- (b) Se a DATA do evento mudar: redistribui só as pendentes (a função já
--     ignora decidida/nao_se_aplica). Mesma regra do recálculo em cascata.
create or replace function public.trg_redistribuir_por_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.date is distinct from old.date then
    perform public.redistribuir_decisoes_evento(new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_redistribuir_por_data on public.events;
create trigger trg_redistribuir_por_data
  after update of date on public.events
  for each row execute function public.trg_redistribuir_por_data();

-- (c) Ao alternar nao_se_aplica (libera/ocupa espaço), redistribui as
--     pendentes. Atualiza só prazo_previsto — não refaz o gatilho de estado
--     (que é AFTER UPDATE OF estado), sem risco de recursão.
create or replace function public.trg_redistribuir_por_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.redistribuir_decisoes_evento(new.event_id);
  return new;
end $$;

drop trigger if exists trg_redistribuir_por_estado on public.evento_decisao;
create trigger trg_redistribuir_por_estado
  after update of estado on public.evento_decisao
  for each row execute function public.trg_redistribuir_por_estado();

-- ------------------------------------------------------------
-- 4) Backfill dos eventos já existentes
-- ------------------------------------------------------------
do $$
declare e record;
begin
  for e in select id from public.events loop
    perform public.redistribuir_decisoes_evento(e.id);
  end loop;
end $$;
