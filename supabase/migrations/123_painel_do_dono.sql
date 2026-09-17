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
-- 4) Contas da casa — fora dos números do painel (16/09/2026)
-- ------------------------------------------------------------
-- As contas do próprio dono (a de administrador, as de teste, as do
-- vídeo) entravam no MRR, no churn e na lista de clientes: a conta de
-- teste com cortesia de R$ 1 aparecia como assinante, e cada teste de
-- cancelamento virava churn. Uma linha aqui = a empresa sai das métricas
-- e vai para um grupo à parte na tela Contas.
--
-- Tabela própria, e não uma coluna em empresas: a dona de empresa edita
-- a própria linha de empresas, e não pode tirar a si mesma dos números.
-- Aqui vale o mesmo modelo das tabelas acima: RLS ligada, NENHUMA
-- policy — só o painel, com a chave de serviço, lê e escreve.
create table if not exists public.contas_da_casa (
  empresa_id  uuid primary key references public.empresas (id) on delete cascade,
  marcada_em  timestamptz not null default now()
);

alter table public.contas_da_casa enable row level security;

-- ------------------------------------------------------------
-- 5) Quem está usando o sistema agora, e o quê (16/09/2026)
-- ------------------------------------------------------------
-- Pedido do dono: ver no painel quem está "ao vivo" e em que área, e se
-- as contas estão usando o sistema, sem ver dado nenhum. Guarda só o NOME
-- DA ÁREA ("Evento › Planejamento"): nunca o endereço com ids, nunca o que
-- aparece na tela, nunca o que foi digitado.
--
-- presenca: uma linha por pessoa, com a área e a última vez que a tela
-- dela deu sinal (a cada minuto, com a aba à vista). "Ao vivo" é sinal
-- recente; a leitura decide o prazo.
-- uso_diario: por pessoa, dia (de Brasília) e área, quantas vezes abriu e
-- quantos minutos ficou. Some depois de 13 meses (rotina diária).
--
-- Mesmo modelo das tabelas acima: RLS ligada e NENHUMA policy, só o
-- painel lê, com a chave de serviço. Quem escreve é a própria pessoa, pela
-- função abaixo, e só a própria linha.
create table if not exists public.presenca (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  area        text not null,
  -- início desta visita: sem sinal por 10 minutos, a próxima é outra
  desde       timestamptz not null default now(),
  visto_em    timestamptz not null default now()
);

alter table public.presenca enable row level security;

create index if not exists presenca_empresa_idx
  on public.presenca (empresa_id, visto_em desc);

create table if not exists public.uso_diario (
  user_id     uuid not null references auth.users (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  dia         date not null,
  area        text not null,
  aberturas   int not null default 0,
  minutos     int not null default 0,
  primary key (user_id, dia, area)
);

alter table public.uso_diario enable row level security;

create index if not exists uso_diario_empresa_idx
  on public.uso_diario (empresa_id, dia desc);
create index if not exists uso_diario_dia_idx
  on public.uso_diario (dia);

create or replace function public.registrar_presenca(
  p_area  text,
  p_abriu boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_empresa uuid;
  v_antes   timestamptz;
  v_minuto  boolean;
  v_area    text := left(btrim(regexp_replace(coalesce(p_area, ''), '[[:cntrl:]]', '', 'g')), 60);
  v_dia     date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_uid is null then
    return;
  end if;
  -- só o nome de uma área: nada que pareça id ou endereço
  if v_area = '' or v_area ~ '[0-9a-fA-F]{8}-' or v_area ~ '[/?=@]' then
    v_area := 'Outra tela';
  end if;

  select m.empresa_id into v_empresa
    from public.membros_equipe m
   where m.user_id = v_uid and m.status = 'ativo'
   order by m.created_at asc
   limit 1;
  if v_empresa is null then
    return;
  end if;

  select p.visto_em into v_antes from public.presenca p where p.user_id = v_uid;
  -- o sinal de vida conta um minuto; duas abas abertas não contam dois
  v_minuto := not p_abriu and (v_antes is null or v_antes < now() - interval '50 seconds');

  insert into public.presenca as p (user_id, empresa_id, area, desde, visto_em)
  values (v_uid, v_empresa, v_area, now(), now())
  on conflict (user_id) do update
     set empresa_id = excluded.empresa_id,
         area       = excluded.area,
         desde      = case when p.visto_em < now() - interval '10 minutes'
                           then now() else p.desde end,
         visto_em   = now();

  if p_abriu or v_minuto then
    insert into public.uso_diario as u (user_id, empresa_id, dia, area, aberturas, minutos)
    values (v_uid, v_empresa, v_dia, v_area,
            case when p_abriu then 1 else 0 end,
            case when v_minuto then 1 else 0 end)
    on conflict (user_id, dia, area) do update
       set empresa_id = excluded.empresa_id,
           aberturas  = u.aberturas + case when p_abriu then 1 else 0 end,
           minutos    = u.minutos + case when v_minuto then 1 else 0 end;
  end if;
exception when others then
  -- registrar presença nunca derruba a tela de ninguém
  raise warning 'registrar_presenca: %', sqlerrm;
end $$;

revoke all on function public.registrar_presenca(text, boolean) from public, anon;
grant execute on function public.registrar_presenca(text, boolean) to authenticated;

-- ============================================================
-- O PAINEL REPAGINADO (17/09/2026)
-- ============================================================
-- Pedido do dono: a primeira tela vira um centro de controle (quem
-- precisa de atenção, quem usa de verdade, quanto entra e sai, o que
-- ameaça a operação), com a ficha de cada conta, e as contas da casa bem
-- separadas das de clientes.
--
-- Tudo daqui para baixo segue o modelo das seções acima: tabela com RLS
-- ligada e NENHUMA policy; função de leitura que só a chave de serviço
-- executa. Nada disto é alcançável pelo navegador de uma cerimonialista,
-- com uma única exceção declarada (registrar_erro_da_tela, seção 10),
-- que só grava o nome da área e um código curto, com freio por pessoa.
--
-- As funções são plpgsql de propósito: o corpo só é resolvido quando
-- roda, então este arquivo continua aplicável num banco montado do zero,
-- antes das migrações que criam as tabelas que elas leem.

-- ------------------------------------------------------------
-- 6) A assinatura guarda o fim do teste e a validade do cartão
-- ------------------------------------------------------------
-- teste_ia_ate: o último dia do teste, que continua ali depois que a
-- conta assina. A 154 apaga teste_termina_em quando o status sai de
-- 'trial' (de propósito: é essa data que abre a porta). Sem uma cópia,
-- "testes convertidos" e "taxa de conversão" não teriam base.
--
-- O gatilho abaixo roda ANTES do da 154: gatilhos do mesmo momento rodam
-- em ordem alfabética, e trg_guarda... vem antes de trg_teste... Ele fica
-- aqui, e não na 154, para ninguém precisar reaplicar a 154 (que derruba
-- e recria teto_do_plano: uma falha no meio deixaria as contas sem poder
-- criar evento).
--
-- cartao_mes / cartao_ano: a validade do cartão, que a operadora devolve
-- no aviso; o painel avisa antes de vencer.
alter table public.assinaturas add column if not exists teste_ia_ate date;
alter table public.assinaturas add column if not exists cartao_mes smallint;
alter table public.assinaturas add column if not exists cartao_ano smallint;

create or replace function public.trg_guarda_fim_do_teste()
returns trigger
language plpgsql
as $$
declare
  -- to_jsonb, e não new.teste_termina_em: a coluna nasce na 154, e este
  -- gatilho não pode quebrar a escrita num banco montado do zero
  v_fim text := to_jsonb(new) ->> 'teste_termina_em';
begin
  if v_fim is not null then
    new.teste_ia_ate := v_fim::date;
  end if;
  return new;
end $$;

revoke all on function public.trg_guarda_fim_do_teste() from public, anon, authenticated;

drop trigger if exists trg_guarda_fim_do_teste on public.assinaturas;
create trigger trg_guarda_fim_do_teste
  before insert or update on public.assinaturas
  for each row execute function public.trg_guarda_fim_do_teste();

-- As contas em teste de hoje recebem a cópia. Dentro de um bloco porque
-- teste_termina_em só existe depois da 154.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'assinaturas'
               and column_name = 'teste_termina_em') then
    execute 'update public.assinaturas
                set teste_ia_ate = teste_termina_em
              where teste_termina_em is not null
                and teste_ia_ate is distinct from teste_termina_em';
  end if;
