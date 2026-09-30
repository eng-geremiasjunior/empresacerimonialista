-- ============================================================
-- 188 — O convite para a cerimonialista (30/09/2026)
-- ============================================================
-- A noiva que abriu a conta sozinha (187) manda um link para a
-- cerimonialista dela. EM DOIS PASSOS (decisão dele, depois da revisão):
--   1. a cerimonialista abre o link e PEDE para organizar;
--   2. a noiva vê no portal quem pediu (o nome da empresa) e CONFIRMA —
--      a palavra final é da família. Só então o evento passa para a conta
--      da cerimonialista, com tudo o que a noiva já fez. Se a noiva disser
--      que não é ela, o link é cancelado (um link que vazou morre ali).
-- A noiva continua no portal, como qualquer família de hoje (mão dupla).
--
-- A PASSAGEM, e por que ela é genérica. O evento arrasta ~50 tabelas que
-- guardam a empresa ao lado do evento, e cada migração nova cria mais.
-- Uma lista escrita à mão ficaria velha na próxima; por isso a função lê o
-- catálogo do Postgres na hora:
--   · toda tabela com `event_id` e `empresa_id` troca a empresa das
--     linhas deste evento (menos os três cadastros que só citam o evento);
--   · linhas SEM `event_id` que pendem de uma linha que mudou (filha de
--     filha) mudam junto, rodada a rodada, até não sobrar nenhuma;
--   · o que o evento aponta FORA dele, na conta de família:
--       - cliente e fornecedor → SEMPRE uma cópia na conta dela (nunca
--         casar com o cadastro dela: e-mail e telefone estão na mão da
--         família, e casar misturaria o cadastro de outra pessoa). A
--         cliente leva só nome, telefone, e-mail, WhatsApp e Instagram; o
--         fornecedor, nada de documento, endereço ou banco;
--       - membro da equipe → quem aceitou; coluna de autoria ("…_por")
--         fica vazia (o fato histórico não vira de outra pessoa);
--       - objetivo, decisão e checklist do método → o de mesmo código (e
--         tipo de evento) na conta dela, se houver exatamente um; campo,
--         item e tarefa do método → pela decisão/objetivo já religados;
--       - qualquer outro cadastro → vazio; coluna obrigatória faz a
--         passagem PARAR (melhor recusar do que apontar para a conta de
--         outra pessoa) — é o caso do estoque.
--
-- O que fica de fora, anotado (a família não cria nada disso hoje):
-- fornecedor citado por tabela sem event_id (decisao_opcao, guia), o
-- `dinheiro_pedido`, cujo gatilho segura o fornecedor antigo (178), e os
-- arquivos do balde `contratos`, que moram na pasta da EMPRESA (os de
-- planejamento, comprovantes e mídia do convite moram na pasta do evento
-- e acompanham sozinhos).
--
-- Aditiva e convergente. Termina com a conferência (tudo true).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) De carona: o histórico do financeiro (167)
-- ------------------------------------------------------------
-- a) `registrar_financeiro` estava aberta a qualquer login: gravava linha
--    no histórico de qualquer evento. Quem chama são os gatilhos da 167
--    (security definer), então a sessão não precisa dela.
revoke execute on function public.registrar_financeiro(uuid, text, text, text, uuid, uuid, numeric)
  from authenticated;
-- b) O histórico continua sem aceitar alteração — a não ser trocar a
--    conta dona da linha, que é o que a passagem faz (não há policy de
--    UPDATE nessa tabela: só o banco chega aqui).
create or replace function public.trg_financeiro_registro_imutavel()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'empresa_id') = (to_jsonb(old) - 'empresa_id') then
    return new;
  end if;
  raise exception 'o histórico do financeiro não aceita alteração';
end $$;

