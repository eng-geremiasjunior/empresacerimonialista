-- ============================================================
-- Vela — Migração 002: módulo Roteiro do Evento
-- Execute no SQL Editor do Supabase (depois do schema.sql).
-- ============================================================

-- Status operacional de cada item do roteiro (dia do evento)
alter table public.roteiro_items
  add column if not exists status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluido')),
  add column if not exists created_at timestamptz not null default now();

-- Links públicos do roteiro, um por (evento, fornecedor).
-- O hash é a única credencial de acesso — sem login.
create table if not exists public.roteiro_links (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  hash        text not null unique,
  created_at  timestamptz not null default now(),
  unique (event_id, supplier_id)
);

create index if not exists idx_roteiro_links_event on public.roteiro_links (event_id);

alter table public.roteiro_links enable row level security;

create policy "roteiro_links_own" on public.roteiro_links
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

-- Função pública (security definer): dado o hash do link, devolve o roteiro
-- APENAS do fornecedor daquele link. É o que a página pública consome via RPC,
-- sem expor políticas anon nas tabelas.
create or replace function public.roteiro_publico(link_hash text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'event', jsonb_build_object(
      'type', e.type,
      'date', e.date,
      'location', e.location,
      'client_name', c.name
    ),
    'supplier', jsonb_build_object('name', s.name),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'time', ri.time,
            'title', ri.title,
            'description', ri.description,
            'status', ri.status
          )
          order by ri.time
        )
        from public.roteiro_items ri
        where ri.event_id = l.event_id
          and ri.supplier_id = l.supplier_id
      ),
      '[]'::jsonb
    )
  )
  from public.roteiro_links l
  join public.events e on e.id = l.event_id
  join public.suppliers s on s.id = l.supplier_id
  left join public.clients c on c.id = e.client_id
  where l.hash = link_hash
$$;

grant execute on function public.roteiro_publico(text) to anon, authenticated;
