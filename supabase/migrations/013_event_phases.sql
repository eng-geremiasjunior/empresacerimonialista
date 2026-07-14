-- ============================================================
-- Vela — Migração 013: fases do cronograma (event_phases)
-- Execute no SQL Editor do Supabase (depois da 012).
--
-- Cada evento recebe, na criação, as fases do TEMPLATE do seu tipo
-- (ver lib/event-templates.ts → gerarFasesPorTipo). Ex.: casamento =
-- Contrato → Planejamento → Reunião Final → Cerimônia → Recepção → Pós-evento.
-- ============================================================

create table if not exists public.event_phases (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  name       text not null,
  "order"    integer not null default 0,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_phases_event
  on public.event_phases (event_id, "order");

alter table public.event_phases enable row level security;

create policy "event_phases_own" on public.event_phases
  for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.cerimonialista_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.cerimonialista_id = auth.uid()
    )
  );
