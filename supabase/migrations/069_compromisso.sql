-- 069 — Compromisso (Agenda) + confirmação sem login
--
-- Um COMPROMISSO é um evento no tempo com hora marcada: a cerimonialista
-- (ou o fornecedor) COMPARECE — diferente de uma tarefa, que se EXECUTA.
-- Uma "reunião" é só um compromisso; não há tabela separada de reunião.
--
-- Vive na Organização, ao lado das tarefas. Pode nascer de uma
-- tarefa/decisão (rastreabilidade) e apontar para um fornecedor. Tem hash
-- único para o fornecedor confirmar sem login — mesmo padrão de credencial
-- pública de supplier_confirmations (019) e roteiro_links.

-- ------------------------------------------------------------
-- 1) Tabela
-- ------------------------------------------------------------
create table if not exists public.compromisso (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  empresa_id        uuid references public.empresas (id) on delete cascade,
  titulo            text not null,
  data              date not null,
  hora              time,                    -- null = dia inteiro / hora a definir
  local             text,
  responsavel       text check (responsavel is null or responsavel in
                       ('noivos', 'cerimonialista', 'ambos')),
  observacao        text,
  -- vínculos opcionais
  supplier_id       uuid references public.suppliers (id) on delete set null,
  task_id           uuid references public.tasks (id) on delete set null,
  evento_decisao_id uuid references public.evento_decisao (id) on delete set null,
  -- ciclo de vida do comparecimento
  estado            text not null default 'agendado'
                    check (estado in ('agendado', 'confirmado', 'cancelado', 'remarcado')),
  -- credencial pública p/ o fornecedor confirmar sem login
  hash              text unique not null
                    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  confirmado_em     timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_compromisso_event on public.compromisso (event_id, data);

-- empresa_id herda do evento (mesmo gatilho das outras filhas)
drop trigger if exists trg_fill_empresa on public.compromisso;
create trigger trg_fill_empresa before insert on public.compromisso
  for each row execute function public.fill_empresa_from_event();

-- ------------------------------------------------------------
-- 2) RLS por cargo do evento (mesmo molde de tasks)
-- ------------------------------------------------------------
alter table public.compromisso enable row level security;

drop policy if exists "compromisso_select" on public.compromisso;
create policy "compromisso_select" on public.compromisso
  for select using (public.pode_ver_evento(event_id));

drop policy if exists "compromisso_insert" on public.compromisso;
create policy "compromisso_insert" on public.compromisso
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists "compromisso_update" on public.compromisso;
create policy "compromisso_update" on public.compromisso
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists "compromisso_delete" on public.compromisso;
create policy "compromisso_delete" on public.compromisso
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 3) Funções públicas (hash como credencial; sem SELECT direto)
-- ------------------------------------------------------------
create or replace function public.consultar_compromisso(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'titulo', c.titulo,
    'supplier_name', s.name,
    'event_label', public.event_label(e.type, e.client_id),
    'data', c.data,
    'hora', c.hora,
    'local', c.local,
    'estado', c.estado
  )
  from public.compromisso c
  join public.events e on e.id = c.event_id
  left join public.suppliers s on s.id = c.supplier_id
  where c.hash = p_hash
$$;

create or replace function public.responder_compromisso(p_hash text, p_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.compromisso%rowtype;
  v_estado text;
begin
  -- WhatsApp/link só mandam confirmar ou recusar; mapeamos para o estado.
  if p_status = 'confirmado' then
    v_estado := 'confirmado';
  elsif p_status in ('recusado', 'cancelado') then
    v_estado := 'cancelado';
  else
    return json_build_object('error', 'status inválido');
  end if;

  update public.compromisso
  set estado = v_estado, confirmado_em = now()
  where hash = p_hash
  returning * into v_row;

  if not found then
    return json_build_object('error', 'compromisso não encontrado');
  end if;

  return json_build_object('success', true, 'estado', v_estado);
end;
$$;

grant execute on function public.consultar_compromisso(text) to anon, authenticated;
grant execute on function public.responder_compromisso(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) Notificar a cerimonialista quando o fornecedor responde
-- ------------------------------------------------------------
-- Superconjunto do CHECK atual (043) + o novo tipo 'compromisso'. Precisa
-- manter todos os tipos já em uso (orcamento_*), senão viola linhas existentes.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor',
    'orcamento_aprovado', 'orcamento_recusado', 'compromisso'
  ));

create or replace function public.notificar_resposta_compromisso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerimonialista uuid;
  v_event_label text;
begin
  if new.estado is distinct from old.estado
     and new.estado in ('confirmado', 'cancelado') then
    select e.cerimonialista_id, public.event_label(e.type, e.client_id)
      into v_cerimonialista, v_event_label
    from public.events e where e.id = new.event_id;

    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (
      v_cerimonialista,
      'compromisso',
      new.titulo || case when new.estado = 'confirmado'
        then ' — confirmado' else ' — não poderá comparecer' end,
      coalesce(v_event_label, 'Evento'),
      '/eventos/' || new.event_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notificar_compromisso on public.compromisso;
create trigger trg_notificar_compromisso
  after update on public.compromisso
  for each row execute function public.notificar_resposta_compromisso();
