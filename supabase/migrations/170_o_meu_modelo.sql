-- ============================================================
-- 170 — O MEU MODELO
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Pedido do dono (23/09/2026), vindo da revisão contra a Aline Campos
-- (450 casamentos, "estratégia e método próprios"): quem já trabalha com
-- método não migra para um sistema que impõe o dele. O Playbook já é da
-- empresa desde a 064 (metodo_*), e cada evento nasce de uma cópia dele
-- (instanciar_metodo_evento, versão da 132). Faltava o caminho de volta:
-- do evento para o modelo.
--
-- O QUE VAI PARA O MODELO — só o que ELA fez no evento:
--   * o que ela criou: assunto, decisão e campo próprios (os que o
--     Planejamento cria com o id do modelo nulo; campo próprio tem código
--     proprio_*);
--   * o que ela tirou: decisão do modelo marcada "não se aplica" neste
--     evento, SE ela escolher tirar também do modelo.
--
-- O QUE NÃO VAI, de propósito: prazos, prioridade, faixas de verba e
-- liga/desliga de assunto. São DERIVADOS — aplicar_arquetipos_evento
-- (083) refaz tudo isso a partir do modelo + delta de escala/cenário.
-- Copiar o valor do evento embutiria o delta no modelo, e o próximo
-- evento receberia o delta duas vezes.
--
-- TIRAR NÃO APAGA. A decisão fica no modelo com fora_do_modelo = true e
-- nasce nos próximos eventos como "não se aplica" — visível e reativável,
-- a mesma regra da 064 ("não se aplica é ESTADO, não delete"). O código
-- dela continua existindo para a curadoria do portal, as tarefas e o
-- roteiro que dependem dele.
--
-- O QUE BATE PELO NOME NÃO DUPLICA. Um assunto ou decisão sem vínculo
-- cujo nome já existe no modelo é RELIGADO, não inserido. Isso protege
-- os eventos que ficaram órfãos na re-semeadura de 26/08 (o cascade da
-- 084 anula o vínculo) e faz salvar duas vezes — ou de dois eventos
-- com a mesma decisão própria — dar uma linha só.
--
-- ⚠ PARA QUEM FOR RE-SEMEAR UM MÉTODO DEPOIS DESTA MIGRAÇÃO: as sementes
-- da 084 (casamento) e da 122 (debutante) APAGAM o método do tipo, e o
-- cascade leva junto as linhas `proprio = true` — o modelo dela some em
-- silêncio. Qualquer re-seed daqui em diante tem de preservar essas
-- linhas (e as marcas fora_do_modelo), ou ser aditivo como a 141.
--
-- Eventos que já existem não mudam: o modelo vale para os próximos.

-- ------------------------------------------------------------
-- 1) As marcas no modelo
-- ------------------------------------------------------------
alter table public.metodo_objetivo add column if not exists proprio boolean not null default false;
alter table public.metodo_decisao  add column if not exists proprio boolean not null default false;
alter table public.metodo_decisao  add column if not exists fora_do_modelo boolean not null default false;
alter table public.metodo_campo    add column if not exists proprio boolean not null default false;

-- ------------------------------------------------------------
-- 2) Quando o modelo foi salvo, e de qual evento
-- ------------------------------------------------------------
create table if not exists public.metodo_modelo_salvo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo_evento text not null,
  event_id    uuid references public.events (id) on delete set null,
  salvo_por   uuid references auth.users (id) on delete set null,
  salvo_em    timestamptz not null default now(),
  resumo      jsonb not null default '{}'::jsonb
);

create index if not exists idx_metodo_modelo_salvo
  on public.metodo_modelo_salvo (empresa_id, tipo_evento, salvo_em desc);

alter table public.metodo_modelo_salvo enable row level security;

-- leitura para a empresa; escrita só pela função abaixo (sem policy)
drop policy if exists metodo_modelo_salvo_select on public.metodo_modelo_salvo;
create policy metodo_modelo_salvo_select on public.metodo_modelo_salvo
  for select using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

