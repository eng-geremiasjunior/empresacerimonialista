-- ============================================================
-- Vela — Migração 030: corrige as policies de upload da capa do evento
--
-- A policy de insert da 029 fazia uma subquery em public.events (que tem
-- RLS própria + funções SECURITY DEFINER) dentro do contexto da policy de
-- storage.objects, e o check falhava ("new row violates row-level security
-- policy"). Aqui trocamos por uma função SECURITY DEFINER dedicada que
-- resolve a empresa sem depender do RLS de events.
--
-- Execute no SQL Editor do Supabase (depois da 029).
-- ============================================================

create or replace function public.pode_gerenciar_capa(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e, public.meu_cargo() mc
    where e.id::text = p_folder
      and e.empresa_id = mc.empresa_id
  );
$$;

grant execute on function public.pode_gerenciar_capa(text) to authenticated;

drop policy if exists "Empresa can upload event covers" on storage.objects;
create policy "Empresa can upload event covers"
  on storage.objects for insert
  with check (
    bucket_id = 'event-covers'
    and public.pode_gerenciar_capa((storage.foldername(name))[1])
  );

drop policy if exists "Empresa can update event covers" on storage.objects;
create policy "Empresa can update event covers"
  on storage.objects for update
  using (
    bucket_id = 'event-covers'
    and public.pode_gerenciar_capa((storage.foldername(name))[1])
  );

drop policy if exists "Empresa can delete event covers" on storage.objects;
create policy "Empresa can delete event covers"
  on storage.objects for delete
  using (
    bucket_id = 'event-covers'
    and public.pode_gerenciar_capa((storage.foldername(name))[1])
  );
