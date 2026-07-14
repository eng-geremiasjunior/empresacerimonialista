-- ============================================================
-- Vela — Migração 021: fundação multiusuário (Etapa 1 de 5)
-- Empresas + Membros da Equipe + coluna empresa_id em todas as
-- tabelas de dados, com backfill a partir do cerimonialista_id.
--
-- ESTA ETAPA NÃO MUDA O COMPORTAMENTO DO SISTEMA:
--  - nenhuma política de RLS existente é alterada
--  - cerimonialista_id continua em todas as tabelas, intocado
--  - nenhuma tela ou formulário depende das novas estruturas ainda
--
-- Execute no SQL Editor do Supabase (depois da 020).
-- Transacional: se qualquer passo falhar, nada é aplicado.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Tabela empresas
-- ------------------------------------------------------------

create table if not exists public.empresas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  owner_user_id uuid not null references auth.users (id),
  created_at    timestamptz not null default now()
);

-- Um owner só pode ter uma empresa (invariante do backfill e das etapas
-- seguintes; se um dia houver multi-empresa por usuário, revisar aqui).
create unique index if not exists uq_empresas_owner
  on public.empresas (owner_user_id);

alter table public.empresas enable row level security;

-- Política simples por enquanto: o owner vê a própria empresa.
-- (Será refinada na Etapa 4, quando existirem outros cargos.)
drop policy if exists "empresas_owner" on public.empresas;
create policy "empresas_owner" on public.empresas
  for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- ------------------------------------------------------------
-- 2) Tabela membros_equipe
-- ------------------------------------------------------------

