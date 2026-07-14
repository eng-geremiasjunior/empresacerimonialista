-- ============================================================
-- Vela — Migração 022: cerimonialista responsável no evento
-- (Etapa 3 de 5 da transição multiusuário)
--
-- Adiciona events.cerimonialista_responsavel_id (FK membros_equipe),
-- atribui os eventos existentes à proprietária da empresa e recria a
-- RPC criar_evento_completo com o parâmetro opcional do responsável.
-- Nenhuma regra de permissão muda aqui (isso é a Etapa 4).
--
-- Execute no SQL Editor do Supabase (depois da 021).
-- ============================================================

begin;

-- 1) Coluna no evento
alter table public.events
  add column if not exists cerimonialista_responsavel_id uuid
  references public.membros_equipe (id);

create index if not exists idx_events_responsavel
  on public.events (cerimonialista_responsavel_id);

-- 2) Backfill: eventos existentes ficam com a proprietária da empresa
update public.events e
set cerimonialista_responsavel_id = (
  select me.id from public.membros_equipe me
  where me.empresa_id = e.empresa_id and me.is_owner = true
  limit 1
)
where cerimonialista_responsavel_id is null;

-- 3) Recria a RPC do wizard com o parâmetro opcional p_responsavel_id.
--    (Assinatura nova: chamadas antigas sem o parâmetro continuam
--    funcionando por causa do default null.)
drop function if exists public.criar_evento_completo(
  uuid, text, text, text, text, date, time, text, text,
  integer, numeric, text, numeric, jsonb, jsonb, jsonb
);

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

  for v_item in select * from jsonb_array_elements(coalesce(p_timeline, '[]'::jsonb)) loop
    insert into public.roteiro_items (event_id, title, "order", time)
    values (
      v_event_id,
      v_item->>'title',
      coalesce((v_item->>'order')::int, 0),
      case when v_item->>'time' is null then null else (v_item->>'time')::time end
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

commit;

-- VALIDAÇÃO (deve retornar 0):
-- select count(*) from public.events where cerimonialista_responsavel_id is null;
