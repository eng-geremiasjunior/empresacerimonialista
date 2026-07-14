-- ============================================================
-- Vela — Migração 024: RLS por cargo (Etapa 4 de 5)
--
-- Visibilidade real por papel:
--   proprietaria  → tudo da empresa (inclusive financeiro da empresa)
--   coordenadora  → todos os eventos da empresa (sem financeiro da empresa)
--   cerimonialista→ apenas eventos onde é a responsável
--   assistente    → apenas eventos onde está em evento_participantes
--                   (pode ver/atualizar tarefas; não exclui nada crítico)
--
-- ROLLBACK: supabase/migrations/024_rollback_rls_por_cargo.sql
-- Execute no SQL Editor do Supabase (depois da 023).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Participantes de evento (vínculo para Assistentes)
-- ------------------------------------------------------------

create table if not exists public.evento_participantes (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  membro_equipe_id uuid not null references public.membros_equipe (id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique (event_id, membro_equipe_id)
);

alter table public.evento_participantes enable row level security;

-- ------------------------------------------------------------
-- 2) Funções auxiliares (SECURITY DEFINER: leem sem RLS, evitando
--    recursão e repetição de subqueries em todas as policies)
-- ------------------------------------------------------------

create or replace function public.meu_cargo()
returns table(empresa_id uuid, cargo text, membro_equipe_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id, cargo, id
  from public.membros_equipe
  where user_id = auth.uid() and status = 'ativo'
  order by created_at asc
  limit 1;
$$;

create or replace function public.pode_ver_evento(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e, public.meu_cargo() mc
    where e.id = p_event_id
      and e.empresa_id = mc.empresa_id
      and (
        mc.cargo in ('proprietaria', 'coordenadora')
        or e.cerimonialista_responsavel_id = mc.membro_equipe_id
        or exists (
          select 1 from public.evento_participantes ep
          where ep.event_id = e.id
            and ep.membro_equipe_id = mc.membro_equipe_id
        )
      )
  );
$$;

-- Edição: igual à visibilidade, MENOS assistentes (participantes).
create or replace function public.pode_editar_evento(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e, public.meu_cargo() mc
    where e.id = p_event_id
      and e.empresa_id = mc.empresa_id
      and (
        mc.cargo in ('proprietaria', 'coordenadora')
        or e.cerimonialista_responsavel_id = mc.membro_equipe_id
      )
  );
$$;

grant execute on function public.meu_cargo() to authenticated;
grant execute on function public.pode_ver_evento(uuid) to authenticated;
grant execute on function public.pode_editar_evento(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) Cadastro novo pelo /login ("Criar conta gratuita") ganha empresa
--    própria automaticamente. Membros criados pela Admin API levam a
--    flag equipe=true nos metadados e NÃO ganham empresa própria.
-- ------------------------------------------------------------

create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'equipe', '') = 'true' then
    return new; -- membro de equipe: o registro é feito pela Admin API
  end if;

  insert into public.empresas (nome, owner_user_id)
  values (coalesce(new.raw_user_meta_data->>'name', 'Minha Empresa'), new.id)
  on conflict (owner_user_id) do nothing;

  insert into public.membros_equipe
    (empresa_id, user_id, nome, email, cargo, status, is_owner)
  select e.id, new.id,
         coalesce(new.raw_user_meta_data->>'name', 'Proprietária'),
         new.email, 'proprietaria', 'ativo', true
  from public.empresas e
  where e.owner_user_id = new.id
    and not exists (
      select 1 from public.membros_equipe m where m.user_id = new.id
    );

  return new;
end;
$$;

drop trigger if exists trg_handle_novo_usuario on auth.users;
create trigger trg_handle_novo_usuario
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- ------------------------------------------------------------
-- 4) EVENTS
-- ------------------------------------------------------------

drop policy if exists "events_own" on public.events;

create policy "events_select" on public.events
  for select using (public.pode_ver_evento(id));

create policy "events_insert" on public.events
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );

