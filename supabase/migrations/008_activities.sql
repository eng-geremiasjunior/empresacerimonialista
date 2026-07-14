-- ============================================================
-- Vela — Migração 008: log de atividades (Feed do Dashboard)
-- Execute no SQL Editor do Supabase (depois da 007).
--
-- Cada ação importante gera uma linha em activities automaticamente.
-- Aqui cobrimos EVENTOS via trigger (criar/editar/concluir/cancelar).
-- Outros módulos (financeiro, orçamento...) ganham triggers próprios
-- quando existirem.
-- ============================================================

create table if not exists public.activities (
  id                uuid primary key default gen_random_uuid(),
  cerimonialista_id uuid not null references auth.users (id) on delete cascade,
  category          text not null,
  type              text not null,
  title             text not null,
  description       text,
  event_id          uuid references public.events (id) on delete set null,
  event_name        text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_activities_user
  on public.activities (cerimonialista_id, created_at desc);

alter table public.activities enable row level security;

create policy "activities_own" on public.activities
  for all
  using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- Realtime (para um feed ao vivo no futuro).
do $$
begin
  alter publication supabase_realtime add table public.activities;
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- Rótulo legível do evento: "Casamento — Maria & João"
-- ------------------------------------------------------------
create or replace function public.event_label(p_type text, p_client_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    (case p_type
       when 'casamento' then 'Casamento'
       when 'debutante' then 'Debutante'
       else initcap(p_type)
     end)
    || ' — '
    || coalesce(
      (select name from public.clients where id = p_client_id),
      'Sem cliente'
    )
$$;

-- ------------------------------------------------------------
-- Trigger: registra atividades da tabela events
-- ------------------------------------------------------------
create or replace function public.log_event_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type  text;
  v_title text;
begin
  if tg_op = 'INSERT' then
    v_type := 'evento_criado';
    v_title := 'Novo evento criado';
  else -- UPDATE
    if new.status is distinct from old.status and new.status = 'concluido' then
      v_type := 'evento_concluido';
      v_title := 'Evento concluído';
    elsif new.status is distinct from old.status and new.status = 'cancelado' then
      v_type := 'evento_cancelado';
      v_title := 'Evento cancelado';
    else
      v_type := 'evento_editado';
      v_title := 'Evento atualizado';
    end if;
  end if;

  insert into public.activities
    (cerimonialista_id, category, type, title, event_id, event_name)
  values
    (new.cerimonialista_id, 'eventos', v_type, v_title, new.id,
     public.event_label(new.type, new.client_id));

  return new;
end;
$$;

drop trigger if exists trg_log_event_insert on public.events;
create trigger trg_log_event_insert
  after insert on public.events
  for each row execute function public.log_event_activity();

drop trigger if exists trg_log_event_update on public.events;
create trigger trg_log_event_update
  after update on public.events
  for each row execute function public.log_event_activity();

-- ------------------------------------------------------------
-- Backfill: registra os eventos que já existem (inclusive os
-- criados antes desta migração), usando a data real de criação.
-- ------------------------------------------------------------
insert into public.activities
  (cerimonialista_id, category, type, title, event_id, event_name, created_at)
select
  e.cerimonialista_id, 'eventos', 'evento_criado', 'Novo evento criado',
  e.id, public.event_label(e.type, e.client_id), e.created_at
from public.events e
where not exists (
  select 1 from public.activities a
  where a.event_id = e.id and a.type = 'evento_criado'
);
