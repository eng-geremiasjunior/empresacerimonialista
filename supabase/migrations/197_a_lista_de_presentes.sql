-- ============================================================
-- 197 — A LISTA DE PRESENTES (etapas 2 e 3: a lista e os pagamentos)
-- ============================================================
-- A lista que o casal monta a partir do catálogo pronto (como as listas
-- da Wedy) e que o convidado compra pelo Pix, com o dinheiro dividido
-- pelo split da Pagar.me: a parte do presente vai DIRETO ao recebedor da
-- família (182); o eOrganizei nunca guarda dinheiro de evento.
--
-- Página pública: /c/<endereço-do-site>/presentes, só com o site no ar e
-- a lista publicada.
--
-- 1) evento_lista: as escolhas do casal (quem paga a taxa, a mensagem, se
--    a lista aparece). Uma linha por evento.
-- 2) evento_presente: os itens. Do catálogo (codigo) ou do casal (codigo
--    nulo). Na v1 a foto é SÓ do catálogo — o casal não sobe foto, então
--    a lista não passa pela revisão do dono (a regra dele: o risco é a
--    foto). Item com pagamento nunca é apagado: sai da lista (removido).
-- 3) presente_pagamento: cada presente dado. Escrito SÓ pelo servidor
--    (chave de serviço), depois de conferir o preço no banco — nenhuma
--    policy de escrita. Fica aqui: quem, o recado, o e-mail (para o
--    obrigado), os valores e a origem (o IP do dia embaralhado no
--    servidor, para o freio por pessoa — o IP em si não é guardado); o
--    CPF e o celular do convidado vão direto para a Pagar.me e NÃO são
--    guardados.
-- 4) RPCs: portal_lista (a família que vê presentes lê), portal_salvar_lista
--    (SÓ o casal grava, como o convite e o site; publicar exige a conta que
--    recebe aprovada) e lista_publica (o anônimo; só com o site no ar e a
--    lista publicada; nada de quem deu).
--
-- Quem vê os presentes recebidos: o casal (área 'financeiro' da 189 — é
-- dinheiro do casal), e só os PAGOS, sem o e-mail nem a origem (grant por
-- coluna). A equipe não lê pagamento a pagamento.
--
-- Revisada por 2 céticos em 02/10/2026, depois de aplicada: esta versão
-- é a convergente (rodar de novo por cima da primeira).
--
-- Aditiva e convergente (pode rodar de novo). Termina com a conferência
-- (tudo true).
-- ============================================================

-- ------------------------------------------------------------
-- 0) Pré-condições
-- ------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.familia_pode(uuid, text)') is null
     or to_regprocedure('public.portal_pode(uuid, text)') is null then
    raise exception '197: falta a 189 (familia_pode / portal_pode)';
  end if;
  if to_regprocedure('public.sou_login_vitrine()') is null
     or to_regprocedure('public.vitrine_nao_grava()') is null then
    raise exception '197: falta a 195 (a trava do visitante do catálogo)';
  end if;
  if to_regclass('public.evento_recebedor') is null then
    raise exception '197: falta a 182 (evento_recebedor)';
  end if;
  if to_regprocedure('public.fill_empresa_from_event()') is null then
    raise exception '197: falta a 021 (fill_empresa_from_event)';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) As escolhas do casal