create policy "events_update" on public.events
  for update
  using (public.pode_editar_evento(id))
  with check (empresa_id = (select empresa_id from public.meu_cargo()));

create policy "events_delete" on public.events
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
  );

-- ------------------------------------------------------------
-- 5) EVENTO_PARTICIPANTES (gestão pelos que editam o evento)
-- ------------------------------------------------------------

drop policy if exists "participantes_select" on public.evento_participantes;
create policy "participantes_select" on public.evento_participantes
  for select using (public.pode_ver_evento(event_id));

drop policy if exists "participantes_insert" on public.evento_participantes;
create policy "participantes_insert" on public.evento_participantes
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists "participantes_delete" on public.evento_participantes;
create policy "participantes_delete" on public.evento_participantes
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 6) TASKS (assistente vê e atualiza; não exclui)
-- ------------------------------------------------------------

drop policy if exists "tasks_own" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (public.pode_ver_evento(event_id));
create policy "tasks_insert" on public.tasks
  for insert with check (public.pode_ver_evento(event_id));
create policy "tasks_update" on public.tasks
  for update using (public.pode_ver_evento(event_id));
create policy "tasks_delete" on public.tasks
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 7) TRANSACTIONS (financeiro DO EVENTO: assistente só lê)
-- ------------------------------------------------------------

drop policy if exists "transactions_own" on public.transactions;

create policy "transactions_select" on public.transactions
  for select using (public.pode_ver_evento(event_id));
create policy "transactions_insert" on public.transactions
  for insert with check (public.pode_editar_evento(event_id));
create policy "transactions_update" on public.transactions
  for update using (public.pode_editar_evento(event_id));
create policy "transactions_delete" on public.transactions
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 8) BUSINESS_TRANSACTIONS (financeiro DA EMPRESA: só proprietária)
-- ------------------------------------------------------------

drop policy if exists "business_transactions_own" on public.business_transactions;

create policy "business_transactions_proprietaria" on public.business_transactions
  for all
  using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) = 'proprietaria'
  )
  with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 9) Tabelas-filhas do evento: seguem a visibilidade do pai
-- ------------------------------------------------------------

drop policy if exists "roteiro_items_own" on public.roteiro_items;
create policy "roteiro_items_select" on public.roteiro_items
  for select using (public.pode_ver_evento(event_id));
create policy "roteiro_items_write" on public.roteiro_items
  for insert with check (public.pode_editar_evento(event_id));
create policy "roteiro_items_update" on public.roteiro_items
  for update using (public.pode_editar_evento(event_id));
create policy "roteiro_items_delete" on public.roteiro_items
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists "roteiro_links_own" on public.roteiro_links;
create policy "roteiro_links_select" on public.roteiro_links
  for select using (public.pode_ver_evento(event_id));
create policy "roteiro_links_write" on public.roteiro_links
  for insert with check (public.pode_editar_evento(event_id));
create policy "roteiro_links_update" on public.roteiro_links
  for update using (public.pode_editar_evento(event_id));
create policy "roteiro_links_delete" on public.roteiro_links
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists "event_phases_own" on public.event_phases;
create policy "event_phases_select" on public.event_phases
  for select using (public.pode_ver_evento(event_id));
create policy "event_phases_write" on public.event_phases
  for insert with check (public.pode_editar_evento(event_id));
create policy "event_phases_update" on public.event_phases
  for update using (public.pode_editar_evento(event_id));
create policy "event_phases_delete" on public.event_phases
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists "event_messages_cerimonialista" on public.event_messages;
create policy "event_messages_select" on public.event_messages
  for select using (public.pode_ver_evento(event_id));
create policy "event_messages_insert" on public.event_messages
  for insert with check (public.pode_ver_evento(event_id));
create policy "event_messages_update" on public.event_messages
  for update using (public.pode_ver_evento(event_id));
create policy "event_messages_delete" on public.event_messages
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists "confirmations_own" on public.supplier_confirmations;
create policy "confirmations_select" on public.supplier_confirmations
  for select using (public.pode_ver_evento(event_id));