-- ------------------------------------------------------------
-- 3) O evento novo nasce com o modelo — e com o que ela tirou dele
-- ------------------------------------------------------------
-- Corpo da 132 inteiro. Uma mudança só: a decisão fora_do_modelo nasce
-- 'nao_se_aplica'. Os gatilhos de estado (067 e 070) são AFTER UPDATE
-- OF estado — nascer assim no INSERT não gera nem apaga tarefa.
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
    (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem,
     ativo, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_event_id, v_empresa, o.id, o.nome, o.descricao, o.ordem,
         o.ativo_padrao, o.faixa_pct_min, o.faixa_pct_ideal, o.faixa_pct_max
  from public.metodo_objetivo o
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  insert into public.evento_decisao
    (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
     titulo, descricao, responsavel, offset_ideal_dias,
     offset_min_dias, offset_max_dias, prioridade, ordem, estado)
  select eo.id, p_event_id, v_empresa, d.id,
         d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias,
         d.offset_min_dias, d.offset_max_dias, d.prioridade, d.ordem,
         case when d.fora_do_modelo then 'nao_se_aplica' else 'pendente' end
  from public.metodo_decisao d
  join public.metodo_objetivo o on o.id = d.objetivo_id
  join public.evento_objetivo eo
    on eo.event_id = p_event_id and eo.objetivo_template_id = o.id
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  -- Campos tipados nascem vazios: o formulário É o roteiro de conversa.
  insert into public.evento_campo_valor
    (evento_decisao_id, event_id, empresa_id, campo_template_id,
     codigo, label, tipo, opcoes, unidade, ordem)
  select ed.id, p_event_id, v_empresa, c.id,
         c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem
  from public.metodo_campo c
  join public.evento_decisao ed
    on ed.event_id = p_event_id and ed.decisao_template_id = c.decisao_id;

  -- Aplica deltas de arquétipo e redistribui prazos.
  perform public.aplicar_arquetipos_evento(p_event_id);

  -- E os recursos: o que se conta neste evento, já dimensionado.
  perform public.instanciar_recursos_evento(p_event_id);
end $$;

-- ------------------------------------------------------------
-- 4) A prévia: o que entra, o que pode sair, o que volta
-- ------------------------------------------------------------
-- Só leitura, com a RLS de quem chama (security invoker): quem não vê o
-- evento recebe nulo.
create or replace function public.previa_do_modelo(p_event_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_emp  uuid;
  v_tipo text;
begin
  select empresa_id, type into v_emp, v_tipo
  from public.events where id = p_event_id;
  if v_emp is null then
    return null;
  end if;

  return jsonb_build_object(
    'tipo', v_tipo,
    'pode_salvar', exists (
      select 1 from public.meu_cargo() mc
      where mc.empresa_id = v_emp and mc.cargo = 'proprietaria'
    ),
    -- assuntos próprios cujo nome o modelo ainda não tem
    'objetivos', coalesce((
      select jsonb_agg(eo.nome order by eo.ordem)
      from public.evento_objetivo eo
      where eo.event_id = p_event_id
        and eo.objetivo_template_id is null
        and not exists (
          select 1 from public.metodo_objetivo mo
          where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
            and lower(trim(mo.nome)) = lower(trim(eo.nome))
        )
    ), '[]'::jsonb),
    -- decisões próprias cujo título o assunto do modelo ainda não tem
    'decisoes', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', ed.titulo, 'objetivo', eo.nome)
                       order by eo.ordem, ed.ordem)
      from public.evento_decisao ed
      join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
      where ed.event_id = p_event_id
        and ed.decisao_template_id is null
        and not exists (
          select 1
          from public.metodo_decisao md
          join public.metodo_objetivo mo on mo.id = md.objetivo_id
          where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
            and (mo.id = eo.objetivo_template_id
                 or (eo.objetivo_template_id is null
                     and lower(trim(mo.nome)) = lower(trim(eo.nome))))
            and lower(trim(md.titulo)) = lower(trim(ed.titulo))
        )
    ), '[]'::jsonb),
    -- campos próprios (proprio_*) que a decisão do modelo ainda não tem
    'campos', coalesce((
      select jsonb_agg(jsonb_build_object('label', c.label, 'decisao', ed.titulo)
                       order by ed.ordem, c.ordem)
      from public.evento_campo_valor c
      join public.evento_decisao ed on ed.id = c.evento_decisao_id
      where c.event_id = p_event_id
        and c.campo_template_id is null
        and c.codigo like 'proprio\_%'
        and (ed.decisao_template_id is null
             or not exists (
               select 1 from public.metodo_campo mc
               where mc.decisao_id = ed.decisao_template_id and mc.codigo = c.codigo
             ))
    ), '[]'::jsonb),
    -- decisões do modelo que ela marcou "não se aplica" aqui
    'podem_sair', coalesce((
      select jsonb_agg(jsonb_build_object('id', ed.id, 'titulo', ed.titulo, 'objetivo', eo.nome)
                       order by eo.ordem, ed.ordem)
      from public.evento_decisao ed
      join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
      join public.metodo_decisao md on md.id = ed.decisao_template_id
      where ed.event_id = p_event_id
        and ed.estado = 'nao_se_aplica'
        and not md.fora_do_modelo
    ), '[]'::jsonb),
    -- decisões que estavam fora do modelo e ela usou neste evento
    'voltam', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', ed.titulo, 'objetivo', eo.nome)
                       order by eo.ordem, ed.ordem)
      from public.evento_decisao ed
      join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
      join public.metodo_decisao md on md.id = ed.decisao_template_id
      where ed.event_id = p_event_id
        and ed.estado <> 'nao_se_aplica'
        and md.fora_do_modelo
    ), '[]'::jsonb),
    'ultimo', (
      select jsonb_build_object(
        'salvo_em', s.salvo_em,
        'evento', coalesce(nullif(trim(e.name), ''), cl.name)
      )
      from public.metodo_modelo_salvo s
      left join public.events e on e.id = s.event_id
      left join public.clients cl on cl.id = e.client_id
      where s.empresa_id = v_emp and s.tipo_evento = v_tipo
      order by s.salvo_em desc
      limit 1
    )
  );
