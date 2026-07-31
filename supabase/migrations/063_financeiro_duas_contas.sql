-- 063 — Financeiro do evento em duas contas + verba por fornecedor
--
-- Separa o que é da ASSESSORIA (o que a cliente paga à cerimonialista)
-- do que é de FORNECEDOR (a verba negociada com cada um), e passa a
-- registrar quanto foi alocado por fornecedor, com detalhamento opcional.
--
-- Três ajustes em relação ao pedido original, todos por causa do schema
-- real deste projeto:
--
--  1. as tabelas se chamam `suppliers` e `events` (não `fornecedores` e
--     `eventos`);
--
--  2. transactions JÁ tem `supplier_id` apontando para suppliers, então a
--     regra usa essa coluna em vez de criar uma segunda para o mesmo
--     conceito — duas colunas para a mesma coisa viram armadilha em todo
--     relatório futuro;
--
--  3. o default é 'assessoria', não 'fornecedor'. Com 'fornecedor' o
--     CHECK reprovaria de imediato as linhas existentes sem fornecedor e
--     o ALTER falharia. 'assessoria' também é o significado certo: o que
--     já estava lançado sem fornecedor é da cerimonialista.

-- ------------------------------------------------------------
-- 1) Conta da transação
-- ------------------------------------------------------------
alter table public.transactions
  add column if not exists conta text not null default 'assessoria';

alter table public.transactions
  drop constraint if exists transactions_conta_check;
alter table public.transactions
  add constraint transactions_conta_check
  check (conta in ('assessoria', 'fornecedor'));

-- Backfill pelo significado: o que aponta para um fornecedor é da conta
-- dele; o resto é assessoria. Roda antes do CHECK de coerência.
update public.transactions
set conta = 'fornecedor'
where supplier_id is not null
  and conta <> 'fornecedor';

-- Conta e fornecedor andam juntos: lançamento de fornecedor sem dizer
-- qual não dá para cobrar nem prestar contas, e lançamento de assessoria
-- com fornecedor confunde as duas contas.
alter table public.transactions
  drop constraint if exists transactions_fornecedor_obrigatorio_check;
alter table public.transactions
  add constraint transactions_fornecedor_obrigatorio_check
  check (
    (conta = 'fornecedor' and supplier_id is not null)
    or (conta = 'assessoria' and supplier_id is null)
  );

create index if not exists idx_transactions_evento_conta
  on public.transactions (event_id, conta);

-- ------------------------------------------------------------
-- 2) Verba alocada por fornecedor
-- ------------------------------------------------------------
-- valor_alocado é preenchido à mão pela cerimonialista dentro do evento;
-- não vem do Orçamento (decisão explícita por ora).
create table if not exists public.evento_fornecedor_orcamento (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,

  -- quanto a cliente imaginava gastar. Opcional: só existe economia para
  -- calcular quando este campo foi preenchido.
  valor_estimado_inicial numeric(12, 2),
  -- quanto foi efetivamente negociado
  valor_alocado          numeric(12, 2) not null,

  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- um fornecedor entra uma vez por evento; ajustes editam a linha
  unique (event_id, supplier_id)
);

-- Detalhamento opcional: um fornecedor pode não ter item nenhum (mostra
-- só o total) ou vários. Quando há itens, o total do fornecedor passa a
-- ser a soma deles.
create table if not exists public.evento_fornecedor_item (
  id uuid primary key default gen_random_uuid(),
  evento_fornecedor_orcamento_id uuid not null
    references public.evento_fornecedor_orcamento (id) on delete cascade,
  descricao text not null,
  valor_estimado_inicial numeric(12, 2),
  valor_negociado        numeric(12, 2),
  created_at timestamptz not null default now()
);

create index if not exists idx_efo_evento
  on public.evento_fornecedor_orcamento (event_id);
create index if not exists idx_efi_orcamento
  on public.evento_fornecedor_item (evento_fornecedor_orcamento_id);