-- ------------------------------------------------------------
-- 1) O convite
-- ------------------------------------------------------------
create table if not exists public.convite_cerimonialista (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  empresa_origem  uuid not null references public.empresas (id) on delete cascade,
  -- o link (…/convite-cerimonialista/<token>) é a credencial, como o
  -- hash da proposta: 64 hex, gen_random_uuid duplo (padrão da casa)
  token           text not null unique,
  criado_por      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  expira_em       timestamptz not null default now() + interval '30 days',
  -- o pedido da cerimonialista, esperando a família
  pedido_em       timestamptz,
  pedido_por      uuid references auth.users (id) on delete set null,
  pedido_empresa  uuid references public.empresas (id) on delete set null,
  cancelado_em    timestamptz,
  aceito_em       timestamptz,
  aceito_por      uuid references auth.users (id) on delete set null,
  empresa_destino uuid references public.empresas (id) on delete set null
);

create unique index if not exists convite_cerimonialista_um_aberto
  on public.convite_cerimonialista (event_id)
  where aceito_em is null and cancelado_em is null;

-- Sem policy nenhuma: só as funções abaixo leem e escrevem.
alter table public.convite_cerimonialista enable row level security;

-- ------------------------------------------------------------
-- 2) A noiva: o link, e o pedido que chegou
-- ------------------------------------------------------------
-- A conta de família do evento, se quem chama é a dona dela; senão null.
create or replace function public.dona_da_familia_do_evento(p_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.empresa_id
    from public.events e
    join public.empresas emp on emp.id = e.empresa_id
   where e.id = p_event_id
     and emp.tipo = 'familia'
     and emp.owner_user_id = auth.uid();
$$;

revoke all on function public.dona_da_familia_do_evento(uuid) from public, anon, authenticated;

-- Só lê: o link em aberto (se ainda vale) e o pedido que espera resposta.
-- Abrir a tela não cria convite.
create or replace function public.familia_convite_estado(p_event_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conv public.convite_cerimonialista%rowtype;
begin
  if public.dona_da_familia_do_evento(p_event_id) is null then
    return null;
  end if;
  select * into v_conv
    from public.convite_cerimonialista
   where event_id = p_event_id and aceito_em is null and cancelado_em is null;
  if not found then
    return json_build_object('token', null, 'pedido', null);
  end if;
  return json_build_object(
    'token', case when v_conv.expira_em > now() or v_conv.pedido_em is not null then v_conv.token end,
    'expira_em', v_conv.expira_em,
    'pedido', case when v_conv.pedido_em is null then null else json_build_object(
      'empresa', (select nome from public.empresas where id = v_conv.pedido_empresa),
      'quem', (select split_part(trim(m.nome), ' ', 1) from public.membros_equipe m
                where m.user_id = v_conv.pedido_por and m.empresa_id = v_conv.pedido_empresa limit 1),
      'em', v_conv.pedido_em) end
  );
end $$;

revoke all on function public.familia_convite_estado(uuid) from public, anon;
grant execute on function public.familia_convite_estado(uuid) to authenticated;

-- Pega o link (cria se não houver um valendo). `p_novo` cancela o que
-- houver — inclusive um pedido esperando — e gera outro.
create or replace function public.familia_convite_cerimonialista(
  p_event_id uuid,
  p_novo     boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := public.dona_da_familia_do_evento(p_event_id);
  v_conv    public.convite_cerimonialista%rowtype;
begin
  if v_empresa is null then
    raise exception 'este evento não é da sua conta';
  end if;

  if p_novo then
    update public.convite_cerimonialista
       set cancelado_em = now()
     where event_id = p_event_id and aceito_em is null and cancelado_em is null;
  end if;

  select * into v_conv
    from public.convite_cerimonialista
   where event_id = p_event_id and aceito_em is null and cancelado_em is null
   for update;

  if not found or (v_conv.expira_em < now() and v_conv.pedido_em is null) then
    update public.convite_cerimonialista
       set cancelado_em = now()
     where event_id = p_event_id and aceito_em is null and cancelado_em is null;
    insert into public.convite_cerimonialista (event_id, empresa_origem, token, criado_por)
    values (
      p_event_id, v_empresa,
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      auth.uid()
    )
    returning * into v_conv;
  end if;

  return json_build_object('token', v_conv.token, 'expira_em', v_conv.expira_em);
end $$;

revoke all on function public.familia_convite_cerimonialista(uuid, boolean) from public, anon;
grant execute on function public.familia_convite_cerimonialista(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 3) A página do convite (quem tem o link)
-- ------------------------------------------------------------
-- Com o convite em aberto: a festa, a data, a cidade e o primeiro nome de
-- quem convida — nada de contato nem valor. Fora disso, só o estado: um
-- link cancelado (vazou) ou já usado não mostra mais o evento.
create or replace function public.convite_cerimonialista_publico(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conv   public.convite_cerimonialista%rowtype;
  v_ev     record;
  v_estado text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_conv from public.convite_cerimonialista where token = p_token;
  if not found then
    return null;
  end if;

  v_estado := case
    when v_conv.aceito_em is not null then 'aceito'
    when v_conv.cancelado_em is not null then 'cancelado'
    when v_conv.pedido_em is not null then 'pedido'
    when v_conv.expira_em < now() then 'expirado'
    else 'aberto'
  end;
  if v_estado <> 'aberto' then
    return json_build_object('estado', v_estado);
  end if;

  select e.type::text as tipo, e.name, e.date, e.city into v_ev
    from public.events e where e.id = v_conv.event_id;

  return json_build_object(
    'estado', v_estado,
    'tipo', v_ev.tipo,
    'festa', v_ev.name,
    'data', v_ev.date,
    'cidade', v_ev.city,
    'quem', (select split_part(trim(m.nome), ' ', 1) from public.membros_equipe m
              where m.user_id = v_conv.criado_por and m.empresa_id = v_conv.empresa_origem limit 1)
  );
end $$;

revoke all on function public.convite_cerimonialista_publico(text) from public;
grant execute on function public.convite_cerimonialista_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) O teto do plano, com a mensagem certa (molde da 147)
-- ------------------------------------------------------------
create or replace function public.conferir_vaga_para_o_evento(p_empresa uuid, p_para_a_familia boolean)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.pode_criar_evento(p_empresa) then
    return;
  end if;
  if p_para_a_familia then
    raise exception 'plano_da_cerimonialista_no_limite'
      using hint = 'A agenda da cerimonialista está no limite do plano dela. Peça para ela ajustar o plano e confirme de novo.';
  end if;
  if exists (select 1 from public.assinaturas a
              where a.empresa_id = p_empresa
                and a.status in ('ativa', 'inadimplente', 'pausada')) then
    raise exception 'plano_no_limite'
      using hint = 'Sua agenda chegou ao teto do plano. Mude de plano para receber este evento.';
  end if;
  raise exception 'plano_gratuito_no_limite'
    using hint = 'O primeiro evento é por nossa conta. Para receber este, ative a assinatura.';
end $$;

revoke all on function public.conferir_vaga_para_o_evento(uuid, boolean) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 5) A passagem do evento (interna)
-- ------------------------------------------------------------
-- Uma tabela PENDE DO EVENTO quando é o próprio events, tem event_id, ou
-- aponta (FK) para events ou para uma tabela com event_id. É o que separa
-- "linha do evento, que viaja junto" de "cadastro da conta, que ganha o
-- equivalente do outro lado" (cliente, fornecedor, modelo do método).
create or replace function public.tabela_pende_do_evento(p_tabela regclass)
returns boolean
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$
  select p_tabela = 'public.events'::regclass
      or exists (select 1 from pg_attribute x
                  where x.attrelid = p_tabela and x.attname = 'event_id' and not x.attisdropped)
      or exists (
        select 1 from pg_constraint c
         where c.conrelid = p_tabela
           and c.contype = 'f'
           and (c.confrelid = 'public.events'::regclass
                or exists (select 1 from pg_attribute x
                            where x.attrelid = c.confrelid and x.attname = 'event_id' and not x.attisdropped)));
$$;

revoke all on function public.tabela_pende_do_evento(regclass) from public, anon, authenticated;

create or replace function public.transferir_evento_de_familia(
  p_event_id uuid,
  p_destino  uuid,
  p_user     uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_origem  uuid;
  v_membro  uuid;
  v_novo    uuid;
  v_cols    text;
  v_n       int;
  v_linhas  bigint;
  v_rodada  int := 0;
  -- cadastros que só CITAM o evento (de onde vieram): ficam na conta de família
  v_ficam   oid[] := array_remove(array[
                       to_regclass('public.metodo_modelo_salvo')::oid,
                       to_regclass('public.extrato_importacao')::oid,
                       to_regclass('public.estoque_movimento')::oid], null);
  v_campo   regclass := to_regclass('public.metodo_campo');
  v_recurso regclass := to_regclass('public.metodo_recurso');
  v_estoque regclass := to_regclass('public.estoque_item');
  r         record;
  m         record;
begin
  select e.empresa_id into v_origem from public.events e where e.id = p_event_id for update;
  if v_origem is null
     or not exists (select 1 from public.empresas where id = v_origem and tipo = 'familia') then
    raise exception 'o evento não está numa conta de família';
  end if;
  if not exists (select 1 from public.empresas where id = p_destino and tipo = 'cerimonial') then
    raise exception 'o destino não é uma conta de cerimonial';
  end if;
  select mb.id into v_membro
    from public.membros_equipe mb
   where mb.empresa_id = p_destino and mb.user_id = p_user and mb.status = 'ativo'
   limit 1;
  if v_membro is null then
    raise exception 'quem aceita não é da equipe do destino';
  end if;

  create temp table if not exists _passagem_mapa (tabela regclass, velho uuid, novo uuid) on commit drop;
  truncate _passagem_mapa;

  -- as colunas que apontam para CADASTRO da conta (tem empresa e não pende
  -- do evento), a partir de tabela do evento (tem event_id, ou é events).
  -- FK de uma coluna só: as de várias colunas ficam dentro do evento.
  create temp table if not exists _passagem_fk (
    tabela regclass, coluna name, alvo regclass, obrigatoria boolean, do_evento boolean
  ) on commit drop;
  truncate _passagem_fk;
  insert into _passagem_fk
  select c.conrelid::regclass, a.attname, c.confrelid::regclass, a.attnotnull,
         c.conrelid = 'public.events'::regclass
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
   where c.contype = 'f'
     and array_length(c.conkey, 1) = 1
     and c.connamespace = 'public'::regnamespace
     and (select relnamespace from pg_class where oid = c.confrelid) = 'public'::regnamespace
     and c.confrelid <> 'public.empresas'::regclass
     and not public.tabela_pende_do_evento(c.confrelid::regclass)
     and exists (select 1 from pg_attribute x
                  where x.attrelid = c.confrelid and x.attname = 'empresa_id' and not x.attisdropped)
     and (c.conrelid = 'public.events'::regclass
          or exists (select 1 from pg_attribute x
                      where x.attrelid = c.conrelid and x.attname = 'event_id' and not x.attisdropped));

  -- a) CLIENTES e FORNECEDORES que o evento usa: sempre uma cópia
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'suppliers'
     and column_name not in ('id', 'empresa_id', 'cerimonialista_id', 'created_at', 'updated_at',
                             'cpf', 'cnpj', 'documento', 'endereco', 'cep', 'pix', 'pix_chave',
                             'chave_pix', 'banco', 'agencia', 'conta', 'dados_bancarios')
     and is_generated = 'NEVER'
     and coalesce(is_identity, 'NO') = 'NO';
  for m in select * from _passagem_fk
            where alvo in ('public.clients'::regclass, 'public.suppliers'::regclass) loop
    for r in execute format(
      'select distinct s.id from %s s join %s t on t.%I = s.id where s.empresa_id = $1 and %s',
      m.alvo, m.tabela, m.coluna,
      case when m.do_evento then 't.id = $2' else 't.event_id = $2' end)
      using v_origem, p_event_id
    loop
      continue when exists (select 1 from _passagem_mapa where velho = r.id);
      if m.alvo = 'public.clients'::regclass then
        insert into public.clients (cerimonialista_id, empresa_id, name, phone, email, whatsapp, instagram)
        select p_user, p_destino, cl.name, cl.phone, cl.email, cl.whatsapp, cl.instagram
          from public.clients cl where cl.id = r.id
        returning id into v_novo;
      else
        execute format(
          'insert into public.suppliers (%s, empresa_id, cerimonialista_id)
           select %s, $1, $2 from public.suppliers where id = $3 returning id', v_cols, v_cols)
          into v_novo using p_destino, p_user, r.id;
      end if;
      insert into _passagem_mapa values (m.alvo, r.id, v_novo);
    end loop;
  end loop;

  -- b) cada coluna que aponta para fora do evento, na conta de família
  for m in select * from _passagem_fk loop
    if m.alvo in ('public.clients'::regclass, 'public.suppliers'::regclass) then
      execute format(
        'update %s t set %I = mp.novo from _passagem_mapa mp where mp.velho = t.%I and %s',
        m.tabela, m.coluna, m.coluna,
        case when m.do_evento then 't.id = $1' else 't.event_id = $1' end)
        using p_event_id;
    elsif m.alvo = 'public.membros_equipe'::regclass then
      -- autoria ("conferido_por", "criado_por"…) não vira de outra pessoa
      execute format(
        'update %s t set %I = %s
          where %s and t.%I in (select id from public.membros_equipe where empresa_id = $3)',
        m.tabela, m.coluna,
        case when m.coluna::text like '%\_por' and not m.obrigatoria then 'null' else '$2' end,
        case when m.do_evento then 't.id = $1' else 't.event_id = $1' end, m.coluna)
        using p_event_id, v_membro, v_origem;
    elsif m.alvo is not distinct from v_campo or m.alvo is not distinct from v_recurso then
      null;  -- religados depois, pela decisão e pelo objetivo (o código repete)
    elsif m.alvo is distinct from v_estoque
          and exists (select 1 from pg_attribute x
                       where x.attrelid = m.alvo and x.attname = 'codigo' and not x.attisdropped) then
      -- objetivo, decisão, checklist do método: o de mesmo código (e tipo
      -- de evento) na conta dela, se houver exatamente um; senão vazio
      execute format(
        'update %1$s t set %2$I = (
            select case when count(*) = 1 then min(d.id::text)::uuid end
              from %3$s d join %3$s o on o.id = t.%2$I
             where d.empresa_id = $2 and d.codigo = o.codigo %4$s)
          where %5$s and t.%2$I in (select id from %3$s where empresa_id = $3)',
        m.tabela, m.coluna, m.alvo,
        case when exists (select 1 from pg_attribute x
                           where x.attrelid = m.alvo and x.attname = 'tipo_evento' and not x.attisdropped)
             then 'and d.tipo_evento = o.tipo_evento' else '' end,
        case when m.do_evento then 't.id = $1' else 't.event_id = $1' end)
        using p_event_id, p_destino, v_origem;
    else
      -- qualquer outro cadastro: vazio. A coluna obrigatória faz o update
      -- falhar e a passagem para inteira, com o nome da tabela no erro.
      execute format(
        'update %s t set %I = null where %s and t.%I in (select id from %s where empresa_id = $2)',
        m.tabela, m.coluna,
        case when m.do_evento then 't.id = $1' else 't.event_id = $1' end,
        m.coluna, m.alvo)
        using p_event_id, v_origem;
    end if;
  end loop;

  -- c) campo, item e tarefa do método: pela decisão/objetivo já religados
  if v_campo is not null then
    update public.evento_campo_valor c
       set campo_template_id = (
             select mc.id from public.evento_decisao ed
               join public.metodo_campo mc on mc.decisao_id = ed.decisao_template_id and mc.codigo = c.codigo
              where ed.id = c.evento_decisao_id)
     where c.event_id = p_event_id;
  end if;
  if v_recurso is not null then
    update public.evento_recurso rr
       set recurso_template_id = (
             select mr.id from public.evento_objetivo eo
               join public.metodo_recurso mr on mr.objetivo_id = eo.objetivo_template_id and mr.codigo = rr.codigo
              where eo.id = rr.evento_objetivo_id)
     where rr.event_id = p_event_id;
  end if;
  -- a tarefa-modelo não tem FK (066): pelo título, dentro da decisão; sem
  -- par único, vazio (vazio nunca colide com o índice único)
  update public.tasks t
     set metodo_tarefa_id = (
           select case when count(*) = 1 then min(mt.id::text)::uuid end
             from public.evento_decisao ed
             join public.metodo_tarefa mo on mo.id = t.metodo_tarefa_id
             join public.metodo_tarefa mt on mt.decisao_id = ed.decisao_template_id
                                         and lower(btrim(mt.titulo)) = lower(btrim(mo.titulo))
            where ed.id = t.evento_decisao_id)
   where t.event_id = p_event_id and t.metodo_tarefa_id is not null;

  -- d) toda tabela com event_id e empresa_id: a conta dona das linhas
  for r in
    select c.oid::regclass as tabela
      from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p')
       and c.oid <> 'public.events'::regclass
       and c.oid <> all (v_ficam)
       and exists (select 1 from pg_attribute x where x.attrelid = c.oid and x.attname = 'event_id' and not x.attisdropped)
       and exists (select 1 from pg_attribute x where x.attrelid = c.oid and x.attname = 'empresa_id' and not x.attisdropped)
  loop
    execute format('update %s set empresa_id = $1 where event_id = $2 and empresa_id is distinct from $1', r.tabela)
      using p_destino, p_event_id;
  end loop;

  update public.events
     set empresa_id = p_destino,
         cerimonialista_id = p_user,
         cerimonialista_responsavel_id = v_membro
   where id = p_event_id;

  -- e) filhas de filhas: linha SEM event_id, ainda na conta de família,
  --    que pende de uma linha que já mudou — rodada a rodada
  loop
    v_rodada := v_rodada + 1;
    v_n := 0;
    for r in
      select c.conrelid::regclass as tabela, a.attname as coluna, c.confrelid::regclass as alvo,
             exists (select 1 from pg_attribute x
                      where x.attrelid = c.confrelid and x.attname = 'event_id' and not x.attisdropped) as alvo_tem_evento
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
       where c.contype = 'f'
         and array_length(c.conkey, 1) = 1
         and c.connamespace = 'public'::regnamespace
         and (select relnamespace from pg_class where oid = c.confrelid) = 'public'::regnamespace
         and c.conrelid not in ('public.events'::regclass, 'public.empresas'::regclass,
                                'public.membros_equipe'::regclass, 'public.clients'::regclass,
                                'public.suppliers'::regclass)
         and c.conrelid <> all (v_ficam)
         and not exists (select 1 from pg_attribute x where x.attrelid = c.conrelid and x.attname = 'event_id' and not x.attisdropped)
         and exists (select 1 from pg_attribute x where x.attrelid = c.conrelid and x.attname = 'empresa_id' and not x.attisdropped)
         and public.tabela_pende_do_evento(c.confrelid::regclass)
         and (c.confrelid = 'public.events'::regclass
              or exists (select 1 from pg_attribute x where x.attrelid = c.confrelid and x.attname = 'event_id' and not x.attisdropped)
              or exists (select 1 from pg_attribute x where x.attrelid = c.confrelid and x.attname = 'empresa_id' and not x.attisdropped))
    loop
      execute format(
        'update %1$s t set empresa_id = $1
          where t.empresa_id = $2
            and t.%2$I in (select p.id from %3$s p where %4$s)',
        r.tabela, r.coluna, r.alvo,
        case when r.alvo = 'public.events'::regclass then 'p.id = $3'
             when r.alvo_tem_evento then 'p.event_id = $3'
             -- neta: a mãe (sem event_id) já passou para o destino
             else 'p.empresa_id = $1' end)
        using p_destino, v_origem, p_event_id;
      get diagnostics v_linhas = row_count;
      v_n := v_n + v_linhas::int;
    end loop;
    exit when v_n = 0 or v_rodada >= 6;
  end loop;

  -- f) o histórico não ganha linhas falsas: o que os gatilhos anotaram
  --    DURANTE a passagem (a troca de cliente, por exemplo) não é mudança
  --    que alguém fez. now() é o instante da transação: pega só essas.
  delete from public.activities where event_id = p_event_id and created_at = now();

  -- g) o Google Agenda dela recebe o evento (o gatilho da 168 não olha
  --    a troca de conta)
  if public.google_agenda_empresa_conectada(p_destino) then
    insert into public.google_agenda_fila (empresa_id, origem, origem_id, acao)
    values (p_destino, 'evento', p_event_id, 'gravar');
  end if;
