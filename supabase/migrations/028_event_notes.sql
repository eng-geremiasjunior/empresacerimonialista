-- ============================================================
-- Vela — Migração 028: notas rápidas do evento
--
-- Suporta a seção "Notas rápidas" do painel de Resumo do evento.
-- RLS segue a visibilidade do evento (funções pode_ver_evento /
-- pode_editar_evento da migração 024). Qualquer um que enxerga o evento
-- pode ler e adicionar nota; excluir só o autor ou quem edita o evento.
--
-- Execute no SQL Editor do Supabase (depois da 027).
-- ============================================================

create table if not exists public.event_notes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  content    text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_event_notes_event
  on public.event_notes (event_id, created_at desc);

alter table public.event_notes enable row level security;

drop policy if exists "event_notes_select" on public.event_notes;
create policy "event_notes_select" on public.event_notes
  for select using (public.pode_ver_evento(event_id));

drop policy if exists "event_notes_insert" on public.event_notes;
create policy "event_notes_insert" on public.event_notes
  for insert with check (
    author_id = auth.uid() and public.pode_ver_evento(event_id)
  );

drop policy if exists "event_notes_delete" on public.event_notes;
create policy "event_notes_delete" on public.event_notes
  for delete using (
    author_id = auth.uid() or public.pode_editar_evento(event_id)
  );
