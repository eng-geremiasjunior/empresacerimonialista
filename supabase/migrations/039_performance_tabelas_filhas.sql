-- ============================================================
-- Vela — Migração 039: performance das tabelas-filhas (listagens).
--
-- CONTEXTO (medido depois da 038):
--   listar 50 eventos ..... 584ms -> 67ms  (RLS praticamente de graça)
--   100 tarefas ........... 186ms -> 169ms (sem RLS: 64ms)
--
--   As filhas ainda usam `pode_ver_evento(event_id)`: o argumento vem da
--   linha, então a função roda uma vez POR LINHA varrida, e cada execução
--   consulta events + membros_equipe.
--
-- FIX: `event_id in (select public.eventos_visiveis())`. A subconsulta
--      não referencia a linha, então o Postgres a executa UMA vez por
--      consulta e usa hash para testar cada linha.
--
-- ESCOPO: apenas as policies de SELECT (as listagens). As de
--   INSERT/UPDATE/DELETE seguem com pode_ver_evento/pode_editar_evento —
--   ali a checagem roda para uma linha só, não há ganho e mexer traria
--   risco desnecessário.
--
-- Semântica preservada: eventos_visiveis() aplica exatamente a mesma
-- regra de pode_ver_evento (proprietária/coordenadora, responsável,
-- criadora e participante), dentro da mesma empresa.
--
-- Execute no SQL Editor do Supabase (depois da 038).
-- ============================================================

begin;

create or replace function public.eventos_visiveis()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.events e, public.meu_cargo() mc
  where e.empresa_id = mc.empresa_id
    and (
      mc.cargo in ('proprietaria', 'coordenadora')
      or e.cerimonialista_responsavel_id = mc.membro_equipe_id
      or e.cerimonialista_id = auth.uid()
      or exists (
        select 1 from public.evento_participantes ep
        where ep.event_id = e.id
          and ep.membro_equipe_id = mc.membro_equipe_id
      )
    );
$$;

revoke all on function public.eventos_visiveis() from public, anon;
grant execute on function public.eventos_visiveis() to authenticated;

-- ------------------------------------------------------------
-- Listagens: uma avaliação por consulta em vez de uma por linha
-- ------------------------------------------------------------
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "roteiro_items_select" on public.roteiro_items;
create policy "roteiro_items_select" on public.roteiro_items
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "event_phases_select" on public.event_phases;
create policy "event_phases_select" on public.event_phases
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "event_messages_select" on public.event_messages;
create policy "event_messages_select" on public.event_messages
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "event_suppliers_select" on public.event_suppliers;
create policy "event_suppliers_select" on public.event_suppliers
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "roteiro_links_select" on public.roteiro_links;
create policy "roteiro_links_select" on public.roteiro_links
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "confirmations_select" on public.supplier_confirmations;
create policy "confirmations_select" on public.supplier_confirmations
  for select using (event_id in (select public.eventos_visiveis()));

drop policy if exists "participantes_select" on public.evento_participantes;
create policy "participantes_select" on public.evento_participantes
  for select using (event_id in (select public.eventos_visiveis()));

commit;
