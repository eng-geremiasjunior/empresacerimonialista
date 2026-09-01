-- ============================================================
-- Vela — Migração 139: ocorrências do dia + valor realizado
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- As duas metades que faltavam para a conferência pós-evento (o fio da
-- prestação de contas v2: o contrato extrai o CONTRATADO; a conferência
-- registra o REALIZADO; o relatório apresenta a diferença):
--
--   1. evento_ocorrencia — a avaria, a perda, o pertence esquecido.
--      Hoje isso é um checkbox mudo na desmontagem ("avarias
--      registradas") e um status de item de roteiro. A ocorrência nasce
--      ESCONDIDA do casal (visivel_ao_casal = false): ela decide item a
--      item, na revisão do documento, o que o casal vê. O portal nunca
--      lê esta tabela — só a fotografia entregue (136).
--
--   2. valor_realizado em evento_fornecedor_orcamento — o valor final
--      acertado com o fornecedor, conferido depois do evento. NULL =
--      não conferido, e o documento do casal continua dizendo "valor
--      contratado". Preenchido, o rótulo vira "conferido" e o em-aberto
--      passa a ser calculado sobre ele.

-- ------------------------------------------------------------
-- 1) Ocorrências
-- ------------------------------------------------------------
create table if not exists public.evento_ocorrencia (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),
  tipo        text not null check (tipo in ('avaria', 'perda', 'pertence', 'outro')),
  descricao   text not null check (char_length(descricao) between 1 and 500),
  valor       numeric(12, 2) check (valor is null or valor >= 0),
  supplier_id uuid references public.suppliers (id) on delete set null,
  resolvida   boolean not null default false,
  -- nasce escondida; só a mão dela vira isto para true
  visivel_ao_casal boolean not null default false,
  criada_em   timestamptz not null default now(),
  criada_por  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create index if not exists idx_evento_ocorrencia_evento
  on public.evento_ocorrencia (event_id);

comment on table public.evento_ocorrencia is
  'Ocorrências do evento (avaria/perda/pertence/outro). O casal só vê o que ela marcar visivel_ao_casal, e só pela fotografia da prestação de contas.';

drop trigger if exists trg_fill_empresa on public.evento_ocorrencia;
create trigger trg_fill_empresa before insert on public.evento_ocorrencia
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_touch on public.evento_ocorrencia;
create trigger trg_touch before update on public.evento_ocorrencia
  for each row execute function public.set_updated_at();

alter table public.evento_ocorrencia enable row level security;

drop policy if exists ocorrencia_select on public.evento_ocorrencia;
create policy ocorrencia_select on public.evento_ocorrencia
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists ocorrencia_insert on public.evento_ocorrencia;
create policy ocorrencia_insert on public.evento_ocorrencia
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists ocorrencia_update on public.evento_ocorrencia;
create policy ocorrencia_update on public.evento_ocorrencia
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists ocorrencia_delete on public.evento_ocorrencia;
create policy ocorrencia_delete on public.evento_ocorrencia
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 2) A conferência de valor por fornecedor
-- ------------------------------------------------------------
alter table public.evento_fornecedor_orcamento
  add column if not exists valor_realizado numeric(12, 2)
    check (valor_realizado is null or valor_realizado >= 0),
  add column if not exists conferido_em timestamptz,
  add column if not exists conferido_por uuid references auth.users (id) on delete set null;

comment on column public.evento_fornecedor_orcamento.valor_realizado is
  'Conferência pós-evento: o valor final acertado com o fornecedor. NULL = não conferido — o documento do casal diz "valor contratado" enquanto for NULL.';

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'evento_ocorrencia existe com RLS ligada' as item,
       (select c.relrowsecurity from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'evento_ocorrencia') as ok
union all
select 'os quatro tipos e o teto da descrição estão no CHECK',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.evento_ocorrencia'::regclass
           and contype = 'c'
           and pg_get_constraintdef(oid) like '%avaria%'
           and pg_get_constraintdef(oid) like '%pertence%'
       )
       and exists (
         select 1 from pg_constraint
         where conrelid = 'public.evento_ocorrencia'::regclass
           and contype = 'c'
           and pg_get_constraintdef(oid) like '%500%'
       )
union all
select 'a ocorrência nasce escondida do casal (default false)',
       (select column_default like '%false%'
        from information_schema.columns
        where table_schema = 'public' and table_name = 'evento_ocorrencia'
          and column_name = 'visivel_ao_casal')
union all
select 'nenhuma policy de anon nem de portal na tabela',
       (select count(*) = 4 from pg_policies
        where schemaname = 'public' and tablename = 'evento_ocorrencia')
       and not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'evento_ocorrencia'
           and 'anon' = any(roles)
       )
union all
select 'as três colunas da conferência existem na verba',
       (select count(*) = 3 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'evento_fornecedor_orcamento'
          and column_name in ('valor_realizado', 'conferido_em', 'conferido_por'))
union all
select 'valor_realizado aceita NULL (não conferido é um estado, não zero)',
       (select is_nullable = 'YES' from information_schema.columns
        where table_schema = 'public'
          and table_name = 'evento_fornecedor_orcamento'
          and column_name = 'valor_realizado');