end $$;

-- ------------------------------------------------------------
-- 7) Notas internas e a auditoria do painel
-- ------------------------------------------------------------
-- conta_nota: o que o dono anota sobre uma conta. Só acréscimo pela tela.
create table if not exists public.conta_nota (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  texto       text not null check (char_length(btrim(texto)) between 1 and 2000),
  autor       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists conta_nota_empresa_idx
  on public.conta_nota (empresa_id, created_at desc);

alter table public.conta_nota enable row level security;

-- admin_registro: o que foi feito no painel, por quem, quando e por quê.
-- Sem chave estrangeira para a empresa: o registro sobrevive à conta (o
-- nome vai junto, em empresa_nome). Não aceita alteração nem exclusão,
-- como o aceite da proposta.
create table if not exists public.admin_registro (
  id            uuid primary key default gen_random_uuid(),
  em            timestamptz not null default now(),
  quem          text not null,
  acao          text not null check (char_length(acao) between 1 and 60),
  empresa_id    uuid,
  empresa_nome  text,
  antes         jsonb,
  depois        jsonb,
  motivo        text check (motivo is null or char_length(motivo) <= 500)
);

create index if not exists admin_registro_em_idx
  on public.admin_registro (em desc);
create index if not exists admin_registro_empresa_idx
  on public.admin_registro (empresa_id, em desc);

alter table public.admin_registro enable row level security;

create or replace function public.trg_admin_registro_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'o registro do painel não aceita alteração nem exclusão';
end $$;

revoke all on function public.trg_admin_registro_imutavel() from public, anon, authenticated;

drop trigger if exists trg_admin_registro_imutavel on public.admin_registro;
create trigger trg_admin_registro_imutavel
  before update or delete on public.admin_registro
  for each row execute function public.trg_admin_registro_imutavel();

-- A mudança de preço entra no registro por qualquer caminho, inclusive o
-- SQL Editor (onde não há login: fica "SQL Editor"). Só quando algo mudou
-- de fato: reaplicar uma migração que regrava o mesmo preço não registra.
create or replace function public.trg_registrar_preco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes  jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) - 'updated_at' end;
  v_depois jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) - 'updated_at' end;
  v_quem   text;
begin
  if v_antes is distinct from v_depois then
    v_quem := coalesce(
      nullif(auth.jwt() ->> 'email', ''),
      case when auth.role() = 'service_role' then 'Sistema' else 'SQL Editor' end
    );
    insert into public.admin_registro (quem, acao, antes, depois)
    values (v_quem, tg_table_name || '_' || lower(tg_op), v_antes, v_depois);
  end if;
  return coalesce(new, old);
exception when others then
  -- registrar nunca impede mudar o preço
  raise warning 'trg_registrar_preco: %', sqlerrm;
  return coalesce(new, old);
end $$;

revoke all on function public.trg_registrar_preco() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.plano_catalogo') is not null then
    execute 'drop trigger if exists trg_registrar_preco on public.plano_catalogo';
    execute 'create trigger trg_registrar_preco
               after insert or update or delete on public.plano_catalogo
               for each row execute function public.trg_registrar_preco()';
  end if;
  if to_regclass('public.plano_promocao') is not null then
    execute 'drop trigger if exists trg_registrar_preco on public.plano_promocao';
    execute 'create trigger trg_registrar_preco
               after insert or update or delete on public.plano_promocao
               for each row execute function public.trg_registrar_preco()';
  end if;
end $$;

