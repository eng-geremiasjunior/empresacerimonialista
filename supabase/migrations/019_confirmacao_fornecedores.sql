-- ============================================================
-- Vela — Migração 019: confirmação automática de fornecedores
-- Execute no SQL Editor do Supabase (depois da 018).
-- ============================================================

-- 1) E-mail do fornecedor (necessário para enviar a confirmação)
alter table public.suppliers add column if not exists email text;

-- 2) Configuração do disparo no evento
alter table public.events
  add column if not exists confirmation_days_before int not null default 7,
  add column if not exists confirmation_sent_at timestamptz;

-- 3) Tabela de confirmações (hash = credencial pública, sem login)
create table if not exists public.supplier_confirmations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  supplier_id  uuid not null references public.suppliers (id) on delete cascade,
  hash         text unique not null
               default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status       text not null default 'pendente'
               check (status in ('pendente', 'confirmado', 'recusado')),
  sent_at      timestamptz,
  responded_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (event_id, supplier_id)
);

alter table public.supplier_confirmations enable row level security;

drop policy if exists "confirmations_own" on public.supplier_confirmations;
create policy "confirmations_own" on public.supplier_confirmations
  for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.cerimonialista_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.cerimonialista_id = auth.uid()
    )
  );

-- 4) Funções públicas (hash como credencial; sem SELECT direto na tabela)

create or replace function public.consultar_confirmacao(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'supplier_name', s.name,
    'event_label', public.event_label(e.type, e.client_id),
    'event_date', e.date,
    'event_time', e.time,
    'event_location', e.location,
    'status', sc.status,
    'responded_at', sc.responded_at
  )
  from public.supplier_confirmations sc
  join public.suppliers s on s.id = sc.supplier_id
  join public.events e on e.id = sc.event_id
  where sc.hash = p_hash
$$;

create or replace function public.responder_confirmacao(p_hash text, p_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conf public.supplier_confirmations%rowtype;
begin
  if p_status not in ('confirmado', 'recusado') then
    return json_build_object('error', 'status inválido');
  end if;

  update public.supplier_confirmations
  set status = p_status, responded_at = now()
  where hash = p_hash
  returning * into v_conf;

  if not found then
    return json_build_object('error', 'link inválido');
  end if;

  -- Sincroniza com o vínculo do roteiro (alimenta Saúde do Evento/Copiloto).
  update public.roteiro_links
  set confirmed = (p_status = 'confirmado')
  where event_id = v_conf.event_id and supplier_id = v_conf.supplier_id;

  return json_build_object('success', true, 'status', p_status);
end;
$$;

grant execute on function public.consultar_confirmacao(text) to anon, authenticated;
grant execute on function public.responder_confirmacao(text, text) to anon, authenticated;

-- 5) Notificação para a cerimonialista quando o fornecedor responde.
--    Amplia o CHECK de notifications para o novo tipo 'fornecedor'.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor'));

create or replace function public.notificar_resposta_fornecedor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerimonialista uuid;
  v_event_label text;
  v_supplier text;
begin
  if new.status is distinct from old.status
     and new.status in ('confirmado', 'recusado') then
    select e.cerimonialista_id, public.event_label(e.type, e.client_id)
      into v_cerimonialista, v_event_label
    from public.events e where e.id = new.event_id;

    select name into v_supplier from public.suppliers where id = new.supplier_id;

    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (
      v_cerimonialista,
      'fornecedor',
      v_supplier || case when new.status = 'confirmado'
        then ' confirmou presença' else ' não poderá comparecer' end,
      coalesce(v_event_label, 'Evento'),
      '/eventos/' || new.event_id || '/fornecedores'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_notificar_resposta on public.supplier_confirmations;
create trigger trigger_notificar_resposta
  after update on public.supplier_confirmations
  for each row execute function public.notificar_resposta_fornecedor();

-- ============================================================
-- AGENDAMENTO (rodar DEPOIS que o app estiver publicado):
-- o job diário chama a rota /api/cron/confirmacoes do app.
--
-- Opção A — Vercel Cron (recomendada com deploy na Vercel):
--   vercel.json → { "crons": [{ "path": "/api/cron/confirmacoes",
--                               "schedule": "0 9 * * *" }] }
--
-- Opção B — pg_cron + pg_net (Supabase):
--   select cron.schedule(
--     'enviar-confirmacoes-diario', '0 9 * * *',
--     $cron$ select net.http_post(
--       url := 'https://SEU-APP.vercel.app/api/cron/confirmacoes',
--       headers := '{"Authorization": "Bearer SEU_CRON_SECRET"}'::jsonb
--     ) $cron$
--   );
--
-- Para TESTAR sem esperar o cron:
--   GET http://localhost:3000/api/cron/confirmacoes
--   com header Authorization: Bearer SEU_CRON_SECRET
-- ============================================================
