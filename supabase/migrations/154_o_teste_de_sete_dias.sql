-- ============================================================
-- 154 — O teste de sete dias, com interruptor no painel do dono
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- A DECISÃO (dono, 08/09/2026). Isto reverte, em parte, o que a 153
-- escreveu dois dias atrás. Lá, o anúncio deixou de convidar para a
-- conta grátis e passou a vender a promoção de lançamento. O motivo era
-- bom (pele em jogo, e uma COMPRA com valor para a Meta otimizar), mas
-- os anúncios rodaram e o funil parou antes do começo: pelo caminho do
-- anúncio, a única porta pede cartão e dezesseis campos de cobrança
-- ANTES da primeira tela do produto. Uma cerimonialista que nunca ouviu
-- falar do sistema não faz isso.
--
-- Hoje "primeira conta criada" e "primeira assinante" são o MESMO
-- evento — não existe caminho para alguém entrar sem pagar. Ou seja: o
-- dono só conhece a primeira usuária depois de ela ter comprado um
-- sistema que nunca viu por dentro, e até lá não aprende onde ela trava.
-- O teste separa os dois eventos. É essa separação que ele está
-- comprando, mais do que a conversão.
--
-- A PROMOÇÃO NÃO SAI DE CENA, muda de lugar: deixa de ser a porta de
-- entrada e vira a ferramenta de fechamento do teste ("assine até o dia
-- 7 e trave R$ 27,90 por três meses"). O botão de assinar agora
-- continua ao lado do de criar conta.
--
-- POR QUE 'trial' E NÃO UM STATUS NOVO. 'trial' já está no CHECK desde a
-- 123 e é o DEFAULT da coluna; virou órfão quando a 131 tirou o trial do
-- fluxo de cobrança (ele mentia: gravava 'trial' num cartão recusado e a
-- tela dizia "Assinatura ativa"). Reaproveitá-lo aqui traz de graça duas
-- coisas que um status novo obrigaria a reescrever:
--   · `podeEntrarNaPromocao` (lib/planos.ts) devolve ELEGÍVEL para uma
--     linha 'trial' sem `cancelada_em` e sem `ultimo_pagamento_em` — ou
--     seja, quem testa não perde o direito aos R$ 27,90, que é
--     exatamente o contrário do que se quer;
--   · o log de métricas já sabe que trial não é pagante (não gera início
--     nem churn) e que a conversão trial→ativa é o INÍCIO da venda, com
--     a data corrigida para o mês certo do CAC (admin-painel.ts).
--
-- O QUE MARCA O TESTE NÃO É O STATUS, É A DATA. `minha_assinatura()`
-- devolve `coalesce(a.status,'trial')`, então TODA conta sem linha já se
-- apresenta como 'trial' para a tela. Se a porta abrisse pela string,
-- abriria para todo mundo que nunca assinou — o buraco que a
-- porta-da-assinatura fechou anteontem, de volta pela porta dos fundos.
-- Quem decide é `teste_termina_em`, e só ela.
--
-- O INTERRUPTOR É DO DONO, NÃO DO CÓDIGO. Ligar e desligar a porta do
-- teste, e mudar de quantos dias ele é, acontece no /admin — como a
-- escada de preço já acontece na `plano_promocao`. Ninguém precisa
-- publicar nada para fechar a torneira.
--
-- FECHAR A PORTA NÃO CORTA QUEM JÁ ESTÁ DENTRO: o interruptor governa
-- só quem CHEGA. Quem já tem `teste_termina_em` corre os dias dela até
-- o fim. Encurtar prazo prometido é o tipo de coisa que gera
-- contestação de cartão e print no grupo.
--
-- NÃO PRECISA DE CRON para o teste ACABAR: a porta e os tetos comparam
-- a data em toda leitura, do mesmo jeito que a 150 já faz com
-- `proximo_vencimento`. (O painel do dono, esse sim, precisa passar a
-- ler a data para não chamar de "em trial hoje" quem testou em março —
-- isso é código, não banco, e vai junto na mesma entrega.)
--
-- ------------------------------------------------------------
-- O QUE MUDOU DEPOIS DA REVISÃO — dois céticos leram esta migração
-- antes de ela chegar ao SQL Editor, e os dois a reprovaram. Fica
-- registrado porque cada um destes era um jeito de perder dinheiro:
--
--  1) O primeiro rascunho tinha um CHECK ("data de teste só em linha
--     trial"). Ele não falharia ao ser criado — falharia DEPOIS, no
--     único instante em que entra dinheiro: `assinarPara` grava
--     status 'ativa' sem tocar em `teste_termina_em`, o CHECK recusa, e
--     a assinante fica com o cartão JÁ COBRADO na operadora e a linha
--     ainda em 'trial'. O webhook entraria em laço e o /admin pararia de
--     salvar aquela conta. Virou GATILHO que normaliza: quem sai de
--     'trial' tem a data apagada, e nenhuma escrita é recusada.
--
--  2) `teto_do_plano` passava a devolver os tetos do Essencial para
--     quem testa — e não adiantava nada: `pode_criar_evento` (147) só
--     consulta o teto quando `pagante` é verdadeiro, e quem testa não é
--     pagante de propósito (as métricas leem essa coluna). A testadora
--     ficaria com UM evento na vida enquanto a tela dizia "1 de 10".
--     Por isso `testando` virou COLUNA da função, e `pode_criar_evento`
--     passa a olhar as duas.
--
--  3) `current_date` é UTC na sessão do Postgres. Como o app conta em
--     Brasília, das 21h à meia-noite do último dia a porta diria "teste
--     vivo" e o banco diria "acabou" — justamente na noite em que a
--     promoção de fechamento deveria converter. Agora o banco conta em
--     America/Sao_Paulo, como a 151 já fazia.
--
--  4) A defesa contra "teste com plano fora do catálogo = sistema
--     ilimitado" estava escrita como `coalesce(plano,'essencial')`, e
--     `plano` é NOT NULL DEFAULT 'piloto': nunca dispararia. Agora a
--     defesa pergunta ao CATÁLOGO, que é o que importa.

