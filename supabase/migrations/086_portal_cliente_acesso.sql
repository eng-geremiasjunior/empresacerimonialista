-- ============================================================
-- Vela — Migração 086: Portal da Cliente, fundação de acesso
--
-- Abre uma SEGUNDA CLASSE DE PRINCIPAL no sistema. Até aqui só existia um
-- eixo de autorização: membros_equipe → meu_cargo() → pode_ver_evento().
-- A cliente final (noiva, noivo, mãe da debutante) não é equipe e nunca
-- entra por esse eixo.
--
-- DECISÃO CENTRAL DE SEGURANÇA: pode_ver_evento/pode_editar_evento NÃO são
-- tocadas. Estendê-las para a cliente daria, de uma vez, o financeiro da
-- assessoria, as tarefas, os convites do Secretário e o bucket de anexos
-- da equipe. Em vez disso: uma função nova (sou_cliente_do_evento) e
-- policies ADITIVAS cirúrgicas. O RLS continua default-deny para tudo que
-- não for explicitamente liberado.
--
-- O CONVITE VEM ANTES DO LOGIN (aprendido medindo o banco): o gatilho de
-- signup (024) provisiona empresa para todo login novo, e marcar
-- app_metadata não o alcança — o GoTrue insere a linha em auth.users
-- PRIMEIRO e grava o metadata num passo seguinte, então o gatilho dispara
-- sem ver marca nenhuma. O que ele consegue ver é o E-MAIL. Por isso o
-- vínculo (evento_acesso) nasce antes do login, com user_id nulo, e o
-- gatilho o liga pelo e-mail — sem provisionar nada.
--
-- IDEMPOTENTE E CONVERGENTE: pode ser aplicada num banco zerado ou por
-- cima de qualquer estado intermediário das tentativas anteriores — o
-- resultado final é o mesmo.
--
-- Execute no SQL Editor do Supabase (depois da 085).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) O vínculo: pessoa × evento, com papel
--
-- Nunca um campo user_id em events: um evento tem mais de uma pessoa com
-- acesso (noiva e noivo), e a mesma pessoa pode ter vários eventos ao
-- longo dos anos. O papel é da PESSOA NAQUELE EVENTO — serve a casamento
-- e a debutante, onde "lado noiva/noivo" não faz sentido.
--
-- user_id é NULO enquanto o convite está pendente (login ainda não
-- criado). Um login que também é da equipe pode ter vínculo aqui — é a
-- dona testando o portal, ou uma cerimonialista que vai se casar.
-- ------------------------------------------------------------

create table if not exists public.evento_acesso (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),
  user_id     uuid references auth.users (id) on delete cascade,
  -- ponte opcional com o CRM; o acesso não depende de existir cliente
  client_id   uuid references public.clients (id) on delete set null,
  nome        text not null,
  email       text not null,
  papel       text not null default 'outro',
  -- revogar sem apagar: o que ela escreveu continua atribuído a ela
  status      text not null default 'ativo',
  criado_por  uuid references public.membros_equipe (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, user_id)
);

-- Convergência para bancos que criaram a tabela numa forma anterior
alter table public.evento_acesso alter column user_id drop not null;
alter table public.evento_acesso
  add column if not exists client_id  uuid references public.clients (id) on delete set null,
  add column if not exists criado_por uuid references public.membros_equipe (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'evento_acesso_papel_check'
  ) then
    alter table public.evento_acesso
      add constraint evento_acesso_papel_check
      check (papel in ('noiva', 'noivo', 'debutante', 'mae', 'pai', 'outro'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'evento_acesso_status_check'
  ) then
    alter table public.evento_acesso
      add constraint evento_acesso_status_check
      check (status in ('ativo', 'revogado'));
  end if;
end $$;

create index if not exists idx_evento_acesso_user on public.evento_acesso (user_id)
  where status = 'ativo';
create index if not exists idx_evento_acesso_evento on public.evento_acesso (event_id);

-- Um convite pendente por (evento, e-mail); comparação em minúsculas,
-- que é como o e-mail chega do formulário e do auth.
create unique index if not exists uq_evento_acesso_convite
  on public.evento_acesso (event_id, lower(email))
  where user_id is null;

comment on table public.evento_acesso is
  'Quem da família tem acesso ao Portal da Cliente, por evento e com papel. Segunda classe de principal — não é equipe.';
comment on column public.evento_acesso.user_id is
  'Nulo enquanto o convite está pendente: a linha nasce antes do login e o gatilho de signup a liga pelo e-mail.';

-- empresa_id a partir do evento (mesmo padrão das filhas, 021)
drop trigger if exists trg_fill_empresa on public.evento_acesso;
create trigger trg_fill_empresa
  before insert on public.evento_acesso
  for each row execute function public.fill_empresa_from_event();

-- ------------------------------------------------------------
-- 2) A função de autorização do portal
--
-- Convite pendente não é acesso: só vale com user_id ligado.
-- ------------------------------------------------------------

