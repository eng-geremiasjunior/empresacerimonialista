-- ============================================================
-- 168 — A AGENDA DELA NO GOOGLE
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Decisão do dono (22/09/2026): a integração com o Google Agenda é pela
-- API, como a do concorrente. Cada pessoa da equipe conecta a PRÓPRIA
-- conta Google em Configurações; o sistema cria na conta dela uma agenda
-- chamada "eOrganizei" e passa a manter ali o dia de cada evento e cada
-- compromisso com hora — na hora em que mudam aqui. No sentido contrário
-- o sistema lê só os horários OCUPADOS dela (sem título, sem conteúdo),
-- para o Secretário Executivo não oferecer ao fornecedor um horário em
-- que ela tem médico.
--
-- O que este arquivo cria, e por quê:
--
--   1. A CONEXÃO (google_agenda_conexao): uma linha por pessoa, com a
--      chave de renovação do Google CIFRADA pelo servidor. Ninguém lê a
--      tabela pela sessão — nem a própria dona da linha. O que a tela
--      precisa ("conectada como fulana@gmail.com", "falhou em 12/10") sai
--      por uma função que devolve só isso.
--
--   2. A FILA (google_agenda_fila): o que precisa ir para o Google. Quem
--      enche a fila são GATILHOS nas tabelas de eventos, compromissos e
--      clientes — assim nada se perde, venha a mudança da tela, do
--      fornecedor escolhendo horário pelo link ou do aceite da proposta
--      que cria o evento. Todo gatilho engole exceção: a fila NUNCA
--      derruba a gravação de um evento.
--
--   3. O AVISO NA HORA: um gatilho na própria fila chama o servidor
--      (pg_net, assíncrono) com um segredo que só o banco conhece. É o
--      "na hora"; a rotina diária varre o que tiver ficado para trás.
--
--   4. QUEM VÊ O QUÊ: a agenda de cada pessoa só recebe os eventos que
--      ela já enxerga no sistema — a mesma régua de pode_ver_evento
--      (037), escrita aqui com o usuário explícito porque quem processa a
--      fila é o servidor, sem sessão.
--
-- O que NUNCA vai para o Google: valor, CPF, observação interna. O
-- servidor monta o item só com título, data, hora, local e link. Isso é
-- decisão do código que processa a fila (src/lib/google/agenda.ts), e a
-- fila só carrega ids.

-- ------------------------------------------------------------
-- 1) pg_net — o banco avisa o servidor
-- ------------------------------------------------------------
-- A 019 citava a extensão como opção e nunca a ligou. Sem ela o gatilho
-- de aviso falha em silêncio (engole a exceção) e a rotina diária faz o
-- serviço com atraso — o sistema continua de pé.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net não instalada (%): o aviso na hora fica desligado, a rotina diária cobre', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- 2) A conexão de cada pessoa
-- ------------------------------------------------------------
create table if not exists public.google_agenda_conexao (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  empresa_id             uuid not null references public.empresas (id) on delete cascade,
  -- só para a tela dizer "conectada como …"
  google_email           text,
  -- a chave de renovação do Google, cifrada pelo servidor (AES-GCM);
  -- o banco nunca vê o texto claro
  refresh_token_cifrado  text not null,
  -- a agenda "eOrganizei" criada na conta dela; nula até ser criada
  calendario_id          text,
  -- ela deixou o sistema ler os horários ocupados (o consentimento do
  -- Google é granular: ela pode conectar só a escrita)
  pode_ler_ocupado       boolean not null default false,
  conectado_em           timestamptz not null default now(),
  -- 'token' = o Google recusou a chave (revogada, ou vencida no modo de
  -- teste): precisa conectar de novo; 'agenda' = a agenda eOrganizei
  -- sumiu da conta dela e será recriada
  falha                  text check (falha is null or falha in ('token', 'agenda')),
  falha_em               timestamptz,
  -- o aviso no sino sobre a falha, uma vez só
  avisado_em             timestamptz,
  atualizado_em          timestamptz not null default now()
);

create index if not exists idx_google_agenda_conexao_empresa
  on public.google_agenda_conexao (empresa_id);

-- RLS ligada e NENHUMA policy: só o service role lê e escreve. A chave
-- cifrada não sai daqui nem para a dona da linha.
alter table public.google_agenda_conexao enable row level security;

