-- ============================================================
-- Vela — Migração 136: a prestação de contas do casal (v1)
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A cerimonialista JÁ entrega prestação de contas depois do evento —
-- montada por fora, em planilha. Esta migração traz o documento para
-- dentro, com as três regras que ele não pode quebrar:
--
--   1. CONGELADO NA ENTREGA. É documento financeiro nominal: se os
--      números mudarem depois de entregue, ela perde a credibilidade.
--      A entrega grava uma FOTOGRAFIA (jsonb) — editar um lançamento
--      depois não muda o que o casal recebeu.
--   2. VERSIONADO, NUNCA SOBRESCRITO. Reemitir cria a versão N+1;
--      a anterior fica. Medido antes: evento_fechamento sobrescreve e
--      reabrir APAGA; o site republica por cima. O único precedente com
--      memória no sistema é site_slugs — este é o segundo.
--   3. O CASAL LÊ SÓ A FOTOGRAFIA, SÓ DO EVENTO DELE. Nenhuma policy de
--      portal na tabela: a leitura é por RPC security definer com o
--      guard duplo do padrão portal_investimento.
--
-- O que NUNCA entra no conteúdo (a régua vive no aplicativo, que valida
-- o payload por allowlist de chaves antes de gravar): conta assessoria,
-- custos dela, lucro, suppliers.notes, motivo_interno de qualquer
-- espécie, dados de outros eventos.

-- ------------------------------------------------------------
-- 1) O documento entregue — append-only
-- ------------------------------------------------------------
create table if not exists public.evento_relatorio (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),
  -- v1 só tem o documento do casal; o fechamento interno segue no
  -- PainelFechamento. O CHECK abre para 'interno' quando a v2 chegar.
  destino     text not null default 'casal' check (destino in ('casal')),
  versao      int  not null check (versao >= 1),
  -- a fotografia: o documento inteiro, como o casal o recebeu
  conteudo    jsonb not null,
  entregue_em timestamptz not null default now(),
  entregue_por uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (event_id, destino, versao)
);

create index if not exists idx_evento_relatorio_evento
  on public.evento_relatorio (event_id, destino, versao desc);

comment on table public.evento_relatorio is
  'Prestação de contas entregue ao casal. Append-only: reemitir cria versão nova; nada é editado nem apagado.';

drop trigger if exists trg_fill_empresa on public.evento_relatorio;
create trigger trg_fill_empresa before insert on public.evento_relatorio
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_relatorio enable row level security;

-- Equipe LÊ e INSERE. Não existe policy de UPDATE nem de DELETE — de
-- propósito: o documento entregue é imutável até para a equipe. Errou?
-- Reemite a versão seguinte.
drop policy if exists relatorio_select on public.evento_relatorio;
create policy relatorio_select on public.evento_relatorio
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists relatorio_insert on public.evento_relatorio;
create policy relatorio_insert on public.evento_relatorio
  for insert with check (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 2) As observações dela (o rascunho vivo, antes da entrega)
-- ------------------------------------------------------------
-- Um texto por seção do documento. Na entrega, o aplicativo fotografa
-- estes textos PARA DENTRO do conteúdo — o documento congelado é
-- autossuficiente, e as notas continuam editáveis para a próxima versão.
create table if not exists public.evento_relatorio_nota (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),
  secao       text not null check (char_length(secao) between 1 and 40),
  texto       text not null default '',
  updated_at  timestamptz not null default now(),
  unique (event_id, secao)
);

drop trigger if exists trg_fill_empresa on public.evento_relatorio_nota;
create trigger trg_fill_empresa before insert on public.evento_relatorio_nota
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_relatorio_nota enable row level security;

drop policy if exists relnota_select on public.evento_relatorio_nota;
create policy relnota_select on public.evento_relatorio_nota
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists relnota_write on public.evento_relatorio_nota;
create policy relnota_write on public.evento_relatorio_nota
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists relnota_update on public.evento_relatorio_nota;
create policy relnota_update on public.evento_relatorio_nota
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists relnota_delete on public.evento_relatorio_nota;
create policy relnota_delete on public.evento_relatorio_nota
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 3) A leitura do casal — a fotografia, nada além
-- ------------------------------------------------------------
create or replace function public.portal_prestacao_de_contas(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not (public.sou_cliente_do_evento(p_event_id)
              or public.pode_ver_evento(p_event_id))
    then null
    else (
      select json_build_object(
        'versao',      r.versao,
        'entregue_em', r.entregue_em,
        'conteudo',    r.conteudo
      )
      from public.evento_relatorio r
      where r.event_id = p_event_id
        and r.destino = 'casal'
      order by r.versao desc
      limit 1
    )
  end;
$$;

revoke all on function public.portal_prestacao_de_contas(uuid) from public, anon;
grant execute on function public.portal_prestacao_de_contas(uuid) to authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'as duas tabelas existem com RLS ligada' as item,
       (select count(*) = 2 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('evento_relatorio', 'evento_relatorio_nota')
          and c.relrowsecurity) as ok
union all
select 'evento_relatorio e APPEND-ONLY (zero policies de update/delete)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'evento_relatorio'
           and cmd in ('UPDATE', 'DELETE')
       )
union all
select 'nenhuma policy de anon em nenhuma das duas',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public'
           and tablename in ('evento_relatorio', 'evento_relatorio_nota')
           and 'anon' = any(roles)
       )
union all
select 'a versao e unica por evento e destino',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.evento_relatorio'::regclass
           and contype = 'u'
       )
union all
select 'a RPC do casal existe UMA vez e nao e executavel por anon',
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'portal_prestacao_de_contas')
       and not exists (
         select 1 from information_schema.routine_privileges
         where routine_schema = 'public'
           and routine_name = 'portal_prestacao_de_contas'
           and grantee = 'anon'
       )
union all
select 'a RPC le so a fotografia (conteudo), nunca junta transactions',
       (select prosrc not like '%transactions%'
           and prosrc not like '%suppliers%'
           and prosrc like '%conteudo%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'portal_prestacao_de_contas');
