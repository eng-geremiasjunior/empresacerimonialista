-- ============================================================
-- Vela — Migração 112: o cronograma do dia nasce da âncora
-- ============================================================
-- Hoje o roteiro nasce inteiro "a definir", e o Modo Evento fica parado:
-- progresso, próxima atividade e detecção de atraso dependem todos de
-- horário. A parte mais forte do sistema fica invisível justamente no
-- dia em que ela mais precisa dela.
--
-- O cronograma não deriva das decisões do Planejamento — quase nenhuma
-- decisão tem relação com o relógio do dia. Ele deriva de uma ÂNCORA
-- mais DESLOCAMENTOS: a hora da cerimônia, que ela já preenche na
-- criação do evento, e o "quanto antes/depois" de cada item, que passa a
-- viver no Playbook da empresa. No instante em que ela digita a hora da
-- cerimônia, o roteiro inteiro nasce com horário.
--
-- Isso é ESTIMATIVA, e se declara como tal (origem_horario) em toda
-- superfície — inclusive no link do fornecedor. Depois o horário vai
-- ficando firme conforme as fases acontecem, e três regras não quebram:
--
--   1. Calculado NUNCA sobrescreve firme. Mudou a hora da cerimônia,
--      recalcula só o que ainda é estimativa.
--   2. A ORIGEM de cada horário fica registrada — cálculo, contrato do
--      espaço, fornecedor ou ela. No dia em que der problema, ela precisa
--      saber quem disse o quê.
--   3. O deslocamento fica guardado JUNTO do horário. Não é duplicar
--      dado: é guardar a regra que produziu o dado, e é o que permite
--      recalcular sem ela refazer nada na mão.
--
-- Precedência (vale também para as origens que ainda não existem):
--   manual   nunca é sobrescrito por ninguém;
--   espaco e fornecedor sobrescrevem calculado, e um ao outro pela ordem
--            em que chegam;
--   calculado só preenche o que já é calculado.
--
-- Precedente do próprio sistema: o Método já é âncora + deslocamento, em
-- DIAS sobre a data do evento (offset_ideal_dias, prazo_previsto). Aqui
-- é o mesmo desenho, em minutos sobre a hora da cerimônia.
--
-- Convergente: pode rodar quantas vezes for preciso.

begin;

-- ------------------------------------------------------------
-- 1) O item do roteiro passa a guardar a regra, não só o resultado
-- ------------------------------------------------------------
alter table public.roteiro_items
  add column if not exists offset_min int,
  add column if not exists origem_horario text;

comment on column public.roteiro_items.offset_min is
  'Minutos em relação à hora da cerimônia (events.time). Negativo = antes.';
comment on column public.roteiro_items.origem_horario is
  'Quem disse este horário: calculado | espaco | fornecedor | manual.';

alter table public.roteiro_items
  drop constraint if exists roteiro_items_origem_horario_check;
alter table public.roteiro_items
  add constraint roteiro_items_origem_horario_check
  check (
    origem_horario is null
    or origem_horario in ('calculado', 'espaco', 'fornecedor', 'manual')
  );

-- Backfill: todo horário que existe hoje foi digitado por ela (o
-- formulário do roteiro sempre exigiu horário), então é firme. Item sem
-- horário fica sem origem — não há regra nem dado a preservar.
update public.roteiro_items
set origem_horario = 'manual'
where time is not null and origem_horario is null;

-- ------------------------------------------------------------
-- 2) Os deslocamentos — configuração da empresa, por tipo de evento
-- ------------------------------------------------------------
-- Debutante tem valsa e troca de vestido: o relógio é outro. E cada
-- cerimonialista tem o ritmo dela, e vai querer ajustar depois de dois
-- casamentos. Por isso tabela (editável pela proprietária), e não
-- constante no código.
create table if not exists public.metodo_roteiro_item (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo_evento public.tipo_evento_catalogo not null,
  codigo      text not null,
  titulo      text not null,
  offset_min  int  not null,
  duracao_min int,
  -- chave de resposta do wizard ('hasDanceFloor'); null = sempre nasce
  condicao    text,
  ordem       int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (empresa_id, tipo_evento, codigo)
);

alter table public.metodo_roteiro_item enable row level security;

