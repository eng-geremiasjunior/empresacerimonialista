-- ============================================================
-- 183 — As parceiras (site navegável, fase 3, 27/09/2026)
-- ============================================================
-- Quem ensina cerimonial (curso, mentoria, conteúdo para colegas) se
-- candidata pela página /parceiras. O dono aprova no /admin/parceiras, e a
-- aprovada ganha um link próprio (/p/<slug>) que leva ao site com a marca
-- utm_source=parceira&utm_campaign=<slug>. As contas que chegam por ele
-- são contadas pela origem do clique que o cadastro já grava (152) — por
-- isso esta tabela não guarda nenhuma conta, só a candidatura.
--
-- As etapas da parceria (evento real, dia do evento pelo sistema) são
-- lidas do próprio sistema na hora, na conta dela (achada pelo e-mail).
-- A única coisa que o sistema não comprova sozinho é o Reels: o dono cola
-- o link dele (reels_url).
--
-- RLS LIGADA E NENHUMA POLICY, como a origem do clique (152): dado do
-- dono do SaaS. Quem escreve é o servidor (a candidatura, com a chave de
-- serviço) e quem lê é o painel do dono.
--
-- Aditiva e reexecutável. Conferência no fim, tudo `true`.
-- ============================================================

create table if not exists public.parceiras (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (char_length(nome) between 2 and 120),
  email        text not null check (char_length(email) between 5 and 200),
  instagram    text not null check (char_length(instagram) between 2 and 80),
  ensina       text not null check (ensina in ('curso', 'mentoria', 'conteudo', 'outro')),
  whatsapp     text check (whatsapp is null or char_length(whatsapp) <= 30),
  sobre        text check (sobre is null or char_length(sobre) <= 600),
  status       text not null default 'candidata' check (status in ('candidata', 'aprovada', 'recusada')),
  slug         text unique check (slug is null or slug ~ '^[a-z0-9-]{2,40}$'),
  reels_url    text check (reels_url is null or char_length(reels_url) <= 300),
  -- só para o limite de candidaturas por endereço (três por hora)
  ip           text,
  criada_em    timestamptz not null default now(),
  decidida_em  timestamptz
);

create index if not exists parceiras_criada_idx on public.parceiras (criada_em desc);
create index if not exists parceiras_ip_idx on public.parceiras (ip, criada_em desc);

alter table public.parceiras enable row level security;
revoke all on public.parceiras from anon, authenticated;

comment on table public.parceiras is
  'Candidaturas e parceiras (quem ensina cerimonial). O link /p/<slug> marca utm_source=parceira e utm_campaign=<slug>; as contas trazidas saem de origem_do_clique.';
comment on column public.parceiras.slug is
  'O trecho do link próprio da parceira: eorganizei.com.br/p/<slug>. Nasce na aprovação.';
comment on column public.parceiras.reels_url is
  'O link do Reels em collab, colado pelo dono: a única etapa que o sistema não comprova sozinho.';

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select
  to_regclass('public.parceiras') is not null as tabela_existe,
  (select relrowsecurity from pg_class where oid = 'public.parceiras'::regclass) as rls_ligada,
  not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'parceiras') as sem_policy,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'parceiras' and column_name = 'reels_url'
  ) as coluna_reels;
