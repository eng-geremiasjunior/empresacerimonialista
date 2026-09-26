-- ============================================================
-- 178 — O dinheiro da família (Portal da família v2, fase 3)
-- ============================================================
-- A tela Dinheiro do portal tem dois lados:
--
--   PROPOSTO PELA CERIMONIALISTA: a verba do evento (conta 'fornecedor',
--   type 'despesa' — a regra canônica da 135). Os mesmos números que a
--   equipe vê no Financeiro. A família marca a parcela como paga e anexa
--   o comprovante; a equipe vê quem marcou. A família pede ajuste de um
--   fornecedor. Nunca a conta 'assessoria' (honorários dela), nunca CPF.
--
--   SÓ DE VOCÊS: o orçamento e os gastos próprios da família. A equipe
--   NÃO lê — nem pela API: as duas tabelas só têm policy para quem é
--   cliente do evento. "Enviar para a cerimonialista" copia o gasto para
--   `dinheiro_pedido` (que as duas pontas leem) e tira do lado privado,
--   numa função só.
--
-- Idempotente. Termina com a conferência (tudo true).

-- ------------------------------------------------------------
-- 1) Quem marcou como pago, na própria parcela
-- ------------------------------------------------------------
alter table public.transactions
  add column if not exists pago_pela_familia_por  uuid references auth.users (id) on delete set null,
  add column if not exists pago_pela_familia_nome text,
  add column if not exists pago_pela_familia_em  timestamptz;

comment on column public.transactions.pago_pela_familia_nome is
  'Quem da família marcou como pago pelo portal (178). Some quando o pagamento é desfeito.';

-- desfez o pagamento (por qualquer caminho): a marca da família sai junto
create or replace function public.trg_pago_pela_familia_limpa()
returns trigger
language plpgsql
as $$
begin
  if old.paid and not coalesce(new.paid, false) then
    new.pago_pela_familia_por := null;
    new.pago_pela_familia_nome := null;
    new.pago_pela_familia_em := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_pago_pela_familia_limpa on public.transactions;
create trigger trg_pago_pela_familia_limpa before update on public.transactions
  for each row execute function public.trg_pago_pela_familia_limpa();

-- ------------------------------------------------------------
-- 2) O autor do histórico financeiro (167) passa a conhecer a família
-- ------------------------------------------------------------
-- Antes, quem não é da equipe virava "Equipe". Agora: equipe pelo nome;
-- família pelo nome do acesso ao portal; sem sessão, "Sistema".
create or replace function public.autor_da_sessao(p_empresa uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_nome text;
begin
  if v_uid is null then
    return 'Sistema';
  end if;
  select nullif(btrim(m.nome), '') into v_nome
    from public.membros_equipe m
   where m.user_id = v_uid
   order by (m.empresa_id is not distinct from p_empresa) desc, m.created_at asc
   limit 1;
  if v_nome is null then
    select nullif(btrim(ea.nome), '') into v_nome
      from public.evento_acesso ea
     where ea.user_id = v_uid and ea.status = 'ativo'
     order by (ea.empresa_id is not distinct from p_empresa) desc, ea.created_at asc
     limit 1;
  end if;
  return coalesce(v_nome, 'Equipe');
end $$;

-- ------------------------------------------------------------
-- 2b) Apagar um login não esbarra no histórico imutável (167)
-- ------------------------------------------------------------
-- `autor_id` aponta para auth.users com ON DELETE SET NULL. Apagar um
-- login (família que saiu do portal, alguém que saiu da equipe) vira um
-- UPDATE nessas linhas — e a trava da 167 recusava tudo, então o login
-- não podia mais ser apagado. A única mudança aceita agora é essa: a
-- chave vira nula; o nome escrito e todo o resto ficam.
create or replace function public.trg_financeiro_registro_imutavel()
returns trigger
language plpgsql
as $$
begin
  if old.autor_id is not null and new.autor_id is null
     and (to_jsonb(new) - 'autor_id') = (to_jsonb(old) - 'autor_id') then
    return new;
  end if;
  raise exception 'o histórico do financeiro não aceita alteração';