-- ------------------------------------------------------------
-- 8) O que a equipe de cada conta fez (a "última ação útil")
-- ------------------------------------------------------------
-- Uma linha por coisa que alguém DA EQUIPE da conta criou ou mudou. Não
-- entram: o que a noiva faz pelo portal, o que convidados e fornecedores
-- fazem pelos links, o aceite da proposta, as rotinas e o que nasce
-- sozinho quando o evento é criado. Cada fonte foi conferida (17/09/2026):
--   · evento criado pelo aceite da proposta tem o histórico com autor
--     'Sistema' (166): não conta. Mudança no evento só conta com autor
--     gravado (a 166 começou a gravar em 16/09; o que veio antes, não);
--   · tarefa, lançamento do financeiro e item do roteiro nascem junto com
--     o evento (método, entrada, esqueleto do roteiro): só contam os
--     criados mais de 2 minutos depois do evento;
--   · a cliente nasce junto com o evento: só conta a criada à parte;
--   · o que tem criado_por (convidados, acesso ao portal, mesas, salão,
--     cortejo, inspirações...) só conta quando quem criou é da equipe;
--   · o termo e o contrato do aceite (evento_documento) não contam;
--   · o link de fornecedor (roteiro_links) nasce quando a equipe vincula
--     o fornecedor ao evento: conta como "fornecedor".
create or replace function public.admin_acoes_da_equipe(
  p_empresa_id uuid default null,
  p_desde      timestamptz default null
)
returns table (empresa_id uuid, em timestamptz, tipo text)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with equipe as (
    select m.empresa_id as empresa, m.user_id as pessoa
      from public.membros_equipe m
     where m.user_id is not null
       and (p_empresa_id is null or m.empresa_id = p_empresa_id)
  ),
  todas as (
    select x.empresa_id as empresa, x.created_at as quando, 'evento'::text as oque
      from public.events x
     where not exists (select 1 from public.activities a
                        where a.event_id = x.id and a.type = 'evento_criado'
                          and a.autor = 'Sistema')
    union all
    select x.empresa_id, x.created_at, 'evento'
      from public.activities x
     where x.autor is not null and x.autor <> 'Sistema'
       and x.type <> 'evento_criado'
    union all
    select x.empresa_id, x.decidida_em, 'decisao'
      from public.evento_decisao x
     where x.decidida_em is not null
    union all
    select x.empresa_id, x.created_at, 'tarefa'
      from public.tasks x
      join public.events ev on ev.id = x.event_id
     where x.created_at > ev.created_at + interval '2 minutes'
    union all
    select x.empresa_id, x.created_at, 'fornecedor'
      from public.suppliers x
    union all
    select x.empresa_id, x.created_at, 'fornecedor'
      from public.roteiro_links x
    union all
    select x.empresa_id, x.created_at, 'cliente'
      from public.clients x
     where not exists (select 1 from public.events ev
                        where ev.client_id = x.id
                          and ev.created_at between x.created_at - interval '2 minutes'
                                                and x.created_at + interval '2 minutes')
    union all
    select x.empresa_id, x.created_at, 'proposta'
      from public.orcamentos x
    union all
    select x.empresa_id, x.enviado_em, 'proposta'
      from public.orcamentos x
     where x.enviado_em is not null
    union all
    select x.empresa_id, coalesce(x.respondido_em, x.encerrado_em), 'pedido'
      from public.pedido_orcamento x
     where coalesce(x.respondido_em, x.encerrado_em) is not null
    union all
    select x.empresa_id, x.updated_at, 'vitrine'
      from public.empresa_pagina x
     where x.atualizado_por is not null
    union all
    select x.empresa_id, x.created_at, 'financeiro'
      from public.transactions x
      join public.events ev on ev.id = x.event_id
     where x.created_at > ev.created_at + interval '2 minutes'
    union all
    select x.empresa_id, x.paid_at, 'financeiro'
      from public.transactions x
      join public.events ev on ev.id = x.event_id
     where x.paid_at is not null
       and x.paid_at > ev.created_at + interval '2 minutes'
       and x.paid_at > x.created_at + interval '2 minutes'
    union all
    select x.empresa_id, x.created_at, 'roteiro'
      from public.roteiro_items x
      join public.events ev on ev.id = x.event_id
     where x.created_at > ev.created_at + interval '2 minutes'
    union all
    select ev.empresa_id, x.created_at, 'nota'
      from public.event_notes x
      join public.events ev on ev.id = x.event_id
    union all
    select x.empresa_id, x.created_at, 'equipe'
      from public.membros_equipe x
     where not x.is_owner
    union all
    select x.empresa_id, x.created_at, 'convidado'
      from public.evento_convidado x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'convidado'
      from public.evento_convidado_relacao x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'portal'
      from public.evento_acesso x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_mesa x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_salao x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_elemento x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_recurso x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_recepcao_posto x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'execucao'
      from public.evento_cortejo_pessoa x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.evento_inspiracao x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.evento_guia_estilo x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.decisao_curadoria x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
    union all
    select x.empresa_id, x.created_at, 'estilo'
      from public.paleta_biblioteca x
      join equipe q on q.empresa = x.empresa_id and q.pessoa = x.criado_por
  )
  select t.empresa, t.quando, t.oque
    from todas t
   where t.quando is not null
     and t.empresa is not null
     and t.quando <= now() + interval '5 minutes'
     and (p_empresa_id is null or t.empresa = p_empresa_id)
     and (p_desde is null or t.quando >= p_desde);
end $$;

