-- ============================================================
-- Vela — Migração 014: criação transacional de evento
-- Execute no SQL Editor do Supabase (depois da 013).
--
-- Uma ÚNICA função cria evento + cliente (se novo) + tasks + fases +
-- timeline + transação de entrada, tudo em uma transação. Se qualquer
-- parte falhar, nada é criado (rollback). SECURITY INVOKER: roda como a
-- cerimonialista logada, então o RLS é aplicado a cada insert.
-- ============================================================

-- Nome opcional do evento (Passo 3 do wizard).
alter table public.events add column if not exists name text;

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
  p_timeline         jsonb
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

  -- Cliente novo (criação rápida) dentro da mesma transação.
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
    location, city, guests, contract_value, status
  )
  values (
    v_uid, v_client, p_type, nullif(trim(coalesce(p_name, '')), ''),
    p_date, p_time, nullif(trim(coalesce(p_location, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''), p_guests, p_contract_value,
    coalesce(p_status, 'orcamento')
  )
  returning id into v_event_id;

  -- Checklist (tasks)
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

  -- Fases do cronograma
  for v_item in select * from jsonb_array_elements(coalesce(p_phases, '[]'::jsonb)) loop
    insert into public.event_phases (event_id, name, "order")
    values (v_event_id, v_item->>'name', coalesce((v_item->>'order')::int, 0));
  end loop;

  -- Timeline sugerida (roteiro_items) — time pode vir null ("A definir")
  for v_item in select * from jsonb_array_elements(coalesce(p_timeline, '[]'::jsonb)) loop
    insert into public.roteiro_items (event_id, title, "order", time)
    values (
      v_event_id,
      v_item->>'title',
      coalesce((v_item->>'order')::int, 0),
      case when v_item->>'time' is null then null else (v_item->>'time')::time end
    );
  end loop;

  -- Entrada já recebida → transação de receita paga
  if p_entrada is not null and p_entrada > 0 then
    insert into public.transactions (event_id, type, value, due_date, paid)
    values (v_event_id, 'receita', p_entrada, p_date, true);
  end if;

  return v_event_id;
end;
$$;

grant execute on function public.criar_evento_completo(
  uuid, text, text, text, text, date, time, text, text, integer,
  numeric, text, numeric, jsonb, jsonb, jsonb
) to authenticated;
