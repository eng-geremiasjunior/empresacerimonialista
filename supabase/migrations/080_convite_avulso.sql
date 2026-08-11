-- 080 — Convite avulso: agendar direto da Agenda, sem tarefa
--
-- O Secretário nasceu preso à tarefa (task_id NOT NULL). Mas o lugar
-- natural de marcar reunião com fornecedor é a AGENDA: "+ Novo" com
-- agendamento automático ligado deve disparar o convite na hora, sem
-- inventar uma tarefa só para isso.
--
-- Modelagem: o CONVITE passa a ser a reunião ainda não marcada (tem
-- fornecedor, duração, prazo e horários oferecidos). O COMPROMISSO só
-- nasce quando o fornecedor escolhe — por isso compromisso.data continua
-- NOT NULL, sem data-fantasma na Agenda.

-- ------------------------------------------------------------
-- 1) task_id opcional + título próprio
-- ------------------------------------------------------------
alter table public.agendamento_convite
  alter column task_id drop not null,
  add column if not exists titulo text;

-- O unique parcial de convite ativo continua valendo por tarefa; com
-- task_id nulo o Postgres trata cada linha como distinta, então convites
-- avulsos não colidem entre si.

-- ------------------------------------------------------------
-- 2) RPCs passam a aceitar convite sem tarefa
-- ------------------------------------------------------------
create or replace function public.consultar_convite(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'status', ac.status,
    -- título vem da tarefa quando existe; senão, do próprio convite
    'tarefa', coalesce(t.title, ac.titulo, 'Reunião'),
    'duracao_min', ac.duracao_min,
    'supplier_name', s.name,
    'event_label', public.event_label(e.type, e.client_id),
    'event_date', e.date,
    'prazo_ate', ac.prazo_ate,
    'sugestao', case when ac.sugestao_data is null then null else json_build_object(
      'data', ac.sugestao_data, 'hora', ac.sugestao_hora
    ) end,
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
  left join public.tasks t on t.id = ac.task_id
  join public.events e on e.id = ac.event_id
  join public.suppliers s on s.id = ac.supplier_id
  left join public.compromisso c on c.id = ac.compromisso_id
  where ac.hash = p_hash
$$;

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
  v_tem_task boolean := false;
  v_titulo text;
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

  if v_conv.task_id is not null then
    select * into v_task from public.tasks where id = v_conv.task_id;
    v_tem_task := found;
  end if;
  v_titulo := coalesce(
    case when v_tem_task then v_task.title else null end,
    v_conv.titulo,
    'Reunião com fornecedor'
  );

  select cerimonialista_id into v_user from public.events where id = v_conv.event_id;

  if exists (
    select 1 from public.disponibilidade_excecao ex
    where ex.user_id = v_user and ex.data = v_slot.data
  ) then
    return json_build_object('error', 'esse dia ficou indisponível — escolha outro');
  end if;

  if public.horario_ocupado(v_user, v_slot.data, v_slot.hora, v_conv.duracao_min) then
    return json_build_object('error', 'esse horário acabou de ser ocupado — escolha outro');
  end if;

  insert into public.compromisso (
    event_id, titulo, data, hora, local, supplier_id,
    task_id, evento_decisao_id, estado, duracao_min, confirmado_em
  )
  values (
    v_conv.event_id, v_titulo, v_slot.data, v_slot.hora,
    case when v_tem_task then v_task.local else null end,
    v_conv.supplier_id,
    v_conv.task_id,
    case when v_tem_task then v_task.evento_decisao_id else null end,
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
         s.name || ' agendou: ' || v_titulo,
         coalesce(v_label, 'Evento') || ' · ' ||
           to_char(v_slot.data, 'DD/MM') || ' às ' || to_char(v_slot.hora, 'HH24:MI'),
         -- sem tarefa, o destino é a própria Agenda do evento
         '/eventos/' || v_conv.event_id || '/organizacao' ||
           case when v_conv.task_id is null then '' else '?tarefa=' || v_conv.task_id end
  from public.suppliers s where s.id = v_conv.supplier_id;

  return json_build_object('success', true, 'data', v_slot.data, 'hora', v_slot.hora);
end $$;

create or replace function public.sugerir_horario_convite(
  p_hash text,
  p_data date,
  p_hora time
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.agendamento_convite%rowtype;
  v_titulo text;
  v_cerimonialista uuid;
  v_label text;
  v_sup text;
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
  if p_data is null or p_hora is null then
    return json_build_object('error', 'informe dia e horário');
  end if;
  if p_data < current_date then
    return json_build_object('error', 'sugira uma data futura');
  end if;

  update public.agendamento_convite
    set status = 'sugerido', sugestao_data = p_data, sugestao_hora = p_hora
    where id = v_conv.id;

  select coalesce(t.title, v_conv.titulo, 'Reunião') into v_titulo
  from (select 1) x
  left join public.tasks t on t.id = v_conv.task_id;

  select e.cerimonialista_id, public.event_label(e.type, e.client_id)
    into v_cerimonialista, v_label
  from public.events e where e.id = v_conv.event_id;
  select s.name into v_sup from public.suppliers s where s.id = v_conv.supplier_id;

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (
    v_cerimonialista, 'compromisso',
    coalesce(v_sup, 'Fornecedor') || ' sugeriu outro horário',
    coalesce(v_titulo, 'Agendamento') || ' · ' ||
      to_char(p_data, 'DD/MM') || ' às ' || to_char(p_hora, 'HH24:MI') ||
      ' — aprovar ou recusar em ' || coalesce(v_label, 'Evento'),
    '/eventos/' || v_conv.event_id || '/organizacao' ||
      case when v_conv.task_id is null then '' else '?tarefa=' || v_conv.task_id end
  );

  return json_build_object('success', true);
end $$;

revoke all on function public.consultar_convite(text) from public;
revoke all on function public.escolher_horario_convite(text, uuid) from public;
revoke all on function public.sugerir_horario_convite(text, date, time) from public;
grant execute on function public.consultar_convite(text) to anon, authenticated;
grant execute on function public.escolher_horario_convite(text, uuid) to anon, authenticated;
grant execute on function public.sugerir_horario_convite(text, date, time) to anon, authenticated;