-- ------------------------------------------------------------
-- 9) As leituras do painel (só a chave de serviço)
-- ------------------------------------------------------------
-- admin_resumo_contas: uma linha por conta, com tudo o que a lista, a
-- visão geral e a ficha precisam. Troca as 6 consultas por conta que a
-- tela Contas fazia (com 300 contas, seriam 1.800 a cada abertura).
-- Nada de conteúdo: nome de evento, de convidado ou de cliente não sai
-- daqui; do próximo evento, só data, tipo e cidade.
-- Com p_empresa_id, só aquela conta (a ficha); sem ele, todas (a lista).
-- O drop tira a versão sem parâmetro da primeira entrega deste arquivo:
-- as duas juntas deixariam a chamada ambígua.
drop function if exists public.admin_resumo_contas();
create or replace function public.admin_resumo_contas(p_empresa_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  return (
    with
    acoes as (
      select a.empresa_id as empresa, a.em as quando, a.tipo as oque
        from public.admin_acoes_da_equipe(p_empresa_id, null) a
    ),
    ultima as (
      select distinct on (a.empresa) a.empresa, a.quando, a.oque
        from acoes a
       order by a.empresa, a.quando desc
    ),
    dias_acao as (
      select a.empresa,
             count(distinct (a.quando at time zone 'America/Sao_Paulo')::date)
               filter (where (a.quando at time zone 'America/Sao_Paulo')::date > v_hoje - 7) as d7,
             count(distinct (a.quando at time zone 'America/Sao_Paulo')::date)
               filter (where (a.quando at time zone 'America/Sao_Paulo')::date > v_hoje - 30) as d30
        from acoes a
       group by a.empresa
    ),
    por_tipo as (
      select p.empresa,
             jsonb_object_agg(p.oque, jsonb_build_object(
               'n', p.n, 'primeira', p.primeira, 'ultima', p.ultima)) as tipos
        from (select a.empresa, a.oque, count(*) as n,
                     min(a.quando) as primeira, max(a.quando) as ultima
                from acoes a
               group by a.empresa, a.oque) p
       group by p.empresa
    ),
    uso as (
      select u.empresa_id as empresa,
             count(distinct u.dia) filter (where u.dia > v_hoje - 7)  as dias7,
             count(distinct u.dia) filter (where u.dia > v_hoje - 30) as dias30,
             coalesce(sum(u.minutos) filter (where u.dia > v_hoje - 7), 0)  as min7,
             coalesce(sum(u.minutos) filter (where u.dia > v_hoje - 30), 0) as min30,
             count(distinct u.dia) as dias_total,
             max(u.dia) as ultimo_dia
        from public.uso_diario u
       where p_empresa_id is null or u.empresa_id = p_empresa_id
       group by u.empresa_id
    )
    select coalesce(jsonb_agg(z.linha order by z.criada_em desc), '[]'::jsonb)
    from (
      select e.created_at as criada_em,
        jsonb_build_object(
          'empresa_id', e.id,
          'nome', e.nome,
          'criada_em', e.created_at,
          'da_casa', exists (select 1 from public.contas_da_casa c where c.empresa_id = e.id),
          'dona', jsonb_build_object(
            'user_id', e.owner_user_id,
            'nome', dona.nome,
            'whatsapp', dona.whatsapp,
            'guia_dispensado_em', dona.guia_dispensado_em,
            'guia_concluido_em', dona.guia_concluido_em,
            'email', du.email,
            'ultimo_login', du.last_sign_in_at,
            'banida_ate', du.banned_until,
            'eventos_3_meses', du.raw_user_meta_data ->> 'eventos_3_meses',
            'instagram', du.raw_user_meta_data ->> 'instagram'
          ),
          'equipe', jsonb_build_object(
            'pessoas', eq.pessoas,
            'convidadas', eq.convidadas,
            'primeiro_convite_em', eq.primeiro_convite_em,
            'ultimo_login', eq.ultimo_login,
            'cargos', eq.cargos
          ),
          'assinatura', case when a.id is null then null
            else (to_jsonb(a) - 'gateway_customer_id' - 'gateway_subscription_id')
                 || jsonb_build_object('tem_gateway', a.gateway_subscription_id is not null)
          end,
          'congelada', public.conta_congelada(e.id),
          'congela_em', public.conta_congela_em(e.id),
          'historico', jsonb_build_object(
            'convertida_em', hist.convertida_em,
            'ultimo_cancelamento_em', hist.ultimo_cancelamento_em,
            'linhas', hist.linhas
          ),
          'eventos', jsonb_build_object(
            'total', ev.total,
            'em_andamento', ev.em_andamento,
            'concluidos', ev.concluidos,
            'proximos_30', ev.proximos_30,
            'primeiro_em', ev.primeiro_em,
            'contexto', coalesce(ev.contexto, false),
            'convidados_previstos', ev.convidados_previstos,
            'cidades', to_jsonb(ev.cidades)
          ),
          'proximo_evento', case when prox.dia is null then null
            else jsonb_build_object('data', prox.dia, 'tipo', prox.tipo, 'cidade', prox.cidade)
          end,
          'decisoes', jsonb_build_object('tomadas', decs.tomadas, 'primeira_em', decs.primeira_em),
          'tarefas', jsonb_build_object(
            'total', tar.total,
            'de_decisao', tar.de_decisao,
            'primeira_de_decisao_em', tar.primeira_de_decisao_em,
            'andamento', coalesce(tar.andamento, false)
          ),
          'fornecedores', jsonb_build_object(
            'total', forn.total,
            'primeiro_em', forn.primeiro_em,
            'vinculos', forn.vinculos,
            'responderam', forn.responderam
          ),
          'clientes', cli.total,
          'convidados', conv.total,
          'propostas', jsonb_build_object(
            'total', orc.total,
            'enviadas', orc.enviadas,
            'aceitas', orc.aceitas,
            'primeira_enviada_em', orc.primeira_enviada_em
          ),
          'acoes', jsonb_build_object(
            'ultima_em', ult.quando,
            'ultima_tipo', ult.oque,
            'dias_7', coalesce(da.d7, 0),
            'dias_30', coalesce(da.d30, 0),
            'por_tipo', coalesce(pt.tipos, '{}'::jsonb)
          ),
          'acesso', jsonb_build_object(
            'ultimo_sinal', pres.visto_em,
            'dias_7', coalesce(uso.dias7, 0),
            'dias_30', coalesce(uso.dias30, 0),
            'dias_total', coalesce(uso.dias_total, 0),
            'minutos_7', coalesce(uso.min7, 0),
            'minutos_30', coalesce(uso.min30, 0),
            'ultimo_dia', uso.ultimo_dia
          ),
          'suporte', jsonb_build_object(
            'mensagens_30d', sup.mensagens_30d,
            'nao_lidas', sup.nao_lidas,
            'ultima_em', sup.ultima_em,
            'sem_resposta', sr.conversas,
            'esperando_desde', sr.desde
          ),
          'origem', case when oc.empresa_id is null then null
            else jsonb_build_object(
              'utm_source', oc.utm_source,
              'utm_medium', oc.utm_medium,
              'utm_campaign', oc.utm_campaign,
              'gclid', oc.gclid is not null,
              'user_agent', left(oc.user_agent, 300)
            )
          end
        ) as linha
      from public.empresas e
      left join auth.users du on du.id = e.owner_user_id
      left join lateral (
        select m.nome, m.whatsapp, m.guia_dispensado_em, m.guia_concluido_em
          from public.membros_equipe m
         where m.empresa_id = e.id and m.user_id = e.owner_user_id
         order by m.created_at
         limit 1
      ) dona on true
      left join lateral (
        select count(*) filter (where m.status = 'ativo') as pessoas,
               count(*) filter (where not m.is_owner) as convidadas,
               min(m.created_at) filter (where not m.is_owner) as primeiro_convite_em,
               max(u.last_sign_in_at) as ultimo_login,
               jsonb_agg(jsonb_build_object('cargo', m.cargo, 'dona', m.is_owner,
                                            'status', m.status, 'ultimo_login', u.last_sign_in_at)
                         order by m.is_owner desc, m.created_at) as cargos
          from public.membros_equipe m
          left join auth.users u on u.id = m.user_id
         where m.empresa_id = e.id
      ) eq on true
      left join public.assinaturas a on a.empresa_id = e.id
      left join lateral (
        select min(h.em) filter (where h.tipo = 'inicio') as convertida_em,
               max(h.em) filter (where h.tipo = 'cancelamento') as ultimo_cancelamento_em,
               count(*) as linhas
          from public.assinatura_eventos h
         where h.empresa_id = e.id
      ) hist on true
      left join lateral (
        select count(*) as total,
               count(*) filter (where x.status in ('orcamento', 'confirmado')
                                  and coalesce(x.archived, false) = false) as em_andamento,
               count(*) filter (where x.status = 'concluido') as concluidos,
               count(*) filter (where x.date between v_hoje and v_hoje + 30
                                  and x.status in ('orcamento', 'confirmado')
                                  and coalesce(x.archived, false) = false) as proximos_30,
               min(x.created_at) as primeiro_em,
               bool_or(x.escala is not null and x.cenario is not null) as contexto,
               coalesce(sum(x.guests), 0) as convidados_previstos,
               array_remove(array_agg(distinct nullif(btrim(x.city), '')), null) as cidades
          from public.events x
         where x.empresa_id = e.id
      ) ev on true
      left join lateral (
        select x.date as dia, x.type as tipo, x.city as cidade
          from public.events x
         where x.empresa_id = e.id
           and x.date >= v_hoje
           and x.status in ('orcamento', 'confirmado')
           and coalesce(x.archived, false) = false
         order by x.date
         limit 1
      ) prox on true
      left join lateral (
        select count(*) as tomadas, min(d.decidida_em) as primeira_em
          from public.evento_decisao d
         where d.empresa_id = e.id and d.estado = 'decidida'
      ) decs on true
      left join lateral (
        select count(*) as total,
               count(*) filter (where t.evento_decisao_id is not null) as de_decisao,
               min(t.created_at) filter (where t.evento_decisao_id is not null) as primeira_de_decisao_em,
               bool_or(t.status is not null and t.status <> 'pendente') as andamento
          from public.tasks t
         where t.empresa_id = e.id
      ) tar on true
      left join lateral (
        select (select count(*) from public.suppliers s where s.empresa_id = e.id) as total,
               (select min(s.created_at) from public.suppliers s where s.empresa_id = e.id) as primeiro_em,
               (select count(*) from public.roteiro_links l where l.empresa_id = e.id) as vinculos,
               -- fornecedor que confirmou pelo link ou abriu a central dele:
               -- prova de que o link chegou a alguém (clique nosso não prova)
               (select count(*) from public.roteiro_links l
                 where l.empresa_id = e.id and coalesce(l.confirmed, false))
               + (select count(*) from public.fornecedor_acesso f
                   where f.empresa_id = e.id and f.aberturas > 0) as responderam
      ) forn on true
      left join lateral (
        select count(*) as total from public.clients c where c.empresa_id = e.id
      ) cli on true
      left join lateral (
        select count(*) as total from public.evento_convidado c where c.empresa_id = e.id
      ) conv on true
      left join lateral (
        select count(*) as total,
               count(*) filter (where o.status <> 'rascunho') as enviadas,
               count(*) filter (where o.status = 'aprovado') as aceitas,
               min(coalesce(o.enviado_em,
                            case when o.status <> 'rascunho' then o.created_at end)) as primeira_enviada_em
          from public.orcamentos o
         where o.empresa_id = e.id
      ) orc on true
      left join ultima ult on ult.empresa = e.id
      left join dias_acao da on da.empresa = e.id
      left join por_tipo pt on pt.empresa = e.id
      left join uso on uso.empresa = e.id
      left join lateral (
        select max(p.visto_em) as visto_em from public.presenca p where p.empresa_id = e.id
      ) pres on true
      left join lateral (
        select count(*) filter (where s.autor = 'cliente'
                                  and s.created_at > now() - interval '30 days') as mensagens_30d,
               count(*) filter (where s.autor = 'cliente'
                                  and s.lida_pelo_suporte_em is null) as nao_lidas,
               max(s.created_at) as ultima_em
          from public.suporte_mensagem s
         where s.empresa_id = e.id
      ) sup on true
      left join lateral (
        -- sem resposta: a última mensagem da conversa é dela
        select count(*) as conversas, min(u.created_at) as desde
          from (select distinct on (s.user_id) s.user_id, s.autor, s.created_at
                  from public.suporte_mensagem s
                 where s.empresa_id = e.id and s.user_id is not null
                 order by s.user_id, s.created_at desc) u
         where u.autor = 'cliente'
      ) sr on true
      left join public.origem_do_clique oc on oc.empresa_id = e.id
      where p_empresa_id is null or e.id = p_empresa_id
    ) z
  );
end $$;

-- admin_linha_do_tempo: por dia, quanto de cada coisa a conta fez, o uso
-- por área, o histórico da assinatura, o suporte, os avisos da operadora,
-- a auditoria e as notas. Só números e nomes de área, nunca conteúdo.
create or replace function public.admin_linha_do_tempo(
  p_empresa_id uuid,
  p_dias       int default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dia_inicio date := (now() at time zone 'America/Sao_Paulo')::date
                       - least(greatest(coalesce(p_dias, 60), 1), 400);
  v_desde timestamptz := v_dia_inicio::timestamp at time zone 'America/Sao_Paulo';
begin
  if p_empresa_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'acoes', coalesce((
      select jsonb_agg(jsonb_build_object('dia', x.dia, 'tipo', x.oque, 'n', x.n)
                       order by x.dia desc, x.oque)
        from (select (a.em at time zone 'America/Sao_Paulo')::date as dia,
                     a.tipo as oque, count(*) as n
                from public.admin_acoes_da_equipe(p_empresa_id, v_desde) a
               group by 1, 2) x
    ), '[]'::jsonb),
    'uso', coalesce((
      select jsonb_agg(jsonb_build_object('dia', x.dia, 'minutos', x.minutos,
                                          'aberturas', x.aberturas, 'areas', x.areas)
                       order by x.dia desc)
        from (select u.dia,
                     sum(u.minutos) as minutos,
                     sum(u.aberturas) as aberturas,
                     jsonb_agg(jsonb_build_object('area', u.area, 'minutos', u.minutos,
                                                  'aberturas', u.aberturas)
                               order by u.minutos desc, u.aberturas desc) as areas
                from public.uso_diario u
               where u.empresa_id = p_empresa_id
                 and u.dia >= v_dia_inicio
               group by u.dia) x
    ), '[]'::jsonb),
    'assinatura', coalesce((
      select jsonb_agg(jsonb_build_object('em', h.em, 'tipo', h.tipo,
                                          'valor_antes', h.valor_antes,
                                          'valor_depois', h.valor_depois,
                                          'nota', h.nota)
                       order by h.em desc, h.created_at desc)
        from public.assinatura_eventos h
       where h.empresa_id = p_empresa_id
    ), '[]'::jsonb),
    'suporte', coalesce((
      select jsonb_agg(jsonb_build_object('dia', x.dia, 'dela', x.dela, 'nossas', x.nossas)
                       order by x.dia desc)
        from (select (s.created_at at time zone 'America/Sao_Paulo')::date as dia,
                     count(*) filter (where s.autor = 'cliente') as dela,
                     count(*) filter (where s.autor = 'eorganizei') as nossas
                from public.suporte_mensagem s
               where s.empresa_id = p_empresa_id
                 and s.created_at >= v_desde
               group by 1) x
    ), '[]'::jsonb),
    'gateway', coalesce((
      select jsonb_agg(jsonb_build_object('em', g.created_at, 'tipo', g.tipo, 'erro', g.erro)
                       order by g.created_at desc)
        from (select g0.created_at, g0.tipo, g0.erro
                from public.gateway_evento g0
               where g0.empresa_id = p_empresa_id
               order by g0.created_at desc
               limit 30) g
    ), '[]'::jsonb),
    'registro', coalesce((
      select jsonb_agg(jsonb_build_object('em', r.em, 'quem', r.quem, 'acao', r.acao,
                                          'antes', r.antes, 'depois', r.depois,
                                          'motivo', r.motivo)
                       order by r.em desc)
        from (select r0.em, r0.quem, r0.acao, r0.antes, r0.depois, r0.motivo
                from public.admin_registro r0
               where r0.empresa_id = p_empresa_id
               order by r0.em desc
               limit 100) r
    ), '[]'::jsonb),
    'notas', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'texto', n.texto,
                                          'autor', n.autor, 'em', n.created_at)
                       order by n.created_at desc)
        from public.conta_nota n
       where n.empresa_id = p_empresa_id
    ), '[]'::jsonb)
  );