end $$;

revoke all on function public.transferir_evento_de_familia(uuid, uuid, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 6) A cerimonialista pede para organizar
-- ------------------------------------------------------------
-- Dona ou coordenadora de uma conta de cerimonial. O evento vai contar no
-- plano dela: o teto é conferido aqui (e de novo na confirmação).
create or replace function public.pedir_para_organizar(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv    public.convite_cerimonialista%rowtype;
  v_empresa uuid;
  v_cargo   text;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  select mc.empresa_id, mc.cargo into v_empresa, v_cargo from public.meu_cargo() mc limit 1;
  if v_empresa is null
     or not exists (select 1 from public.empresas where id = v_empresa and tipo = 'cerimonial') then
    raise exception 'convite_so_para_cerimonialista'
      using hint = 'Este convite é para a cerimonialista: entre com a conta do seu negócio.';
  end if;
  if v_cargo not in ('proprietaria', 'coordenadora') then
    raise exception 'convite_so_dona'
      using hint = 'Quem aceita o convite é a dona ou a coordenadora da conta.';
  end if;

  select * into v_conv from public.convite_cerimonialista where token = p_token for update;
  if not found or v_conv.cancelado_em is not null then
    raise exception 'convite_invalido' using hint = 'Este convite não vale mais. Peça um link novo à família.';
  end if;
  if v_conv.aceito_em is not null then
    raise exception 'convite_ja_aceito' using hint = 'Este convite já foi usado.';
  end if;
  if v_conv.pedido_em is not null then
    if v_conv.pedido_empresa = v_empresa then
      return json_build_object('estado', 'pedido');  -- pedir de novo: nada muda
    end if;
    raise exception 'convite_ocupado' using hint = 'Este convite já espera a resposta da família.';
  end if;
  if v_conv.expira_em < now() then
    raise exception 'convite_expirado' using hint = 'Este convite venceu. Peça um link novo à família.';
  end if;
  if not exists (select 1 from public.events e
                   join public.empresas emp on emp.id = e.empresa_id
                  where e.id = v_conv.event_id and emp.id = v_conv.empresa_origem and emp.tipo = 'familia') then
    raise exception 'convite_invalido' using hint = 'Este evento já tem cerimonialista.';
  end if;
  perform public.conferir_vaga_para_o_evento(v_empresa, false);

  update public.convite_cerimonialista
     set pedido_em = now(), pedido_por = auth.uid(), pedido_empresa = v_empresa
   where id = v_conv.id;

  return json_build_object('estado', 'pedido');
end $$;

revoke all on function public.pedir_para_organizar(text) from public, anon;
grant execute on function public.pedir_para_organizar(text) to authenticated;

-- ------------------------------------------------------------
-- 7) A família confirma (ou diz que não é ela)
-- ------------------------------------------------------------
create or replace function public.familia_responder_pedido(p_event_id uuid, p_confirmar boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv  public.convite_cerimonialista%rowtype;
  v_festa text;
begin
  if public.dona_da_familia_do_evento(p_event_id) is null then
    raise exception 'este evento não é da sua conta';
  end if;
  select * into v_conv
    from public.convite_cerimonialista
   where event_id = p_event_id and aceito_em is null and cancelado_em is null
     and pedido_em is not null
   for update;
  if not found then
    raise exception 'sem_pedido' using hint = 'Não há pedido esperando resposta.';
  end if;
  select name into v_festa from public.events where id = p_event_id;

  if not coalesce(p_confirmar, false) then
    -- não é ela: o link morre junto (se vazou, para de valer)
    update public.convite_cerimonialista set cancelado_em = now() where id = v_conv.id;
    if v_conv.pedido_por is not null then
      insert into public.notifications (cerimonialista_id, type, title, message, link)
      values (v_conv.pedido_por, 'evento', 'A família não confirmou',
              format('O pedido para organizar %s não foi confirmado.', coalesce(v_festa, 'a festa')),
              '/eventos');
    end if;
    return json_build_object('estado', 'recusado');
  end if;

  -- quem pediu ainda é dona ou coordenadora ativa daquela conta?
  if v_conv.pedido_por is null or v_conv.pedido_empresa is null
     or not exists (select 1 from public.membros_equipe m
                     join public.empresas emp on emp.id = m.empresa_id and emp.tipo = 'cerimonial'
                    where m.user_id = v_conv.pedido_por and m.empresa_id = v_conv.pedido_empresa
                      and m.status = 'ativo' and m.cargo in ('proprietaria', 'coordenadora')) then
    raise exception 'pedido_sem_dona' using hint = 'Quem pediu não está mais na conta. Mande um link novo.';
  end if;
  perform public.conferir_vaga_para_o_evento(v_conv.pedido_empresa, true);

  perform public.transferir_evento_de_familia(p_event_id, v_conv.pedido_empresa, v_conv.pedido_por);

  update public.convite_cerimonialista
     set aceito_em = now(), aceito_por = v_conv.pedido_por, empresa_destino = v_conv.pedido_empresa
   where id = v_conv.id;

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (v_conv.pedido_por, 'evento', 'A família confirmou',
          format('%s está na sua agenda, com o que a família já tinha feito.', coalesce(v_festa, 'O evento')),
          '/eventos/' || p_event_id);

  return json_build_object('estado', 'aceito', 'evento_id', p_event_id);
end $$;

revoke all on function public.familia_responder_pedido(uuid, boolean) from public, anon;
grant execute on function public.familia_responder_pedido(uuid, boolean) to authenticated;

-- a versão de um passo só (antes da revisão) nunca foi aplicada; se foi,
-- sai
drop function if exists public.aceitar_convite_cerimonialista(text);

commit;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'a tabela do convite tem RLS' as item,
       (select relrowsecurity from pg_class where oid = 'public.convite_cerimonialista'::regclass) as ok
union all
select 'a tabela do convite não tem policy (só as funções)',
       not exists (select 1 from pg_policies where tablename = 'convite_cerimonialista')
union all
select 'ninguém chama a passagem direto',
       not has_function_privilege('authenticated', 'public.transferir_evento_de_familia(uuid, uuid, uuid)', 'execute')
       and not has_function_privilege('anon', 'public.transferir_evento_de_familia(uuid, uuid, uuid)', 'execute')
union all
select 'ninguém chama as peças internas direto',
       not has_function_privilege('authenticated', 'public.tabela_pende_do_evento(regclass)', 'execute')
       and not has_function_privilege('authenticated', 'public.dona_da_familia_do_evento(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.conferir_vaga_para_o_evento(uuid, boolean)', 'execute')
union all
select 'anon não gera convite nem pede nem responde',
       not has_function_privilege('anon', 'public.familia_convite_cerimonialista(uuid, boolean)', 'execute')
       and not has_function_privilege('anon', 'public.pedir_para_organizar(text)', 'execute')
       and not has_function_privilege('anon', 'public.familia_responder_pedido(uuid, boolean)', 'execute')
union all
select 'quem tem o link lê o convite',
       has_function_privilege('anon', 'public.convite_cerimonialista_publico(text)', 'execute')
union all
select 'o convite público não devolve contato nem valor',
       (select prosrc from pg_proc where oid = 'public.convite_cerimonialista_publico(text)'::regprocedure)
         !~* '(email|phone|whatsapp|contract_value|valor)'
union all
select 'a versão de um passo só não existe',
       to_regprocedure('public.aceitar_convite_cerimonialista(text)') is null
union all
select 'o registro financeiro não é mais porta aberta',
       not has_function_privilege('authenticated',
         'public.registrar_financeiro(uuid, text, text, text, uuid, uuid, numeric)', 'execute')
union all
select 'a tarefa pende do evento; o modelo do método e a cliente, não',
       public.tabela_pende_do_evento('public.tasks'::regclass)
       and not public.tabela_pende_do_evento('public.metodo_objetivo'::regclass)
       and not public.tabela_pende_do_evento('public.clients'::regclass)
       and not public.tabela_pende_do_evento('public.suppliers'::regclass)
union all
select 'a cliente tem as colunas que a passagem copia',
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'clients'
           and column_name in ('name', 'phone', 'email', 'whatsapp', 'instagram', 'empresa_id')) = 6;