begin;

-- ------------------------------------------------------------
-- 1) A data que define o teste
-- ------------------------------------------------------------
alter table public.assinaturas
  add column if not exists teste_termina_em date;

comment on column public.assinaturas.teste_termina_em is
  'Último dia do teste grátis, inclusive. Preenchida no cadastro quando o portão está aberto; NUNCA preenchida por quem paga (o gatilho trg_teste_so_no_trial a apaga sozinho). É ela, e não o status, que abre a porta durante o teste — status trial sozinho não vale nada, porque conta sem linha também se apresenta como trial.';

-- O gatilho normaliza em vez de recusar. Um CHECK aqui derrubaria a
-- conversão da testadora com o cartão já cobrado (ver o item 1 do
-- histórico de revisão, no cabeçalho): `assinarPara`, o webhook do
-- gateway e o /admin gravam status sem saber que esta coluna existe.
-- Assim eles continuam sem precisar saber.
create or replace function public.trg_teste_so_no_trial()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from 'trial' then
    new.teste_termina_em := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_teste_so_no_trial on public.assinaturas;
create trigger trg_teste_so_no_trial
  before insert or update on public.assinaturas
  for each row execute function public.trg_teste_so_no_trial();

-- Higiene do que já existe: nenhuma linha de hoje tem data de teste (a
-- coluna acabou de nascer), mas re-execuções e escritas anteriores ao
-- gatilho não deixam resíduo.
update public.assinaturas
   set teste_termina_em = null
 where teste_termina_em is not null
   and status is distinct from 'trial';

