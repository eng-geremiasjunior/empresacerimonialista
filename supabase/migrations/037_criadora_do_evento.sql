-- ============================================================
-- Vela — Migração 037: quem cria o evento tem acesso a ele.
--
-- CAUSA:
--   Na 035 a policy de SELECT de events passou a reconhecer a criadora,
--   mas pode_ver_evento(uuid) / pode_editar_evento(uuid) ficaram como
--   estavam. Todas as tabelas-filhas usam essas funções — tasks,
--   event_phases, roteiro_items, transactions, etc.
--
--   Regra atual, para quem não é proprietária/coordenadora: só vê o
--   evento se for a RESPONSÁVEL (cerimonialista_responsavel_id) ou uma
--   participante. Uma cerimonialista que cria um evento sem se atribuir
--   como responsável fica sem acesso ao próprio evento — e o wizard, que
--   insere as tarefas do template logo depois, falhava com
--   "new row violates row-level security policy for table tasks".
--
-- FIX: as duas funções passam a considerar também
--      events.cerimonialista_id = auth.uid() (quem criou o evento).
--      O escopo por empresa continua igual — nada muda entre empresas,
--      nem para proprietária/coordenadora/responsável/participante.
--
-- Execute no SQL Editor do Supabase (depois da 036).
-- ============================================================

begin;

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
        or e.cerimonialista_id = auth.uid()
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
        or e.cerimonialista_id = auth.uid()
      )
  );
$$;

commit;