end $$;

-- admin_uso_por_modulo: o que cada conta fez e abriu numa janela de dias
-- (a tela Ativação e uso junta por módulo).
create or replace function public.admin_uso_por_modulo(p_dias int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dias int := least(greatest(coalesce(p_dias, 30), 1), 400);
  v_dia_inicio date := (now() at time zone 'America/Sao_Paulo')::date - v_dias + 1;
  v_desde timestamptz := v_dia_inicio::timestamp at time zone 'America/Sao_Paulo';
begin
  return jsonb_build_object(
    'dias', v_dias,
    'acoes', coalesce((
      select jsonb_agg(jsonb_build_object('empresa_id', x.empresa, 'tipo', x.oque,
                                          'n', x.n, 'dias', x.dias))
        from (select a.empresa_id as empresa, a.tipo as oque, count(*) as n,
                     count(distinct (a.em at time zone 'America/Sao_Paulo')::date) as dias
                from public.admin_acoes_da_equipe(null, v_desde) a
               group by 1, 2) x
    ), '[]'::jsonb),
    'uso', coalesce((
      select jsonb_agg(jsonb_build_object('empresa_id', x.empresa, 'area', x.area,
                                          'minutos', x.minutos, 'aberturas', x.aberturas,
                                          'dias', x.dias))
        from (select u.empresa_id as empresa, u.area,
                     sum(u.minutos) as minutos, sum(u.aberturas) as aberturas,
                     count(distinct u.dia) as dias
                from public.uso_diario u
               where u.dia >= v_dia_inicio
               group by 1, 2) x
    ), '[]'::jsonb),
    'suporte', coalesce((
      select jsonb_agg(jsonb_build_object('empresa_id', x.empresa, 'n', x.n))
        from (select s.empresa_id as empresa, count(*) as n
                from public.suporte_mensagem s
               where s.autor = 'cliente' and s.created_at >= v_desde
               group by 1) x
    ), '[]'::jsonb)
  );
end $$;

-- admin_dias_ativos: para cada conta, os dias (de Brasília) em que a
-- equipe fez alguma coisa e os dias em que abriu o sistema (este só desde
-- 16/09/2026, quando o registro de uso começou). É o que mede "voltou no
-- dia seguinte", "em 7 dias" e "em 30 dias".
create or replace function public.admin_dias_ativos()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'empresa_id', e.id,
             'acao', coalesce(ac.dias, '[]'::jsonb),
             'acesso', coalesce(us.dias, '[]'::jsonb)))
      from public.empresas e
      left join lateral (
        select jsonb_agg(d.dia order by d.dia) as dias
          from (select distinct (a.em at time zone 'America/Sao_Paulo')::date as dia
                  from public.admin_acoes_da_equipe(e.id, null) a) d
      ) ac on true
      left join lateral (
        select jsonb_agg(d.dia order by d.dia) as dias
          from (select distinct u.dia from public.uso_diario u where u.empresa_id = e.id) d
      ) us on true
  ), '[]'::jsonb);
