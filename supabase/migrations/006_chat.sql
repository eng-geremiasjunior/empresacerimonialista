-- ============================================================
-- Vela — Migração 006: chat evento <-> fornecedor
-- Execute no SQL Editor do Supabase (depois da 005).
--
-- Modelo de acesso:
--   Cerimonialista (logada): RLS direto na tabela (todas as
--     conversas dos seus eventos) + Supabase Realtime.
--   Fornecedor (sem login): acessa pelo hash do link do roteiro
--     (roteiro_links), via funções security definer — nenhuma
--     política anônima na tabela.
-- ============================================================

create table if not exists public.event_messages (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  sender_id   uuid references auth.users (id) on delete set null,
  sender_type text not null check (sender_type in ('cerimonialista', 'fornecedor')),
  message     text not null check (length(message) between 1 and 2000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists idx_event_messages_conversa
  on public.event_messages (event_id, supplier_id, created_at);

alter table public.event_messages enable row level security;

-- Cerimonialista: vê e envia em todas as conversas dos SEUS eventos.
create policy "event_messages_cerimonialista" on public.event_messages
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

-- Realtime: publica INSERT/UPDATE da tabela (RLS é aplicado por assinante).
do $$
begin
  alter publication supabase_realtime add table public.event_messages;
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- Funções do fornecedor (credencial = hash do link do roteiro)
-- ------------------------------------------------------------

-- Lê a conversa do fornecedor daquele link.
create or replace function public.chat_mensagens(link_hash text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'sender_type', m.sender_type,
          'message', m.message,
          'created_at', m.created_at,
          'read_at', m.read_at
        )
        order by m.created_at
      )
      from public.event_messages m
      where m.event_id = l.event_id
        and m.supplier_id = l.supplier_id
    ),
    '[]'::jsonb
  )
  from public.roteiro_links l
  where l.hash = link_hash
$$;

-- Envia mensagem como fornecedor daquele link.
create or replace function public.chat_enviar(link_hash text, conteudo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.roteiro_links;
  v_msg  public.event_messages;
begin
  select * into v_link from public.roteiro_links where hash = link_hash;
  if v_link.id is null then
    raise exception 'link inválido';
  end if;
  if conteudo is null or length(trim(conteudo)) = 0 or length(conteudo) > 2000 then
    raise exception 'mensagem inválida';
  end if;

  insert into public.event_messages (event_id, supplier_id, sender_type, message)
  values (v_link.event_id, v_link.supplier_id, 'fornecedor', trim(conteudo))
  returning * into v_msg;

  return jsonb_build_object('id', v_msg.id, 'created_at', v_msg.created_at);
end;
$$;

-- Marca como lidas as mensagens da cerimonialista naquela conversa.
create or replace function public.chat_marcar_lidas(link_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.event_messages m
  set read_at = now()
  from public.roteiro_links l
  where l.hash = link_hash
    and m.event_id = l.event_id
    and m.supplier_id = l.supplier_id
    and m.sender_type = 'cerimonialista'
    and m.read_at is null
$$;

grant execute on function public.chat_mensagens(text) to anon, authenticated;
grant execute on function public.chat_enviar(text, text) to anon, authenticated;
grant execute on function public.chat_marcar_lidas(text) to anon, authenticated;
