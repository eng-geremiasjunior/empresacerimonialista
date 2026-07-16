-- ============================================================
-- Vela — Migração 026: fornecedores — nova estrutura
-- (Etapa 1 de 5 do módulo Fornecedores)
--
-- Estrutura ANTIGA (inspecionada antes desta migração):
--   suppliers(id, cerimonialista_id, name, category[texto único],
--             phone, notes, created_at, email, empresa_id)
--   Vínculo evento↔fornecedor: roteiro_links(event_id, supplier_id).
--   event_suppliers existe mas está vazia (legado).
--   empresa_id já preenchido em todos (migrações 021/023).
--
-- Esta migração NÃO cria telas nem remove a coluna `category` antiga
-- (coexiste com supplier_categorias até a Etapa 2 confirmar a migração).
--
-- Execute no SQL Editor do Supabase (depois da 025).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Novas colunas em suppliers (email e empresa_id já existem)
-- ------------------------------------------------------------

alter table public.suppliers
  add column if not exists empresa_id       uuid references public.empresas (id),
  add column if not exists tipo_operacional text not null default 'operacional',
  add column if not exists status           text not null default 'ativo',
  add column if not exists faixa_preco       text,
  add column if not exists descricao         text,
  add column if not exists email             text,
  add column if not exists whatsapp          text,
  add column if not exists cpf               text,
  add column if not exists endereco          text,
  add column if not exists cidade            text;

-- Enums via CHECK (valores fixos; categoria fica fora, é lista aberta).
alter table public.suppliers drop constraint if exists suppliers_tipo_operacional_check;
alter table public.suppliers
  add constraint suppliers_tipo_operacional_check
  check (tipo_operacional in ('operacional', 'apoio', 'parceiro'));

alter table public.suppliers drop constraint if exists suppliers_status_check;
alter table public.suppliers
  add constraint suppliers_status_check
  check (status in ('ativo', 'inativo', 'bloqueado', 'favorito', 'parceiro_premium'));

alter table public.suppliers drop constraint if exists suppliers_faixa_preco_check;
alter table public.suppliers
  add constraint suppliers_faixa_preco_check
  check (faixa_preco is null or faixa_preco in ('economico', 'intermediario', 'premium'));

-- Backfill defensivo do empresa_id (já deve estar 0 nulos).
update public.suppliers s
set empresa_id = emp.id
from public.empresas emp
where emp.owner_user_id = s.cerimonialista_id and s.empresa_id is null;

create index if not exists idx_suppliers_empresa_status
  on public.suppliers (empresa_id, status);

-- ------------------------------------------------------------
-- 2) supplier_categorias — múltiplos serviços por fornecedor
-- ------------------------------------------------------------

create table if not exists public.supplier_categorias (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  categoria   text not null,
  created_at  timestamptz not null default now(),
  unique (supplier_id, categoria)
);

create index if not exists idx_supplier_categorias_supplier
  on public.supplier_categorias (supplier_id);

alter table public.supplier_categorias enable row level security;

-- Segue a visibilidade do fornecedor (empresa). Usa meu_cargo() (Etapa 4
-- de Cerimonialistas). Escrita restrita aos cargos que gerenciam
-- fornecedores, alinhado às policies de suppliers da migração 024.
drop policy if exists "supplier_categorias_empresa" on public.supplier_categorias;

create policy "supplier_categorias_select" on public.supplier_categorias
  for select using (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id
        and s.empresa_id = (select empresa_id from public.meu_cargo())
    )
  );

create policy "supplier_categorias_write" on public.supplier_categorias
  for insert with check (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id
        and s.empresa_id = (select empresa_id from public.meu_cargo())
        and (select cargo from public.meu_cargo())
            in ('proprietaria', 'coordenadora', 'cerimonialista')
    )
  );

create policy "supplier_categorias_delete" on public.supplier_categorias
  for delete using (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id
        and s.empresa_id = (select empresa_id from public.meu_cargo())
        and (select cargo from public.meu_cargo())
            in ('proprietaria', 'coordenadora', 'cerimonialista')
    )
  );

-- ------------------------------------------------------------
-- 3) Migração da categoria antiga (texto único) → supplier_categorias
--    Normaliza para slug minúsculo (ex.: "Buffet" -> "buffet").
-- ------------------------------------------------------------

insert into public.supplier_categorias (supplier_id, categoria)
select id, lower(trim(category))
from public.suppliers
where category is not null and length(trim(category)) > 0
on conflict (supplier_id, categoria) do nothing;

-- ------------------------------------------------------------
-- 4) RLS de suppliers: as policies por cargo da migração 024
--    (suppliers_select/insert/update/delete) já implementam
--    "visível para toda a empresa, escrita por cargo". NÃO adicionamos
--    uma policy FOR ALL aqui — isso ampliaria o acesso de escrita para
--    assistentes, regredindo a Etapa 4. Mantidas como estão.
-- ------------------------------------------------------------

commit;

-- ============================================================
-- VALIDAÇÃO (rode após o commit):
-- select count(*) filter (where empresa_id is null) as sem_empresa,
--        count(*) as total from public.suppliers;
-- select count(*) from public.supplier_categorias;
-- -- duplicatas (nome+telefone na mesma empresa):
-- select name, phone, empresa_id, count(*), array_agg(id)
-- from public.suppliers group by name, phone, empresa_id having count(*) > 1;
-- ============================================================
