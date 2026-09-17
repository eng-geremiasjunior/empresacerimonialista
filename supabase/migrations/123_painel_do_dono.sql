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
                 and indexdef like '%empresa_id%' and indexdef like '%UNIQUE%');