create or replace function public.sou_cliente_do_evento(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evento_acesso ea
    where ea.event_id = p_event_id
      and ea.user_id is not null
      and ea.user_id = auth.uid()
      and ea.status = 'ativo'
  );
$$;

revoke all on function public.sou_cliente_do_evento(uuid) from public, anon;
grant execute on function public.sou_cliente_do_evento(uuid) to authenticated;

comment on function public.sou_cliente_do_evento(uuid) is
  'Autorização do Portal da Cliente. Nunca substitui pode_ver_evento: as duas convivem em policies separadas.';

-- ------------------------------------------------------------
-- 3) RLS do próprio vínculo
--
-- A equipe do evento gerencia; a cliente enxerga apenas as próprias
-- linhas. Ela nunca escreve aqui — não se auto-promove, não muda o
-- próprio papel, não revoga ninguém.
-- ------------------------------------------------------------

alter table public.evento_acesso enable row level security;

drop policy if exists evento_acesso_select on public.evento_acesso;
create policy evento_acesso_select on public.evento_acesso
  for select using (
    public.pode_ver_evento(event_id) or user_id = auth.uid()
  );

drop policy if exists evento_acesso_insert on public.evento_acesso;
create policy evento_acesso_insert on public.evento_acesso
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists evento_acesso_update on public.evento_acesso;
create policy evento_acesso_update on public.evento_acesso
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists evento_acesso_delete on public.evento_acesso;
create policy evento_acesso_delete on public.evento_acesso
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 4) Nenhum caminho provisiona empresa para quem é do portal
--
-- 4a) O gatilho de signup casa o convite pelo E-MAIL — a única informação
--     que já está na linha de auth.users quando ele dispara.
-- ------------------------------------------------------------

create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'equipe', '') = 'true' then
    return new; -- membro de equipe: o registro é feito pela Admin API
  end if;

  -- Cliente do Portal convidada antes do login: liga o convite e sai.
  -- (Checar app_metadata aqui não funciona: o GoTrue só o grava depois
  -- do INSERT — medido no banco.)
  if exists (
    select 1 from public.evento_acesso ea
    where ea.user_id is null
      and lower(ea.email) = lower(coalesce(new.email, ''))
  ) then
    update public.evento_acesso
       set user_id = new.id, updated_at = now()
     where user_id is null
       and lower(email) = lower(coalesce(new.email, ''));
    return new;
  end if;

  insert into public.empresas (nome, owner_user_id)
  values (coalesce(new.raw_user_meta_data->>'name', 'Minha Empresa'), new.id)
  on conflict (owner_user_id) do nothing;

  insert into public.membros_equipe
    (empresa_id, user_id, nome, email, cargo, status, is_owner)
  select e.id, new.id,
         coalesce(new.raw_user_meta_data->>'name', 'Proprietária'),
         new.email, 'proprietaria', 'ativo', true
  from public.empresas e
  where e.owner_user_id = new.id
    and not exists (
      select 1 from public.membros_equipe m where m.user_id = new.id
    );

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4b) A RPC chamada pelo app tem as mesmas saídas. Aqui a marca de
--     app_metadata FUNCIONA (a RPC roda muito depois do signup) e o
--     vínculo é a segunda trava.
-- ------------------------------------------------------------

create or replace function public.garantir_empresa_propria()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_empresa uuid;
  v_nome    text;
  v_email   text;
  v_portal  boolean;
