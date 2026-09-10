-- ============================================================
-- 152 — De qual anúncio veio esta conta
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- O PROBLEMA. A criação de conta acontece no navegador e o pixel conta.
-- A ASSINATURA acontece quando a Pagar.me aprova — no servidor, dentro de
-- uma action, numa tela onde pixel nenhum entra, e às vezes dias depois
-- do clique no anúncio. Para a Meta e o Google saberem que AQUELA
-- assinatura veio DAQUELE anúncio, o servidor precisa mandar junto os
-- identificadores do clique. Eles só existem no navegador, e só naquele
-- momento: é preciso guardá-los quando a conta nasce.
--
-- O QUE ESTA TABELA GUARDA — e por que nada aqui é dado pessoal:
--   fbp        cookie que o pixel cria para identificar o NAVEGADOR
--   fbc        derivado do fbclid, identifica o CLIQUE no anúncio
--   ga_client_id  o mesmo, do lado do Google
--   gclid / utm_*  de qual campanha, conjunto e ANÚNCIO a pessoa veio
-- Nenhum deles diz quem a pessoa é: dizem de onde ela chegou. Nome,
-- e-mail, documento e telefone NÃO entram aqui — o e-mail que a API de
-- Conversões usa é lido da conta na hora do envio e sai em SHA-256.
--
-- UMA LINHA POR EMPRESA, escrita uma vez. Se a pessoa criar conta, voltar
-- por outro anúncio e criar outra empresa, cada empresa guarda a sua.
--
-- RLS LIGADA E NENHUMA POLICY, como as tabelas comerciais da 123 e da
-- 149: isto é dado de aquisição do dono do SaaS, não dado operacional da
-- cerimonialista. Nem ela alcança a própria linha pela API; só o service
-- role, que é quem escreve na criação e lê no envio da conversão.
--
-- Aditiva. Conferência no fim, tudo `true`.
-- ============================================================

create table if not exists public.origem_do_clique (
  empresa_id     uuid primary key references public.empresas (id) on delete cascade,
  fbp            text,
  fbc            text,
  ga_client_id   text,
  gclid          text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  -- EMENDA DE 09/09/2026. A Meta tem um campo "Parâmetros de URL" que
  -- aceita macros: {{campaign.name}}, {{adset.name}}, {{ad.name}}. Com
  -- três criativos rodando no mesmo conjunto, saber a CAMPANHA não basta
  -- — a pergunta que decide onde pôr a verba é qual ANÚNCIO trouxe a
  -- conta. utm_content leva o nome do anúncio; utm_term, o do conjunto.
  utm_content    text,
  utm_term       text,
  -- o endereço e o navegador de quando a conta nasceu: a Meta os exige
  -- para casar o evento de servidor com o do navegador
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

comment on table public.origem_do_clique is
  'De qual anúncio veio cada conta. Identificadores de clique, nunca de pessoa — usados só para atribuir a conversão de servidor (API de Conversões da Meta e Measurement Protocol do GA4).';
comment on column public.origem_do_clique.fbp is
  'Cookie _fbp do pixel: identifica o navegador, não a pessoa.';
comment on column public.origem_do_clique.fbc is
  'Cookie _fbc, derivado do fbclid: identifica o clique no anúncio.';
comment on column public.origem_do_clique.utm_content is
  'Nome do ANÚNCIO, vindo da macro {{ad.name}} nos Parâmetros de URL. É por ele que se sabe qual criativo trouxe a conta.';
comment on column public.origem_do_clique.utm_term is
  'Nome do CONJUNTO de anúncios, vindo da macro {{adset.name}}.';
comment on column public.origem_do_clique.ga_client_id is
  'client_id do GA4 (o par de números do cookie _ga). Sem ele o Measurement Protocol registra a conversão sem sessão de origem.';

-- Para quem já rodou esta migração antes da emenda: as colunas entram
-- sem tocar no que está gravado.
alter table public.origem_do_clique add column if not exists utm_content text;
alter table public.origem_do_clique add column if not exists utm_term text;

alter table public.origem_do_clique enable row level security;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'origem_do_clique existe' as item,
       (select to_regclass('public.origem_do_clique') is not null) as ok
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class
        where oid = 'public.origem_do_clique'::regclass)
union all
select 'nenhuma policy (negado a anon e authenticated)',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'origem_do_clique')
union all
select 'uma linha por empresa (chave primária em empresa_id)',
       exists (select 1 from pg_index i
               join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
               where i.indrelid = 'public.origem_do_clique'::regclass
                 and i.indisprimary and a.attname = 'empresa_id')
union all
select 'morre junto com a empresa (cascade)',
       exists (select 1 from pg_constraint
               where conrelid = 'public.origem_do_clique'::regclass
                 and contype = 'f' and confdeltype = 'c')
union all
select 'guarda o anúncio e o conjunto, não só a campanha',
       (select count(*) = 2 from information_schema.columns
        where table_schema = 'public' and table_name = 'origem_do_clique'
          and column_name in ('utm_content', 'utm_term'))
union all
select 'nenhuma coluna de dado pessoal',
       not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'origem_do_clique'
                     and column_name in ('nome','email','telefone','documento','cpf','cnpj'));