drop policy if exists metodo_roteiro_item_select on public.metodo_roteiro_item;
create policy metodo_roteiro_item_select on public.metodo_roteiro_item
  for select
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists metodo_roteiro_item_write on public.metodo_roteiro_item;
create policy metodo_roteiro_item_write on public.metodo_roteiro_item
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 3) SEED dos deslocamentos (ponto de partida; ela ajusta depois)
-- ------------------------------------------------------------
create or replace function public.semear_roteiro_padrao(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Casamento — âncora: a cerimônia (offset 0)
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'casamento', v.codigo, v.titulo, v.off, v.dur, v.cond, v.ordem
  from (values
    ('equipe_decoracao', 'Chegada da equipe/decoração',   -360, 240, null::text, 10),
    ('cerimonialista',   'Chegada do cerimonialista',     -300, null, null,      20),
    ('buffet',           'Chegada do buffet',             -240,  90, null,       30),
    ('cerimonia',        'Cerimônia',                        0,  60, null,       40),
    ('fotos',            'Fotos',                           60,  45, null,       50),
    ('entrada_noivos',   'Recepção/Entrada dos noivos',    105,  15, null,       60),
    ('jantar',           'Jantar',                         120,  90, null,       70),
    ('pista',            'Abertura da pista',              210, null, 'hasDanceFloor', 80),
    ('bolo',             'Corte do bolo',                  270, null, null,      90)
  ) as v(codigo, titulo, off, dur, cond, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'casamento' and m.codigo = v.codigo
  );

  -- Debutante — âncora: a entrada da aniversariante (offset 0)
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'debutante', v.codigo, v.titulo, v.off, v.dur, v.cond, v.ordem
  from (values
    ('equipe_decoracao', 'Chegada da equipe/decoração',   -360, 240, null::text, 10),
    ('buffet',           'Chegada do buffet',             -240,  90, null,       20),
    ('entrada',          'Entrada da aniversariante',        0,  15, null,       30),
    ('valsa',            'Valsa',                           15,  20, null,       40),
    ('troca_vestido',    'Troca de vestido',               120,  30, null,       50),
    ('velas',            'As 15 velas',                    150,  30, null,       60),
    ('homenagem_pais',   'Homenagem aos pais',             180,  20, null,       70),
    ('pista',            'Abertura da pista',              200, null, null,      80),
    ('cabine_fotos',     'Cabine de fotos',                200, null, 'cabineFotos', 90)
  ) as v(codigo, titulo, off, dur, cond, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'debutante' and m.codigo = v.codigo
  );
end;
$$;

-- ------------------------------------------------------------
-- 4) Recálculo — o coração da regra 1
-- ------------------------------------------------------------
-- Mudou a hora da cerimônia? Só o que ainda é estimativa se move. O que
-- ela digitou, o que o fornecedor confirmou e o que veio do contrato do
-- espaço ficam onde estão.
create or replace function public.recalcular_horarios_roteiro(p_event_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.roteiro_items ri
  set time = case
               when e.time is null then null
               else (e.time + make_interval(mins => ri.offset_min))::time
             end
  from public.events e
  where e.id = p_event_id
    and ri.event_id = p_event_id
    and ri.origem_horario = 'calculado'
    and ri.offset_min is not null;
$$;

revoke all on function public.recalcular_horarios_roteiro(uuid) from public, anon;
grant execute on function public.recalcular_horarios_roteiro(uuid) to authenticated;

create or replace function public.trg_recalcular_roteiro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalcular_horarios_roteiro(new.id);
  return new;
end $$;

-- Gatilho, e não chamada na action: cobre TODO caminho de escrita da
-- hora — a tela de edição, o wizard, e o que vier depois — sem depender
-- de alguém lembrar de chamar.
drop trigger if exists trg_recalcular_roteiro on public.events;
create trigger trg_recalcular_roteiro
  after update of time on public.events
  for each row
  when (new.time is distinct from old.time)
  execute function public.trg_recalcular_roteiro();

-- ------------------------------------------------------------
-- 5) Empresa nova nasce com os deslocamentos
-- ------------------------------------------------------------
-- Cópia da 111 com uma linha a mais. As anteriores ficam como estavam.
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
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_roteiro_padrao(new.id);
  return new;
end $$;

do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_roteiro_padrao(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6) A semeadura do roteiro passa a carregar o deslocamento
-- ------------------------------------------------------------
-- As duas funções abaixo são cópia fiel das versões vigentes (022 e
-- 052) com UM laço trocado cada. O resto do corpo não muda.