-- O que a tela pode saber da própria conexão — e só da própria.
create or replace function public.minha_conexao_google()
returns table (
  google_email      text,
  conectado_em      timestamptz,
  pode_ler_ocupado  boolean,
  falha             text,
  falha_em          timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.google_email, c.conectado_em, c.pode_ler_ocupado, c.falha, c.falha_em
  from public.google_agenda_conexao c
  where c.user_id = auth.uid();
$$;
revoke all on function public.minha_conexao_google() from public, anon;
grant execute on function public.minha_conexao_google() to authenticated, service_role;

-- ------------------------------------------------------------
-- 3) A fila
-- ------------------------------------------------------------
create table if not exists public.google_agenda_fila (
  id              bigserial primary key,
  empresa_id      uuid not null,
  origem          text not null check (origem in ('evento', 'compromisso')),
  -- sem FK de propósito: o item apagado precisa continuar na fila para
  -- ser apagado também no Google
  origem_id       uuid not null,
  acao            text not null check (acao in ('gravar', 'apagar')),
  -- preenchido quando a linha nasceu de "conectar": só a agenda dessa
  -- pessoa precisa receber o item
  apenas_user_id  uuid,
  criado_em       timestamptz not null default now(),
  tentativas      int not null default 0,
  proxima_em      timestamptz not null default now(),
  -- o servidor marca ao pegar a linha; solta se falhar. Linha pegada há
  -- mais de 5 minutos é considerada abandonada (função que serve) e
  -- volta a ser servida
  pegado_em       timestamptz,
  falha           text
);

create index if not exists idx_google_agenda_fila_proxima
  on public.google_agenda_fila (proxima_em, id);

alter table public.google_agenda_fila enable row level security;

-- ------------------------------------------------------------
-- 4) O ajuste: para onde o banco avisa, e com que segredo
-- ------------------------------------------------------------
-- O segredo nasce aqui, no banco, e não passa por variável de ambiente
-- nem por git: o servidor lê a linha pelo service role e compara com o
-- cabeçalho que o pg_net mandou. Trocar o segredo é um UPDATE.
create table if not exists public.google_agenda_ajuste (
  id        smallint primary key default 1 check (id = 1),
  url_fila  text not null default 'https://eorganizei.com.br/api/google/fila',
  segredo   text not null default encode(gen_random_bytes(24), 'hex'),
  criado_em timestamptz not null default now()
);
alter table public.google_agenda_ajuste enable row level security;
insert into public.google_agenda_ajuste (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 5) Quem enche a fila: os gatilhos
-- ------------------------------------------------------------
-- Todos SECURITY DEFINER: disparam na sessão de quem editou o evento, e
-- essa sessão não tem policy nenhuma na fila nem na conexão.

-- Só vale a pena enfileirar se alguém da empresa conectou.
create or replace function public.google_agenda_empresa_conectada(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.google_agenda_conexao c where c.empresa_id = p_empresa);
$$;
revoke all on function public.google_agenda_empresa_conectada(uuid) from public, anon, authenticated;
grant execute on function public.google_agenda_empresa_conectada(uuid) to service_role;

-- EVENTOS: criado, mudou o que aparece na agenda, ou sumiu. O título do
-- compromisso carrega o tipo e a cliente do evento; quando isso muda, os
-- compromissos futuros do evento vão junto.
create or replace function public.google_agenda_trg_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_id      uuid;
  v_acao    text;
begin
  begin
    if tg_op = 'DELETE' then
      v_empresa := old.empresa_id; v_id := old.id; v_acao := 'apagar';
    else
      v_empresa := new.empresa_id; v_id := new.id; v_acao := 'gravar';
    end if;
    if v_empresa is null or not public.google_agenda_empresa_conectada(v_empresa) then
      return null;
    end if;

    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao)
    values (v_empresa, 'evento', v_id, v_acao);

    if tg_op = 'UPDATE'
       and (new.type is distinct from old.type
            or new.client_id is distinct from old.client_id
            or new.status is distinct from old.status) then
      insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao)
      select v_empresa, 'compromisso', c.id, 'gravar'
      from public.compromisso c
      where c.event_id = v_id
        and c.data >= (now() at time zone 'America/Sao_Paulo')::date;
    end if;
  exception when others then
    -- a fila nunca derruba a gravação do evento
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_google_agenda_evento on public.events;
create trigger trg_google_agenda_evento
  after insert or delete or update of date, type, location, status, client_id, name
  on public.events
  for each row execute function public.google_agenda_trg_evento();

-- COMPROMISSOS: qualquer mudança. O empresa_id vem do gatilho BEFORE da
-- 069 (fill_empresa_from_event), que já rodou quando este dispara.
create or replace function public.google_agenda_trg_compromisso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_id      uuid;
  v_acao    text;