end $$;

revoke all on function public.trg_financeiro_registro_imutavel()
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3) O lado "só de vocês" — privado da família
-- ------------------------------------------------------------
create table if not exists public.familia_gasto (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete cascade,
  nome        text not null,
  categoria   text,
  valor       numeric(12, 2) not null default 0,
  pago        boolean not null default false,
  criado_por  uuid references auth.users (id) on delete set null,
  autor_nome  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.familia_gasto drop constraint if exists familia_gasto_nome_check;
alter table public.familia_gasto add constraint familia_gasto_nome_check
  check (char_length(btrim(nome)) between 1 and 80);
alter table public.familia_gasto drop constraint if exists familia_gasto_categoria_check;
alter table public.familia_gasto add constraint familia_gasto_categoria_check
  check (categoria is null or char_length(categoria) <= 80);
alter table public.familia_gasto drop constraint if exists familia_gasto_valor_check;
alter table public.familia_gasto add constraint familia_gasto_valor_check
  check (valor >= 0 and valor <= 10000000);

create index if not exists idx_familia_gasto_evento on public.familia_gasto (event_id, created_at);

create table if not exists public.familia_orcamento (
  event_id       uuid primary key references public.events (id) on delete cascade,
  empresa_id     uuid references public.empresas (id) on delete cascade,
  valor          numeric(12, 2),
  atualizado_por uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now()
);

alter table public.familia_orcamento drop constraint if exists familia_orcamento_valor_check;
alter table public.familia_orcamento add constraint familia_orcamento_valor_check
  check (valor is null or (valor >= 0 and valor <= 100000000));

drop trigger if exists trg_fill_empresa on public.familia_gasto;
create trigger trg_fill_empresa before insert on public.familia_gasto
  for each row execute function public.fill_empresa_from_event();
drop trigger if exists trg_fill_empresa on public.familia_orcamento;
create trigger trg_fill_empresa before insert on public.familia_orcamento
  for each row execute function public.fill_empresa_from_event();

-- autor e carimbo (quem escreveu não é o que o navegador diz)
create or replace function public.trg_familia_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'familia_gasto' then
    if tg_op = 'INSERT' then
      new.criado_por := auth.uid();
      new.autor_nome := (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
                          where ea.event_id = new.event_id and ea.user_id = auth.uid()
                            and ea.status = 'ativo' limit 1);
    else
      new.criado_por := old.criado_por;
      new.autor_nome := old.autor_nome;
      new.event_id := old.event_id;
    end if;
  else
    new.atualizado_por := auth.uid();
    if tg_op = 'UPDATE' then
      new.event_id := old.event_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.trg_familia_autor() from public, anon;

drop trigger if exists trg_familia_autor on public.familia_gasto;
create trigger trg_familia_autor before insert or update on public.familia_gasto
  for each row execute function public.trg_familia_autor();
drop trigger if exists trg_familia_autor on public.familia_orcamento;
create trigger trg_familia_autor before insert or update on public.familia_orcamento
  for each row execute function public.trg_familia_autor();

-- RLS: só quem é cliente do evento. Nenhuma policy para a equipe.
alter table public.familia_gasto enable row level security;
alter table public.familia_orcamento enable row level security;

drop policy if exists familia_gasto_so_da_familia on public.familia_gasto;
create policy familia_gasto_so_da_familia on public.familia_gasto
  for all to authenticated
  using (event_id in (select public.eventos_da_cliente()))
  with check (event_id in (select public.eventos_da_cliente()));

drop policy if exists familia_orcamento_so_da_familia on public.familia_orcamento;
create policy familia_orcamento_so_da_familia on public.familia_orcamento
  for all to authenticated
  using (event_id in (select public.eventos_da_cliente()))
  with check (event_id in (select public.eventos_da_cliente()));

-- ------------------------------------------------------------
-- 4) O que a família pede à cerimonialista sobre dinheiro
-- ------------------------------------------------------------
-- 'ajuste': um fornecedor do lado dela ("o valor mudou", "dá para
-- dividir em 3?"). 'gasto': um gasto do lado privado que a família quer
-- que entre na verba. As duas pontas leem; só a equipe responde.
create table if not exists public.dinheiro_pedido (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  empresa_id     uuid references public.empresas (id) on delete cascade,
  tipo           text not null,
  supplier_id    uuid references public.suppliers (id) on delete set null,
  rotulo         text not null,
  texto          text,
  valor          numeric(12, 2),
  pago           boolean not null default false,
  autor_nome     text,
  criado_por     uuid references auth.users (id) on delete set null,
  estado         text not null default 'aguardando',
  resposta       text,
  respondida_em  timestamptz,
  respondida_por uuid references auth.users (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.dinheiro_pedido drop constraint if exists dinheiro_pedido_tipo_check;
alter table public.dinheiro_pedido add constraint dinheiro_pedido_tipo_check
  check (tipo in ('ajuste', 'gasto'));
alter table public.dinheiro_pedido drop constraint if exists dinheiro_pedido_estado_check;
alter table public.dinheiro_pedido add constraint dinheiro_pedido_estado_check
  check (estado in ('aguardando', 'lancado', 'respondido'));
alter table public.dinheiro_pedido drop constraint if exists dinheiro_pedido_textos_check;
alter table public.dinheiro_pedido add constraint dinheiro_pedido_textos_check
  check (char_length(btrim(rotulo)) between 1 and 80
         and (texto is null or char_length(texto) <= 600)
         and (resposta is null or char_length(resposta) <= 600));
alter table public.dinheiro_pedido drop constraint if exists dinheiro_pedido_valor_check;
alter table public.dinheiro_pedido add constraint dinheiro_pedido_valor_check
  check (valor is null or (valor >= 0 and valor <= 10000000));

create index if not exists idx_dinheiro_pedido_evento
  on public.dinheiro_pedido (event_id, estado, created_at desc);

drop trigger if exists trg_fill_empresa on public.dinheiro_pedido;
create trigger trg_fill_empresa before insert on public.dinheiro_pedido
  for each row execute function public.fill_empresa_from_event();

create or replace function public.trg_dinheiro_pedido_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- o fornecedor do ajuste tem de ser deste evento
    if new.supplier_id is not null and not exists (
      select 1 from public.transactions t
       where t.event_id = new.event_id and t.supplier_id = new.supplier_id
      union all
      select 1 from public.evento_fornecedor_orcamento o
       where o.event_id = new.event_id and o.supplier_id = new.supplier_id
    ) then
      raise exception 'fornecedor de outro evento';
    end if;
    new.criado_por := auth.uid();
    new.autor_nome := coalesce(
      (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
        where ea.event_id = new.event_id and ea.user_id = auth.uid() and ea.status = 'ativo'
        limit 1),
      new.autor_nome);
    new.estado := 'aguardando';
    new.resposta := null;
    new.respondida_em := null;
    new.respondida_por := null;
    new.transaction_id := null;
    return new;
  end if;

  -- UPDATE (só a equipe, pela policy): a resposta muda; o pedido, não
  new.updated_at := now();
  if new.estado is distinct from old.estado or new.resposta is distinct from old.resposta then
    new.respondida_em := now();
    new.respondida_por := auth.uid();
  end if;
  new.event_id := old.event_id;
  new.tipo := old.tipo;
  new.supplier_id := old.supplier_id;
  new.rotulo := old.rotulo;
  new.texto := old.texto;
  new.valor := old.valor;
  new.pago := old.pago;
  new.autor_nome := old.autor_nome;
  new.criado_por := old.criado_por;
  return new;
end $$;

revoke all on function public.trg_dinheiro_pedido_antes() from public, anon;

drop trigger if exists trg_dinheiro_pedido_antes on public.dinheiro_pedido;
create trigger trg_dinheiro_pedido_antes before insert or update on public.dinheiro_pedido
  for each row execute function public.trg_dinheiro_pedido_antes();

-- quem cuida do evento recebe um aviso (padrão da 177)
create or replace function public.avisar_equipe_do_dinheiro(p_event_id uuid, p_titulo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev   public.events%rowtype;
  v_resp uuid;
begin
  select * into v_ev from public.events where id = p_event_id;
  if not found then
    return;
  end if;
  select me.user_id into v_resp from public.membros_equipe me
   where me.id = v_ev.cerimonialista_responsavel_id;
  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal', left(p_titulo, 200),
          'Veja no Financeiro do evento.', '/eventos/' || p_event_id || '/financeiro');
exception when others then
  -- aviso nunca derruba o que a família fez
  return;
end $$;

revoke all on function public.avisar_equipe_do_dinheiro(uuid, text) from public, anon, authenticated;

create or replace function public.trg_dinheiro_pedido_avisa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.pode_editar_evento(new.event_id) then
    return null;
  end if;
  perform public.avisar_equipe_do_dinheiro(
    new.event_id,
    coalesce(new.autor_nome, 'A família')
      || case when new.tipo = 'ajuste'
              then ' pediu um ajuste em ' || new.rotulo
              else ' enviou um gasto: ' || new.rotulo
                   || coalesce(' · ' || public.dinheiro_br(new.valor), '')
         end);
  return null;
exception when others then
  return null;
end $$;

revoke all on function public.trg_dinheiro_pedido_avisa() from public, anon;

drop trigger if exists trg_dinheiro_pedido_avisa on public.dinheiro_pedido;
create trigger trg_dinheiro_pedido_avisa after insert on public.dinheiro_pedido
  for each row execute function public.trg_dinheiro_pedido_avisa();

alter table public.dinheiro_pedido enable row level security;

drop policy if exists dinheiro_pedido_select on public.dinheiro_pedido;
create policy dinheiro_pedido_select on public.dinheiro_pedido
  for select to authenticated using (
    public.pode_ver_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

drop policy if exists dinheiro_pedido_insert on public.dinheiro_pedido;
create policy dinheiro_pedido_insert on public.dinheiro_pedido
  for insert to authenticated with check (event_id in (select public.eventos_da_cliente()));

drop policy if exists dinheiro_pedido_update on public.dinheiro_pedido;
create policy dinheiro_pedido_update on public.dinheiro_pedido
  for update to authenticated using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists dinheiro_pedido_delete on public.dinheiro_pedido;
create policy dinheiro_pedido_delete on public.dinheiro_pedido
  for delete to authenticated using (
    event_id in (select public.eventos_da_cliente()) and estado = 'aguardando'
  );

-- ------------------------------------------------------------
-- 5) O comprovante da família: pasta <evento>/familia/ no balde da 097
-- ------------------------------------------------------------
-- A família sobe e lê SÓ o que está na pasta dela; a equipe continua
-- lendo tudo do evento pela policy da 097.
create or replace function public.pode_usar_comprovante_familia(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pastas text[];
begin
  -- dentro do bloco, para a exceção cair no "false" e nunca derrubar a policy
  v_pastas := storage.foldername(p_name);
  return v_pastas[2] = 'familia'
     and public.sou_cliente_do_evento(v_pastas[1]::uuid);
exception when others then
  return false;
end $$;

revoke all on function public.pode_usar_comprovante_familia(text) from public, anon;
grant execute on function public.pode_usar_comprovante_familia(text) to authenticated;

drop policy if exists "comprovantes_familia_insert" on storage.objects;
create policy "comprovantes_familia_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes'
              and public.pode_usar_comprovante_familia(name));

drop policy if exists "comprovantes_familia_select" on storage.objects;
create policy "comprovantes_familia_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes'
         and public.pode_usar_comprovante_familia(name));

-- ------------------------------------------------------------
-- 6) As funções do portal
-- ------------------------------------------------------------
-- 6a) O lado da cerimonialista, como a família vê. Lista fechada de
-- campos: nada da assessoria, nenhum documento de fornecedor, e o
-- caminho do comprovante só quando é da pasta da família.
create or replace function public.portal_dinheiro(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.sou_cliente_do_evento(p_event_id) then null
    else json_build_object(
      'fornecedores', coalesce((
        select json_agg(json_build_object(
            'supplier_id', o.supplier_id,
            'nome',        s.name,
            'categoria',   coalesce(eo.nome, s.category),
            'contratado',  case
              when exists (select 1 from public.evento_fornecedor_item i
                            where i.evento_fornecedor_orcamento_id = o.id)
              then (select coalesce(sum(coalesce(i.valor_negociado, 0)), 0)
                      from public.evento_fornecedor_item i
                     where i.evento_fornecedor_orcamento_id = o.id)
              else o.valor_alocado
            end
          ) order by s.name)
        from public.evento_fornecedor_orcamento o
        join public.suppliers s on s.id = o.supplier_id
        left join public.evento_objetivo eo on eo.id = o.objetivo_id
        where o.event_id = p_event_id), '[]'::json),
      'parcelas', coalesce((
        select json_agg(json_build_object(
            'id',              t.id,
            'supplier_id',     t.supplier_id,
            'fornecedor',      s.name,
            'categoria',       s.category,
            'descricao',       t.description,
            'valor',           t.value,
            'vencimento',      t.due_date,
            'pago',            t.paid,
            'pago_em',         t.paid_at,
            'origem',          t.origem_pagamento,
            'familia_nome',    t.pago_pela_familia_nome,
            'familia_em',      t.pago_pela_familia_em,
            'tem_comprovante', t.comprovante_path is not null,
            'comprovante_path', case when t.comprovante_path like p_event_id::text || '/familia/%'
                                     then t.comprovante_path end,
            'comprovante_nome', case when t.comprovante_path like p_event_id::text || '/familia/%'
                                     then t.comprovante_nome end
          ) order by t.due_date nulls last, t.created_at)
        from public.transactions t
        left join public.suppliers s on s.id = t.supplier_id
        where t.event_id = p_event_id
          and t.conta = 'fornecedor'
          and t.type = 'despesa'), '[]'::json)
    )
  end;
$$;

revoke all on function public.portal_dinheiro(uuid) from public, anon;
grant execute on function public.portal_dinheiro(uuid) to authenticated;

-- 6b) Marcar como pago (e/ou anexar o comprovante que faltou)
create or replace function public.portal_marcar_pago(
  p_transaction_id   uuid,
  p_pago_em          date default null,
  p_comprovante_path text default null,
  p_comprovante_nome text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t     public.transactions%rowtype;
  v_nome  text;
  v_forn  text;
  v_hoje  date := (now() at time zone 'America/Sao_Paulo')::date;
  v_cnome text := left(coalesce(nullif(btrim(p_comprovante_nome), ''), 'comprovante'), 120);
begin
  select * into v_t from public.transactions where id = p_transaction_id for update;
  if not found or not public.sou_cliente_do_evento(v_t.event_id)
     or v_t.conta <> 'fornecedor' or v_t.type <> 'despesa' then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if p_comprovante_path is not null
     and p_comprovante_path not like v_t.event_id::text || '/familia/%' then
    return json_build_object('ok', false, 'erro', 'comprovante');
  end if;

  if v_t.paid then
    -- já pago: só entra o comprovante que faltava
    if p_comprovante_path is null or v_t.comprovante_path is not null then
      return json_build_object('ok', false, 'erro', 'ja_pago');
    end if;
    update public.transactions
       set comprovante_path = p_comprovante_path,
           comprovante_nome = v_cnome,
           comprovante_em = now()
     where id = v_t.id;
    return json_build_object('ok', true);
  end if;

  if v_t.origem_pagamento <> 'cliente_direto' then
    return json_build_object('ok', false, 'erro', 'pelo_caixa');
  end if;
  if p_pago_em is not null and p_pago_em > v_hoje then
    return json_build_object('ok', false, 'erro', 'data_futura');
  end if;

  v_nome := coalesce(
    (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
      where ea.event_id = v_t.event_id and ea.user_id = auth.uid() and ea.status = 'ativo'
      limit 1),
    'A família');

  update public.transactions
     set paid = true,
         -- meio-dia de Brasília: a data não escorrega de dia no UTC
         paid_at = (coalesce(p_pago_em, v_hoje) + time '12:00') at time zone 'America/Sao_Paulo',
         pago_pela_familia_por = auth.uid(),
         pago_pela_familia_nome = v_nome,
         pago_pela_familia_em = now(),
         comprovante_path = coalesce(p_comprovante_path, comprovante_path),
         comprovante_nome = case when p_comprovante_path is not null then v_cnome else comprovante_nome end,
         comprovante_em = case when p_comprovante_path is not null then now() else comprovante_em end
   where id = v_t.id;

  select s.name into v_forn from public.suppliers s where s.id = v_t.supplier_id;
  perform public.avisar_equipe_do_dinheiro(
    v_t.event_id,
    v_nome || ' marcou como pago: '
      || coalesce(v_forn, nullif(btrim(v_t.description), ''), 'uma parcela')
      || ' · ' || public.dinheiro_br(v_t.value));
  return json_build_object('ok', true);
end $$;

revoke all on function public.portal_marcar_pago(uuid, date, text, text) from public, anon;
grant execute on function public.portal_marcar_pago(uuid, date, text, text) to authenticated;

-- 6c) Desfazer o "pago" que a própria família marcou
create or replace function public.portal_desfazer_pago(p_transaction_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t public.transactions%rowtype;
begin
  select * into v_t from public.transactions where id = p_transaction_id for update;
  if not found or not public.sou_cliente_do_evento(v_t.event_id)
     or v_t.conta <> 'fornecedor' or v_t.type <> 'despesa' then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if not v_t.paid or v_t.pago_pela_familia_em is null then
    return json_build_object('ok', false, 'erro', 'nada_a_desfazer');
  end if;
  update public.transactions
     set paid = false,
         paid_at = null,
         comprovante_path = case when comprovante_path like v_t.event_id::text || '/familia/%'
                                 then null else comprovante_path end,
         comprovante_nome = case when comprovante_path like v_t.event_id::text || '/familia/%'
                                 then null else comprovante_nome end,
         comprovante_em = case when comprovante_path like v_t.event_id::text || '/familia/%'
                               then null else comprovante_em end
   where id = v_t.id;
  return json_build_object('ok', true);
end $$;

revoke all on function public.portal_desfazer_pago(uuid) from public, anon;
grant execute on function public.portal_desfazer_pago(uuid) to authenticated;

-- 6d) "Enviar para a cerimonialista": o gasto sai do lado privado e vira
-- pedido, na mesma transação
create or replace function public.portal_enviar_gasto(p_gasto_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_g  public.familia_gasto%rowtype;
  v_id uuid;
begin
  select * into v_g from public.familia_gasto where id = p_gasto_id for update;
  if not found or not public.sou_cliente_do_evento(v_g.event_id) then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  insert into public.dinheiro_pedido (event_id, tipo, rotulo, texto, valor, pago, autor_nome)
  values (v_g.event_id, 'gasto', v_g.nome, v_g.categoria, v_g.valor, v_g.pago, v_g.autor_nome)
  returning id into v_id;
  delete from public.familia_gasto where id = v_g.id;
  return json_build_object('ok', true, 'pedido_id', v_id);
end $$;

revoke all on function public.portal_enviar_gasto(uuid) from public, anon;
grant execute on function public.portal_enviar_gasto(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7) Conferência — tudo true
-- ------------------------------------------------------------
select 'transactions guarda quem da família marcou como pago' as item,
       (select count(*) = 3 from information_schema.columns
         where table_schema = 'public' and table_name = 'transactions'
           and column_name in ('pago_pela_familia_por', 'pago_pela_familia_nome',
                               'pago_pela_familia_em')) as ok
union all
select 'as três tabelas novas com RLS ligada',
       (select count(*) = 3 from pg_class c
         where c.oid in (to_regclass('public.familia_gasto'),
                         to_regclass('public.familia_orcamento'),
                         to_regclass('public.dinheiro_pedido'))
           and c.relrowsecurity)
union all
select 'só de vocês: uma policy por tabela, e nenhuma cita a equipe',
       (select count(*) = 2 from pg_policies
         where schemaname = 'public'
           and tablename in ('familia_gasto', 'familia_orcamento'))
       and not exists (select 1 from pg_policies
                        where schemaname = 'public'
                          and tablename in ('familia_gasto', 'familia_orcamento')
                          and (coalesce(qual, '') || coalesce(with_check, ''))
                              ~ 'pode_ver_evento|pode_editar_evento|meu_cargo')
union all
select 'pedidos: quatro policies (ler, pedir, responder, tirar)',
       (select count(*) = 4 from pg_policies
         where schemaname = 'public' and tablename = 'dinheiro_pedido')
union all
select 'o comprovante da família: duas policies no balde',
       (select count(*) = 2 from pg_policies
         where schemaname = 'storage' and tablename = 'objects'
           and policyname in ('comprovantes_familia_insert', 'comprovantes_familia_select'))
union all
select 'portal_dinheiro não lê a assessoria nem documento',
       (select p.prosrc !~* 'assessoria|cpf|cnpj|contract_value|verba_total'
          from pg_proc p where p.proname = 'portal_dinheiro'
           and p.pronamespace = 'public'::regnamespace)
union all
select 'o anônimo não executa as funções do portal',
       not has_function_privilege('anon', 'public.portal_dinheiro(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_marcar_pago(uuid, date, text, text)', 'execute')
       and not has_function_privilege('anon', 'public.portal_desfazer_pago(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_enviar_gasto(uuid)', 'execute')
union all
select 'ninguém de fora chama o aviso direto',
       not has_function_privilege('authenticated', 'public.avisar_equipe_do_dinheiro(uuid, text)', 'execute')
union all
select 'o histórico segue imutável, menos a chave do login apagado',
       (select p.prosrc ~ 'autor_id' and p.prosrc ~ 'não aceita alteração'
          from pg_proc p where p.proname = 'trg_financeiro_registro_imutavel'
           and p.pronamespace = 'public'::regnamespace)
union all
select 'os gatilhos no lugar',
       (select count(*) = 8 from pg_trigger t
         where not t.tgisinternal
           and ((t.tgrelid = 'public.transactions'::regclass and t.tgname = 'trg_pago_pela_familia_limpa')
             or (t.tgrelid = 'public.familia_gasto'::regclass and t.tgname in ('trg_fill_empresa', 'trg_familia_autor'))
             or (t.tgrelid = 'public.familia_orcamento'::regclass and t.tgname in ('trg_fill_empresa', 'trg_familia_autor'))
             or (t.tgrelid = 'public.dinheiro_pedido'::regclass
                 and t.tgname in ('trg_fill_empresa', 'trg_dinheiro_pedido_antes', 'trg_dinheiro_pedido_avisa'))));