create or replace function public.criar_evento_completo(
  p_client_id        uuid,
  p_new_client_name  text,
  p_new_client_phone text,
  p_type             text,
  p_name             text,
  p_date             date,
  p_time             time,
  p_location         text,
  p_city             text,
  p_guests           integer,
  p_contract_value   numeric,
  p_status           text,
  p_entrada          numeric,
  p_tasks            jsonb,
  p_phases           jsonb,
  p_timeline         jsonb,
  p_responsavel_id   uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_client   uuid := p_client_id;
  v_event_id uuid;
  v_item     jsonb;
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;

  if v_client is null then
    if p_new_client_name is null or length(trim(p_new_client_name)) = 0 then
      raise exception 'cliente obrigatório';
    end if;
    insert into public.clients (cerimonialista_id, name, phone)
    values (v_uid, trim(p_new_client_name), nullif(trim(coalesce(p_new_client_phone, '')), ''))
    returning id into v_client;
  end if;

  insert into public.events (
    cerimonialista_id, client_id, type, name, date, time,
    location, city, guests, contract_value, status,
    cerimonialista_responsavel_id
  )
  values (
    v_uid, v_client, p_type, nullif(trim(coalesce(p_name, '')), ''),
    p_date, p_time, nullif(trim(coalesce(p_location, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''), p_guests, p_contract_value,
    coalesce(p_status, 'orcamento'),
    p_responsavel_id
  )
  returning id into v_event_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) loop
    insert into public.tasks (event_id, title, status, priority, category)
    values (
      v_event_id,
      v_item->>'title',
      'pendente',
      coalesce(v_item->>'priority', 'media'),
      coalesce(v_item->>'category', 'geral')
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_phases, '[]'::jsonb)) loop
    insert into public.event_phases (event_id, name, "order")
    values (v_event_id, v_item->>'name', coalesce((v_item->>'order')::int, 0));
  end loop;

  -- O item do roteiro pode vir com deslocamento em vez de horário: o
  -- template guarda "4h antes da cerimônia", e o horário nasce disso.
  -- Guardar o offset junto do horário é guardar a REGRA que produziu o
  -- dado — é ela que permite recalcular quando a cerimônia muda de hora.
  for v_item in select * from jsonb_array_elements(coalesce(p_timeline, '[]'::jsonb)) loop
    insert into public.roteiro_items (
      event_id, title, "order", time, offset_min, duracao_minutos, origem_horario
    )
    values (
      v_event_id,
      v_item->>'title',
      coalesce((v_item->>'order')::int, 0),
      case
        when v_item->>'time' is not null then (v_item->>'time')::time
        when v_item->>'offset_min' is not null and p_time is not null
          then (p_time + make_interval(mins => (v_item->>'offset_min')::int))::time
        else null
      end,
      case when v_item->>'offset_min' is null then null
           else (v_item->>'offset_min')::int end,
      case when v_item->>'duracao_min' is null then null
           else (v_item->>'duracao_min')::int end,
      case
        -- horário explícito é escolha dela; deslocamento é estimativa
        when v_item->>'time' is not null then 'manual'
        when v_item->>'offset_min' is not null then 'calculado'
        else null
      end
    );
  end loop;

  if p_entrada is not null and p_entrada > 0 then
    insert into public.transactions
      (event_id, type, category, description, value, due_date, paid, paid_at)
    values
      (v_event_id, 'receita', 'entrada', 'Entrada', p_entrada, p_date, true, now());
  end if;

  return v_event_id;
end;
$$;

create or replace function public.criar_evento_do_orcamento(
  p_hash        text,
  p_tasks       jsonb default '[]'::jsonb,
  p_phases      jsonb default '[]'::jsonb,
  p_data_evento date default null,
  p_roteiro     jsonb default '[]'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc       public.orcamentos%rowtype;
  v_uid       uuid;
  v_client    uuid;
  v_event     uuid;
  v_data      date;
  v_item      jsonb;
  v_tel_dig   text;
  v_email     text;
  v_nome      text;
begin
  select * into v_orc from public.orcamentos where hash_publico = p_hash;
  if not found then
    return json_build_object('error', 'orçamento não encontrado');
  end if;

  if v_orc.evento_gerado_id is not null then
    return json_build_object(
      'success', true, 'evento_id', v_orc.evento_gerado_id, 'ja_existia', true
    );
  end if;

  if v_orc.status <> 'aprovado' then
    return json_build_object('error', 'orçamento não está aprovado');
  end if;
  if v_orc.ficha_preenchida_em is null then
    return json_build_object('error', 'ficha de cadastro ainda não preenchida');
  end if;

  v_data := coalesce(p_data_evento, v_orc.data_evento);
  if v_data is null then
    return json_build_object(
      'error', 'sem_data',
      'mensagem', 'defina a data do evento para gerá-lo'
    );
  end if;

  select coalesce(
    (select m.user_id from public.membros_equipe m
      where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_uid;

  if v_uid is null then
    return json_build_object('error', 'empresa sem responsável definido');
  end if;

  v_nome  := coalesce(nullif(trim(v_orc.ficha_nome), ''), v_orc.contato_nome);
  v_email := coalesce(nullif(trim(v_orc.ficha_email), ''), v_orc.contato_email);
  v_tel_dig := regexp_replace(
    coalesce(nullif(trim(v_orc.ficha_whatsapp), ''),
             nullif(trim(v_orc.ficha_telefone), ''),
             v_orc.contato_telefone, ''), '\D', '', 'g');

  select c.id into v_client
  from public.clients c
  where c.empresa_id = v_orc.empresa_id
    and (
      (
        length(v_tel_dig) >= 8
        and (
          right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 8) = right(v_tel_dig, 8)
          or right(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g'), 8) = right(v_tel_dig, 8)
        )
      )
      or (
        v_email is not null and c.email is not null
        and lower(trim(c.email)) = lower(trim(v_email))
      )
    )
  order by c.created_at
  limit 1;

  if v_client is null then
    insert into public.clients (
      cerimonialista_id, empresa_id, name, phone, whatsapp, email,
      instagram, address, city
    )
    values (
      v_uid, v_orc.empresa_id, v_nome,
      nullif(coalesce(v_orc.ficha_telefone, v_orc.contato_telefone), ''),
      nullif(v_orc.ficha_whatsapp, ''),
      v_email,
      nullif(v_orc.ficha_instagram, ''),
      nullif(v_orc.ficha_endereco, ''),
      coalesce(nullif(v_orc.ficha_cidade, ''), v_orc.cidade_evento)
    )
    returning id into v_client;
  end if;

  insert into public.events (
    cerimonialista_id, empresa_id, client_id, type, date,
    location, city, guests, contract_value, status,
    cerimonialista_responsavel_id
  )
  values (
    v_uid, v_orc.empresa_id, v_client, v_orc.tipo_evento, v_data,
    nullif(v_orc.local_evento, ''), nullif(v_orc.cidade_evento, ''),
    v_orc.numero_convidados, v_orc.valor_total, 'confirmado',
    v_orc.cerimonialista_responsavel_id
  )
  returning id into v_event;

  for v_item in select * from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) loop
    insert into public.tasks (event_id, title, status, priority, category)
    values (
      v_event, v_item->>'title', 'pendente',
      coalesce(v_item->>'priority', 'media'),
      coalesce(v_item->>'category', 'geral')
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_phases, '[]'::jsonb)) loop
    insert into public.event_phases (event_id, name, "order")
    values (v_event, v_item->>'name', coalesce((v_item->>'order')::int, 0));
  end loop;

  -- p_roteiro é IGNORADO (mesmo destino de p_tasks): quem aprova a
  -- proposta é a cliente, sem login, e o navegador dela não enxerga o
  -- Playbook da empresa. A espinha do dia vem da tabela, aqui dentro,
  -- onde o SECURITY DEFINER alcança. Só o que não depende de resposta do
  -- wizard — condicional sem quem responda não é condicional, é chute.
  insert into public.roteiro_items (
    event_id, empresa_id, title, "order", time, status,
    offset_min, duracao_minutos, origem_horario
  )
  select
    v_event, v_orc.empresa_id, mr.titulo, mr.ordem,
    null,          -- orçamento não tem hora de cerimônia; o gatilho
    'pendente',    -- preenche quando ela definir
    mr.offset_min, mr.duracao_min, 'calculado'
  from public.metodo_roteiro_item mr
  where mr.empresa_id = v_orc.empresa_id
    and mr.tipo_evento::text = v_orc.tipo_evento
    and mr.condicao is null
  order by mr.ordem;

  -- SEM transactions: os itens do orçamento são resumo informativo, lido
  -- de orcamento_itens pela tela do Financeiro. As receitas reais são as
  -- parcelas geradas pela cerimonialista.

  update public.orcamentos
  set evento_gerado_id = v_event, updated_at = now()
  where id = v_orc.id;

  insert into public.activities (
    cerimonialista_id, category, type, title, description, event_id, event_name
  )
  values (
    v_uid, 'evento', 'evento_criado',
    'Evento criado a partir de orçamento aprovado',
    'Orçamento de ' || v_nome || ' aprovado em ' ||
      to_char(coalesce(v_orc.respondido_em, now()), 'DD/MM/YYYY') ||
      ' — R$ ' || to_char(v_orc.valor_total, 'FM999G999G990D00'),
    v_event, v_nome
  );

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (
    v_uid, 'evento',
    'Evento criado: ' || v_nome,
    'Gerado automaticamente a partir do orçamento aprovado',
    '/eventos/' || v_event
  );

  return json_build_object(
    'success', true,
    'evento_id', v_event,
    'cliente_id', v_client,
    'ja_existia', false
  );
end;
$$;

grant execute on function public.criar_evento_do_orcamento(text, jsonb, jsonb, date, jsonb)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 7) O cronograma devolve a origem, para a tela poder dizer "estimado"
-- ------------------------------------------------------------
-- Cópia fiel da 062 com duas chaves a mais no objeto.
create or replace function public.cronograma_evento(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.pode_ver_evento(p_event_id) then '[]'::jsonb
    else coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'time', ri.time,
            'title', ri.title,
            'description', ri.description,
            'supplier_id', ri.supplier_id,
            'supplier_name', s.name,
            'supplier_categoria', (
              select sc.categoria
              from public.supplier_categorias sc
              where sc.supplier_id = ri.supplier_id
              order by sc.categoria
              limit 1
            ),
            'status_novo', ri.status_novo,
            'horario_real_inicio', ri.horario_real_inicio,
            'horario_real_fim', ri.horario_real_fim,
            'observacao', ri.observacao,
            'responsavel_nome', ri.responsavel_nome,
            'responsavel_telefone', ri.responsavel_telefone,
            'etapa_obrigatoria', coalesce(ri.etapa_obrigatoria, false),
            'duracao_minutos', ri.duracao_minutos,
            'depende_de', ri.depende_de,
            'tipo_dependencia', ri.tipo_dependencia,
            'time_original', ri.time_original,
            'offset_min', ri.offset_min,
            'origem_horario', ri.origem_horario
          )
          order by ri.time nulls last, ri."order"
        )
        from public.roteiro_items ri
        left join public.suppliers s on s.id = ri.supplier_id
        where ri.event_id = p_event_id
      ),
      '[]'::jsonb
    )
  end
