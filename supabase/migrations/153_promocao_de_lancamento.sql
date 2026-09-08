-- ============================================================
-- 153 — A promoção de lançamento, em degraus
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- A DECISÃO (dono, 06/09/2026). O anúncio deixa de convidar para a conta
-- grátis e passa a vender uma promoção de lançamento. Motivo comercial:
-- quem passa o cartão, mesmo por pouco, entra com pele em jogo — e o
-- evento que a Meta e o Google recebem passa a ser uma COMPRA com valor,
-- que é o sinal certo para otimizar anúncio. Grátis fazia a plataforma
-- caçar quem cria conta e some.
--
-- Por que ESCADA e não um desconto só: o ciclo desta cliente é longo. Ela
-- fecha um casamento com 6 a 12 meses de antecedência, e só entende por
-- que o sistema vale R$ 97 no DIA DO EVENTO — o link do fornecedor, a
-- recepção lendo QR, a prestação de contas. Três meses baratos e um salto
-- de 3,5× a levariam a cancelar sem nunca ter visto a melhor parte. A
-- escada cobre um ciclo inteiro e o salto vira 2×.
--
--   meses 1 a 3   R$ 27,90
--   do 4º em diante  o preço do plano (hoje R$ 97,00, lido do catálogo)
--
-- EMENDA DE 08/09/2026 — o degrau do meio saiu. A escada tinha três
-- preços (27,90 → 57,00 → 97,00) e o dono a leu como visitante: "ficou
-- confuso na leitura e tem choque do mesmo jeito". É verdade: 27,90 para
-- 57,00 e 57,00 para 97,00 são o mesmo susto, dado duas vezes, e três
-- preços numa frase ninguém guarda. Fica um degrau só, e a frase que a
-- página monta sozinha vira "R$ 27,90 nos meses 1 a 3, R$ 97,00 do 4º mês
-- em diante".
--
-- POR QUE APAGAR E NÃO MARCAR `ativo = false`: as duas colunas fazem
-- coisas diferentes de propósito. `ativo` governa a VITRINE (a policy de
-- leitura filtra por ele), e `valor_da_promocao` o IGNORA, para desligar
-- a venda não subir o preço de quem está no meio da escada. Marcar
-- inativo faria a página anunciar R$ 97,00 no mês 4 e a cobrança sacar
-- R$ 57,00 no mesmo mês — a vitrine prometendo o que o checkout não
-- cobra, que é de onde nasce contestação de cartão. Apagar é seguro
-- aqui e agora: conferido em 08/09/2026, nenhuma assinatura tem
-- `promocao_codigo` preenchido, ou seja, ninguém está na escada.
--
-- POR QUE NÃO O DESCONTO DA OPERADORA. A Pagar.me tem desconto por ciclos
-- (value/discount_type/cycles), e ele resolveria UM degrau sozinho. Não
-- resolve dois: os descontos se somam nos primeiros ciclos (97 − 69,10 −
-- 40 dá negativo) e a documentação não define ordem entre eles. Aqui a
-- escada é andada trocando o preço do item da assinatura — o mesmo
-- caminho da troca de plano, que já está no ar e testado.
--
-- O DEGRAU É CALCULADO, NUNCA GUARDADO. A tabela guarda só o código e a
-- data de início; qual degrau vale hoje é conta. Assim, se a rotina
-- diária falhar por uma semana, a próxima execução acerta sozinha — e a
-- falha erra a favor da cliente (ela segue pagando o degrau anterior),
-- que é o único lado em que esse erro pode cair.
--
-- O PLANO NÃO MUDA: promoção é PREÇO, não plano. A conta é 'essencial'
-- desde o primeiro dia, com os tetos do Essencial (teto_do_plano lê o
-- plano, não o valor). Ninguém ganha mais evento por pagar menos, e
-- ninguém perde acesso quando o preço sobe.
--
-- Aditiva. Conferência no fim, tudo `true`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Os degraus
-- ------------------------------------------------------------
create table if not exists public.plano_promocao (
  codigo        text    not null,
  ordem         int     not null,
  -- > 0, não >= 0: um degrau de R$ 0,00 não é promoção, é assinatura
  -- gratuita — e a operadora recusa cobrança de zero, o que deixaria a
  -- conta num limbo (assinatura criada, cobrança nunca aprovada). Quem
  -- quiser dar um mês de graça faz isso pelo status 'pausada'
  -- (cortesia), que o sistema já entende. Negativo não entra aqui em
  -- nenhuma hipótese: esta escada troca o PREÇO do item, nunca aplica
  -- desconto — foi por isso que o desconto por ciclos da operadora foi
  -- descartado (dois deles se somariam e o valor cobrado ficaria abaixo
  -- de zero).
  valor_mensal  numeric(12, 2) not null check (valor_mensal > 0),
  -- por quantos meses este degrau vale
  meses         int     not null check (meses > 0),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  primary key (codigo, ordem)
);

