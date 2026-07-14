-- ============================================================
-- Vela — Schema inicial (Supabase / Postgres)
-- Execute este arquivo no SQL Editor do painel do Supabase.
-- ============================================================

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------

create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  cerimonialista_id uuid not null references auth.users (id) on delete cascade,
  name              text not null,
  phone             text,
  email             text,
  created_at        timestamptz not null default now()
);

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  cerimonialista_id uuid not null references auth.users (id) on delete cascade,
  client_id         uuid references public.clients (id) on delete set null,
  type              text not null check (type in ('casamento', 'debutante')),
  date              date not null,
  location          text,
  status            text not null default 'orcamento'
                    check (status in ('orcamento', 'confirmado', 'concluido', 'cancelado')),
  created_at        timestamptz not null default now()
);

create table public.suppliers (
  id                uuid primary key default gen_random_uuid(),
  cerimonialista_id uuid not null references auth.users (id) on delete cascade,
  name              text not null,
  category          text,
  phone             text,
  notes             text,
  created_at        timestamptz not null default now()
);

create table public.event_suppliers (
  event_id    uuid not null references public.events (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  role        text,
  primary key (event_id, supplier_id)
);

create table public.roteiro_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  time        time not null,
  title       text not null,
  description text,
  supplier_id uuid references public.suppliers (id) on delete set null,
  "order"     integer not null default 0
);

create table public.budgets (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  status     text not null default 'rascunho'
             check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  total      numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.budget_items (
  id          uuid primary key default gen_random_uuid(),
  budget_id   uuid not null references public.budgets (id) on delete cascade,
  description text not null,
  value       numeric(12, 2) not null default 0
);

create table public.transactions (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  type     text not null check (type in ('receita', 'despesa')),
  value    numeric(12, 2) not null,
  due_date date,
  paid     boolean not null default false
);

create table public.tasks (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title    text not null,
  due_date date,
  notified boolean not null default false
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------

create index idx_clients_cerimonialista   on public.clients (cerimonialista_id);
create index idx_events_cerimonialista    on public.events (cerimonialista_id);
create index idx_events_client            on public.events (client_id);
create index idx_suppliers_cerimonialista on public.suppliers (cerimonialista_id);
create index idx_event_suppliers_supplier on public.event_suppliers (supplier_id);
create index idx_roteiro_items_event      on public.roteiro_items (event_id);
create index idx_budgets_event            on public.budgets (event_id);
create index idx_budget_items_budget      on public.budget_items (budget_id);
create index idx_transactions_event       on public.transactions (event_id);
create index idx_tasks_event              on public.tasks (event_id);

-- ------------------------------------------------------------
-- RLS — isolamento por cerimonialista_id
--
-- Tabelas com cerimonialista_id direto: política sobre a própria coluna.
-- Tabelas filhas (roteiro_items, budgets, etc.): política via join com events.
--
-- Obs.: o link público do roteiro (módulo 3) NÃO usará estas políticas —
-- será servido por rota server-side com chave service_role ou por uma
-- política anon adicional criada junto com aquele módulo.
-- ------------------------------------------------------------

alter table public.clients         enable row level security;
alter table public.events          enable row level security;
alter table public.suppliers       enable row level security;
alter table public.event_suppliers enable row level security;
alter table public.roteiro_items   enable row level security;
alter table public.budgets         enable row level security;
alter table public.budget_items    enable row level security;
alter table public.transactions    enable row level security;
alter table public.tasks           enable row level security;

create policy "clients_own" on public.clients
  for all
  using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

create policy "events_own" on public.events
  for all
  using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

create policy "suppliers_own" on public.suppliers
  for all
  using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

create policy "event_suppliers_own" on public.event_suppliers
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

create policy "roteiro_items_own" on public.roteiro_items
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

create policy "budgets_own" on public.budgets
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

create policy "budget_items_own" on public.budget_items
  for all
  using (
    exists (
      select 1
      from public.budgets b
      join public.events e on e.id = b.event_id
      where b.id = budget_id and e.cerimonialista_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.budgets b
      join public.events e on e.id = b.event_id
      where b.id = budget_id and e.cerimonialista_id = auth.uid()
    )
  );

create policy "transactions_own" on public.transactions
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

create policy "tasks_own" on public.tasks
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
