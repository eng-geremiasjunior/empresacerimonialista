-- ============================================================
-- Vela — Migração 029: foto de capa do evento (Supabase Storage)
--
-- Bucket 'event-covers' público para leitura; upload/alteração/remoção
-- restritos a eventos da empresa do usuário (via meu_cargo(), migração 024).
-- Estrutura de arquivo: event-covers/{event_id}/cover — nome fixo permite
-- sobrescrever ao trocar a foto.
--
-- Execute no SQL Editor do Supabase (depois da 028).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers', 'event-covers', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Leitura pública
drop policy if exists "Event covers are publicly accessible" on storage.objects;
create policy "Event covers are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'event-covers');

-- A pasta (1º segmento do path) tem que ser um event_id da empresa do usuário.
drop policy if exists "Empresa can upload event covers" on storage.objects;
create policy "Empresa can upload event covers"
  on storage.objects for insert
  with check (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.empresa_id = (select empresa_id from public.meu_cargo())
    )
  );

drop policy if exists "Empresa can update event covers" on storage.objects;
create policy "Empresa can update event covers"
  on storage.objects for update
  using (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.empresa_id = (select empresa_id from public.meu_cargo())
    )
  );

drop policy if exists "Empresa can delete event covers" on storage.objects;
create policy "Empresa can delete event covers"
  on storage.objects for delete
  using (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.empresa_id = (select empresa_id from public.meu_cargo())
    )
  );

alter table public.events add column if not exists cover_image_url text;
