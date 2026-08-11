-- 078 — Agenda de Fornecedores: config da grade + exceções
--
-- A grade (077) ganha duas peças que faltavam para virar a tela /agenda:
--   * agenda_config — slot padrão e BUFFER entre reuniões, por cerimonialista.
--     O buffer entra no motor: os horários oferecidos passam a andar de
--     (duração + buffer) em (duração + buffer). A duração da reunião em si
--     continua POR TAREFA (decisão já tomada na etapa B) — o slot padrão da
--     grade é só o default de tarefa nova.
--   * disponibilidade_excecao — bloqueios pontuais ("25/07 férias"). Dia de
--     exceção some dos slots gerados E das RPCs públicas: fornecedor não
--     consegue escolher um dia bloqueado nem num convite já enviado.

-- ------------------------------------------------------------
-- 1) Config da grade (1 linha por cerimonialista)
-- ------------------------------------------------------------
create table if not exists public.agenda_config (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  slot_padrao_min  int not null default 45 check (slot_padrao_min between 15 and 480),
  buffer_min       int not null default 15 check (buffer_min between 0 and 120),
  updated_at       timestamptz not null default now()
);

alter table public.agenda_config enable row level security;

drop policy if exists "agenda_config_own" on public.agenda_config;
create policy "agenda_config_own" on public.agenda_config
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 2) Exceções (bloqueios pontuais)
-- ------------------------------------------------------------
create table if not exists public.disponibilidade_excecao (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  data       date not null,
  label      text,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

alter table public.disponibilidade_excecao enable row level security;

drop policy if exists "disponibilidade_excecao_own" on public.disponibilidade_excecao;
create policy "disponibilidade_excecao_own" on public.disponibilidade_excecao
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3) Dia bloqueado some das RPCs públicas
-- ------------------------------------------------------------
-- consultar_convite: além de descontar a ocupação, esconde slots em dia de
-- exceção da responsável pelo evento.
create or replace function public.consultar_convite(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'status', ac.status,
    'tarefa', t.title,
    'duracao_min', ac.duracao_min,
    'supplier_name', s.name,
    'event_label', public.event_label(e.type, e.client_id),
    'event_date', e.date,
    'prazo_ate', ac.prazo_ate,
    'compromisso', case when c.id is null then null else json_build_object(
      'data', c.data, 'hora', c.hora, 'local', c.local
    ) end,
    'slots', (
      select coalesce(json_agg(json_build_object(
        'id', sl.id, 'data', sl.data, 'hora', sl.hora
      ) order by sl.data, sl.hora), '[]'::json)
      from public.agendamento_slot sl
      where sl.convite_id = ac.id
        and sl.data >= current_date
        and not public.horario_ocupado(e.cerimonialista_id, sl.data, sl.hora, ac.duracao_min)
        and not exists (
          select 1 from public.disponibilidade_excecao ex
          where ex.user_id = e.cerimonialista_id and ex.data = sl.data
        )
    )
  )
  from public.agendamento_convite ac
  join public.tasks t on t.id = ac.task_id
  join public.events e on e.id = ac.event_id
  join public.suppliers s on s.id = ac.supplier_id
  left join public.compromisso c on c.id = ac.compromisso_id
  where ac.hash = p_hash
$$;

-- escolher_horario_convite: recusa dia de exceção mesmo que o slot tenha
-- sido oferecido antes do bloqueio existir.
create or replace function public.escolher_horario_convite(p_hash text, p_slot_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.agendamento_convite%rowtype;
  v_slot public.agendamento_slot%rowtype;
  v_task public.tasks%rowtype;
  v_user uuid;
  v_comp uuid;
  v_cerimonialista uuid;
  v_label text;
begin
  select * into v_conv from public.agendamento_convite where hash = p_hash;
  if not found then
    return json_build_object('error', 'convite não encontrado');
  end if;
  if v_conv.status = 'respondido' then
    return json_build_object('error', 'este convite já foi respondido');
  end if;
  if v_conv.status in ('expirado', 'cancelado') or now() > v_conv.prazo_ate then
    return json_build_object('error', 'este convite expirou — a cerimonialista vai combinar direto com você');
  end if;

  select * into v_slot from public.agendamento_slot
  where id = p_slot_id and convite_id = v_conv.id;
  if not found then
    return json_build_object('error', 'horário inválido');
  end if;
  if v_slot.data < current_date then
    return json_build_object('error', 'esse horário já passou — escolha outro');
  end if;

  select * into v_task from public.tasks where id = v_conv.task_id;
  select cerimonialista_id into v_user from public.events where id = v_conv.event_id;

  -- dia bloqueado pela cerimonialista (férias etc.)
  if exists (
    select 1 from public.disponibilidade_excecao ex
    where ex.user_id = v_user and ex.data = v_slot.data
  ) then
    return json_build_object('error', 'esse dia ficou indisponível — escolha outro');
  end if;

  -- REVALIDA a vaga na hora da escolha.
  if public.horario_ocupado(v_user, v_slot.data, v_slot.hora, v_conv.duracao_min) then
    return json_build_object('error', 'esse horário acabou de ser ocupado — escolha outro');
  end if;

  insert into public.compromisso (
    event_id, titulo, data, hora, local, supplier_id,
    task_id, evento_decisao_id, estado, duracao_min, confirmado_em
  )
  values (
    v_conv.event_id, v_task.title, v_slot.data, v_slot.hora, v_task.local,
    v_conv.supplier_id, v_task.id, v_task.evento_decisao_id,
    'confirmado', v_conv.duracao_min, now()
  )
  returning id into v_comp;

  update public.agendamento_slot set escolhido = true where id = v_slot.id;
  update public.agendamento_convite
    set status = 'respondido', compromisso_id = v_comp
    where id = v_conv.id;

  select e.cerimonialista_id, public.event_label(e.type, e.client_id)
    into v_cerimonialista, v_label
  from public.events e where e.id = v_conv.event_id;

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  select v_cerimonialista, 'compromisso',
         s.name || ' agendou: ' || v_task.title,
         coalesce(v_label, 'Evento') || ' · ' ||
           to_char(v_slot.data, 'DD/MM') || ' às ' || to_char(v_slot.hora, 'HH24:MI'),
         '/eventos/' || v_conv.event_id || '/organizacao?tarefa=' || v_task.id
  from public.suppliers s where s.id = v_conv.supplier_id;

  return json_build_object(
    'success', true,
    'data', v_slot.data,
    'hora', v_slot.hora
  );
end $$;

revoke all on function public.consultar_convite(text) from public;
revoke all on function public.escolher_horario_convite(text, uuid) from public;
grant execute on function public.consultar_convite(text) to anon, authenticated;
grant execute on function public.escolher_horario_convite(text, uuid) to anon, authenticated;