create table if not exists public.membros_equipe (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  -- pode ser null temporariamente: cadastro do membro antes do login
  -- (o login será criado na Etapa 2 via Admin API)
  user_id        uuid references auth.users (id),
  nome           text not null,
  email          text,
  cargo          text not null default 'proprietaria'
                 check (cargo in ('proprietaria', 'coordenadora', 'cerimonialista', 'assistente')),
  especialidades text[],
  status         text not null default 'ativo'
                 check (status in ('ativo', 'inativo')),
  is_owner       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Um mesmo login não pode ser membro duplicado da mesma empresa
create unique index if not exists uq_membros_empresa_user
  on public.membros_equipe (empresa_id, user_id)
  where user_id is not null;

-- Só existe uma proprietária por empresa
create unique index if not exists uq_membros_owner_por_empresa
  on public.membros_equipe (empresa_id)
  where is_owner;

create index if not exists idx_membros_empresa
  on public.membros_equipe (empresa_id);

alter table public.membros_equipe enable row level security;

-- Política simples por enquanto: só a dona da empresa vê os membros.
drop policy if exists "membros_equipe_empresa" on public.membros_equipe;
create policy "membros_equipe_empresa" on public.membros_equipe
  for all
  using (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  )
  with check (
    empresa_id in (select id from public.empresas where owner_user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 3) Backfill: uma empresa + registro de proprietária para cada
--    usuário que já possui dados no sistema (união de TODAS as
--    tabelas com cerimonialista_id, não só events — um usuário pode
--    ter clientes/fornecedores sem ter criado eventos ainda).
-- ------------------------------------------------------------

do $$
declare
  v_user_id    uuid;
  v_empresa_id uuid;
begin
  for v_user_id in
    select distinct cerimonialista_id from public.events    where cerimonialista_id is not null
    union
    select distinct cerimonialista_id from public.clients   where cerimonialista_id is not null
    union
    select distinct cerimonialista_id from public.suppliers where cerimonialista_id is not null
    union
    select distinct cerimonialista_id from public.business_transactions where cerimonialista_id is not null
    union
    select distinct cerimonialista_id from public.notifications where cerimonialista_id is not null
    union
    select distinct cerimonialista_id from public.activities where cerimonialista_id is not null
  loop
    v_empresa_id := null;

    insert into public.empresas (nome, owner_user_id)
    select
      coalesce(
        (select raw_user_meta_data->>'name' from auth.users where id = v_user_id),
        'Minha Empresa'
      ),
      v_user_id
    where not exists (select 1 from public.empresas where owner_user_id = v_user_id)
    returning id into v_empresa_id;

    if v_empresa_id is null then
      select id into v_empresa_id from public.empresas where owner_user_id = v_user_id;
    end if;

    insert into public.membros_equipe
      (empresa_id, user_id, nome, email, cargo, status, is_owner)
    select
      v_empresa_id,
      v_user_id,
      coalesce(
        (select raw_user_meta_data->>'name' from auth.users where id = v_user_id),
        'Proprietária'
      ),
      (select email from auth.users where id = v_user_id),
      'proprietaria',
      'ativo',
      true
    where not exists (
      select 1 from public.membros_equipe where user_id = v_user_id and is_owner = true
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4) Coluna empresa_id em todas as tabelas de dados
--    (cerimonialista_id permanece; as duas coexistem até a Etapa 4)
-- ------------------------------------------------------------

-- Tabelas com cerimonialista_id direto
alter table public.events                add column if not exists empresa_id uuid references public.empresas (id);
alter table public.clients               add column if not exists empresa_id uuid references public.empresas (id);
alter table public.suppliers             add column if not exists empresa_id uuid references public.empresas (id);
alter table public.business_transactions add column if not exists empresa_id uuid references public.empresas (id);
alter table public.notifications         add column if not exists empresa_id uuid references public.empresas (id);
alter table public.activities            add column if not exists empresa_id uuid references public.empresas (id);

-- Tabelas vinculadas via event_id (herdam a empresa do evento)
alter table public.tasks                  add column if not exists empresa_id uuid references public.empresas (id);
alter table public.transactions           add column if not exists empresa_id uuid references public.empresas (id);
alter table public.roteiro_items          add column if not exists empresa_id uuid references public.empresas (id);
alter table public.roteiro_links          add column if not exists empresa_id uuid references public.empresas (id);
alter table public.event_phases           add column if not exists empresa_id uuid references public.empresas (id);
alter table public.event_messages         add column if not exists empresa_id uuid references public.empresas (id);
alter table public.supplier_confirmations add column if not exists empresa_id uuid references public.empresas (id);
alter table public.event_suppliers        add column if not exists empresa_id uuid references public.empresas (id);
alter table public.budgets                add column if not exists empresa_id uuid references public.empresas (id);
alter table public.budget_items           add column if not exists empresa_id uuid references public.empresas (id);

-- ------------------------------------------------------------
-- 5) Backfill de empresa_id
-- ------------------------------------------------------------

-- Diretas: pelo cerimonialista_id
update public.events    e set empresa_id = emp.id from public.empresas emp where emp.owner_user_id = e.cerimonialista_id and e.empresa_id is null;
update public.clients   c set empresa_id = emp.id from public.empresas emp where emp.owner_user_id = c.cerimonialista_id and c.empresa_id is null;
update public.suppliers s set empresa_id = emp.id from public.empresas emp where emp.owner_user_id = s.cerimonialista_id and s.empresa_id is null;
update public.business_transactions b set empresa_id = emp.id from public.empresas emp where emp.owner_user_id = b.cerimonialista_id and b.empresa_id is null;
update public.notifications n set empresa_id = emp.id from public.empresas emp where emp.owner_user_id = n.cerimonialista_id and n.empresa_id is null;
update public.activities  a set empresa_id = emp.id from public.empresas emp where emp.owner_user_id = a.cerimonialista_id and a.empresa_id is null;

-- Via event_id: herdam do evento
update public.tasks                  t  set empresa_id = e.empresa_id from public.events e where e.id = t.event_id  and t.empresa_id  is null;
update public.transactions           tx set empresa_id = e.empresa_id from public.events e where e.id = tx.event_id and tx.empresa_id is null;
update public.roteiro_items          ri set empresa_id = e.empresa_id from public.events e where e.id = ri.event_id and ri.empresa_id is null;
update public.roteiro_links          rl set empresa_id = e.empresa_id from public.events e where e.id = rl.event_id and rl.empresa_id is null;
update public.event_phases           ep set empresa_id = e.empresa_id from public.events e where e.id = ep.event_id and ep.empresa_id is null;
update public.event_messages         em set empresa_id = e.empresa_id from public.events e where e.id = em.event_id and em.empresa_id is null;
update public.supplier_confirmations sc set empresa_id = e.empresa_id from public.events e where e.id = sc.event_id and sc.empresa_id is null;
update public.event_suppliers        es set empresa_id = e.empresa_id from public.events e where e.id = es.event_id and es.empresa_id is null;
update public.budgets                bg set empresa_id = e.empresa_id from public.events e where e.id = bg.event_id and bg.empresa_id is null;

-- budget_items herda via budgets
update public.budget_items bi set empresa_id = bg.empresa_id
from public.budgets bg where bg.id = bi.budget_id and bi.empresa_id is null;

-- Índices para as consultas por empresa das próximas etapas
create index if not exists idx_events_empresa    on public.events (empresa_id);
create index if not exists idx_clients_empresa   on public.clients (empresa_id);
create index if not exists idx_suppliers_empresa on public.suppliers (empresa_id);
create index if not exists idx_tasks_empresa     on public.tasks (empresa_id);
create index if not exists idx_transactions_empresa on public.transactions (empresa_id);
create index if not exists idx_business_tx_empresa  on public.business_transactions (empresa_id);

-- ------------------------------------------------------------
-- 6) Triggers de preenchimento automático: o app ainda não conhece
--    empresa_id (Etapa 1 não muda telas nem queries), então INSERTs
--    novos preencheriam NULL e os dados divergiriam até a Etapa 4.
--    Estes triggers derivam o empresa_id sozinhos, sem mudar nenhum
--    comportamento visível.
-- ------------------------------------------------------------

