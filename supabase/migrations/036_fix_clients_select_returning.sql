-- ============================================================
-- Vela — Migração 036: cerimonialista consegue criar evento com
-- cliente novo.
--
-- CAUSA (mesma classe da 035, agora em clients):
--   O wizard cria o CLIENTE antes do evento, com
--   `insert into clients ... returning id`. Com RETURNING, a linha nova
--   precisa passar pela policy de SELECT.
--
--   clients_select exige, para quem NÃO é proprietária/coordenadora,
--   que exista um evento daquele cliente visível para a pessoa. No
--   momento em que o cliente é criado ainda não existe evento algum —
--   então a policy nega e o Postgres devolve
--   "new row violates row-level security policy for table clients".
--
--   Efeito: proprietária e coordenadora criavam evento normalmente;
--   cerimonialista da equipe não conseguia (só com cliente novo).
--
-- FIX: quem cadastrou o cliente sempre enxerga o próprio cadastro
--      (clients.cerimonialista_id = auth.uid()). O restante da regra
--      continua igual: dona/coordenadora veem todos da empresa; demais
--      veem os clientes dos eventos a que têm acesso.
--
-- Execute no SQL Editor do Supabase (depois da 035).
-- ============================================================

begin;

drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (
      (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
      or cerimonialista_id = auth.uid()
      or exists (
        select 1 from public.events e
        where e.client_id = clients.id and public.pode_ver_evento(e.id)
      )
    )
  );

-- Mesma lacuna na edição: quem cadastrou pode ajustar o cadastro
-- (ex.: corrigir telefone logo após criar) mesmo antes de existir evento.
drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (
      (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
      or cerimonialista_id = auth.uid()
      or exists (
        select 1 from public.events e
        where e.client_id = clients.id and public.pode_editar_evento(e.id)
      )
    )
  );

commit;
