-- ============================================================
-- Vela — Migração 023: empresa_id para dados criados pela equipe
--
-- O trigger da 021 só derivava empresa_id quando quem criava era a
-- DONA da empresa (owner_user_id). Eventos/clientes criados por
-- membros da equipe (coordenadora, cerimonialista, assistente)
-- ficavam com empresa_id nulo. Agora o trigger também resolve a
-- empresa via membros_equipe, e o backfill cobre registros afetados.
--
-- Execute no SQL Editor do Supabase (depois da 022).
-- ============================================================

begin;

create or replace function public.fill_empresa_from_cerimonialista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null and new.cerimonialista_id is not null then
    -- 1º: é dona de empresa?
    select id into new.empresa_id
    from public.empresas where owner_user_id = new.cerimonialista_id;

    -- 2º: é membro da equipe de alguma empresa?
    if new.empresa_id is null then
      select empresa_id into new.empresa_id
      from public.membros_equipe
      where user_id = new.cerimonialista_id
      limit 1;
    end if;
  end if;
  return new;
end;
$$;

-- Backfill de registros criados por membros antes desta correção
update public.events e
set empresa_id = (
  select me.empresa_id from public.membros_equipe me
  where me.user_id = e.cerimonialista_id limit 1
)
where e.empresa_id is null and e.cerimonialista_id is not null;

update public.clients c
set empresa_id = (
  select me.empresa_id from public.membros_equipe me
  where me.user_id = c.cerimonialista_id limit 1
)
where c.empresa_id is null and c.cerimonialista_id is not null;

update public.suppliers s
set empresa_id = (
  select me.empresa_id from public.membros_equipe me
  where me.user_id = s.cerimonialista_id limit 1
)
where s.empresa_id is null and s.cerimonialista_id is not null;

update public.business_transactions b
set empresa_id = (
  select me.empresa_id from public.membros_equipe me
  where me.user_id = b.cerimonialista_id limit 1
)
where b.empresa_id is null and b.cerimonialista_id is not null;

update public.notifications n
set empresa_id = (
  select me.empresa_id from public.membros_equipe me
  where me.user_id = n.cerimonialista_id limit 1
)
where n.empresa_id is null and n.cerimonialista_id is not null;

update public.activities a
set empresa_id = (
  select me.empresa_id from public.membros_equipe me
  where me.user_id = a.cerimonialista_id limit 1
)
where a.empresa_id is null and a.cerimonialista_id is not null;

-- Filhas de events que herdaram o nulo
update public.tasks t set empresa_id = e.empresa_id
from public.events e where e.id = t.event_id and t.empresa_id is null;
update public.transactions tx set empresa_id = e.empresa_id
from public.events e where e.id = tx.event_id and tx.empresa_id is null;
update public.roteiro_items ri set empresa_id = e.empresa_id
from public.events e where e.id = ri.event_id and ri.empresa_id is null;
update public.roteiro_links rl set empresa_id = e.empresa_id
from public.events e where e.id = rl.event_id and rl.empresa_id is null;
update public.event_phases ep set empresa_id = e.empresa_id
from public.events e where e.id = ep.event_id and ep.empresa_id is null;
update public.event_messages em set empresa_id = e.empresa_id
from public.events e where e.id = em.event_id and em.empresa_id is null;
update public.supplier_confirmations sc set empresa_id = e.empresa_id
from public.events e where e.id = sc.event_id and sc.empresa_id is null;

-- Eventos sem responsável cuja empresa agora é conhecida: se quem criou
-- é membro da equipe, ele mesmo vira o responsável; senão, a dona.
update public.events e
set cerimonialista_responsavel_id = coalesce(
  (select me.id from public.membros_equipe me
   where me.user_id = e.cerimonialista_id
     and me.empresa_id = e.empresa_id limit 1),
  (select me.id from public.membros_equipe me
   where me.empresa_id = e.empresa_id and me.is_owner = true limit 1)
)
where e.cerimonialista_responsavel_id is null and e.empresa_id is not null;

commit;

-- VALIDAÇÃO (ambos devem retornar 0):
-- select count(*) from public.events where empresa_id is null;
-- select count(*) from public.events where cerimonialista_responsavel_id is null;