$$;

commit;

-- ------------------------------------------------------------
-- Conferência: todas as linhas devem voltar "true".
-- ------------------------------------------------------------
select 'backfill: nenhum horario ficou sem origem' as verificacao,
       not exists (
         select 1 from public.roteiro_items
         where time is not null and origem_horario is null) as aplicou
union all
select 'deslocamentos de casamento semeados (9 por empresa)',
       (select count(*) from public.metodo_roteiro_item where tipo_evento = 'casamento')
       = (select count(*) from public.empresas) * 9
union all
select 'deslocamentos de debutante semeados (9 por empresa)',
       (select count(*) from public.metodo_roteiro_item where tipo_evento = 'debutante')
       = (select count(*) from public.empresas) * 9
union all
select 'gatilho de recalculo instalado',
       exists (select 1 from pg_trigger where tgname = 'trg_recalcular_roteiro')
union all
select 'cronograma_evento devolve a origem do horario',
       pg_get_functiondef('public.cronograma_evento(uuid)'::regprocedure)
         like '%origem_horario%'
union all
select 'a semeadura do wizard entende deslocamento',
       pg_get_functiondef(
         'public.criar_evento_completo(uuid, text, text, text, text, date, time, text, text, integer, numeric, text, numeric, jsonb, jsonb, jsonb, uuid)'::regprocedure
       ) like '%offset_min%'
union all
select 'a proposta aprovada semeia do Playbook',
       pg_get_functiondef(
         'public.criar_evento_do_orcamento(text, jsonb, jsonb, date, jsonb)'::regprocedure
       ) like '%metodo_roteiro_item%';