begin
  if v_uid is null then
    return;
  end if;

  -- Já pertence a alguma equipe (qualquer status)? Então não provisiona.
  if exists (select 1 from public.membros_equipe where user_id = v_uid) then
    return;
  end if;

  -- Trava 1: marca posta pelo servidor na criação do acesso (app_metadata,
  -- que a própria usuária não consegue editar).
  select coalesce((raw_app_meta_data->>'portal')::boolean, false)
    into v_portal
  from auth.users where id = v_uid;

  if coalesce(v_portal, false) then
    return;
  end if;

  -- Trava 2: ter vínculo de portal basta, mesmo sem a marca.
  if exists (select 1 from public.evento_acesso where user_id = v_uid) then
    return;
  end if;

  select raw_user_meta_data->>'name', email
    into v_nome, v_email
  from auth.users where id = v_uid;

  insert into public.empresas (nome, owner_user_id)
  values (coalesce(nullif(trim(v_nome), ''), 'Minha Empresa'), v_uid)
  on conflict (owner_user_id) do nothing;

  select id into v_empresa
  from public.empresas where owner_user_id = v_uid;

  if v_empresa is null then
    return;
  end if;

  insert into public.membros_equipe
    (empresa_id, user_id, nome, email, cargo, status, is_owner)
  values (
    v_empresa, v_uid,
    coalesce(nullif(trim(v_nome), ''), v_email, 'Proprietária'),
    v_email, 'proprietaria', 'ativo', true
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.garantir_empresa_propria() to authenticated;

-- ------------------------------------------------------------
-- 5) Leitura mínima do portal (aditiva; não toca as policies da equipe)
--
-- events: a cliente enxerga o próprio evento inteiro. Nenhuma coluna ali
-- é segredo para ela — inclusive contract_value, que é o contrato DELA.
-- Leitura apenas: escrever em events deixaria a data do casamento nas
-- mãos de quem não coordena.
-- ------------------------------------------------------------

drop policy if exists portal_events_select on public.events;
create policy portal_events_select on public.events
  for select using (public.sou_cliente_do_evento(id));

-- empresas: só para a marca da cerimonialista (nome e logo_url).
drop policy if exists portal_empresas_select on public.empresas;
create policy portal_empresas_select on public.empresas
  for select using (
    exists (
      select 1
      from public.evento_acesso ea
      where ea.empresa_id = empresas.id
        and ea.user_id = auth.uid()
        and ea.status = 'ativo'
    )
  );

-- ------------------------------------------------------------
-- 6) Contato da cerimonialista ("Falar com a Camila")
--
-- Por RPC, não por policy: o telefone da PESSOA não existe no schema
-- (membros_equipe não tem telefone), então a fonte é o WhatsApp
-- institucional, que varia por tipo de evento desde a 057. Isolar aqui
-- permite trocar a fonte depois sem abrir membros_equipe à cliente.
-- ------------------------------------------------------------

create or replace function public.portal_contato_cerimonialista(p_event_id uuid)
returns table(nome text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      (select me.nome
         from public.membros_equipe me
         join public.events e on e.cerimonialista_responsavel_id = me.id
        where e.id = p_event_id),
      (select me.nome
         from public.membros_equipe me
         join public.events e on e.empresa_id = me.empresa_id
        where e.id = p_event_id and me.is_owner
        limit 1)
    ) as nome,
    (select eci.whatsapp_contato
       from public.empresa_conteudo_institucional eci
       join public.events e on e.empresa_id = eci.empresa_id
      where e.id = p_event_id
        and eci.tipo_evento::text = e.type
      limit 1) as whatsapp
  where public.sou_cliente_do_evento(p_event_id)
     or public.pode_ver_evento(p_event_id);
$$;

revoke all on function public.portal_contato_cerimonialista(uuid) from public, anon;
grant execute on function public.portal_contato_cerimonialista(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7) Saneamento: desfaz empresas que nasceram pelo furo do gatilho antes
--    desta migração. Só age sobre dona com vínculo de portal E empresa
--    completamente vazia (sem eventos, sem clientes) — nunca toca numa
--    empresa de verdade.
-- ------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select e.id as empresa_id, e.owner_user_id as uid
    from public.empresas e
    where exists (
        select 1 from public.evento_acesso ea where ea.user_id = e.owner_user_id
      )
      and not exists (select 1 from public.events ev where ev.empresa_id = e.id)
      and not exists (select 1 from public.clients c where c.empresa_id = e.id)
  loop
    delete from public.membros_equipe
     where empresa_id = r.empresa_id and user_id = r.uid;
    delete from public.empresas where id = r.empresa_id;
    raise notice 'Empresa órfã de cliente do portal removida: %', r.empresa_id;
  end loop;
end $$;

commit;
