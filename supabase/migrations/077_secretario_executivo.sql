-- 077 — Secretário Executivo (agendamento automático com fornecedor)
--
-- A tarefa carrega DUAS datas (076): vencimento (quando fazer) e convite
-- (quando chamar o fornecedor, mais cedo). Aqui entra o resto do motor:
--
--   * grade de DISPONIBILIDADE da cerimonialista (por usuária — na vida
--     real cada uma organiza os próprios horários de visita/reunião);
--   * CONVITE com hash (magic link, mesmo padrão dos links públicos) e
--     SLOTS de horário oferecidos. Os slots nascem de: grade MENOS os
--     compromissos já existentes dela — a Agenda é a fonte única de
--     ocupação, nunca um calendário paralelo. E a vaga é REVALIDADA no
--     momento da escolha, porque o fornecedor pode demorar a responder;
--   * ao escolher, o sistema cria o COMPROMISSO na Agenda (tabela que já
--     existe — reaproveitada, não duplicada) ligado à tarefa, e notifica;
--   * recálculo: mudou a data do casamento, vencimento e convite das
--     tarefas PENDENTES deslocam juntos (mesma cascata de sempre).
--
-- Tudo determinístico por data/offset — copiloto por regras, sem IA.
-- Resposta do fornecedor é escolha estruturada (slot), nunca texto livre.

-- ------------------------------------------------------------
-- 1) Campos do disparo na tarefa + duração no compromisso
-- ------------------------------------------------------------
alter table public.tasks
  add column if not exists auto_agendar boolean not null default false,
  add column if not exists duracao_min int not null default 60
    check (duracao_min between 15 and 480),
  add column if not exists prazo_resposta_dias int not null default 5,
  add column if not exists reenvio_horas int not null default 48;

-- Compromisso ganha duração para a conta de conflito de horário. Linhas
-- antigas ficam com 60min — aproximação honesta para o overlap.
alter table public.compromisso
  add column if not exists duracao_min int not null default 60;

