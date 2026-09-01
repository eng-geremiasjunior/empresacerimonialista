-- ============================================================
-- Vela — Migração 138: a proposta de extração de contrato
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O contrato do fornecedor chega (bucket privado, caminho na
-- solicitacao_fornecedor.resposta) e hoje termina em NADA — ela abre o
-- PDF e redigita valor, parcelas, quantidades e horários à mão.
--
-- A extração vira PROPOSTA, nunca verdade:
--   - o PDF é lido no NAVEGADOR dela (pdfjs, molde da planta 099);
--     o servidor não ganha leitor de PDF e o arquivo não viaja;
--   - o texto sai REDIGIDO (CPF/CNPJ/contas/PIX/contatos removidos)
--     antes de ir ao provedor de IA, com prévia do que será enviado;
--   - a resposta do modelo entra aqui como payload de PROPOSTA;
--   - nada alcança transactions/evento_recurso/roteiro_items sem ela
--     conferir item a item — a aplicação usa as actions existentes, e
--     dinheiro entra sempre como lançamento NÃO pago.
--
-- Uma proposta por solicitação (unique): reler o contrato substitui a
-- proposta enquanto ela não conferiu; depois de conferida, fica como
-- registro do que foi aplicado (coluna aplicado).

create table if not exists public.contrato_extracao (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  empresa_id      uuid references public.empresas (id),
  solicitacao_id  uuid not null references public.solicitacao_fornecedor (id) on delete cascade,
  supplier_id     uuid references public.suppliers (id) on delete set null,
  -- a proposta como o modelo devolveu, já passada pela allowlist do app
  payload         jsonb not null,
  -- o que ela confirmou e como foi aplicado (preenchido na conferência)
  aplicado        jsonb,
  status          text not null default 'proposta'
                  check (status in ('proposta', 'conferida', 'descartada')),
  criada_em       timestamptz not null default now(),
  criada_por      uuid references auth.users (id) on delete set null,
  conferida_em    timestamptz,
  conferida_por   uuid references auth.users (id) on delete set null,
  unique (solicitacao_id)
);

create index if not exists idx_contrato_extracao_evento
  on public.contrato_extracao (event_id, status);

comment on table public.contrato_extracao is
  'Proposta de extração de um contrato de fornecedor. Nada vira lançamento, recurso ou horário sem a conferência da cerimonialista.';

drop trigger if exists trg_fill_empresa on public.contrato_extracao;
create trigger trg_fill_empresa before insert on public.contrato_extracao
  for each row execute function public.fill_empresa_from_event();

alter table public.contrato_extracao enable row level security;

drop policy if exists extracao_select on public.contrato_extracao;
create policy extracao_select on public.contrato_extracao
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists extracao_insert on public.contrato_extracao;
create policy extracao_insert on public.contrato_extracao
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists extracao_update on public.contrato_extracao;
create policy extracao_update on public.contrato_extracao
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists extracao_delete on public.contrato_extracao;
create policy extracao_delete on public.contrato_extracao
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a tabela existe com RLS ligada' as item,
       (select c.relrowsecurity from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'contrato_extracao') as ok
union all
select 'uma proposta por solicitação (unique)',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.contrato_extracao'::regclass
           and contype = 'u'
       )
union all
select 'os três estados possíveis (proposta/conferida/descartada)',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.contrato_extracao'::regclass
           and contype = 'c'
           and pg_get_constraintdef(oid) like '%proposta%'
           and pg_get_constraintdef(oid) like '%conferida%'
           and pg_get_constraintdef(oid) like '%descartada%'
       )
union all
select 'as quatro policies existem e nenhuma é de anon',
       (select count(*) = 4 from pg_policies
        where schemaname = 'public' and tablename = 'contrato_extracao')
       and not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'contrato_extracao'
           and 'anon' = any(roles)
       )
union all
select 'empresa_id nasce do evento (trigger)',
       exists (
         select 1 from pg_trigger
         where tgrelid = 'public.contrato_extracao'::regclass
           and tgname = 'trg_fill_empresa'
       );
