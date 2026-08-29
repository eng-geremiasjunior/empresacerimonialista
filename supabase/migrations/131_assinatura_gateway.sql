-- ============================================================
-- Vela — Migração 131: a assinatura passa a cobrar sozinha
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A 123 desenhou o registro comercial esperando este dia: "quando o
-- gateway entrar, ele passa a escrever NESTAS tabelas — o painel não
-- muda". É o que acontece aqui. O gateway é o Pagar.me.
--
-- Três coisas:
--
-- 1) A assinatura ganha o vínculo com o gateway (cliente, assinatura,
--    próximo vencimento, o cartão em quatro dígitos) e um estado novo:
--    `inadimplente`. Ele existe porque a decisão do dono foi NÃO travar
--    quem atrasa — ela pode ter um casamento no sábado, e bloquear o
--    sistema no dia do evento é perder a cliente para sempre. O estado
--    serve para avisar, não para punir.
--
-- 2) O log de eventos do gateway, para IDEMPOTÊNCIA. Webhook repetido
--    não é exceção, é regra: a mesma cobrança chega duas, três vezes.
--    Sem esta tabela, cada repetição viraria uma linha nova no histórico
--    de assinatura e o MRR do painel mentiria.
--
-- 3) O LIMITE DO PRIMEIRO EVENTO. A decisão de produto do dono: o teste
--    não é por tempo, é por uso — um evento inteiro, de graça, do
--    orçamento à prestação de contas. Trinta dias não deixariam a
--    cerimonialista viver um ciclo real (evento leva meses); um evento
--    completo, sim. A trava é um gatilho em events, para valer em TODOS
--    os caminhos de criação (o wizard, o orçamento aprovado, a
--    duplicação) sem precisar mexer em cada RPC.

-- ------------------------------------------------------------
-- 1) O VÍNCULO COM O GATEWAY
-- ------------------------------------------------------------
alter table public.assinaturas
  add column if not exists gateway text,
  add column if not exists gateway_customer_id text,
  add column if not exists gateway_subscription_id text,
  add column if not exists proximo_vencimento date,
  add column if not exists ultimo_pagamento_em date,
  -- só o que serve para ELA reconhecer o cartão na tela; nada além
  add column if not exists cartao_final text,
  add column if not exists cartao_bandeira text,
  -- quantas cobranças seguidas falharam (zera quando uma passa)
  add column if not exists falhas_seguidas int not null default 0;

create index if not exists idx_assinaturas_gateway_sub
  on public.assinaturas (gateway_subscription_id)
  where gateway_subscription_id is not null;

-- `inadimplente` entra no CHECK. A lista nova é superconjunto da
-- antiga, então nenhuma linha existente vira inválida.
do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.assinaturas'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.assinaturas drop constraint %I', c.conname);
  end loop;
  alter table public.assinaturas add constraint assinaturas_status_check
    check (status in ('trial', 'ativa', 'inadimplente', 'pausada', 'cancelada'));
end $$;

-- A dona passa a ver a PRÓPRIA assinatura: sem isto a tela dela não
-- tem o que mostrar (a 123 nasceu com RLS ligada e zero policies, o que
-- deixa só o service role passar). Continua sem escrita: quem muda o
-- plano é o gateway (pelo webhook) ou o dono do Vela, nunca ela.
alter table public.assinaturas enable row level security;
drop policy if exists assinatura_propria_select on public.assinaturas;
create policy assinatura_propria_select on public.assinaturas
  for select using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 2) O LOG DO GATEWAY (idempotência)
-- ------------------------------------------------------------
create table if not exists public.gateway_evento (
  id            uuid primary key default gen_random_uuid(),
  gateway       text not null default 'pagarme',
  -- o id do EVENTO no gateway: é ele que impede processar duas vezes
  evento_id     text not null,
  tipo          text not null,
  empresa_id    uuid references public.empresas (id) on delete set null,
  payload       jsonb,
  processado_em timestamptz,
  erro          text,
  created_at    timestamptz not null default now(),
  unique (gateway, evento_id)
);

create index if not exists idx_gateway_evento_empresa
  on public.gateway_evento (empresa_id, created_at desc);

-- Ninguém lê pela API: é registro de servidor. RLS ligada, zero
-- policies — o padrão das tabelas do dono (123).
alter table public.gateway_evento enable row level security;

