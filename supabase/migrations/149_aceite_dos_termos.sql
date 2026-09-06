-- ============================================================
-- 149 — O aceite dos Termos e Condições
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- No fim da assinatura a pessoa marca "Li e aceito os Termos e
-- Condições" e só então o cartão vai ao gateway. Esta tabela é a PROVA
-- desse clique: quando foi, qual versão do texto estava no ar
-- (TERMOS_VERSAO em src/lib/termos.ts), de que conta e de que e-mail,
-- de qual IP e navegador. Sem a linha aqui, a action nem chama a
-- operadora — o aceite é fato antes de existir cobrança, e continua
-- sendo fato mesmo que o cartão seja recusado logo depois.
--
-- TRÊS DECISÕES:
--
--   1. RLS ligada e NENHUMA policy — a doutrina da 123. O aceite é a
--      relação COMERCIAL entre o dono do sistema e a conta, não dado
--      operacional da cerimonialista: nem ela alcança a própria linha
--      pela API. Só o service role escreve e lê (a action que assina e,
--      um dia, o painel do dono).
--
--   2. UPDATE é recusado por gatilho. Prova que pode ser reescrita não
--      prova nada; quem precisar de um aceite novo (texto novo, versão
--      nova) insere outra linha. `user_id` NÃO tem FK em auth.users de
--      propósito: se a pessoa apagar o próprio login, a prova de que ela
--      aceitou tem de sobreviver.
--
--   3. DELETE fica ABERTO — só pelo cascade de `empresas`. Apagar uma
--      empresa é o que a limpeza de conta de teste e o banimento fazem,
--      e um gatilho que barrasse o DELETE derrubaria os dois no meio da
--      transação. A linha morre junto com a conta, e só junto com ela.
--
-- Aditiva. Conferência no fim, tudo `true`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) A prova
-- ------------------------------------------------------------
create table if not exists public.termos_aceite (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  user_id     uuid not null,                 -- sem FK em auth.users: a prova sobrevive à conta
  email       text,
  versao      text not null,                 -- TERMOS_VERSAO no momento do aceite
  contexto    text not null default 'assinatura'
              check (contexto in ('assinatura')),
  plano       text,                          -- o código do plano escolhido
  ip          text,
  user_agent  text,
  aceito_em   timestamptz not null default now()
);

comment on table public.termos_aceite is
  'Prova do aceite dos Termos e Condições. Uma linha por clique; imutável; morre só com a empresa (cascade).';
comment on column public.termos_aceite.user_id is
  'Quem clicou. Sem FK em auth.users: a prova sobrevive à exclusão do login.';
comment on column public.termos_aceite.versao is
  'TERMOS_VERSAO (src/lib/termos.ts) no momento do aceite — é por ela que se prova QUAL texto foi aceito.';
comment on column public.termos_aceite.contexto is
  'Onde o aceite aconteceu. Hoje só na assinatura; outros contextos entram pelo CHECK.';
comment on column public.termos_aceite.plano is
  'Código do plano escolhido no ato (essencial, profissional, master).';
comment on column public.termos_aceite.ip is
  'Primeiro IP de x-forwarded-for. Nulo quando o cabeçalho não veio.';
comment on column public.termos_aceite.user_agent is
  'Navegador, cortado em 300 caracteres.';

create index if not exists idx_termos_aceite_empresa
  on public.termos_aceite (empresa_id, aceito_em desc);

alter table public.termos_aceite enable row level security;

-- ------------------------------------------------------------
-- 2) Imutável: UPDATE cai; DELETE passa (cascade de empresas)
-- ------------------------------------------------------------
create or replace function public.trg_termos_aceite_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'termos_aceite é imutável: aceite novo é linha nova'
    using errcode = 'restrict_violation';
end $$;

drop trigger if exists trg_termos_aceite_imutavel on public.termos_aceite;
create trigger trg_termos_aceite_imutavel
  before update on public.termos_aceite
  for each row execute function public.trg_termos_aceite_imutavel();

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'termos_aceite existe' as item,
       (select to_regclass('public.termos_aceite') is not null) as ok
union all
select 'termos_aceite: RLS ligada',
       (select relrowsecurity from pg_class
        where oid = 'public.termos_aceite'::regclass)
union all
select 'termos_aceite: nenhuma policy (negado a anon e authenticated)',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'termos_aceite')
union all
select 'UPDATE é recusado por gatilho',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.termos_aceite'::regclass
                 and tgname = 'trg_termos_aceite_imutavel'
                 and not tgisinternal)
union all
select 'DELETE continua livre para o cascade de empresas',
       not exists (select 1 from pg_trigger
                   where tgrelid = 'public.termos_aceite'::regclass
                     and not tgisinternal
                     and (tgtype::int & 8) = 8)   -- bit 8 = dispara em DELETE
union all
select 'contexto aceita assinatura',
       (select pg_get_constraintdef(c.oid) ilike '%assinatura%'
        from pg_constraint c
        where c.conrelid = 'public.termos_aceite'::regclass
          and c.contype = 'c'
          and pg_get_constraintdef(c.oid) ilike '%contexto%')
union all
select 'a prova sobrevive à conta (sem FK em auth.users)',
       not exists (select 1 from pg_constraint
                   where conrelid = 'public.termos_aceite'::regclass
                     and contype = 'f'
                     and confrelid = 'auth.users'::regclass);
