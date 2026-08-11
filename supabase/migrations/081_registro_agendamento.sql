-- 081 — Registro do agendamento no sino e no histórico do evento
--
-- Até aqui só o RESPOSTA do fornecedor virava notificação; o envio do
-- convite era mudo e a cerimonialista tinha que caçar a informação.
-- Agora cada passo do Secretário registra nos dois lugares:
--   * notifications → o sino (o que aconteceu agora)
--   * activities    → aba Histórico do evento (o que aconteceu naquele evento)
--
-- Helper SECURITY DEFINER porque as duas tabelas têm RLS por dono
-- (cerimonialista_id = auth.uid()): um envio feito por coordenadora da
-- equipe falharia ao gravar em nome da proprietária do evento.

create or replace function public.registrar_agendamento_evento(
  p_event_id  uuid,
  p_tipo      text,           -- activities.type
  p_titulo    text,
  p_mensagem  text,
  p_link      text default null,
  p_notificar boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid;
  v_label text;
begin
  -- Guarda: usuário logado só registra em evento que ele enxerga. O cron
  -- (service role, auth.uid() nulo) e as RPCs internas passam direto.
  if auth.uid() is not null and not public.pode_ver_evento(p_event_id) then
    return;
  end if;

  select e.cerimonialista_id, public.event_label(e.type, e.client_id)
    into v_user, v_label
  from public.events e where e.id = p_event_id;

  if v_user is null then
    return;
  end if;

  insert into public.activities (
    cerimonialista_id, category, type, title, description, event_id, event_name
  )
  values (
    v_user, 'fornecedores', p_tipo, p_titulo, p_mensagem, p_event_id, v_label
  );

  if p_notificar then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (
      v_user, 'compromisso', p_titulo,
      coalesce(v_label, 'Evento') || ' · ' || p_mensagem,
      coalesce(p_link, '/eventos/' || p_event_id || '/organizacao')
    );
  end if;
end $$;

grant execute on function public.registrar_agendamento_evento(uuid, text, text, text, text, boolean)
  to authenticated;

-- ------------------------------------------------------------
-- RPCs públicas passam a registrar nos dois lugares
-- ------------------------------------------------------------
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
    v_conv.titulo, 'Reunião com fornecedor'
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
    v_conv.supplier_id, v_conv.task_id,
    case when v_tem_task then v_task.evento_decisao_id else null end,
    'confirmado', v_conv.duracao_min, now()
  )
  returning id into v_comp;

  update public.agendamento_slot set escolhido = true where id = v_slot.id;
  update public.agendamento_convite
    set status = 'respondido', compromisso_id = v_comp
    where id = v_conv.id;

  select s.name into v_sup from public.suppliers s where s.id = v_conv.supplier_id;

  perform public.registrar_agendamento_evento(
    v_conv.event_id,
    'fornecedor_confirmado',
    coalesce(v_sup, 'Fornecedor') || ' agendou: ' || v_titulo,
    to_char(v_slot.data, 'DD/MM') || ' às ' || to_char(v_slot.hora, 'HH24:MI'),
    '/eventos/' || v_conv.event_id || '/organizacao' ||
      case when v_conv.task_id is null then '' else '?tarefa=' || v_conv.task_id end
  );

  return json_build_object('success', true, 'data', v_slot.data, 'hora', v_slot.hora);
end $$;

create or replace function public.sugerir_horario_convite(
  p_hash text, p_data date, p_hora time
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.agendamento_convite%rowtype;
  v_titulo text;
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

  select s.name into v_sup from public.suppliers s where s.id = v_conv.supplier_id;

  perform public.registrar_agendamento_evento(
    v_conv.event_id,
    'fornecedor_confirmado',
    coalesce(v_sup, 'Fornecedor') || ' sugeriu outro horário',
    v_titulo || ' · ' || to_char(p_data, 'DD/MM') || ' às ' ||
      to_char(p_hora, 'HH24:MI') || ' — aprovar ou recusar',
    '/eventos/' || v_conv.event_id || '/organizacao' ||
      case when v_conv.task_id is null then '' else '?tarefa=' || v_conv.task_id end
  );

  return json_build_object('success', true);
end $$;

revoke all on function public.escolher_horario_convite(text, uuid) from public;
revoke all on function public.sugerir_horario_convite(text, date, time) from public;
grant execute on function public.escolher_horario_convite(text, uuid) to anon, authenticated;
grant execute on function public.sugerir_horario_convite(text, date, time) to anon, authenticated;