end $$;

revoke all on function public.previa_do_modelo(uuid) from public, anon;
grant execute on function public.previa_do_modelo(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) Salvar como meu modelo
-- ------------------------------------------------------------
-- SECURITY DEFINER porque escreve no modelo; a trava é a mesma da
-- política de escrita da 064: só a PROPRIETÁRIA da empresa do evento.
-- p_tirar: ids de evento_decisao ("não se aplica" aqui) que também saem
-- do modelo. O que ela reativou neste evento volta sozinho — a prévia
-- mostra isso antes.
create or replace function public.salvar_planejamento_como_modelo(
  p_event_id uuid,
  p_tirar    uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp     uuid;
  v_tipo    text;
  v_data    date;
  v_id      uuid;
  r         record;
  n_obj     int := 0;
  n_dec     int := 0;
  n_campo   int := 0;
  n_sai     int := 0;
  n_volta   int := 0;
begin
  select empresa_id, type, date into v_emp, v_tipo, v_data
  from public.events where id = p_event_id;

  if v_emp is null then
    raise exception 'Evento não encontrado.';
  end if;
  if not exists (
    select 1 from public.meu_cargo() mc
    where mc.empresa_id = v_emp and mc.cargo = 'proprietaria'
  ) then
    raise exception 'Só a proprietária da conta muda o modelo.';
  end if;

  -- 1) assuntos próprios: religa pelo nome ou cria
  for r in
    select eo.id, eo.nome, eo.descricao, eo.ordem
    from public.evento_objetivo eo
    where eo.event_id = p_event_id and eo.objetivo_template_id is null
    order by eo.ordem
  loop
    v_id := null;
    select mo.id into v_id
    from public.metodo_objetivo mo
    where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
      and lower(trim(mo.nome)) = lower(trim(r.nome))
    limit 1;

    if v_id is null then
      begin
        insert into public.metodo_objetivo
          (empresa_id, tipo_evento, codigo, nome, descricao, ordem, proprio)
        values
          (v_emp, v_tipo, 'meu_' || left(md5(r.id::text), 10), r.nome, r.descricao, r.ordem, true)
        on conflict (empresa_id, tipo_evento, codigo) do update
          set nome = excluded.nome, updated_at = now()
        returning id into v_id;
      exception when check_violation then
        raise exception 'Este tipo de evento ainda não tem modelo.';
      end;
      n_obj := n_obj + 1;
    end if;

    if not exists (
      select 1 from public.evento_objetivo x
      where x.event_id = p_event_id and x.objetivo_template_id = v_id
    ) then
      update public.evento_objetivo set objetivo_template_id = v_id where id = r.id;
    end if;
  end loop;

  -- 2) decisões próprias: religa pelo título dentro do assunto, ou cria.
  --    O prazo só vai se ela tiver um (decisão própria costuma não ter).
  for r in
    select ed.id, ed.titulo, ed.descricao, ed.responsavel, ed.prioridade,
           ed.ordem, ed.prazo_previsto, ed.evento_objetivo_id,
           eo.objetivo_template_id as mo_id
    from public.evento_decisao ed
    join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
    where ed.event_id = p_event_id
      and ed.decisao_template_id is null
      and eo.objetivo_template_id is not null
    order by eo.ordem, ed.ordem
  loop
    v_id := null;
    select md.id into v_id
    from public.metodo_decisao md
    where md.objetivo_id = r.mo_id
      and lower(trim(md.titulo)) = lower(trim(r.titulo))
    limit 1;

    if v_id is null then
      insert into public.metodo_decisao
        (objetivo_id, empresa_id, codigo, titulo, descricao, responsavel,
         offset_ideal_dias, prioridade, ordem, proprio)
      values
        (r.mo_id, v_emp, 'meu_' || left(md5(r.id::text), 10), r.titulo, r.descricao, r.responsavel,
         case when r.prazo_previsto is not null and v_data is not null
              then greatest(v_data - r.prazo_previsto, 0) end,
         r.prioridade, r.ordem, true)
      on conflict (empresa_id, codigo) do update
        set titulo = excluded.titulo, updated_at = now()
      returning id into v_id;
      n_dec := n_dec + 1;
    end if;

    if not exists (
      select 1 from public.evento_decisao x
      where x.evento_objetivo_id = r.evento_objetivo_id and x.decisao_template_id = v_id
    ) then
      update public.evento_decisao set decisao_template_id = v_id where id = r.id;
    end if;
  end loop;

  -- 3) campos próprios (proprio_*): o mesmo código na mesma decisão é o
  --    mesmo campo
  for r in
    select c.id, c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem,
           ed.decisao_template_id as md_id
    from public.evento_campo_valor c
    join public.evento_decisao ed on ed.id = c.evento_decisao_id
    where c.event_id = p_event_id
      and c.campo_template_id is null
      and c.codigo like 'proprio\_%'
      and ed.decisao_template_id is not null
  loop
    v_id := null;
    select mc.id into v_id
    from public.metodo_campo mc
    where mc.decisao_id = r.md_id and mc.codigo = r.codigo;

    if v_id is null then
      insert into public.metodo_campo
        (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem, proprio)
      values
        (r.md_id, v_emp, r.codigo, r.label, r.tipo, r.opcoes, r.unidade, r.ordem, true)
      returning id into v_id;
      n_campo := n_campo + 1;
    end if;

    update public.evento_campo_valor set campo_template_id = v_id where id = r.id;
  end loop;

  -- 4) o que ela tirou do modelo
  update public.metodo_decisao md
  set fora_do_modelo = true, updated_at = now()
  from public.evento_decisao ed
  where ed.id = any (coalesce(p_tirar, '{}'))
    and ed.event_id = p_event_id
    and ed.estado = 'nao_se_aplica'
    and md.id = ed.decisao_template_id
    and md.empresa_id = v_emp
    and not md.fora_do_modelo;
  get diagnostics n_sai = row_count;

  -- 5) o que estava fora e ela usou aqui volta
  update public.metodo_decisao md
  set fora_do_modelo = false, updated_at = now()
  from public.evento_decisao ed
  where ed.event_id = p_event_id
    and ed.estado <> 'nao_se_aplica'
    and md.id = ed.decisao_template_id
    and md.empresa_id = v_emp
    and md.fora_do_modelo;
  get diagnostics n_volta = row_count;

  insert into public.metodo_modelo_salvo (empresa_id, tipo_evento, event_id, salvo_por, resumo)
  values (
    v_emp, v_tipo, p_event_id, auth.uid(),
    jsonb_build_object('objetivos', n_obj, 'decisoes', n_dec, 'campos', n_campo,
                       'sairam', n_sai, 'voltaram', n_volta)
  );

  return jsonb_build_object('objetivos', n_obj, 'decisoes', n_dec, 'campos', n_campo,
                            'sairam', n_sai, 'voltaram', n_volta);