-- ------------------------------------------------------------
-- 3) O PRIMEIRO EVENTO É POR NOSSA CONTA
-- ------------------------------------------------------------
-- Quantos eventos "contam" para o limite: os que estão de pé. Um
-- cancelado ou arquivado não conta — se ela desistiu de um casamento,
-- não é justo cobrar por isso.
create or replace function public.eventos_que_contam(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.events e
  where e.empresa_id = p_empresa_id
    and e.status <> 'cancelado'
    and coalesce(e.archived, false) = false;
$$;

-- A conta pode criar mais um evento?
--   assinatura ativa (ou inadimplente, ou pausada pelo dono) → sempre
--   sem assinatura, ou em trial/cancelada → só até o primeiro
create or replace function public.pode_criar_evento(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.assinaturas a
      where a.empresa_id = p_empresa_id
        -- inadimplente NÃO trava: a decisão foi avisar, não punir
        and a.status in ('ativa', 'inadimplente', 'pausada')
    ) then true
    else public.eventos_que_contam(p_empresa_id) < 1
  end;
$$;

revoke all on function public.pode_criar_evento(uuid) from public, anon;
grant execute on function public.pode_criar_evento(uuid) to authenticated;
revoke all on function public.eventos_que_contam(uuid) from public, anon;
grant execute on function public.eventos_que_contam(uuid) to authenticated;

-- O gatilho: vale em TODOS os caminhos de criação (wizard, orçamento
-- aprovado, duplicar), porque mora na tabela e não em cada RPC.
create or replace function public.trg_limite_do_plano()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role, cron e migração passam direto: quem cria sem sessão
  -- é o próprio sistema
  if auth.uid() is null then
    return new;
  end if;
  if new.empresa_id is null then
    return new;
  end if;
  if public.pode_criar_evento(new.empresa_id) then
    return new;
  end if;

  raise exception 'plano_gratuito_no_limite'
    using hint = 'O primeiro evento é por nossa conta. Para criar outros, ative a assinatura.';
end $$;

drop trigger if exists trg_limite_do_plano on public.events;
create trigger trg_limite_do_plano
  before insert on public.events
  for each row execute function public.trg_limite_do_plano();

-- CORTESIA PARA QUEM JÁ ESTAVA AQUI. Sem isto, as contas que existem
-- hoje (a do dono, com dezenas de eventos de teste) travariam no
-- instante em que o gatilho subisse — o limite é para quem chega
-- depois, não punição retroativa. `pausada` = o dono decide o que
-- fazer com cada uma no painel; nenhuma cobrança nasce daqui.
insert into public.assinaturas (empresa_id, plano, valor_mensal, status, observacao)
select e.id, 'cortesia', 0, 'pausada',
       'Conta anterior ao limite do primeiro evento (131) — cortesia até o dono decidir.'
from public.empresas e
where not exists (select 1 from public.assinaturas a where a.empresa_id = e.id);

-- ------------------------------------------------------------
-- 4) O QUE A TELA DELA MOSTRA
-- ------------------------------------------------------------
-- Uma consulta só: o estado da assinatura + quantos eventos ela já tem
-- + se pode criar mais. A tela não precisa saber a regra, só o que
-- fazer agora.
create or replace function public.minha_assinatura()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'empresa_id', mc.empresa_id,
    'status', coalesce(a.status, 'trial'),
    'plano', coalesce(a.plano, 'piloto'),
    'valor_mensal', coalesce(a.valor_mensal, 0),
    'proximo_vencimento', a.proximo_vencimento,
    'ultimo_pagamento_em', a.ultimo_pagamento_em,
    'cartao_final', a.cartao_final,
    'cartao_bandeira', a.cartao_bandeira,
    'falhas_seguidas', coalesce(a.falhas_seguidas, 0),
    'tem_gateway', a.gateway_subscription_id is not null,
    'eventos', public.eventos_que_contam(mc.empresa_id),
    'pode_criar_evento', public.pode_criar_evento(mc.empresa_id)
  )
  from public.meu_cargo() mc
  left join public.assinaturas a on a.empresa_id = mc.empresa_id
  where mc.cargo = 'proprietaria';
$$;

revoke all on function public.minha_assinatura() from public, anon;
grant execute on function public.minha_assinatura() to authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'assinaturas tem o vínculo com o gateway' as item,
       (select count(*) = 8 from information_schema.columns
        where table_schema = 'public' and table_name = 'assinaturas'
          and column_name in ('gateway','gateway_customer_id','gateway_subscription_id',
                              'proximo_vencimento','ultimo_pagamento_em','cartao_final',
                              'cartao_bandeira','falhas_seguidas')) as ok
union all
select 'inadimplente é um estado válido',
       (select pg_get_constraintdef(oid) ilike '%inadimplente%'
        from pg_constraint
        where conrelid = 'public.assinaturas'::regclass
          and conname = 'assinaturas_status_check')
union all
select 'a dona lê a própria assinatura, e só ela',
       exists (select 1 from pg_policies
               where schemaname = 'public' and tablename = 'assinaturas'
                 and policyname = 'assinatura_propria_select'
                 and qual like '%proprietaria%')
union all
select 'a assinatura continua sem escrita pela API (só gateway e dono)',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'assinaturas'
                     and cmd in ('INSERT','UPDATE','DELETE','ALL'))
union all
select 'o log do gateway existe e é único por evento',
       to_regclass('public.gateway_evento') is not null
       and exists (select 1 from pg_indexes
                   where schemaname = 'public' and tablename = 'gateway_evento'
                     and indexdef ilike '%unique%evento_id%')
union all
select 'o log do gateway não é lido por ninguém pela API',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'gateway_evento')
union all
select 'o gatilho do primeiro evento está na tabela events',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.events'::regclass
                 and tgname = 'trg_limite_do_plano')
union all
select 'inadimplente NÃO trava a criação (avisa, não pune)',
       (pg_get_functiondef('public.pode_criar_evento(uuid)'::regprocedure)
         like '%inadimplente%')
union all
select 'evento cancelado ou arquivado não conta para o limite',
       (pg_get_functiondef('public.eventos_que_contam(uuid)'::regprocedure)
         like '%archived%')
union all
select 'a tela da dona tem uma consulta só',
       has_function_privilege('authenticated', 'public.minha_assinatura()', 'execute')
       and not has_function_privilege('anon', 'public.minha_assinatura()', 'execute')
union all
select 'NENHUMA empresa existente foi travada por esta migração',
       not exists (
         select 1 from public.empresas e
         where not public.pode_criar_evento(e.id)
       )
union all
select 'toda empresa tem uma linha de assinatura',
       not exists (
         select 1 from public.empresas e
         where not exists (select 1 from public.assinaturas a where a.empresa_id = e.id)
       );
