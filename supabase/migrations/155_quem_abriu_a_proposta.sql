-- ============================================================
-- 155 — Quem abriu a proposta, e quantas vezes
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- A DECISÃO (dono, 10/09/2026). Ele olhou a concorrente e viu que ela
-- rastreia a visualização do orçamento — "eles rastreiam as pessoas que
-- fecham os orçamentos da cerimonialista". É a informação que falta do
-- lado de cá: hoje a cerimonialista manda o link e fica no escuro até a
-- cliente responder, ou não responder.
--
-- O QUE ISTO RESPONDE, e é uma pergunta de venda, não de tecnologia:
-- "ela abriu?". Sem resposta, o silêncio da cliente é ambíguo — pode ser
-- que não viu, pode ser que viu e achou caro. Com resposta, viram dois
-- problemas diferentes, com duas ações diferentes: reenviar o link, ou
-- ligar para conversar sobre o valor.
--
-- TRÊS COISAS QUE ESTA TABELA NÃO FAZ, de propósito:
--
--  1. NÃO identifica a pessoa. Não guarda IP, não guarda navegador, não
--     põe cookie. Guarda que houve visita e quando. A proposta é aberta
--     pela noiva, pela mãe dela e pela irmã no mesmo dia — saber QUEM
--     abriu não muda nenhuma decisão da cerimonialista, e guardar isso
--     seria vigiar a cliente dela.
--  2. NÃO conta a própria cerimonialista. Ela abre o link para conferir
--     a peça, e é o caso mais comum de visita. Quem filtra é o
--     aplicativo, que já sabe reconhecer a dona da conta (a faixa de
--     rascunho da 09/09 usa a mesma leitura).
--  3. NÃO conta robô. A contagem sai do NAVEGADOR, depois que a página
--     roda — o buscador de prévia do WhatsApp, que baixa a página assim
--     que o link é colado na conversa, não executa nada e por isso não
--     entra. Sem isso, toda proposta nasceria "vista 1 vez" no instante
--     em que fosse enviada, que é pior do que não ter contagem.
--
-- ONDE MORA: colunas na própria `orcamentos`, e não tabela nova. São
-- três campos de resumo, lidos sempre junto com o orçamento e nunca
-- sozinhos; uma tabela de eventos daria histórico que ninguém pediu e um
-- JOIN em toda listagem.

begin;

alter table public.orcamentos
  add column if not exists visitas int not null default 0;
alter table public.orcamentos
  add column if not exists primeira_visita_em timestamptz;
alter table public.orcamentos
  add column if not exists ultima_visita_em timestamptz;

comment on column public.orcamentos.visitas is
  'Quantas vezes a proposta foi aberta por alguém que NÃO é da empresa dona. Contada pelo navegador, depois da página rodar — prévia de link e robô não entram.';
comment on column public.orcamentos.primeira_visita_em is
  'Quando a cliente abriu pela primeira vez. É a resposta para "ela chegou a ver?".';
comment on column public.orcamentos.ultima_visita_em is
  'A visita mais recente. Duas semanas de silêncio depois de cinco aberturas é uma conversa; duas semanas sem nenhuma abertura é outra.';

-- ------------------------------------------------------------
-- O registro, por RPC — a tabela continua fechada
-- ------------------------------------------------------------
-- `orcamentos` não tem policy de escrita para anon, e não vai ter: o
-- público que abre a proposta não pode tocar em preço, prazo nem status.
-- Esta função é a única porta, e ela só sabe fazer uma coisa: somar um.
--
-- `security definer` porque quem chama é anônimo. O `p_hash` é a
-- credencial — quem não tem o link não acha a linha, exatamente como no
-- resto do sistema (roteiro público, confirmação de fornecedor, portal).
--
-- SÓ CONTA PROPOSTA ENVIADA. Rascunho aberto pela dona não é visita de
-- cliente, e proposta já aceita não precisa mais de contagem.
create or replace function public.registrar_visita_orcamento(p_hash text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.orcamentos
     set visitas = visitas + 1,
         primeira_visita_em = coalesce(primeira_visita_em, now()),
         ultima_visita_em = now()
   where hash_publico = p_hash
     and status = 'enviado';
$$;

revoke all on function public.registrar_visita_orcamento(text) from public;
grant execute on function public.registrar_visita_orcamento(text) to anon, authenticated;

comment on function public.registrar_visita_orcamento(text) is
  'Soma uma visita à proposta enviada daquele hash. Única escrita que o público alcança em orcamentos, e ela não lê nem devolve nada — quem tem o link conta uma visita, e nada mais.';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'as três colunas existem' as item,
       (select count(*) = 3 from information_schema.columns
        where table_schema = 'public' and table_name = 'orcamentos'
          and column_name in ('visitas', 'primeira_visita_em', 'ultima_visita_em')) as ok
union all
select 'visitas nasce em zero e nunca nula',
       (select is_nullable = 'NO' and column_default like '0%'
        from information_schema.columns
        where table_schema = 'public' and table_name = 'orcamentos'
          and column_name = 'visitas')
union all
select 'nenhum orçamento antigo ficou com visita inventada',
       (select count(*) = 0 from public.orcamentos where visitas <> 0 and primeira_visita_em is null)
union all
select 'a função existe uma vez',
       (select count(*) = 1 from pg_proc
        where proname = 'registrar_visita_orcamento'
          and pronamespace = 'public'::regnamespace)
union all
select 'quem abre a proposta pode contar a visita',
       (select has_function_privilege('anon', 'public.registrar_visita_orcamento(text)', 'execute'))
union all
select 'a função só mexe em proposta enviada',
       (select prosrc ilike '%status = ''enviado''%'
        from pg_proc where proname = 'registrar_visita_orcamento'
          and pronamespace = 'public'::regnamespace)
union all
select 'a função não guarda IP nem navegador',
       (select prosrc not ilike '%ip%' and prosrc not ilike '%user_agent%'
        from pg_proc where proname = 'registrar_visita_orcamento'
          and pronamespace = 'public'::regnamespace)
union all
select 'anon continua sem escrever direto em orcamentos',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'orcamentos'
                     and cmd in ('UPDATE', 'INSERT', 'ALL')
                     and 'anon' = any(roles));