begin
  begin
    if tg_op = 'DELETE' then
      v_empresa := old.empresa_id; v_id := old.id; v_acao := 'apagar';
    else
      v_empresa := new.empresa_id; v_id := new.id; v_acao := 'gravar';
    end if;
    if v_empresa is null or not public.google_agenda_empresa_conectada(v_empresa) then
      return null;
    end if;
    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao)
    values (v_empresa, 'compromisso', v_id, v_acao);
  exception when others then
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_google_agenda_compromisso on public.compromisso;
create trigger trg_google_agenda_compromisso
  after insert or update or delete
  on public.compromisso
  for each row execute function public.google_agenda_trg_compromisso();

-- CLIENTES: o nome dela está no título de cada item. Só os eventos de
-- hoje em diante, e os compromissos futuros deles.
create or replace function public.google_agenda_trg_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if new.name is not distinct from old.name then
      return null;
    end if;
    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao)
    select e.empresa_id, 'evento', e.id, 'gravar'
    from public.events e
    where e.client_id = new.id
      and e.empresa_id is not null
      and e.date >= (now() at time zone 'America/Sao_Paulo')::date
      and public.google_agenda_empresa_conectada(e.empresa_id);

    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao)
    select e.empresa_id, 'compromisso', c.id, 'gravar'
    from public.events e
    join public.compromisso c on c.event_id = e.id
    where e.client_id = new.id
      and e.empresa_id is not null
      and c.data >= (now() at time zone 'America/Sao_Paulo')::date
      and public.google_agenda_empresa_conectada(e.empresa_id);
  exception when others then
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_google_agenda_cliente on public.clients;
create trigger trg_google_agenda_cliente
  after update of name
  on public.clients
  for each row execute function public.google_agenda_trg_cliente();

-- ------------------------------------------------------------
-- 6) O aviso na hora
-- ------------------------------------------------------------
-- Um por comando (statement), não por linha: uma importação de 50
-- eventos avisa uma vez. Sem pg_net, a chamada falha, a exceção é
-- engolida, e a rotina diária cobre.
create or replace function public.google_agenda_trg_avisar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url     text;
  v_segredo text;
begin
  begin
    select a.url_fila, a.segredo into v_url, v_segredo
    from public.google_agenda_ajuste a
    where a.id = 1;
    if coalesce(v_url, '') = '' then
      return null;
    end if;
    perform net.http_post(
      url := v_url,
      body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-eorg-fila', v_segredo),
      timeout_milliseconds := 8000
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;

drop trigger if exists trg_google_agenda_avisar on public.google_agenda_fila;
create trigger trg_google_agenda_avisar
  after insert
  on public.google_agenda_fila
  for each statement execute function public.google_agenda_trg_avisar();

-- ------------------------------------------------------------
-- 7) O que o servidor pergunta ao banco (só service role)
-- ------------------------------------------------------------

-- Quem, entre os conectados da empresa, vê este evento — a régua de
-- pode_ver_evento (037) com o usuário explícito. Quem não está aqui e
-- está conectado recebe o item APAGADO da sua agenda.
create or replace function public.google_agenda_quem_ve(p_event uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.user_id
  from public.events e
  join public.google_agenda_conexao c on c.empresa_id = e.empresa_id
  join public.membros_equipe m
    on m.user_id = c.user_id
   and m.empresa_id = e.empresa_id
   and m.status = 'ativo'
  where e.id = p_event
    and (
      m.cargo in ('proprietaria', 'coordenadora')
      or e.cerimonialista_responsavel_id = m.id
      or e.cerimonialista_id = c.user_id
      or exists (
        select 1 from public.evento_participantes ep
        where ep.event_id = e.id and ep.membro_equipe_id = m.id
      )
    );
$$;
revoke all on function public.google_agenda_quem_ve(uuid) from public, anon, authenticated;
grant execute on function public.google_agenda_quem_ve(uuid) to service_role;

-- Serve um lote da fila e o marca como pego. Duas chamadas ao mesmo
-- tempo (o aviso do banco e a rotina diária) não pegam a mesma linha:
-- FOR UPDATE SKIP LOCKED. Linha pega há mais de 5 minutos é de um
-- processo que morreu no meio, e volta a ser servida.
create or replace function public.google_agenda_pegar_fila(p_max int default 50)
returns setof public.google_agenda_fila
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with alvo as (
    select f.id
    from public.google_agenda_fila f
    where f.proxima_em <= now()
      and (f.pegado_em is null or f.pegado_em < now() - interval '5 minutes')
    order by f.id
    limit greatest(1, least(coalesce(p_max, 50), 200))
    for update skip locked
  )
  update public.google_agenda_fila f
     set pegado_em = now(),
         tentativas = f.tentativas + 1
    from alvo
   where f.id = alvo.id
  returning f.*;
end;
$$;
revoke all on function public.google_agenda_pegar_fila(int) from public, anon, authenticated;
grant execute on function public.google_agenda_pegar_fila(int) to service_role;

-- Ao conectar: tudo o que a pessoa vê, de hoje em diante, vai para a
-- agenda dela — e só para a dela (apenas_user_id). Eventos cancelados e
-- compromissos cancelados ficam de fora.
create or replace function public.google_agenda_enfileirar_tudo(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_n       int := 0;
  v_hoje    date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select c.empresa_id into v_empresa
  from public.google_agenda_conexao c
  where c.user_id = p_user;
  if v_empresa is null then
    return 0;
  end if;

  with ins as (
    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao, apenas_user_id)
    select e.empresa_id, 'evento', e.id, 'gravar', p_user
    from public.events e
    where e.empresa_id = v_empresa
      and e.date >= v_hoje
      and e.status <> 'cancelado'
      and p_user in (select public.google_agenda_quem_ve(e.id))
    returning 1
  )
  select count(*) into v_n from ins;

  with ins as (
    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao, apenas_user_id)
    select e.empresa_id, 'compromisso', c.id, 'gravar', p_user
    from public.compromisso c
    join public.events e on e.id = c.event_id
    where e.empresa_id = v_empresa
      and c.data >= v_hoje
      and c.estado <> 'cancelado'
      and p_user in (select public.google_agenda_quem_ve(e.id))
    returning 1
  )
  select v_n + count(*) into v_n from ins;

  return v_n;