comment on table public.plano_promocao is
  'Os degraus de uma promoção de lançamento. Depois do último, vale o preço do plano no catálogo. Promoção é preço, nunca plano: os tetos continuam sendo os do plano contratado.';
comment on column public.plano_promocao.meses is
  'Duração DESTE degrau em meses, não o acumulado.';
comment on column public.plano_promocao.ativo is
  'Governa quem ENTRA: a vitrine e a policy de leitura filtram por aqui. NÃO governa quem já entrou — valor_da_promocao ignora esta coluna de propósito, para desligar a venda não subir o preço de quem está no meio da escada.';

-- A escada de lançamento. `where not exists` para a migração poder rodar
-- de novo sem duplicar nem sobrescrever um preço que o dono tenha
-- ajustado à mão depois.
insert into public.plano_promocao (codigo, ordem, valor_mensal, meses)
select 'lancamento', 1, 27.90, 3
where not exists (
  select 1 from public.plano_promocao where codigo = 'lancamento' and ordem = 1
);
-- O degrau 2 (R$ 57,00) existiu entre 06/09 e 08/09/2026 e foi removido
-- pela emenda do cabeçalho. O delete fica aqui, e não numa migração
-- nova, porque este arquivo é convergente e é ele que define a escada:
-- sem esta linha, rodar a 153 de novo ressuscitaria o degrau que o dono
-- mandou tirar. Se um dia voltar a haver degrau do meio, é aqui que ele
-- nasce de novo.
delete from public.plano_promocao where codigo = 'lancamento' and ordem = 2;

alter table public.plano_promocao enable row level security;

-- Lida por quem está logado E por quem ainda não tem conta: a página de
-- vendas precisa mostrar a escada inteira antes de a pessoa assinar.
-- Ninguém escreve por policy — preço muda pelo service role, como no
-- catálogo de planos (147/150).
drop policy if exists plano_promocao_leitura on public.plano_promocao;
create policy plano_promocao_leitura
  on public.plano_promocao for select
  to anon, authenticated
  using (ativo);

-- ------------------------------------------------------------
-- 2) Em que degrau esta assinatura está
-- ------------------------------------------------------------
alter table public.assinaturas
  add column if not exists promocao_codigo text;
alter table public.assinaturas
  add column if not exists promocao_inicio date;

comment on column public.assinaturas.promocao_codigo is
  'A promoção com que esta conta entrou. Null = preço cheio do plano.';
comment on column public.assinaturas.promocao_inicio is
  'Quando a escada começou a contar. O degrau de hoje é calculado a partir daqui, nunca guardado.';