-- ------------------------------------------------------------
-- 2) Grade de disponibilidade (por cerimonialista)
-- ------------------------------------------------------------
create table if not exists public.disponibilidade (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  dia_semana  int not null check (dia_semana between 0 and 6), -- 0=domingo
  hora_inicio time not null,
  hora_fim    time not null,
  created_at  timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

create index if not exists idx_disponibilidade_user
  on public.disponibilidade (user_id, dia_semana);

alter table public.disponibilidade enable row level security;

-- A grade é pessoal: cada uma gerencia a sua. O cron lê com service role.
drop policy if exists "disponibilidade_own" on public.disponibilidade;
create policy "disponibilidade_own" on public.disponibilidade
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3) Convite de agendamento + slots oferecidos
-- ------------------------------------------------------------
create table if not exists public.agendamento_convite (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid not null references public.tasks (id) on delete cascade,
  event_id       uuid not null references public.events (id) on delete cascade,
  empresa_id     uuid,
  supplier_id    uuid not null references public.suppliers (id) on delete cascade,
  hash           text unique not null
                 default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status         text not null default 'enviado'
                 check (status in ('enviado', 'reenviado', 'respondido', 'expirado', 'cancelado')),
  duracao_min    int not null default 60,
  enviado_em     timestamptz not null default now(),
  reenviado_em   timestamptz,
  prazo_ate      timestamptz not null,
  compromisso_id uuid references public.compromisso (id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Um convite ATIVO por tarefa (o código valida antes de inserir; este
-- índice é o guarda-corpo contra corrida do cron).
create unique index if not exists uq_convite_ativo
  on public.agendamento_convite (task_id)
  where status in ('enviado', 'reenviado');

create index if not exists idx_convite_status
  on public.agendamento_convite (status, prazo_ate);

drop trigger if exists trg_fill_empresa on public.agendamento_convite;
create trigger trg_fill_empresa before insert on public.agendamento_convite
  for each row execute function public.fill_empresa_from_event();

alter table public.agendamento_convite enable row level security;

drop policy if exists "convite_select" on public.agendamento_convite;
create policy "convite_select" on public.agendamento_convite
  for select using (public.pode_ver_evento(event_id));
drop policy if exists "convite_write" on public.agendamento_convite;
create policy "convite_write" on public.agendamento_convite
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

create table if not exists public.agendamento_slot (
  id          uuid primary key default gen_random_uuid(),
  convite_id  uuid not null references public.agendamento_convite (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid,
  data        date not null,
  hora        time not null,
  escolhido   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_slot_convite on public.agendamento_slot (convite_id);

drop trigger if exists trg_fill_empresa on public.agendamento_slot;
create trigger trg_fill_empresa before insert on public.agendamento_slot
  for each row execute function public.fill_empresa_from_event();

alter table public.agendamento_slot enable row level security;

drop policy if exists "slot_select" on public.agendamento_slot;
create policy "slot_select" on public.agendamento_slot
  for select using (public.pode_ver_evento(event_id));
drop policy if exists "slot_write" on public.agendamento_slot;
create policy "slot_write" on public.agendamento_slot
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 4) Ocupação da cerimonialista (helper interno)
-- ------------------------------------------------------------
-- Um horário está ocupado se QUALQUER compromisso ativo dela (em qualquer
-- evento) sobrepõe a janela. A Agenda é a fonte única de ocupação.
create or replace function public.horario_ocupado(
  p_user_id uuid,
  p_data date,
  p_hora time,
  p_duracao_min int
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.compromisso c
    join public.events e on e.id = c.event_id
    where e.cerimonialista_id = p_user_id
      and c.data = p_data
      and c.hora is not null
      and c.estado in ('agendado', 'confirmado')
      and c.hora < p_hora + make_interval(mins => p_duracao_min)
      and p_hora < c.hora + make_interval(mins => c.duracao_min)
  )
$$;

-- ------------------------------------------------------------
-- 5) RPCs públicas do magic link (hash como credencial)
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
        -- só oferece o que AINDA está livre (revalidação na leitura)
        and not public.horario_ocupado(e.cerimonialista_id, sl.data, sl.hora, ac.duracao_min)
    )
  )
  from public.agendamento_convite ac
  join public.tasks t on t.id = ac.task_id
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

  -- REVALIDA a vaga na hora da escolha: a Agenda pode ter mudado desde o
  -- envio (outro compromisso, outro convite respondido antes).
  if public.horario_ocupado(v_user, v_slot.data, v_slot.hora, v_conv.duracao_min) then
    return json_build_object('error', 'esse horário acabou de ser ocupado — escolha outro');
  end if;

  -- Cria o COMPROMISSO na Agenda (tabela existente), ligado à tarefa e à
  -- decisão de origem. Nasce confirmado: foi o fornecedor quem escolheu.
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

  -- Avisa a cerimonialista (tipo 'compromisso' já existe no CHECK da 069).
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

-- ------------------------------------------------------------
-- 6) Recálculo na mudança da data do casamento (só pendentes)
-- ------------------------------------------------------------
-- Vencimento e convite deslocam pelo mesmo delta da data do evento,
-- presos a [hoje .. nova data]. Tarefa concluída não se mexe — mesma
-- regra de cascata das decisões (070).
create or replace function public.trg_recalcular_tarefas_por_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta int;
begin
  if new.date is null or old.date is null or new.date = old.date then
    return new;
  end if;
  v_delta := new.date - old.date;

  update public.tasks
  set due_date = case
        when due_date is null then null
        else greatest(current_date, least(new.date, due_date + v_delta))
      end,
      convite_data = case
        when convite_offset_dias is not null
          then greatest(current_date, new.date - convite_offset_dias)
        when convite_data is null then null
        else greatest(current_date, least(new.date, convite_data + v_delta))
      end
  where event_id = new.id
    and status <> 'concluido';

  return new;
end $$;

drop trigger if exists trg_recalcular_tarefas_por_data on public.events;
create trigger trg_recalcular_tarefas_por_data
  after update of date on public.events
  for each row execute function public.trg_recalcular_tarefas_por_data();