-- ------------------------------------------------------------
-- 2) O interruptor, na mão do dono
-- ------------------------------------------------------------
-- Uma linha só, para sempre: o `check (id)` com default true impede a
-- segunda. Sem linha, o código lê "porta fechada" e o sistema volta ao
-- comportamento da 153 sozinho — que é o padrão seguro, e é também o
-- que acontece enquanto esta migração não for aplicada.
create table if not exists public.teste_gratis (
  id boolean primary key default true check (id),
  aberto boolean not null default false,
  dias int not null default 7 check (dias between 1 and 90),
  atualizado_em timestamptz not null default now()
);

comment on table public.teste_gratis is
  'O portão do teste grátis, ligado e desligado pelo dono no /admin. Uma linha só. Governa apenas quem CHEGA: fechar não corta o teste de quem já está dentro.';
comment on column public.teste_gratis.aberto is
  'Com false, o cadastro grátis some da página de vendas e os botões voltam a levar ao checkout.';
comment on column public.teste_gratis.dias is
  'Quantos dias vale o teste de quem se cadastrar a partir de agora. Mudar não mexe em teste já concedido.';

insert into public.teste_gratis (id, aberto, dias)
  values (true, false, 7)
  on conflict (id) do nothing;

alter table public.teste_gratis enable row level security;

-- Legível sem conta: a página de vendas precisa saber, antes do login,
-- se mostra "criar conta grátis" ou o checkout. Não há segredo aqui —
-- é a mesma informação que o botão já anuncia em voz alta.
drop policy if exists teste_gratis_leitura_publica on public.teste_gratis;
create policy teste_gratis_leitura_publica
  on public.teste_gratis for select
  to anon
  using (true);

drop policy if exists teste_gratis_leitura on public.teste_gratis;
create policy teste_gratis_leitura
  on public.teste_gratis for select
  to authenticated
  using (true);

-- Ninguém escreve por policy: o interruptor muda pelo service role, no
-- admin, atrás de `exigirSuperAdmin()`. Sem policy de escrita, nem a
-- dona da própria conta consegue se dar um teste eterno pela API.

