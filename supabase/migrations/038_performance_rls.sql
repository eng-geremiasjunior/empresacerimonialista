-- ============================================================
-- Vela — Migração 038: performance das policies (RLS).
--
-- MEDIDO em produção (empresa sintética com 1.500 eventos):
--   listar 50 eventos ..... sem RLS  68ms | com RLS 584ms  (8,6x)
--   eventos + cliente ..... sem RLS  77ms | com RLS 607ms
--   100 tarefas ........... sem RLS  81ms | com RLS 186ms
--
-- POR QUÊ:
--   1) Não havia NENHUM índice em membros_equipe. meu_cargo() filtra por
--      user_id a cada chamada => varredura sequencial.
--   2) As policies chamam funções passando COLUNAS da linha
--      (pode_ver_evento(id), pode_ver_evento_cols(...)). Argumento por
--      linha impede o Postgres de calcular uma vez só: a função roda para
--      cada linha varrida — 1.500 execuções numa listagem, cada uma
--      consultando membros_equipe.
--
-- FIX (dois níveis):
--   1) Índices para as consultas que as policies fazem o tempo todo.
--   2) events_select reescrita em subconsultas NÃO correlacionadas
--      — `(select ... from meu_cargo())` sem referência à linha vira
--      InitPlan: o Postgres executa UMA vez por consulta e depois só
--      compara colunas. Semântica idêntica à 035+037:
--      proprietária/coordenadora, responsável, criadora e participante.
--
-- Execute no SQL Editor do Supabase (depois da 037).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Índices que faltavam
-- ------------------------------------------------------------
create index if not exists idx_membros_equipe_user
  on public.membros_equipe (user_id);
create index if not exists idx_membros_equipe_user_status
  on public.membros_equipe (user_id, status);
create index if not exists idx_membros_equipe_empresa
  on public.membros_equipe (empresa_id);

create index if not exists idx_evento_participantes_membro
  on public.evento_participantes (membro_equipe_id);
create index if not exists idx_evento_participantes_evento
  on public.evento_participantes (event_id);

create index if not exists idx_tasks_event on public.tasks (event_id);
create index if not exists idx_roteiro_items_event on public.roteiro_items (event_id);
create index if not exists idx_events_cerimonialista
  on public.events (cerimonialista_id);
create index if not exists idx_events_responsavel
  on public.events (cerimonialista_responsavel_id);

-- ------------------------------------------------------------
-- 2) events_select sem chamada por linha
-- ------------------------------------------------------------
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (
      (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
      or cerimonialista_id = (select auth.uid())
      or cerimonialista_responsavel_id =
         (select mc.membro_equipe_id from public.meu_cargo() mc)
      or id in (
        select ep.event_id
        from public.evento_participantes ep
        where ep.membro_equipe_id =
              (select mc.membro_equipe_id from public.meu_cargo() mc)
      )
    )
  );

commit;

-- ============================================================
-- Sobre as tabelas-filhas (tasks, roteiro_items, transactions...):
-- elas usam pode_ver_evento(event_id) — ainda uma chamada por linha.
-- Com os índices acima o custo cai bastante; se ainda pesar, o próximo
-- passo é trocar por `event_id in (select ... eventos_visiveis())`,
-- avaliado uma única vez por consulta.
-- ============================================================