end;
$$;
revoke all on function public.google_agenda_enfileirar_tudo(uuid) from public, anon, authenticated;
grant execute on function public.google_agenda_enfileirar_tudo(uuid) to service_role;

-- ------------------------------------------------------------
-- CONFERÊNCIA — tudo abaixo deve sair `true`
-- ------------------------------------------------------------
select 'pg_net instalada (se false, só o aviso na hora fica desligado)' as o_que,
       exists (select 1 from pg_extension where extname = 'pg_net') as ok

union all
select 'conexão: RLS ligada e sem policy',
       (select relrowsecurity from pg_class where oid = 'public.google_agenda_conexao'::regclass)
   and (select count(*) = 0 from pg_policies
         where schemaname = 'public' and tablename = 'google_agenda_conexao')

union all
select 'fila: RLS ligada e sem policy',
       (select relrowsecurity from pg_class where oid = 'public.google_agenda_fila'::regclass)
   and (select count(*) = 0 from pg_policies
         where schemaname = 'public' and tablename = 'google_agenda_fila')

union all
select 'ajuste: RLS ligada, sem policy, com a linha e o segredo',
       (select relrowsecurity from pg_class where oid = 'public.google_agenda_ajuste'::regclass)
   and (select count(*) = 0 from pg_policies
         where schemaname = 'public' and tablename = 'google_agenda_ajuste')
   and (select length(segredo) >= 32 from public.google_agenda_ajuste where id = 1)

union all
select 'a tela lê só a própria conexão (authenticated executa; anon não)',
       has_function_privilege('authenticated', 'public.minha_conexao_google()', 'execute')
   and not has_function_privilege('anon', 'public.minha_conexao_google()', 'execute')

union all
select 'anon e authenticated não pegam a fila',
       not has_function_privilege('anon', 'public.google_agenda_pegar_fila(int)', 'execute')
   and not has_function_privilege('authenticated', 'public.google_agenda_pegar_fila(int)', 'execute')

union all
select 'anon e authenticated não perguntam quem vê nem enfileiram tudo',
       not has_function_privilege('anon', 'public.google_agenda_quem_ve(uuid)', 'execute')
   and not has_function_privilege('authenticated', 'public.google_agenda_quem_ve(uuid)', 'execute')
   and not has_function_privilege('anon', 'public.google_agenda_enfileirar_tudo(uuid)', 'execute')
   and not has_function_privilege('authenticated', 'public.google_agenda_enfileirar_tudo(uuid)', 'execute')
   and not has_function_privilege('authenticated', 'public.google_agenda_empresa_conectada(uuid)', 'execute')

union all
select 'evento, compromisso e cliente enchem a fila',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.events'::regclass
                  and tgname = 'trg_google_agenda_evento' and not tgisinternal)
   and exists (select 1 from pg_trigger
                where tgrelid = 'public.compromisso'::regclass
                  and tgname = 'trg_google_agenda_compromisso' and not tgisinternal)
   and exists (select 1 from pg_trigger
                where tgrelid = 'public.clients'::regclass
                  and tgname = 'trg_google_agenda_cliente' and not tgisinternal)

union all
select 'a fila avisa o servidor',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.google_agenda_fila'::regclass
                  and tgname = 'trg_google_agenda_avisar' and not tgisinternal);
