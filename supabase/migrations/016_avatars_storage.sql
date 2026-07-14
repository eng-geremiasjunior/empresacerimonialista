-- ============================================================
-- Vela — Migração 016: fotos de perfil (Supabase Storage)
-- Execute no SQL Editor do Supabase (depois da 015).
--
-- Alternativa pelo dashboard: Storage > New bucket > "avatars"
-- (Public bucket ✓, File size limit 2MB) e as 4 políticas abaixo
-- em Storage > Policies. O SQL faz tudo de uma vez.
--
-- Estrutura de arquivo: avatars/{user_id}/avatar — o nome fixo permite
-- sobrescrever ao trocar a foto, e a política amarra a pasta ao auth.uid().
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Leitura pública (o bucket é público, a política cobre o acesso via API).
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload/alteração/remoção: só na própria pasta ({user_id}/...).
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