-- ------------------------------------------------------------
-- 3) RLS — mesmo padrão de cargo das outras tabelas do evento
-- ------------------------------------------------------------
alter table public.evento_fornecedor_orcamento enable row level security;
alter table public.evento_fornecedor_item enable row level security;

drop policy if exists "efo_select" on public.evento_fornecedor_orcamento;
drop policy if exists "efo_insert" on public.evento_fornecedor_orcamento;
drop policy if exists "efo_update" on public.evento_fornecedor_orcamento;
drop policy if exists "efo_delete" on public.evento_fornecedor_orcamento;

create policy "efo_select" on public.evento_fornecedor_orcamento
  for select using (public.pode_ver_evento(event_id));
create policy "efo_insert" on public.evento_fornecedor_orcamento
  for insert with check (public.pode_editar_evento(event_id));
create policy "efo_update" on public.evento_fornecedor_orcamento
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
create policy "efo_delete" on public.evento_fornecedor_orcamento
  for delete using (public.pode_editar_evento(event_id));

-- O item herda a permissão do orçamento a que pertence: quem enxerga o
-- evento enxerga o detalhamento, quem edita o evento edita.
drop policy if exists "efi_select" on public.evento_fornecedor_item;
drop policy if exists "efi_insert" on public.evento_fornecedor_item;
drop policy if exists "efi_update" on public.evento_fornecedor_item;
drop policy if exists "efi_delete" on public.evento_fornecedor_item;

create policy "efi_select" on public.evento_fornecedor_item
  for select using (
    exists (
      select 1 from public.evento_fornecedor_orcamento o
      where o.id = evento_fornecedor_orcamento_id
        and public.pode_ver_evento(o.event_id)
    )
  );
create policy "efi_insert" on public.evento_fornecedor_item
  for insert with check (
    exists (
      select 1 from public.evento_fornecedor_orcamento o
      where o.id = evento_fornecedor_orcamento_id
        and public.pode_editar_evento(o.event_id)
    )
  );
create policy "efi_update" on public.evento_fornecedor_item
  for update using (
    exists (
      select 1 from public.evento_fornecedor_orcamento o
      where o.id = evento_fornecedor_orcamento_id
        and public.pode_editar_evento(o.event_id)
    )
  );
create policy "efi_delete" on public.evento_fornecedor_item
  for delete using (
    exists (
      select 1 from public.evento_fornecedor_orcamento o
      where o.id = evento_fornecedor_orcamento_id
        and public.pode_editar_evento(o.event_id)
    )
  );

-- ------------------------------------------------------------
-- 4) Quanto foi pago a cada fornecedor, por mês
-- ------------------------------------------------------------
-- Para o Portal da Cliente mais adiante. Conta só o que foi PAGO (não o
-- previsto) e usa a data de pagamento quando existe, caindo no vencimento
-- para lançamentos antigos que não carimbaram paid_at.
--
-- É função, não view, porque view não respeita o RLS de quem chama sem
-- security_invoker; assim a checagem de permissão fica explícita.
create or replace function public.pagamentos_fornecedor_por_mes(p_event_id uuid)
returns table (
  supplier_id   uuid,
  fornecedor    text,
  mes           date,
  total_pago    numeric,
  qtd_parcelas  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.supplier_id,
    s.name as fornecedor,
    date_trunc('month', coalesce(t.paid_at::date, t.due_date))::date as mes,
    sum(t.value) as total_pago,
    count(*) as qtd_parcelas
  from public.transactions t
  join public.suppliers s on s.id = t.supplier_id
  where t.event_id = p_event_id
    and t.conta = 'fornecedor'
    and t.paid
    and public.pode_ver_evento(p_event_id)
  group by t.supplier_id, s.name, 3
  order by 3, s.name;
$$;

revoke all on function public.pagamentos_fornecedor_por_mes(uuid) from public, anon;
grant execute on function public.pagamentos_fornecedor_por_mes(uuid) to authenticated;