end $$;

revoke all on function public.salvar_planejamento_como_modelo(uuid, uuid[]) from public, anon;
grant execute on function public.salvar_planejamento_como_modelo(uuid, uuid[]) to authenticated;

-- ------------------------------------------------------------
-- 6) Conferência: cada linha tem de voltar true
-- ------------------------------------------------------------
select 'metodo_decisao tem proprio e fora_do_modelo' as verificacao,
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'metodo_decisao'
           and column_name in ('proprio', 'fora_do_modelo')) as aplicou
union all
select 'metodo_objetivo e metodo_campo têm proprio',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and column_name = 'proprio'
           and table_name in ('metodo_objetivo', 'metodo_campo'))
union all
select 'tabela metodo_modelo_salvo com RLS',
       coalesce((select relrowsecurity from pg_class
                  where oid = to_regclass('public.metodo_modelo_salvo')), false)
union all
select 'o evento novo nasce com o que saiu do modelo',
       pg_get_functiondef('public.instanciar_metodo_evento(uuid)'::regprocedure)
         like '%fora_do_modelo then ''nao_se_aplica''%'
union all
select 'a instanciação ainda aplica arquétipos e recursos',
       pg_get_functiondef('public.instanciar_metodo_evento(uuid)'::regprocedure)
         like '%aplicar_arquetipos_evento%instanciar_recursos_evento%'
union all
select 'anônimo não salva modelo',
       not has_function_privilege('anon', 'public.salvar_planejamento_como_modelo(uuid, uuid[])', 'execute')
union all
select 'anônimo não lê a prévia',
       not has_function_privilege('anon', 'public.previa_do_modelo(uuid)', 'execute')
union all
select 'quem está logado salva',
       has_function_privilege('authenticated', 'public.salvar_planejamento_como_modelo(uuid, uuid[])', 'execute');