end $$;

-- ------------------------------------------------------------
-- 10) Receita, custos e a saúde do sistema
-- ------------------------------------------------------------
-- custo_operacao: o que o dono lança como custo do mês. Resultado de
-- gestão, não contábil. O gasto de marketing continua em
-- gastos_aquisicao (é o denominador do CAC) e por isso não é categoria.
create table if not exists public.custo_operacao (
  id          uuid primary key default gen_random_uuid(),
  mes         date not null check (extract(day from mes) = 1),
  servico     text not null check (char_length(btrim(servico)) between 1 and 60),
  categoria   text not null check (categoria in (
                'infraestrutura', 'email', 'ia', 'armazenamento', 'dominio',
                'ferramentas', 'operadora', 'contabilidade', 'impostos',
                'pessoal', 'outros')),
  valor       numeric(12, 2) not null check (valor >= 0),
  recorrente  boolean not null default false,
  pago        boolean not null default true,
  nota        text check (nota is null or char_length(nota) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists custo_operacao_mes_idx on public.custo_operacao (mes);
alter table public.custo_operacao enable row level security;

-- caixa_saldo: o saldo que o dono informa, com a data. A projeção parte
-- do mais recente.
create table if not exists public.caixa_saldo (
  dia         date primary key,
  valor       numeric(14, 2) not null,
  nota        text check (nota is null or char_length(nota) <= 200),
  updated_at  timestamptz not null default now()
);

alter table public.caixa_saldo enable row level security;

-- painel_ajuste: o que o dono informa e não cabe em tabela própria
-- (alíquota de imposto estimada, limites e custo dos serviços).
create table if not exists public.painel_ajuste (
  chave          text primary key check (chave ~ '^[a-z0-9_]{1,40}$'),
  valor          jsonb not null,
  atualizado_em  timestamptz not null default now()
);

alter table public.painel_ajuste enable row level security;

-- rotina_execucao: cada rotina do despachante diário, com duração e
-- resultado. Some depois de 90 dias (rotina uso-antigo).
create table if not exists public.rotina_execucao (
  id          uuid primary key default gen_random_uuid(),
  rotina      text not null check (char_length(rotina) between 1 and 60),
  inicio      timestamptz not null default now(),
  duracao_ms  int,
  ok          boolean not null,
  resumo      text check (resumo is null or char_length(resumo) <= 300),
  created_at  timestamptz not null default now()
);

create index if not exists rotina_execucao_idx on public.rotina_execucao (rotina, inicio desc);
alter table public.rotina_execucao enable row level security;

-- email_envio: cada e-mail que o sistema tentou mandar. Sem destinatário
-- e sem assunto: só o tipo, o resultado e o id do provedor (que permite
-- perguntar depois se chegou).
create table if not exists public.email_envio (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (char_length(tipo) between 1 and 40),
  ok           boolean not null,
  provedor_id  text check (provedor_id is null or char_length(provedor_id) <= 80),
  erro         text check (erro is null or char_length(erro) <= 120),
  situacao     text check (situacao is null or char_length(situacao) <= 30),
  created_at   timestamptz not null default now()
);

create index if not exists email_envio_idx on public.email_envio (created_at desc);
alter table public.email_envio enable row level security;

-- erro_do_sistema: o erro que chegou à tela de alguém da equipe (só o
-- nome da área e um código curto) e o que as rotas e rotinas registram.
-- Nunca a mensagem, que pode carregar dado de quem usa.
create table if not exists public.erro_do_sistema (
  id          uuid primary key default gen_random_uuid(),
  origem      text not null check (origem in ('tela', 'servidor', 'rotina')),
  area        text not null check (char_length(area) between 1 and 80),
  codigo      text check (codigo is null or char_length(codigo) <= 60),
  empresa_id  uuid references public.empresas (id) on delete set null,
  user_id     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists erro_do_sistema_idx on public.erro_do_sistema (created_at desc);
create index if not exists erro_do_sistema_pessoa_idx on public.erro_do_sistema (user_id, created_at desc);
alter table public.erro_do_sistema enable row level security;

-- medida_diaria: o tamanho do banco e dos arquivos, uma vez por dia.
create table if not exists public.medida_diaria (
  dia             date primary key,
  banco_bytes     bigint not null,
  arquivos_bytes  bigint not null,
  por_balde       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.medida_diaria enable row level security;

-- ia_uso: chamadas e tokens da IA por dia, conta e rota.
create table if not exists public.ia_uso (
  dia             date not null,
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  rota            text not null,
  chamadas        int not null default 0,
  falhas          int not null default 0,
  tokens_entrada  bigint not null default 0,
  tokens_saida    bigint not null default 0,
  primary key (dia, empresa_id, rota)
);

alter table public.ia_uso enable row level security;

-- O tamanho do banco, dos baldes de arquivos e das maiores tabelas.
create or replace function public.admin_tamanho_do_banco()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'banco_bytes', pg_database_size(current_database()),
    'baldes', coalesce((
      select jsonb_agg(jsonb_build_object('balde', b.balde, 'bytes', b.bytes, 'arquivos', b.n)
                       order by b.bytes desc)
        from (select o.bucket_id as balde,
                     sum(coalesce((o.metadata ->> 'size')::bigint, 0)) as bytes,
                     count(*) as n
                from storage.objects o
               group by o.bucket_id) b
    ), '[]'::jsonb),
    'tabelas', coalesce((
      select jsonb_agg(jsonb_build_object('tabela', t.relname, 'bytes', t.bytes, 'linhas', t.linhas)
                       order by t.bytes desc)
        from (select c.relname, pg_total_relation_size(c.oid) as bytes,
                     greatest(c.reltuples, 0)::bigint as linhas
                from pg_class c
               where c.relkind = 'r'
                 and c.relnamespace = 'public'::regnamespace
               order by pg_total_relation_size(c.oid) desc
               limit 12) t
    ), '[]'::jsonb)
  );
end $$;

-- A foto do dia, gravada pela rotina diária.
create or replace function public.registrar_medida_diaria()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v     jsonb := public.admin_tamanho_do_banco();
  v_dia date  := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.medida_diaria (dia, banco_bytes, arquivos_bytes, por_balde)
  values (
    v_dia,
    (v ->> 'banco_bytes')::bigint,
    coalesce((select sum((b ->> 'bytes')::bigint)
                from jsonb_array_elements(v -> 'baldes') b), 0),
    v -> 'baldes'
  )
  on conflict (dia) do update
     set banco_bytes    = excluded.banco_bytes,
         arquivos_bytes = excluded.arquivos_bytes,
         por_balde      = excluded.por_balde;
end $$;

-- Uma chamada à IA a mais no dia (a rota chama com a chave de serviço).
create or replace function public.registrar_uso_ia(
  p_empresa_id uuid,
  p_rota       text,
  p_ok         boolean,
  p_entrada    int,
  p_saida      int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia  date := (now() at time zone 'America/Sao_Paulo')::date;
  v_rota text := left(regexp_replace(lower(coalesce(p_rota, '')), '[^a-z0-9_-]', '', 'g'), 40);
begin
  if p_empresa_id is null or v_rota = '' then
    return;
  end if;
  insert into public.ia_uso as i
    (dia, empresa_id, rota, chamadas, falhas, tokens_entrada, tokens_saida)
  values (v_dia, p_empresa_id, v_rota, 1,
          case when coalesce(p_ok, false) then 0 else 1 end,
          greatest(coalesce(p_entrada, 0), 0),
          greatest(coalesce(p_saida, 0), 0))
  on conflict (dia, empresa_id, rota) do update
     set chamadas       = i.chamadas + 1,
         falhas         = i.falhas + excluded.falhas,
         tokens_entrada = i.tokens_entrada + excluded.tokens_entrada,
         tokens_saida   = i.tokens_saida + excluded.tokens_saida;
exception when others then
  -- medir nunca derruba a resposta da IA
  raise warning 'registrar_uso_ia: %', sqlerrm;
end $$;

-- O erro que chegou à tela de alguém da equipe. A única escrita desta
-- migração que o navegador alcança, e por isso a mais fechada:
--   · só quem é da equipe de uma conta (portal e anônimo não gravam);
--   · a área passa pela mesma régua da presença (nada que pareça id ou
--     endereço); o código fica só com letras, números, _ e -;
--   · 20 por pessoa por hora: um laço de erro não enche a tabela.
create or replace function public.registrar_erro_da_tela(
  p_area   text,
  p_codigo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_empresa uuid;
  v_area    text := left(btrim(regexp_replace(coalesce(p_area, ''), '[[:cntrl:]]', '', 'g')), 60);
  v_codigo  text := left(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9_-]', '', 'g'), 40);
begin
  if v_uid is null then
    return;
  end if;
  select m.empresa_id into v_empresa
    from public.membros_equipe m
   where m.user_id = v_uid and m.status = 'ativo'
   order by m.created_at
   limit 1;
  if v_empresa is null then
    return;
  end if;
  if v_area = '' or v_area ~ '[0-9a-fA-F]{8}-' or v_area ~ '[/?=@]' then
    v_area := 'Outra tela';
  end if;
  if (select count(*) from public.erro_do_sistema e
       where e.user_id = v_uid
         and e.created_at > now() - interval '1 hour') >= 20 then
    return;
  end if;
  insert into public.erro_do_sistema (origem, area, codigo, empresa_id, user_id)
  values ('tela', v_area, nullif(v_codigo, ''), v_empresa, v_uid);
exception when others then
  raise warning 'registrar_erro_da_tela: %', sqlerrm;
end $$;

-- As permissões: as leituras e registros do painel, só a chave de serviço;
-- o erro da tela, só quem está logado (e, por dentro, só a equipe).
revoke all on function public.admin_acoes_da_equipe(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_resumo_contas(uuid) from public, anon, authenticated;
revoke all on function public.admin_linha_do_tempo(uuid, int) from public, anon, authenticated;
revoke all on function public.admin_uso_por_modulo(int) from public, anon, authenticated;
revoke all on function public.admin_dias_ativos() from public, anon, authenticated;
revoke all on function public.admin_tamanho_do_banco() from public, anon, authenticated;
revoke all on function public.registrar_medida_diaria() from public, anon, authenticated;
revoke all on function public.registrar_uso_ia(uuid, text, boolean, int, int) from public, anon, authenticated;
grant execute on function public.admin_acoes_da_equipe(uuid, timestamptz) to service_role;
grant execute on function public.admin_resumo_contas(uuid) to service_role;
grant execute on function public.admin_linha_do_tempo(uuid, int) to service_role;
grant execute on function public.admin_uso_por_modulo(int) to service_role;
grant execute on function public.admin_dias_ativos() to service_role;
grant execute on function public.admin_tamanho_do_banco() to service_role;
grant execute on function public.registrar_medida_diaria() to service_role;
grant execute on function public.registrar_uso_ia(uuid, text, boolean, int, int) to service_role;

revoke all on function public.registrar_erro_da_tela(text, text) from public, anon;
grant execute on function public.registrar_erro_da_tela(text, text) to authenticated;

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
select 'contas_da_casa: RLS ligada, nenhuma policy',
       (select relrowsecurity from pg_class
        where oid = 'public.contas_da_casa'::regclass)
       and not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'contas_da_casa')
union all
select 'presenca: RLS ligada, nenhuma policy',
       (select relrowsecurity from pg_class
        where oid = 'public.presenca'::regclass)
       and not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'presenca')
union all
select 'uso_diario: RLS ligada, nenhuma policy',
       (select relrowsecurity from pg_class
        where oid = 'public.uso_diario'::regclass)
       and not exists (select 1 from pg_policies
                       where schemaname = 'public' and tablename = 'uso_diario')
union all
select 'registrar_presenca: a chave anônima não executa',
       not has_function_privilege('anon', 'public.registrar_presenca(text, boolean)', 'execute')
union all
select 'registrar_presenca: quem está logado executa',
       has_function_privilege('authenticated', 'public.registrar_presenca(text, boolean)', 'execute')
union all
select 'uma assinatura por empresa (unique)',
       exists (select 1 from pg_indexes
               where schemaname = 'public' and tablename = 'assinaturas'
                 and indexdef like '%empresa_id%' and indexdef like '%UNIQUE%')
-- --- o painel repaginado (17/09/2026) ---
union all
select 'assinaturas guarda o fim do teste e a validade do cartão',
       (select count(*) = 3 from information_schema.columns
        where table_schema = 'public' and table_name = 'assinaturas'
          and column_name in ('teste_ia_ate', 'cartao_mes', 'cartao_ano'))
union all
select 'o gatilho que guarda o fim do teste existe e roda antes do que apaga',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.assinaturas'::regclass
                 and tgname = 'trg_guarda_fim_do_teste' and not tgisinternal)
       and 'trg_guarda_fim_do_teste' < 'trg_teste_so_no_trial'
union all
select 'toda conta em teste já tem a cópia do fim do teste',
       not exists (select 1 from public.assinaturas
                   where teste_ia_ate is null
                     and to_jsonb(assinaturas) ->> 'teste_termina_em' is not null)
union all
select 'as tabelas novas têm RLS ligada',
       (select count(*) = 10 from pg_class
        where relnamespace = 'public'::regnamespace
          and relrowsecurity
          and relname in ('conta_nota', 'admin_registro', 'custo_operacao', 'caixa_saldo',
                          'painel_ajuste', 'rotina_execucao', 'email_envio',
                          'erro_do_sistema', 'medida_diaria', 'ia_uso'))
union all
select 'as tabelas novas não têm policy nenhuma (só a chave de serviço)',
       not exists (select 1 from pg_policies
                   where schemaname = 'public'
                     and tablename in ('conta_nota', 'admin_registro', 'custo_operacao',
                                       'caixa_saldo', 'painel_ajuste', 'rotina_execucao',
                                       'email_envio', 'erro_do_sistema', 'medida_diaria',
                                       'ia_uso'))
union all
select 'o registro do painel não aceita alteração nem exclusão',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.admin_registro'::regclass
                 and tgname = 'trg_admin_registro_imutavel' and not tgisinternal)
union all
select 'a mudança de preço do catálogo entra no registro',
       to_regclass('public.plano_catalogo') is null
       or exists (select 1 from pg_trigger
                  where tgrelid = to_regclass('public.plano_catalogo')
                    and tgname = 'trg_registrar_preco' and not tgisinternal)
union all
select 'nem anon nem quem está logado executa as leituras do painel',
       not has_function_privilege('anon', 'public.admin_resumo_contas(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_resumo_contas(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.admin_acoes_da_equipe(uuid, timestamptz)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_acoes_da_equipe(uuid, timestamptz)', 'execute')
       and not has_function_privilege('anon', 'public.admin_linha_do_tempo(uuid, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_linha_do_tempo(uuid, int)', 'execute')
       and not has_function_privilege('anon', 'public.admin_uso_por_modulo(int)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_uso_por_modulo(int)', 'execute')
       and not has_function_privilege('anon', 'public.admin_dias_ativos()', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_dias_ativos()', 'execute')
       and not has_function_privilege('anon', 'public.admin_tamanho_do_banco()', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_tamanho_do_banco()', 'execute')
union all
select 'nem anon nem quem está logado grava medida do banco ou uso da IA',
       not has_function_privilege('anon', 'public.registrar_medida_diaria()', 'execute')
       and not has_function_privilege('authenticated', 'public.registrar_medida_diaria()', 'execute')
       and not has_function_privilege('anon', 'public.registrar_uso_ia(uuid, text, boolean, int, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.registrar_uso_ia(uuid, text, boolean, int, int)', 'execute')
union all
select 'a chave de serviço executa as leituras e os registros do painel',
       has_function_privilege('service_role', 'public.admin_resumo_contas(uuid)', 'execute')
       and has_function_privilege('service_role', 'public.admin_linha_do_tempo(uuid, int)', 'execute')
       and has_function_privilege('service_role', 'public.admin_uso_por_modulo(int)', 'execute')
       and has_function_privilege('service_role', 'public.admin_dias_ativos()', 'execute')
       and has_function_privilege('service_role', 'public.admin_tamanho_do_banco()', 'execute')
       and has_function_privilege('service_role', 'public.registrar_medida_diaria()', 'execute')
       and has_function_privilege('service_role', 'public.registrar_uso_ia(uuid, text, boolean, int, int)', 'execute')
union all
select 'o erro da tela: anon não grava, quem está logado grava (só a equipe, por dentro)',
       not has_function_privilege('anon', 'public.registrar_erro_da_tela(text, text)', 'execute')
       and has_function_privilege('authenticated', 'public.registrar_erro_da_tela(text, text)', 'execute')
       and (select prosrc ilike '%if v_empresa is null then%'
              from pg_proc where proname = 'registrar_erro_da_tela'
               and pronamespace = 'public'::regnamespace)
union all
select 'a última ação útil não conta o evento criado pelo aceite nem o que nasce com o evento',
       (select prosrc ilike '%a.autor = ''Sistema''%'
               and prosrc ilike '%ev.created_at + interval ''2 minutes''%'
          from pg_proc where proname = 'admin_acoes_da_equipe'
           and pronamespace = 'public'::regnamespace)
union all
select 'o resumo das contas existe uma vez só (com a conta opcional)',
       (select count(*) = 1 from pg_proc
         where proname = 'admin_resumo_contas'
           and pronamespace = 'public'::regnamespace
           and pg_get_function_identity_arguments(oid) = 'p_empresa_id uuid');
