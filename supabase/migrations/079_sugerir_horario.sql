-- 079 — "Sugerir outro horário" (fecha o ciclo do Secretário)
--
-- Quando nenhum horário da grade serve, o fornecedor não fica sem saída:
-- sugere um dia/hora (escolha ESTRUTURADA — date+time, nunca texto livre)
-- e a cerimonialista aprova ou recusa. Convite em 'sugerido' fica parado
-- no cron (não reenvia, não expira): a bola está com ela.

-- ------------------------------------------------------------
-- 1) Estado novo + campos da sugestão no convite
-- ------------------------------------------------------------
-- CHECK recriado com o SUPERCONJUNTO dos valores (linhas existentes usam
-- os antigos; esquecer um violaria a constraint).
alter table public.agendamento_convite
  drop constraint if exists agendamento_convite_status_check;
alter table public.agendamento_convite
  add constraint agendamento_convite_status_check
  check (status in ('enviado', 'reenviado', 'respondido', 'expirado', 'cancelado', 'sugerido'));

alter table public.agendamento_convite
  add column if not exists sugestao_data date,
  add column if not exists sugestao_hora time;

-- ------------------------------------------------------------
-- 2) RPC pública: fornecedor sugere (hash como credencial)
-- ------------------------------------------------------------
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
  v_task_title text;
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

  select t.title into v_task_title from public.tasks t where t.id = v_conv.task_id;
  select e.cerimonialista_id, public.event_label(e.type, e.client_id)
    into v_cerimonialista, v_label
  from public.events e where e.id = v_conv.event_id;
  select s.name into v_sup from public.suppliers s where s.id = v_conv.supplier_id;

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (
    v_cerimonialista, 'compromisso',
    coalesce(v_sup, 'Fornecedor') || ' sugeriu outro horário',
    coalesce(v_task_title, 'Agendamento') || ' · ' ||
      to_char(p_data, 'DD/MM') || ' às ' || to_char(p_hora, 'HH24:MI') ||
      ' — aprovar ou recusar em ' || coalesce(v_label, 'Evento'),
    '/eventos/' || v_conv.event_id || '/organizacao?tarefa=' || v_conv.task_id
  );

  return json_build_object('success', true);
end $$;

revoke all on function public.sugerir_horario_convite(text, date, time) from public;
grant execute on function public.sugerir_horario_convite(text, date, time)
  to anon, authenticated;

-- ------------------------------------------------------------
-- 3) consultar_convite passa a devolver a sugestão pendente
--    (recriada por completo — mantém o filtro de exceções da 078)
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
    'tarefa', t.title,
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
  join public.tasks t on t.id = ac.task_id
  join public.events e on e.id = ac.event_id
  join public.suppliers s on s.id = ac.supplier_id
  left join public.compromisso c on c.id = ac.compromisso_id
  where ac.hash = p_hash
$$;

revoke all on function public.consultar_convite(text) from public;
grant execute on function public.consultar_convite(text) to anon, authenticated;
