-- ============================================================
-- Vela — ROLLBACK da migração 024 (RLS por cargo)
--
-- Restaura as policies originais (isolamento por cerimonialista_id,
-- como era antes da Etapa 4). Rode APENAS se algo der errado.
-- Mantém a tabela evento_participantes e as funções auxiliares
-- (inofensivas sem as policies novas).
-- ============================================================

begin;

-- EVENTS ------------------------------------------------------
drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;
create policy "events_own" on public.events
  for all using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- TASKS -------------------------------------------------------
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_own" on public.tasks
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- TRANSACTIONS ------------------------------------------------
drop policy if exists "transactions_select" on public.transactions;
drop policy if exists "transactions_insert" on public.transactions;
drop policy if exists "transactions_update" on public.transactions;
drop policy if exists "transactions_delete" on public.transactions;
create policy "transactions_own" on public.transactions
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- BUSINESS_TRANSACTIONS --------------------------------------
drop policy if exists "business_transactions_proprietaria" on public.business_transactions;
create policy "business_transactions_own" on public.business_transactions
  for all using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- ROTEIRO_ITEMS ----------------------------------------------
drop policy if exists "roteiro_items_select" on public.roteiro_items;
drop policy if exists "roteiro_items_write" on public.roteiro_items;
drop policy if exists "roteiro_items_update" on public.roteiro_items;
drop policy if exists "roteiro_items_delete" on public.roteiro_items;
create policy "roteiro_items_own" on public.roteiro_items
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- ROTEIRO_LINKS ----------------------------------------------
drop policy if exists "roteiro_links_select" on public.roteiro_links;
drop policy if exists "roteiro_links_write" on public.roteiro_links;
drop policy if exists "roteiro_links_update" on public.roteiro_links;
drop policy if exists "roteiro_links_delete" on public.roteiro_links;
create policy "roteiro_links_own" on public.roteiro_links
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- EVENT_PHASES ------------------------------------------------
drop policy if exists "event_phases_select" on public.event_phases;
drop policy if exists "event_phases_write" on public.event_phases;
drop policy if exists "event_phases_update" on public.event_phases;
drop policy if exists "event_phases_delete" on public.event_phases;
create policy "event_phases_own" on public.event_phases
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- EVENT_MESSAGES ----------------------------------------------
drop policy if exists "event_messages_select" on public.event_messages;
drop policy if exists "event_messages_insert" on public.event_messages;
drop policy if exists "event_messages_update" on public.event_messages;
drop policy if exists "event_messages_delete" on public.event_messages;
create policy "event_messages_cerimonialista" on public.event_messages
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- SUPPLIER_CONFIRMATIONS --------------------------------------
drop policy if exists "confirmations_select" on public.supplier_confirmations;
drop policy if exists "confirmations_write" on public.supplier_confirmations;
drop policy if exists "confirmations_update" on public.supplier_confirmations;
drop policy if exists "confirmations_delete" on public.supplier_confirmations;
create policy "confirmations_own" on public.supplier_confirmations
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- EVENT_SUPPLIERS ---------------------------------------------
drop policy if exists "event_suppliers_select" on public.event_suppliers;
drop policy if exists "event_suppliers_write" on public.event_suppliers;
drop policy if exists "event_suppliers_delete" on public.event_suppliers;
create policy "event_suppliers_own" on public.event_suppliers
  for all using (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  )
  with check (
    exists (select 1 from public.events e
            where e.id = event_id and e.cerimonialista_id = auth.uid())
  );

-- SUPPLIERS ---------------------------------------------------
drop policy if exists "suppliers_select" on public.suppliers;
drop policy if exists "suppliers_insert" on public.suppliers;
drop policy if exists "suppliers_update" on public.suppliers;
drop policy if exists "suppliers_delete" on public.suppliers;
create policy "suppliers_own" on public.suppliers
  for all using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- CLIENTS -----------------------------------------------------
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;
create policy "clients_own" on public.clients
  for all using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- ACTIVITIES --------------------------------------------------
drop policy if exists "activities_select" on public.activities;
drop policy if exists "activities_write" on public.activities;
drop policy if exists "activities_delete" on public.activities;
create policy "activities_own" on public.activities
  for all using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- EVENTO_PARTICIPANTES (fica sem policies novas = ninguém acessa) --
drop policy if exists "participantes_select" on public.evento_participantes;
drop policy if exists "participantes_insert" on public.evento_participantes;
drop policy if exists "participantes_delete" on public.evento_participantes;

-- EMPRESAS / MEMBROS_EQUIPE ----------------------------------
drop policy if exists "empresas_membros_select" on public.empresas;

drop policy if exists "membros_select" on public.membros_equipe;
drop policy if exists "membros_insert" on public.membros_equipe;
drop policy if exists "membros_update" on public.membros_equipe;
drop policy if exists "membros_delete" on public.membros_equipe;
create policy "membros_equipe_empresa" on public.membros_equipe
  for all using (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  )
  with check (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  );

-- Trigger de signup (novo cadastro deixa de ganhar empresa) ----
drop trigger if exists trg_handle_novo_usuario on auth.users;

commit;