create policy "confirmations_write" on public.supplier_confirmations
  for insert with check (public.pode_editar_evento(event_id));
create policy "confirmations_update" on public.supplier_confirmations
  for update using (public.pode_editar_evento(event_id));
create policy "confirmations_delete" on public.supplier_confirmations
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists "event_suppliers_own" on public.event_suppliers;
create policy "event_suppliers_select" on public.event_suppliers
  for select using (public.pode_ver_evento(event_id));
create policy "event_suppliers_write" on public.event_suppliers
  for insert with check (public.pode_editar_evento(event_id));
create policy "event_suppliers_delete" on public.event_suppliers
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 10) SUPPLIERS (agenda de fornecedores: compartilhada na empresa;
--     leitura para toda a equipe, escrita sem assistente)
-- ------------------------------------------------------------

drop policy if exists "suppliers_own" on public.suppliers;

create policy "suppliers_select" on public.suppliers
  for select using (
    empresa_id = (select empresa_id from public.meu_cargo())
  );
create policy "suppliers_insert" on public.suppliers
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );
create policy "suppliers_update" on public.suppliers
  for update using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );
create policy "suppliers_delete" on public.suppliers
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
  );

-- ------------------------------------------------------------
-- 11) CLIENTS (quem tem acesso a um evento do cliente vê o cadastro)
-- ------------------------------------------------------------

drop policy if exists "clients_own" on public.clients;

create policy "clients_select" on public.clients
  for select using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (
      (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
      or exists (
        select 1 from public.events e
        where e.client_id = clients.id and public.pode_ver_evento(e.id)
      )
    )
  );
create policy "clients_insert" on public.clients
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );
create policy "clients_update" on public.clients
  for update using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (
      (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
      or exists (
        select 1 from public.events e
        where e.client_id = clients.id and public.pode_editar_evento(e.id)
      )
    )
  );
create policy "clients_delete" on public.clients
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
  );

-- ------------------------------------------------------------
-- 12) ACTIVITIES (feed: dona/coordenadora veem o da empresa inteira;
--     demais veem as próprias ações; escrita continua própria)
-- ------------------------------------------------------------

drop policy if exists "activities_own" on public.activities;

create policy "activities_select" on public.activities
  for select using (
    cerimonialista_id = auth.uid()
    or (
      empresa_id = (select empresa_id from public.meu_cargo())
      and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
    )
  );
create policy "activities_write" on public.activities
  for insert with check (cerimonialista_id = auth.uid());
create policy "activities_delete" on public.activities
  for delete using (cerimonialista_id = auth.uid());

-- notifications: permanecem PESSOAIS (sino de quem recebe) — a policy
-- "notifications_own" (cerimonialista_id = auth.uid()) não muda.

-- ------------------------------------------------------------
-- 13) EMPRESAS e MEMBROS_EQUIPE: equipe pode LER (selects de
--     responsável, tela de equipe); gestão continua só da dona.
-- ------------------------------------------------------------

drop policy if exists "empresas_membros_select" on public.empresas;
create policy "empresas_membros_select" on public.empresas
  for select using (id = (select empresa_id from public.meu_cargo()));
-- (a policy "empresas_owner" FOR ALL continua valendo para a dona)

drop policy if exists "membros_equipe_empresa" on public.membros_equipe;

create policy "membros_select" on public.membros_equipe
  for select using (
    empresa_id = (select empresa_id from public.meu_cargo())
  );
create policy "membros_insert" on public.membros_equipe
  for insert with check (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  );
create policy "membros_update" on public.membros_equipe
  for update using (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  );
create policy "membros_delete" on public.membros_equipe
  for delete using (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  );

commit;

-- ============================================================
-- VALIDAÇÃO RÁPIDA (rode logado como cada perfil, ou via testes):
-- select * from public.meu_cargo();
-- select count(*) from public.events;  -- deve variar por cargo
-- ============================================================