-- Para tabelas com cerimonialista_id direto
create or replace function public.fill_empresa_from_cerimonialista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null and new.cerimonialista_id is not null then
    select id into new.empresa_id
    from public.empresas where owner_user_id = new.cerimonialista_id;
  end if;
  return new;
end;
$$;

-- Para tabelas vinculadas via event_id
create or replace function public.fill_empresa_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null and new.event_id is not null then
    select empresa_id into new.empresa_id
    from public.events where id = new.event_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fill_empresa on public.events;
create trigger trg_fill_empresa before insert on public.events
  for each row execute function public.fill_empresa_from_cerimonialista();

drop trigger if exists trg_fill_empresa on public.clients;
create trigger trg_fill_empresa before insert on public.clients
  for each row execute function public.fill_empresa_from_cerimonialista();

drop trigger if exists trg_fill_empresa on public.suppliers;
create trigger trg_fill_empresa before insert on public.suppliers
  for each row execute function public.fill_empresa_from_cerimonialista();

drop trigger if exists trg_fill_empresa on public.business_transactions;
create trigger trg_fill_empresa before insert on public.business_transactions
  for each row execute function public.fill_empresa_from_cerimonialista();

drop trigger if exists trg_fill_empresa on public.notifications;
create trigger trg_fill_empresa before insert on public.notifications
  for each row execute function public.fill_empresa_from_cerimonialista();

drop trigger if exists trg_fill_empresa on public.activities;
create trigger trg_fill_empresa before insert on public.activities
  for each row execute function public.fill_empresa_from_cerimonialista();

drop trigger if exists trg_fill_empresa on public.tasks;
create trigger trg_fill_empresa before insert on public.tasks
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.transactions;
create trigger trg_fill_empresa before insert on public.transactions
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.roteiro_items;
create trigger trg_fill_empresa before insert on public.roteiro_items
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.roteiro_links;
create trigger trg_fill_empresa before insert on public.roteiro_links
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.event_phases;
create trigger trg_fill_empresa before insert on public.event_phases
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.event_messages;
create trigger trg_fill_empresa before insert on public.event_messages
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.supplier_confirmations;
create trigger trg_fill_empresa before insert on public.supplier_confirmations
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.event_suppliers;
create trigger trg_fill_empresa before insert on public.event_suppliers
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.budgets;
create trigger trg_fill_empresa before insert on public.budgets
  for each row execute function public.fill_empresa_from_event();

commit;

-- ============================================================
-- VALIDAÇÃO (rode depois do commit; todos os "faltando" devem ser 0)
-- ============================================================
-- select 'empresas' t, count(*) from public.empresas
-- union all select 'membros_owner', count(*) from public.membros_equipe where is_owner
-- union all select 'events faltando',    count(*) from public.events    where empresa_id is null
-- union all select 'clients faltando',   count(*) from public.clients   where empresa_id is null
-- union all select 'suppliers faltando', count(*) from public.suppliers where empresa_id is null
-- union all select 'tasks faltando',     count(*) from public.tasks     where empresa_id is null
-- union all select 'transactions faltando', count(*) from public.transactions where empresa_id is null
-- union all select 'business_tx faltando',  count(*) from public.business_transactions where empresa_id is null
-- union all select 'roteiro_items faltando', count(*) from public.roteiro_items where empresa_id is null
-- union all select 'notifications faltando', count(*) from public.notifications where empresa_id is null;
