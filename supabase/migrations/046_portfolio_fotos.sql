-- ============================================================
-- Vela — Migração 046: galeria de portfólio (Etapa 8 de 10)
--
-- Fotos de eventos realizados, usadas como prova social na landing page
-- da proposta (Etapa 9). Gerenciadas por proprietária e coordenadora.
--
-- PADRÕES APLICADOS:
--  * Storage: leitura pública; escrita validada por função SECURITY
--    DEFINER (lição da 030 — subquery em tabela com RLS dentro de policy
--    de storage.objects não avalia direito).
--  * Policy FOR ALL com USING **e** WITH CHECK (lição da 045 — só com
--    USING todo INSERT é negado).
--  * Path: portfolio-fotos/{empresa_id}/{uuid}.{ext} — a pasta é a
--    credencial verificada pela policy.
--
-- Execute no SQL Editor do Supabase (depois da 045).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Bucket
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('portfolio-fotos', 'portfolio-fotos', true)
on conflict (id) do nothing;

create or replace function public.pode_gerenciar_portfolio(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meu_cargo() mc
    where mc.empresa_id::text = p_folder
      and mc.cargo in ('proprietaria', 'coordenadora')
  );
$$;

grant execute on function public.pode_gerenciar_portfolio(text) to authenticated;

drop policy if exists "Fotos do portfolio sao publicas" on storage.objects;
create policy "Fotos do portfolio sao publicas"
  on storage.objects for select
  using (bucket_id = 'portfolio-fotos');

drop policy if exists "Empresa pode subir foto do portfolio" on storage.objects;
create policy "Empresa pode subir foto do portfolio"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-fotos'
    and public.pode_gerenciar_portfolio((storage.foldername(name))[1])
  );

drop policy if exists "Empresa pode atualizar foto do portfolio" on storage.objects;
create policy "Empresa pode atualizar foto do portfolio"
  on storage.objects for update
  using (
    bucket_id = 'portfolio-fotos'
    and public.pode_gerenciar_portfolio((storage.foldername(name))[1])
  );

drop policy if exists "Empresa pode remover foto do portfolio" on storage.objects;
create policy "Empresa pode remover foto do portfolio"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-fotos'
    and public.pode_gerenciar_portfolio((storage.foldername(name))[1])
  );

-- ------------------------------------------------------------
-- 2) Tabela
-- ------------------------------------------------------------
begin;

create table if not exists public.portfolio_fotos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  url        text not null,
  storage_path text,          -- para apagar do bucket junto com a linha
  legenda    text,
  ordem      int not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_portfolio_fotos_empresa
  on public.portfolio_fotos (empresa_id, ordem);

alter table public.portfolio_fotos enable row level security;

drop policy if exists "portfolio_fotos_empresa" on public.portfolio_fotos;
create policy "portfolio_fotos_empresa"
  on public.portfolio_fotos
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
  );

commit;