-- ------------------------------------------------------------
-- 3) Quanto esta conta deve pagar HOJE
-- ------------------------------------------------------------
-- Devolve o valor do degrau vigente, ou NULL quando a escada acabou (aí
-- vale o preço do plano no catálogo). Pura: entra código e data, sai
-- número — o chamador é que decide o que fazer com isso.
--
-- DUAS COISAS QUE ESTA FUNÇÃO NÃO OLHA, e por quê:
--
--   `ativo`. A coluna governa quem ENTRA na promoção — é ela que a
--   vitrine e a policy de leitura filtram. Quem já entrou tem contrato:
--   a escada dela não pode encurtar porque o dono tirou o lançamento de
--   venda. Com o filtro aqui dentro, um `update plano_promocao set
--   ativo = false` fazia esta função devolver NULL para TODA conta em
--   curso, a rotina diária lia NULL como "acabou a escada" e subia o
--   preço de quem estava no primeiro mês — de R$ 27,90 para o cheio, na
--   cobrança seguinte, sem ninguém ter decidido isso. Desativar um
--   degrau só era pior ainda: a janela acumulada dos outros encolhia e
--   quem estava no 4º mês caía direto no preço cheio.
--
--   A sessão de quem pergunta. `security definer` porque, sem ele, a
--   policy `using (ativo)` refazia por baixo exatamente o filtro que o
--   parágrafo acima acabou de tirar — o corpo veria só os degraus à
--   venda. O valor cobrado tem de ser o mesmo para o cron (service
--   role) e para a tela (authenticated); é o mesmo molde das funções
--   da 147/150.
create or replace function public.valor_da_promocao(
  p_codigo text,
  p_inicio date,
  p_hoje   date default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with hoje as (
    select coalesce(p_hoje, (now() at time zone 'America/Sao_Paulo')::date) as d
  ),
  -- quantos meses inteiros se passaram desde o início
  decorridos as (
    select case
      when p_codigo is null or p_inicio is null then null
      else (extract(year from age((select d from hoje), p_inicio)) * 12
          + extract(month from age((select d from hoje), p_inicio)))::int
    end as m
  ),
  -- o fim acumulado de cada degrau, em meses
  escada as (
    select ordem, valor_mensal,
           sum(meses) over (order by ordem rows between unbounded preceding and current row) as ate
    -- sem filtro de `ativo`: ver o bloco acima. A escada de quem já
    -- entrou é contrato, não vitrine.
    from public.plano_promocao
    where codigo = p_codigo
  )
  select e.valor_mensal
  from escada e, decorridos
  where decorridos.m is not null and decorridos.m < e.ate
  order by e.ordem
  limit 1;
$$;

comment on function public.valor_da_promocao(text, date, date) is
  'O valor do degrau vigente hoje, ou NULL quando a escada acabou. O degrau é calculado, nunca guardado: rotina que falhou por uma semana se corrige sozinha na execução seguinte.';

revoke all on function public.valor_da_promocao(text, date, date) from public, anon;
grant execute on function public.valor_da_promocao(text, date, date) to authenticated;
-- service_role explícito, como a convenção da casa (031, 117): é a rotina
-- diária que anda a escada, e ela roda sem sessão. Sem esta linha o cron
-- não quebraria nada — devolveria "não sei" para todas as contas e a
-- escada simplesmente nunca subiria, em silêncio, que é pior que quebrar.
grant execute on function public.valor_da_promocao(text, date, date) to service_role;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'plano_promocao existe' as item,
       (select to_regclass('public.plano_promocao') is not null) as ok
union all
select 'a escada de lançamento tem um degrau só',
       (select count(*) = 1 from public.plano_promocao where codigo = 'lancamento')
union all
select 'degrau 1: R$ 27,90 por 3 meses',
       exists (select 1 from public.plano_promocao
               where codigo = 'lancamento' and ordem = 1
                 and valor_mensal = 27.90 and meses = 3)
union all
select 'o degrau do meio não existe mais',
       not exists (select 1 from public.plano_promocao
                   where codigo = 'lancamento' and ordem = 2)
union all
select 'assinaturas ganhou as duas colunas',
       (select count(*) = 2 from information_schema.columns
        where table_schema = 'public' and table_name = 'assinaturas'
          and column_name in ('promocao_codigo', 'promocao_inicio'))
union all
-- A escada, mês a mês, contra o que ela deve valer. `coalesce(... , false)`
-- de propósito: NULL é justamente o modo de falha desta escada (degrau
-- apagado, código errado), e `NULL = 27.90` sai NULL — coluna em branco
-- no SQL Editor, que quem varre à procura de `false` dá por aprovada.
select 'mês 0 (recém-assinada) paga 27,90',
       coalesce(public.valor_da_promocao('lancamento', current_date, current_date) = 27.90, false)
union all
select 'mês 2 ainda paga 27,90',
       coalesce(public.valor_da_promocao('lancamento', (current_date - interval '2 months')::date, current_date) = 27.90, false)
union all
select 'mês 3 acabou a escada (null = preço cheio do plano)',
       public.valor_da_promocao('lancamento', (current_date - interval '3 months')::date, current_date) is null
union all
select 'mês 5 continua no preço cheio',
       public.valor_da_promocao('lancamento', (current_date - interval '5 months')::date, current_date) is null
union all
select 'ninguém ficou preso num degrau que não existe mais',
       (select count(*) = 0 from public.assinaturas a
         where a.promocao_codigo = 'lancamento'
           and public.valor_da_promocao(a.promocao_codigo, a.promocao_inicio) = 57.00)
union all
select 'conta sem promoção devolve null',
       public.valor_da_promocao(null, null, current_date) is null
union all
-- nenhum degrau pode cobrar zero (a operadora recusa) nem valor negativo
select 'todo degrau cobra mais que zero',
       not exists (select 1 from public.plano_promocao where valor_mensal <= 0)
union all
-- e nenhum degrau pode custar MAIS que o plano cheio: promoção que
-- encarece não é promoção, é cobrança indevida com outro nome
select 'nenhum degrau custa mais que o Essencial',
       not exists (
         select 1 from public.plano_promocao p
         where p.codigo = 'lancamento'
           and p.valor_mensal > (select c.valor_mensal from public.plano_catalogo c
                                 where c.codigo = 'essencial')
       )
union all
-- a escada tem de subir: um degrau mais barato depois de um mais caro
-- inverteria a promessa feita na tela
select 'a escada sobe, degrau a degrau',
       not exists (
         select 1
         from public.plano_promocao a
         join public.plano_promocao b
           on b.codigo = a.codigo and b.ordem = a.ordem + 1
         where a.codigo = 'lancamento' and b.valor_mensal <= a.valor_mensal
       )
union all
-- Não "ninguém entrou ainda" — isso vira false no dia seguinte ao
-- lançamento, numa migração que rodou perfeitamente, e um false vermelho
-- faz o dono desconfiar de um degrau que está certo. O que se confere é a
-- invariante que importa: código sem data de início deixaria a escada sem
-- âncora, e o degrau de hoje viraria NULL para sempre.
select 'nenhuma promoção ficou sem data de início',
       not exists (select 1 from public.assinaturas
                   where promocao_codigo is not null and promocao_inicio is null)
union all
select 'anon lê a escada (a página de vendas precisa)',
       exists (select 1 from pg_policies
               where schemaname = 'public' and tablename = 'plano_promocao'
                 and 'anon' = any(roles) and cmd = 'SELECT')
union all
select 'ninguém escreve na escada por policy',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'plano_promocao'
                     and cmd in ('INSERT', 'UPDATE', 'DELETE'))
union all
-- Os grants, como a 150 confere os dela. O service_role é o único ator
-- que ANDA a escada: sem o grant dele nada quebraria — a escada
-- simplesmente nunca subiria, em silêncio, que é pior que quebrar.
select 'o cron (service_role) executa a função',
       has_function_privilege('service_role',
         'public.valor_da_promocao(text,date,date)', 'execute')
union all
select 'a tela (authenticated) executa a função',
       has_function_privilege('authenticated',
         'public.valor_da_promocao(text,date,date)', 'execute')
union all
select 'anon NÃO executa a função',
       not has_function_privilege('anon',
         'public.valor_da_promocao(text,date,date)', 'execute')
union all
-- security definer: sem ele, a policy `using (ativo)` refaria por baixo o
-- filtro que o corpo da função tirou de propósito
select 'a função roda como dona (ignora a policy de vitrine)',
       (select p.prosecdef from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'valor_da_promocao');
