-- ============================================================
-- Vela — Migração 123: a fundação do painel do dono
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O painel do dono (/admin) é a primeira superfície FORA do modelo de
-- empresa: quem olha é o proprietário do SaaS, atravessando todas as
-- contas. Por isso o modelo de segurança é diferente de tudo até aqui:
--
--   As três tabelas nascem com RLS LIGADA e NENHUMA policy. Isso nega
--   tudo às chaves anon e authenticated — nem a dona de empresa alcança
--   a própria assinatura pela API. Só o service role (servidor) passa,
--   e as telas /admin conferem SUPER_ADMIN_EMAILS antes de cada leitura
--   e de cada ação. Assinatura é relação COMERCIAL entre o dono do
--   sistema e a conta; não é dado operacional da cerimonialista.
--
-- Enquanto não há gateway de pagamento, o dono registra as assinaturas
-- à mão. Quando o gateway entrar, ele passa a escrever NESTAS tabelas —
-- o painel não muda.

-- ------------------------------------------------------------
-- 1) Assinaturas — uma por empresa
-- ------------------------------------------------------------
create table if not exists public.assinaturas (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas (id) on delete cascade,
  plano         text not null default 'piloto',
  valor_mensal  numeric(12, 2) not null default 0,
  status        text not null default 'trial'
                check (status in ('trial', 'ativa', 'pausada', 'cancelada')),
  inicio        date not null default current_date,
  cancelada_em  date,
  motivo_cancelamento text,
  observacao    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (empresa_id)
);

alter table public.assinaturas enable row level security;

-- ------------------------------------------------------------
-- 2) Histórico de movimentos — o que alimenta NRR e churn de receita
-- ------------------------------------------------------------
-- Cada mudança de valor ou status vira um evento datado — e é DAQUI,
-- não do estado atual da tabela, que TODAS as métricas mensais saem.
-- A revisão adversarial do painel provou por quê: derivando do snapshot,
-- reativar uma conta apagava o churn de julho retroativamente, o trial
-- convertido caía no mês do trial e o mês passado mostrava o MRR de
-- hoje. O log de eventos é imutável; o passado não muda de número.
create table if not exists public.assinatura_eventos (
  id             uuid primary key default gen_random_uuid(),
  assinatura_id  uuid not null references public.assinaturas (id) on delete cascade,
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  tipo           text not null
                 check (tipo in ('inicio', 'upgrade', 'downgrade',
                                 'cancelamento', 'reativacao',
                                 'pausa', 'retomada')),
  valor_antes    numeric(12, 2),
  valor_depois   numeric(12, 2),
  em             date not null default current_date,
  nota           text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_assinatura_eventos_mes
  on public.assinatura_eventos (em);

alter table public.assinatura_eventos enable row level security;

-- ------------------------------------------------------------
-- 3) Gasto de aquisição por mês — o denominador do CAC
-- ------------------------------------------------------------
-- O sistema não tem como saber quanto foi gasto em marketing; o dono
-- informa uma vez por mês. CAC = gasto do mês / novas assinaturas do mês.
create table if not exists public.gastos_aquisicao (
  mes         date primary key,          -- sempre dia 1 do mês
  valor       numeric(12, 2) not null default 0,
  nota        text,
  updated_at  timestamptz not null default now()
);

alter table public.gastos_aquisicao enable row level security;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'assinaturas: RLS ligada' as item,
       (select relrowsecurity from pg_class
        where oid = 'public.assinaturas'::regclass) as ok
union all
select 'assinaturas: nenhuma policy (negado a anon e authenticated)',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'assinaturas')
union all
select 'assinatura_eventos: RLS ligada, nenhuma policy',
       (select relrowsecurity from pg_class
        where oid = 'public.assinatura_eventos'::regclass)
       and not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'assinatura_eventos')
union all
select 'gastos_aquisicao: RLS ligada, nenhuma policy',
       (select relrowsecurity from pg_class
        where oid = 'public.gastos_aquisicao'::regclass)
       and not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'gastos_aquisicao')
union all
select 'uma assinatura por empresa (unique)',
       exists (select 1 from pg_indexes
               where schemaname = 'public' and tablename = 'assinaturas'
                 and indexdef like '%empresa_id%' and indexdef like '%UNIQUE%');
