-- ============================================================
-- Vela — Migração 042: bucket da logo da empresa (Orçamentos, Etapa 4)
--
-- Mesmo padrão dos buckets de avatar/capa (029+030): leitura pública,
-- escrita validada por função SECURITY DEFINER (lição da 030: subquery
-- em tabela com RLS dentro de policy de storage falha).
--
-- Path: empresa-logos/{empresa_id}/logo — nome fixo, upsert sobrescreve.
-- Só a PROPRIETÁRIA da empresa gerencia a logo (configuração da empresa).
--
-- Execute no SQL Editor do Supabase (depois da 041).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('empresa-logos', 'empresa-logos', true)
on conflict (id) do nothing;

create or replace function public.pode_gerenciar_logo(p_folder text)
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
      and mc.cargo = 'proprietaria'
  );
$$;

grant execute on function public.pode_gerenciar_logo(text) to authenticated;

drop policy if exists "Logos sao publicamente acessiveis" on storage.objects;
create policy "Logos sao publicamente acessiveis"
  on storage.objects for select
  using (bucket_id = 'empresa-logos');

drop policy if exists "Proprietaria pode subir logo" on storage.objects;
create policy "Proprietaria pode subir logo"
  on storage.objects for insert
  with check (
    bucket_id = 'empresa-logos'
    and public.pode_gerenciar_logo((storage.foldername(name))[1])
  );

drop policy if exists "Proprietaria pode atualizar logo" on storage.objects;
create policy "Proprietaria pode atualizar logo"
  on storage.objects for update
  using (
    bucket_id = 'empresa-logos'
    and public.pode_gerenciar_logo((storage.foldername(name))[1])
  );

drop policy if exists "Proprietaria pode remover logo" on storage.objects;
create policy "Proprietaria pode remover logo"
  on storage.objects for delete
  using (
    bucket_id = 'empresa-logos'
    and public.pode_gerenciar_logo((storage.foldername(name))[1])
  );

-- Gravar empresas.logo_url já é coberto pela policy empresas_owner
-- (FOR ALL, owner_user_id = auth.uid()) da migração 021 — a proprietária
-- é a dona por definição; nenhuma policy extra necessária.
