-- ============================================================
-- Vela — Migração 085: bucket privado dos anexos do Planejamento
--
-- O campo tipado 'anexo' (083) guarda o caminho do Storage em
-- valor_texto — mas até aqui não havia onde subir o arquivo. Contrato
-- é documento sério (eventos até milionários): fica guardado DENTRO do
-- sistema, nunca como link solto de Drive/WeTransfer.
--
-- Bucket PRIVADO (diferente de event-covers/portfolio, que são públicos):
-- contrato não pode ter URL adivinhável. Leitura via URL assinada.
--
-- Molde das policies: 029/030 (pasta = event_id) + a lição da 030 — a
-- subquery em events dentro de policy de storage.objects esbarra no RLS,
-- então a permissão é resolvida por função SECURITY DEFINER dedicada,
-- aqui delegando às funções canônicas pode_ver_evento/pode_editar_evento
-- (o mesmo par que guarda todas as tabelas-filhas do evento).
--
-- Estrutura do arquivo: planejamento/{event_id}/{campo_id}/{nome}
--
-- Execute no SQL Editor do Supabase (depois da 084).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planejamento', 'planejamento', false, 10485760,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array[
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

-- ------------------------------------------------------------
-- Permissão por pasta (1º segmento do path = event_id).
-- Comparação por id::text — path malformado vira 'false', não erro de cast.
-- ------------------------------------------------------------

create or replace function public.pode_ver_anexo_planejamento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id::text = p_folder
      and public.pode_ver_evento(e.id)
  );
$$;

create or replace function public.pode_editar_anexo_planejamento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    where e.id::text = p_folder
      and public.pode_editar_evento(e.id)
  );
$$;

grant execute on function public.pode_ver_anexo_planejamento(text) to authenticated;
grant execute on function public.pode_editar_anexo_planejamento(text) to authenticated;

-- ------------------------------------------------------------
-- Policies (bucket privado: até o select é gated — URL assinada exige
-- que o dono da sessão possa ver o evento)
-- ------------------------------------------------------------

drop policy if exists "Planejamento anexos select" on storage.objects;
create policy "Planejamento anexos select"
  on storage.objects for select
  using (
    bucket_id = 'planejamento'
    and public.pode_ver_anexo_planejamento((storage.foldername(name))[1])
  );

drop policy if exists "Planejamento anexos insert" on storage.objects;
create policy "Planejamento anexos insert"
  on storage.objects for insert
  with check (
    bucket_id = 'planejamento'
    and public.pode_editar_anexo_planejamento((storage.foldername(name))[1])
  );

drop policy if exists "Planejamento anexos update" on storage.objects;
create policy "Planejamento anexos update"
  on storage.objects for update
  using (
    bucket_id = 'planejamento'
    and public.pode_editar_anexo_planejamento((storage.foldername(name))[1])
  );

drop policy if exists "Planejamento anexos delete" on storage.objects;
create policy "Planejamento anexos delete"
  on storage.objects for delete
  using (
    bucket_id = 'planejamento'
    and public.pode_editar_anexo_planejamento((storage.foldername(name))[1])
  );