-- ------------------------------------------------------------
-- 3) Os tetos durante o teste
-- ------------------------------------------------------------
-- O teste é do plano Essencial, com os tetos do Essencial — a mesma
-- regra que a 153 escreveu para a promoção: promoção é PREÇO, nunca
-- plano. Vale para o teste também.
--
-- `testando` é COLUNA e não se confunde com `pagante`: as métricas leem
-- `pagante` para dizer quem está no MRR, e quem testa não está. Mas os
-- TETOS olham as duas — foi o que o segundo cético pegou.
--
-- ARMADILHA DESARMADA: os tetos saem de `plano_catalogo`, e 'piloto' e
-- 'cortesia' NÃO estão lá. Com `c.codigo is null` os tetos voltam NULL,
-- e `pode_adicionar_login` faz `coalesce(algo < null, true)` = TRUE —
-- teste com plano fora do catálogo seria login ILIMITADO de graça. Por
-- isso o teste vivo pergunta ao catálogo: plano que não está à venda cai
-- no Essencial.
--
-- `drop` antes do `create`: a forma mudou (uma coluna a mais), e
-- `create or replace` não muda a forma de uma função `returns table`.
-- Nada depende dela por objeto — só por nome, dentro de
-- pode_criar_evento, pode_adicionar_login, minha_assinatura e dos
-- gatilhos —, então dropar é seguro.
drop function if exists public.teto_do_plano(uuid);
create function public.teto_do_plano(p_empresa_id uuid)
returns table (
  eventos int,
  logins int,
  plano text,
  plano_nome text,
  pagante boolean,
  testando boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with conta as (
    select
      a.plano,
      a.status,
      -- o teste vivo: status trial E data de fim ainda no futuro. A data
      -- é comparada em Brasília, como a 151 faz — `current_date` é UTC
      -- na sessão do Postgres, e o app conta em Brasília: as três horas
      -- de diferença matariam o teste na noite em que ele deve fechar.
      coalesce(
        a.status = 'trial'
        and a.teste_termina_em is not null
        and a.teste_termina_em >= (now() at time zone 'America/Sao_Paulo')::date,
        false
      ) as testando,
      -- pagante: em dia, atrasada, cortesia — OU cancelada com o mês
      -- pago ainda correndo. Mantido palavra por palavra como a 150
      -- escreveu: mexer aqui mudaria a vida de quem paga, e esta
      -- migração é sobre quem ainda não paga.
      coalesce(
        a.status in ('ativa', 'inadimplente', 'pausada')
        or (a.status = 'cancelada'
            and a.proximo_vencimento is not null
            and a.proximo_vencimento >= current_date),
        false
      ) as pagante
    from (select p_empresa_id as id) e
    left join public.assinaturas a on a.empresa_id = e.id
  ),
  -- o plano que vale para ler o catálogo: quem testa e está num plano
  -- que não está à venda lê o Essencial; o resto lê o que contratou
  efetivo as (
    select
      k.*,
      case
        when k.testando
         and not exists (select 1 from public.plano_catalogo c2 where c2.codigo = k.plano)
        then 'essencial'
        else k.plano
      end as plano_lido
    from conta k
  )
  select
    case when k.pagante or k.testando
      then case when c.codigo is null then null else c.eventos_em_andamento end
      else 1
    end as eventos,
    case when k.pagante or k.testando
      then case when c.codigo is null then null else c.logins end
      else 1
    end as logins,
    coalesce(k.plano, 'piloto') as plano,
    coalesce(c.nome, initcap(coalesce(k.plano, 'piloto'))) as plano_nome,
    -- pagante continua significando PAGANTE: quem testa não entra no
    -- MRR, não vira "assinatura nova" do mês e não vira churn quando o
    -- teste acaba. Só os tetos mudam.
    k.pagante,
    k.testando
  from efetivo k
  left join public.plano_catalogo c on c.codigo = k.plano_lido;
$$;

revoke all on function public.teto_do_plano(uuid) from public, anon;
grant execute on function public.teto_do_plano(uuid) to authenticated;

comment on function public.teto_do_plano(uuid) is
  'Tetos da conta pelo plano. Pagante = ativa/inadimplente/pausada, ou cancelada com proximo_vencimento >= hoje. Testando = trial com teste_termina_em >= hoje em Brasília; recebe os MESMOS tetos do plano (Essencial quando o plano não está no catálogo) mas NÃO conta como pagante nas métricas. Fora disso, 1 evento na vida / 1 login.';

-- ------------------------------------------------------------
-- 4) Quem testa cria eventos de verdade
-- ------------------------------------------------------------
-- Sem esta função, tudo acima é decoração: `pode_criar_evento` só
-- consultava o teto de quem é PAGANTE, e mandava todo o resto para
-- "eventos na vida < 1". A testadora veria "1 de 10" na tela e a trava
-- no segundo evento. Assinatura preservada (o gatilho e a policy de
-- INSERT de events chamam este nome).
--
-- O que NÃO mudou aqui, de propósito: as duas mensagens de erro do
-- `trg_limite_do_plano` (147). Quem testa e enche os dez eventos em sete
-- dias ouve "o primeiro evento é por nossa conta", que é a frase errada
-- — mas reescrever aquele gatilho inteiro por causa de um caso que
-- exige dez eventos numa semana é mais risco do que benefício hoje.
create or replace function public.pode_criar_evento(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when t.pagante or t.testando
      then coalesce(public.eventos_que_contam(p_empresa_id) < t.eventos, true)
    else public.eventos_da_vida(p_empresa_id) < 1
  end
  from public.teto_do_plano(p_empresa_id) t;
$$;

revoke all on function public.pode_criar_evento(uuid) from public, anon;
grant execute on function public.pode_criar_evento(uuid) to authenticated;

commit;

-- ------------------------------------------------------------
-- Como abrir e fechar o portão enquanto a tela do /admin não estiver
-- publicada (depois disso, é um clique lá):
--
--   update public.teste_gratis set aberto = true,  dias = 7, atualizado_em = now();
--   update public.teste_gratis set aberto = false,            atualizado_em = now();
--
-- ORDEM DA ENTREGA: esta migração pode ser aplicada ANTES do código sem
-- efeito nenhum — a tabela nasce fechada e a coluna nasce vazia. É essa
-- a ordem certa: banco primeiro, código depois.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- (O estado do portão NÃO é conferido de propósito: ele é escolha do
-- dono e muda no /admin; conferir valor semeado faria uma migração
-- correta acusar falso na segunda execução.)
-- ------------------------------------------------------------
select 'coluna teste_termina_em existe' as item,
       (select count(*) = 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'assinaturas'
          and column_name = 'teste_termina_em') as ok
union all
select 'nenhum CHECK novo em assinaturas (seria armadilha de cobrança)',
       (select count(*) = 0 from pg_constraint
        where conrelid = 'public.assinaturas'::regclass
          and conname = 'assinaturas_teste_so_no_trial')
union all
select 'o gatilho que apaga a data existe',
       (select count(*) = 1 from pg_trigger
        where tgrelid = 'public.assinaturas'::regclass
          and tgname = 'trg_teste_so_no_trial'
          and not tgisinternal)
union all
select 'nenhuma linha paga tem data de teste',
       (select count(*) = 0 from public.assinaturas
        where teste_termina_em is not null and status is distinct from 'trial')
union all
select 'o interruptor existe com uma linha só',
       (select count(*) = 1 from public.teste_gratis)
union all
select 'o interruptor tem os dois CHECKs (id e dias)',
       (select count(*) = 2 from pg_constraint
        where conrelid = 'public.teste_gratis'::regclass
          and contype = 'c')
union all
select 'RLS ligada no interruptor',
       (select relrowsecurity from pg_class
        where oid = 'public.teste_gratis'::regclass)
union all
select 'o interruptor é legível sem conta',
       (select count(*) = 1 from pg_policies
        where schemaname = 'public' and tablename = 'teste_gratis'
          and policyname = 'teste_gratis_leitura_publica')
union all
select 'ninguém escreve o interruptor por policy',
       (select count(*) = 0 from pg_policies
        where schemaname = 'public' and tablename = 'teste_gratis'
          and cmd <> 'SELECT')
union all
select 'teto_do_plano existe uma vez',
       (select count(*) = 1 from pg_proc
        where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'teto_do_plano devolve a coluna testando',
       (select pg_get_function_result(oid) ilike '%testando boolean%'
        from pg_proc where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'o teste é medido em Brasília, não em UTC',
       (select prosrc ilike '%teste_termina_em >= (now() at time zone ''America/Sao_Paulo'')::date%'
        from pg_proc where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'teste com plano fora do catálogo cai no Essencial',
       (select prosrc ilike '%plano_catalogo c2 where c2.codigo = k.plano%'
        from pg_proc where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'quem testa NÃO conta como pagante',
       (select prosrc ilike '%k.pagante,%' and prosrc ilike '%k.testando%'
        from pg_proc where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'a régua da 150 continua de pé (mês pago vale até o fim)',
       (select prosrc ilike '%proximo_vencimento >= current_date%'
        from pg_proc where proname = 'teto_do_plano'
          and pronamespace = 'public'::regnamespace)
union all
select 'pode_criar_evento enxerga quem testa',
       (select prosrc ilike '%t.pagante or t.testando%'
        from pg_proc where proname = 'pode_criar_evento'
          and pronamespace = 'public'::regnamespace)
union all
select 'anon não executa teto_do_plano',
       (select not has_function_privilege('anon', 'public.teto_do_plano(uuid)', 'execute'))
union all
select 'authenticated executa teto_do_plano',
       (select has_function_privilege('authenticated', 'public.teto_do_plano(uuid)', 'execute'))
union all
select 'anon não executa pode_criar_evento',
       (select not has_function_privilege('anon', 'public.pode_criar_evento(uuid)', 'execute'))
union all
select 'authenticated executa pode_criar_evento',
       (select has_function_privilege('authenticated', 'public.pode_criar_evento(uuid)', 'execute'));