-- ------------------------------------------------------------
create table if not exists public.evento_lista (
  event_id       uuid primary key references public.events (id) on delete cascade,
  empresa_id     uuid references public.empresas (id) on delete cascade,
  -- false (padrão): a taxa vai somada ao preço que o convidado paga;
  -- true: o casal assume e recebe o preço menos a taxa
  taxa_do_casal  boolean not null default false,
  mensagem       text,
  publicada      boolean not null default false,
  atualizado_por uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.evento_lista enable row level security;
revoke all on table public.evento_lista from anon;
revoke insert, update, delete, truncate, references, trigger on table public.evento_lista from authenticated;

do $$
begin
  alter table public.evento_lista drop constraint if exists evento_lista_valores_check;
  alter table public.evento_lista add constraint evento_lista_valores_check
    check (mensagem is null or char_length(mensagem) <= 300);
end $$;

-- ------------------------------------------------------------
-- 2) Os itens
-- ------------------------------------------------------------
create table if not exists public.evento_presente (
  id             uuid primary key,
  event_id       uuid not null references public.events (id) on delete cascade,
  empresa_id     uuid references public.empresas (id) on delete cascade,
  codigo         text,
  categoria      text not null,
  titulo         text not null,
  valor_centavos integer not null,
  quantidade     integer not null default 1,
  ordem          integer not null default 0,
  removido       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_evento_presente_evento on public.evento_presente (event_id, ordem);

alter table public.evento_presente enable row level security;
revoke all on table public.evento_presente from anon;
revoke insert, update, delete, truncate, references, trigger on table public.evento_presente from authenticated;

do $$
begin
  alter table public.evento_presente drop constraint if exists evento_presente_valores_check;
  alter table public.evento_presente add constraint evento_presente_valores_check check (
    (codigo is null or codigo ~ '^[a-z0-9-]{1,60}$')
    and categoria ~ '^[a-z0-9-]{1,40}$'
    and char_length(btrim(titulo)) between 2 and 80
    -- R$ 50 (o mínimo decidido: abaixo disso a divisão da taxa fica negativa) a R$ 50.000
    and valor_centavos between 5000 and 5000000
    and quantidade between 1 and 50
  );
end $$;

-- ------------------------------------------------------------
-- 3) Os pagamentos
-- ------------------------------------------------------------
create table if not exists public.presente_pagamento (
  id                      uuid primary key default gen_random_uuid(),
  event_id                uuid not null references public.events (id) on delete cascade,
  empresa_id              uuid references public.empresas (id) on delete cascade,
  presente_id             uuid references public.evento_presente (id) on delete set null,
  titulo                  text not null,
  valor_presente_centavos integer not null,
  taxa_centavos           integer not null,
  total_centavos          integer not null,
  taxa_do_casal           boolean not null default false,
  quem                    text not null,
  recado                  text,
  email                   text,
  status                  text not null default 'aguardando',
  pagarme_order_id        text unique,
  pagarme_charge_id       text,
  expira_em               timestamptz,
  pago_em                 timestamptz,
  conferido_em            timestamptz,
  origem                  text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- a primeira versão da 197 (aplicada em 02/10/2026) não tinha a origem
alter table public.presente_pagamento add column if not exists origem text;

create index if not exists idx_presente_pagamento_evento on public.presente_pagamento (event_id, status, created_at desc);
create index if not exists idx_presente_pagamento_presente on public.presente_pagamento (presente_id, status);
create index if not exists idx_presente_pagamento_origem on public.presente_pagamento (event_id, origem, created_at desc);

alter table public.presente_pagamento enable row level security;
revoke all on table public.presente_pagamento from anon;
revoke insert, update, delete, truncate, references, trigger on table public.presente_pagamento from authenticated;
-- o casal lê pela API só estas colunas: o e-mail do convidado e a origem
-- ficam com o servidor
revoke select on table public.presente_pagamento from authenticated;
grant select (id, event_id, presente_id, titulo, quem, recado, valor_presente_centavos, taxa_centavos,
              taxa_do_casal, status, pago_em)
  on public.presente_pagamento to authenticated;

do $$
begin
  alter table public.presente_pagamento drop constraint if exists presente_pagamento_valores_check;
  alter table public.presente_pagamento add constraint presente_pagamento_valores_check check (
    status in ('aguardando', 'pago', 'expirado', 'falhou', 'estornado')
    and char_length(btrim(titulo)) between 1 and 80
    and char_length(btrim(quem)) between 2 and 80
    and (recado is null or char_length(recado) <= 500)
    and (email is null or char_length(email) <= 120)
    and (origem is null or char_length(origem) <= 64)
    and valor_presente_centavos > 0
    and taxa_centavos >= 0
    and total_centavos > 0
  );
end $$;

-- ------------------------------------------------------------
-- Gatilhos: a empresa e a trava do visitante do catálogo (195)
-- ------------------------------------------------------------
create or replace trigger trg_fill_empresa before insert on public.evento_lista
  for each row execute function public.fill_empresa_from_event();
create or replace trigger trg_fill_empresa before insert on public.evento_presente
  for each row execute function public.fill_empresa_from_event();
create or replace trigger trg_fill_empresa before insert on public.presente_pagamento
  for each row execute function public.fill_empresa_from_event();

create or replace trigger a0_vitrine_nao_grava
  before insert or update or delete on public.evento_lista
  for each row when (public.sou_login_vitrine())
  execute function public.vitrine_nao_grava();
create or replace trigger a0_vitrine_nao_grava
  before insert or update or delete on public.evento_presente
  for each row when (public.sou_login_vitrine())
  execute function public.vitrine_nao_grava();
create or replace trigger a0_vitrine_nao_grava
  before insert or update or delete on public.presente_pagamento
  for each row when (public.sou_login_vitrine())
  execute function public.vitrine_nao_grava();

-- ------------------------------------------------------------
-- Leitura pela API: só os pagamentos, só o casal (área 'financeiro')
-- ------------------------------------------------------------
-- A lista e os itens são lidos pelas RPCs (nenhuma policy). Os presentes
-- recebidos o casal lê direto (a tela Recebidos), pela regra de nível da
-- 189: 'financeiro' é só do casal. Só os PAGOS: quem gerou o Pix e
-- desistiu não aparece para ninguém.
drop policy if exists presente_pagamento_select on public.presente_pagamento;
create policy presente_pagamento_select on public.presente_pagamento
  for select to authenticated using (status = 'pago' and public.familia_pode(event_id, 'financeiro'));

-- ------------------------------------------------------------
-- 4a) O que está salvo (o editor do portal; a família que vê presentes —
--     a área 'presentes' da 189, fechada ao padrinho — e a equipe)
-- ------------------------------------------------------------
create or replace function public.portal_lista(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case when public.portal_pode(p_event_id, 'presentes') then
    json_build_object(
      'lista', (select json_build_object('taxa_do_casal', l.taxa_do_casal, 'mensagem', l.mensagem,
                                         'publicada', l.publicada, 'updated_at', l.updated_at)
                  from public.evento_lista l where l.event_id = p_event_id),
      'itens', coalesce((
        select json_agg(json_build_object(
                 'id', p.id, 'codigo', p.codigo, 'categoria', p.categoria, 'titulo', p.titulo,
                 'valor_centavos', p.valor_centavos, 'quantidade', p.quantidade, 'ordem', p.ordem,
                 'comprados', (select count(*) from public.presente_pagamento g
                                where g.presente_id = p.id and g.status = 'pago'))
               order by p.ordem, p.created_at)
          from public.evento_presente p
         where p.event_id = p_event_id and not p.removido), '[]'::json))
  end;
$$;

revoke all on function public.portal_lista(uuid) from public, anon;
grant execute on function public.portal_lista(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4b) Gravar a lista inteira (SÓ o casal)
-- ------------------------------------------------------------
-- p_lista: { taxa_do_casal: bool, mensagem: text|null, publicada: bool }
-- p_itens: [{ id: uuid, codigo: text|null, categoria, titulo, valor_centavos, quantidade }]
--   — a lista inteira, na ordem. Item que estava e não veio sai da lista
--   (removido = true): o que já tem pagamento continua ligado a ele.
-- Até 300 itens. Chave fora da lista: erro.
create or replace function public.portal_salvar_lista(p_event_id uuid, p_lista jsonb, p_itens jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_k text;
  v_ordem int := 0;
  v_id uuid;
  v_ids uuid[] := array[]::uuid[];
  v_dono uuid;
begin
  -- o casal: nível 'casal' ('gestao') que escreve ('escrever' barra o
  -- visitante do catálogo); nem a equipe, nem a chave de serviço
  if p_event_id is null
     or not (public.familia_pode(p_event_id, 'gestao')
             and public.familia_pode(p_event_id, 'escrever')) then
    raise exception 'sem permissão';
  end if;

  if p_lista is null or jsonb_typeof(p_lista) <> 'object' then
    raise exception 'lista inválida';
  end if;
  for v_k in select jsonb_object_keys(p_lista) loop
    if v_k not in ('taxa_do_casal', 'mensagem', 'publicada') then
      raise exception 'campo desconhecido na lista: %', v_k;
    end if;
  end loop;
  if jsonb_typeof(coalesce(p_lista -> 'taxa_do_casal', 'false'::jsonb)) <> 'boolean'
     or jsonb_typeof(coalesce(p_lista -> 'publicada', 'false'::jsonb)) <> 'boolean'
     or jsonb_typeof(coalesce(p_lista -> 'mensagem', 'null'::jsonb)) not in ('string', 'null') then
    raise exception 'lista inválida';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'itens inválidos';
  end if;
  if jsonb_array_length(p_itens) > 300 then
    raise exception 'a lista passa de 300 presentes';
  end if;

  -- no ar, só com a conta que recebe aprovada: sem ela, o convidado veria
  -- presentes que não consegue dar (e só a conta da casa cadastra conta)
  if coalesce((p_lista ->> 'publicada')::boolean, false)
     and not exists (select 1 from public.evento_recebedor r
                      where r.event_id = p_event_id and r.status = 'active') then
    raise exception 'conta que recebe não aprovada';
  end if;

  insert into public.evento_lista as l (event_id, taxa_do_casal, mensagem, publicada, atualizado_por, updated_at)
  values (p_event_id,
          coalesce((p_lista ->> 'taxa_do_casal')::boolean, false),
          nullif(btrim(p_lista ->> 'mensagem'), ''),
          coalesce((p_lista ->> 'publicada')::boolean, false),
          auth.uid(), now())
  on conflict (event_id) do update set
    taxa_do_casal = excluded.taxa_do_casal,
    mensagem = excluded.mensagem,
    publicada = excluded.publicada,
    atualizado_por = excluded.atualizado_por,
    updated_at = now();

  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'item inválido';
    end if;
    for v_k in select jsonb_object_keys(v_item) loop
      if v_k not in ('id', 'codigo', 'categoria', 'titulo', 'valor_centavos', 'quantidade') then
        raise exception 'campo desconhecido no presente: %', v_k;
      end if;
    end loop;
    if jsonb_typeof(v_item -> 'id') <> 'string'
       or (v_item ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(v_item -> 'categoria') <> 'string'
       or jsonb_typeof(v_item -> 'titulo') <> 'string'
       or jsonb_typeof(v_item -> 'valor_centavos') <> 'number'
       or jsonb_typeof(coalesce(v_item -> 'quantidade', '1'::jsonb)) <> 'number'
       or jsonb_typeof(coalesce(v_item -> 'codigo', 'null'::jsonb)) not in ('string', 'null') then
      raise exception 'presente inválido';
    end if;
    v_id := (v_item ->> 'id')::uuid;
    if v_id = any (v_ids) then
      raise exception 'presente repetido na lista';
    end if;
    -- o id é de um item DESTE evento, ou novo
    select p.event_id into v_dono from public.evento_presente p where p.id = v_id;
    if v_dono is not null and v_dono <> p_event_id then
      raise exception 'presente de outro evento';
    end if;
    v_ids := array_append(v_ids, v_id);

    insert into public.evento_presente as p (
      id, event_id, codigo, categoria, titulo, valor_centavos, quantidade, ordem, removido, updated_at)
    values (
      v_id, p_event_id,
      nullif(btrim(v_item ->> 'codigo'), ''),
      btrim(v_item ->> 'categoria'),
      btrim(v_item ->> 'titulo'),
      (v_item ->> 'valor_centavos')::numeric::integer,
      coalesce((v_item ->> 'quantidade')::numeric::integer, 1),
      v_ordem, false, now())
    on conflict (id) do update set
      codigo = excluded.codigo,
      categoria = excluded.categoria,
      titulo = excluded.titulo,
      valor_centavos = excluded.valor_centavos,
      quantidade = excluded.quantidade,
      ordem = excluded.ordem,
      removido = false,
      updated_at = now()
    where p.event_id = p_event_id;
    v_ordem := v_ordem + 1;
  end loop;

  -- o que estava e não veio sai da lista (sem apagar: o pagamento continua ligado)
  update public.evento_presente p
     set removido = true, updated_at = now()
   where p.event_id = p_event_id
     and not p.removido
     and not (p.id = any (v_ids));
end;
$$;

revoke all on function public.portal_salvar_lista(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.portal_salvar_lista(uuid, jsonb, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 4c) O convidado (anônimo)
-- ------------------------------------------------------------
-- Pelo endereço do site (atual ou antigo). Site fora do ar ou lista não
-- publicada = nada. Volta só o que a página desenha: os itens, quantos já
-- foram comprados (para o "Presenteado" e o "restam N") e se dá para pagar
-- (recebedor ativo). Nada de quem deu, recado nem e-mail. (Comprados ×
-- valor deixa estimar o total recebido: é o preço de mostrar o que já foi
-- dado, como as outras listas fazem.)
create or replace function public.lista_publica(p_ref text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
           'mensagem', l.mensagem,
           'taxa_do_casal', l.taxa_do_casal,
           'pode_pagar', exists (select 1 from public.evento_recebedor r
                                  where r.event_id = s.event_id and r.status = 'active'),
           'itens', coalesce((
             select json_agg(json_build_object(
                      'id', p.id, 'codigo', p.codigo, 'categoria', p.categoria, 'titulo', p.titulo,
                      'valor_centavos', p.valor_centavos, 'quantidade', p.quantidade,
                      'comprados', (select count(*) from public.presente_pagamento g
                                     where g.presente_id = p.id and g.status = 'pago'))
                    order by p.ordem, p.created_at)
               from public.evento_presente p
              where p.event_id = s.event_id and not p.removido), '[]'::json))
    from public.site_slugs s
    join public.evento_site es on es.event_id = s.event_id and es.publicado
    join public.evento_lista l on l.event_id = s.event_id and l.publicada
   where s.slug = lower(btrim(p_ref))
   limit 1;
$$;

revoke all on function public.lista_publica(text) from public;
grant execute on function public.lista_publica(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Conferência (tudo true)
-- ------------------------------------------------------------
select 'RLS ligada nas três tabelas' as verificacao,
       coalesce((select bool_and(relrowsecurity) and count(*) = 3 from pg_class
                  where oid in ('public.evento_lista'::regclass, 'public.evento_presente'::regclass,
                                'public.presente_pagamento'::regclass)), false) as ok
union all
select 'anon não tem nada nas três',
       not has_table_privilege('anon', 'public.evento_lista', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
       and not has_table_privilege('anon', 'public.evento_presente', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
       and not has_table_privilege('anon', 'public.presente_pagamento', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
union all
select 'ninguém da API grava (só as RPCs e o servidor)',
       not has_table_privilege('authenticated', 'public.evento_lista', 'INSERT, UPDATE, DELETE, TRUNCATE')
       and not has_table_privilege('authenticated', 'public.evento_presente', 'INSERT, UPDATE, DELETE, TRUNCATE')
       and not has_table_privilege('authenticated', 'public.presente_pagamento', 'INSERT, UPDATE, DELETE, TRUNCATE')
union all
select 'o e-mail do convidado e a origem não saem pela API',
       not has_column_privilege('authenticated', 'public.presente_pagamento', 'email', 'select')
       and not has_column_privilege('authenticated', 'public.presente_pagamento', 'origem', 'select')
       and has_column_privilege('authenticated', 'public.presente_pagamento', 'recado', 'select')
union all
select 'a coluna da origem existe',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'presente_pagamento' and column_name = 'origem')
union all
select 'policy só de leitura, e só nos pagamentos',
       coalesce((select count(*) = 1 and bool_and(cmd = 'SELECT' and tablename = 'presente_pagamento')
                   from pg_policies where schemaname = 'public'
                    and tablename in ('evento_lista', 'evento_presente', 'presente_pagamento')), false)
union all
select 'os pagamentos: só os pagos, só para o casal (financeiro), sem "ou"',
       coalesce((select qual like '%familia_pode(event_id, ''financeiro''%'
                        and qual like '%status = ''pago''%'
                        and qual not ilike '% or %'
                   from pg_policies
                  where schemaname = 'public' and tablename = 'presente_pagamento'
                    and policyname = 'presente_pagamento_select'), false)
union all
select 'gatilhos da empresa e da trava do catálogo nas três',
       (select count(*) = 6 from pg_trigger
         where tgname in ('trg_fill_empresa', 'a0_vitrine_nao_grava')
           and tgrelid in ('public.evento_lista'::regclass, 'public.evento_presente'::regclass,
                           'public.presente_pagamento'::regclass))
union all
select 'os CHECKs',
       (select count(*) = 3 from pg_constraint
         where conname in ('evento_lista_valores_check', 'evento_presente_valores_check',
                           'presente_pagamento_valores_check'))
union all
select 'anon não chama o portal',
       not has_function_privilege('anon', 'public.portal_lista(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_lista(uuid, jsonb, jsonb)', 'execute')
union all
select 'quem entra lê e chama o salvar',
       has_function_privilege('authenticated', 'public.portal_lista(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_salvar_lista(uuid, jsonb, jsonb)', 'execute')
union all
select 'anon lê a lista pública',
       has_function_privilege('anon', 'public.lista_publica(text)', 'execute')
union all
select 'salvar: só o casal (sem a equipe), e no ar só com a conta aprovada',
       pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure)
         like '%familia_pode(p_event_id, ''gestao'')%'
       and pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure)
         like '%familia_pode(p_event_id, ''escrever'')%'
       and pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure)
         not like '%pode_editar_evento%'
       and pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure)
         like '%conta que recebe não aprovada%'
union all
select 'ler a lista: a área presentes (o padrinho não vê o rascunho)',
       pg_get_functiondef('public.portal_lista(uuid)'::regprocedure)
         like '%portal_pode(p_event_id, ''presentes'')%'
union all
select 'público: só com o site no ar e a lista publicada, sem quem deu',
       pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%es.publicado%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%l.publicada%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) not like '%quem%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) not like '%email%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) not like '%recado%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) not like '%origem%';
