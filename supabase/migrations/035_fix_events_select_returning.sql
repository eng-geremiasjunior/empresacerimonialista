-- ============================================================
-- Vela — Migração 035: corrige de vez a criação de eventos.
--
-- CAUSA RAIZ (medida em produção, depois da 034):
--   O INSERT em events já passava, mas TODO insert do app usa
--   `RETURNING` (o wizard faz `insert ... returning id into v_event_id`
--   e o PostgREST usa Prefer: return=representation). Com RETURNING, a
--   linha nova também precisa passar pela policy de SELECT.
--
--   A policy events_select chama pode_ver_evento(id), que é STABLE e faz
--   `select 1 from public.events e where e.id = p_event_id`. Uma função
--   STABLE enxerga o snapshot do início do comando — onde a linha que
--   está sendo inserida AINDA NÃO EXISTE. Resultado: exists = false, a
--   policy de SELECT nega e o Postgres devolve
--   "new row violates row-level security policy for table events".
--
--   Por isso INSERT sem RETURNING funcionava e com RETURNING falhava, e
--   por isso clients/tasks/suppliers não sofriam: as policies de SELECT
--   delas olham as colunas da própria linha, sem reler a tabela.
--
-- FIX: policy de SELECT de events passa a avaliar as COLUNAS da linha
--      (sem reler events). Semântica preservada:
--        - proprietária/coordenadora veem tudo da empresa
--        - responsável pelo evento vê o evento
--        - participante (assistente) vê o evento
--        + quem criou o evento sempre vê (necessário para o RETURNING
--          de quem é cerimonialista e ainda não é responsável)
--
--   pode_ver_evento(uuid) continua existindo e inalterada — é usada por
--   outras policies/RPCs (roteiro_item_log, cronograma_evento, etc.).
--
-- Execute no SQL Editor do Supabase (depois da 034).
-- ============================================================

begin;

create or replace function public.pode_ver_evento_cols(
  p_empresa_id       uuid,
  p_responsavel_id   uuid,
  p_cerimonialista_id uuid,
  p_event_id         uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meu_cargo() mc
    where mc.empresa_id = p_empresa_id
      and (
        mc.cargo in ('proprietaria', 'coordenadora')
        or p_responsavel_id = mc.membro_equipe_id
        or p_cerimonialista_id = auth.uid()
        or exists (
          select 1 from public.evento_participantes ep
          where ep.event_id = p_event_id
            and ep.membro_equipe_id = mc.membro_equipe_id
        )
      )
  );
$$;

revoke all on function public.pode_ver_evento_cols(uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.pode_ver_evento_cols(uuid, uuid, uuid, uuid)
  to authenticated;

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
  for select using (
    public.pode_ver_evento_cols(
      empresa_id,
      cerimonialista_responsavel_id,
      cerimonialista_id,
      id
    )
  );

commit;
