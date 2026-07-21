-- ============================================================
-- Vela — Migração 034: corrige "new row violates row-level security
-- policy for table events" ao criar evento.
--
-- DIAGNÓSTICO (medido no banco de produção):
--   * SELECT e UPDATE em events funcionam — essas policies usam funções
--     SECURITY DEFINER (pode_ver_evento / pode_editar_evento).
--   * INSERT em clients, tasks e suppliers funciona.
--   * INSERT em events falha para TODO MUNDO — inclusive a proprietária,
--     e mesmo passando empresa_id explicitamente igual ao de meu_cargo().
--     É a única policy de events que usa subquery inline
--     `(select empresa_id from meu_cargo())` no WITH CHECK.
--   Mesmo padrão do bug corrigido na migração 030: subquery inline dentro
--   de policy não avalia de forma confiável — a solução no projeto é
--   encapsular a regra numa função SECURITY DEFINER.
--
-- FIX (duas partes):
--   1) pode_criar_evento(empresa) + policy events_insert usando a função.
--   2) fill_empresa_from_cerimonialista() passa a resolver a empresa também
--      por membros_equipe. Sem isso, quem NÃO é dona da empresa
--      (coordenadora / cerimonialista da equipe) fica com empresa_id NULL
--      e continua barrada. Esse gatilho serve 7 tabelas (events, clients,
--      suppliers, business_transactions, notifications, activities, tasks).
--
-- Execute no SQL Editor do Supabase (depois da 033).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Regra de criação de evento numa função SECURITY DEFINER
-- ------------------------------------------------------------
create or replace function public.pode_criar_evento(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membros_equipe m
    where m.user_id = auth.uid()
      and m.status = 'ativo'
      and m.empresa_id = p_empresa_id
      and m.cargo in ('proprietaria', 'coordenadora', 'cerimonialista')
  );
$$;

revoke all on function public.pode_criar_evento(uuid) from public, anon;
grant execute on function public.pode_criar_evento(uuid) to authenticated;

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (public.pode_criar_evento(empresa_id));

-- ------------------------------------------------------------
-- 2) empresa_id também para quem é membro (não-proprietária)
-- ------------------------------------------------------------
create or replace function public.fill_empresa_from_cerimonialista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null and new.cerimonialista_id is not null then
    -- 1) empresa da qual a pessoa é proprietária
    select id into new.empresa_id
    from public.empresas
    where owner_user_id = new.cerimonialista_id
    limit 1;

    -- 2) senão, a empresa em que ela é membro ativo da equipe
    if new.empresa_id is null then
      select empresa_id into new.empresa_id
      from public.membros_equipe
      where user_id = new.cerimonialista_id
        and status = 'ativo'
      order by created_at
      limit 1;
    end if;
  end if;

  return new;
end;
$$;

commit;
