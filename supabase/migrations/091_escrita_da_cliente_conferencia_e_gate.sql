-- ============================================================
-- Vela — Migração 091: a cliente escreve, a cerimonialista confere
--
-- Esta é a migração que muda o CAMINHO DE ESCRITA de um campo do
-- método — o mesmo caminho que a cerimonialista já usa no Planejamento.
-- Ela sobe SOZINHA de propósito: se algo quebrar depois de aplicá-la, o
-- suspeito é um só.
--
-- O QUE ENTRA
--
-- 1) Escrita por RPC, nunca por policy de UPDATE. O portal não ganha
--    permissão de escrever na tabela: ganha uma porta estreita, que
--    valida tudo no servidor. Motivo: uma policy de UPDATE precisaria
--    confiar no que o cliente manda (tipo, coluna, valor). A RPC deriva
--    tudo da linha.
--
-- 2) Trava otimista de verdade. Hoje o sistema é last-write-wins: duas
--    pessoas no mesmo evento se sobrescrevem em silêncio. A partir daqui
--    quem grava manda o updated_at que viu; se a linha mudou, a RPC
--    devolve o valor novo em vez de gravar por cima.
--
-- 3) Auditoria. Nenhuma escrita do sistema guardava quem/quando/valor
--    anterior. evento_campo_escrita é append-only e só a RPC escreve
--    nela (mesmo padrão de roteiro_item_log, 031).
--
-- 4) Conferência por BLOCO. O campo que a cliente responde nasce
--    aguardando conferência; a cerimonialista confere a decisão inteira
--    num gesto. Conferir NÃO decide: decidir gera tarefas e mexe no
--    financeiro (083), e isso continua sendo um ato separado dela.
--
-- 5) Classe de sensibilidade no campo. Alergia e medicamento existem no
--    modelo ANTES de qualquer campo sensível ser semeado, para o gate de
--    saída nascer junto — e não depois do dado.
--
-- CONVERGENTE: pode ser reexecutada. Sem tabela temporária (o pooler do
-- Supabase troca de conexão entre statements — lição da 090).
--
-- Execute no SQL Editor do Supabase (depois da 090).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Estado de conferência e classe de sensibilidade
-- ------------------------------------------------------------

alter table public.evento_campo_valor
  add column if not exists aguarda_conferencia boolean not null default false;

comment on column public.evento_campo_valor.aguarda_conferencia is
  'A cliente escreveu e a cerimonialista ainda não conferiu. Enquanto true, o valor NÃO sai do sistema (IA, impresso, disparo).';

alter table public.metodo_campo
  add column if not exists sensibilidade text not null default 'normal';
alter table public.evento_campo_valor
  add column if not exists sensibilidade text not null default 'normal';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'metodo_campo_sensibilidade_check') then
    alter table public.metodo_campo add constraint metodo_campo_sensibilidade_check
      check (sensibilidade in ('normal', 'alergia', 'medicamento'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evento_campo_valor_sensibilidade_check') then
    alter table public.evento_campo_valor add constraint evento_campo_valor_sensibilidade_check
      check (sensibilidade in ('normal', 'alergia', 'medicamento'));
  end if;
end $$;

comment on column public.evento_campo_valor.sensibilidade is
  'normal | alergia | medicamento. Nada além de normal vai para a IA, impresso geral ou link público. Alergia pode ser compartilhada com UM fornecedor por ato explícito.';

-- O campo novo herda as duas marcas do template (mesmo gatilho da 090,
-- estendido — a função é recriada com as colunas novas).
create or replace function public.trg_campo_herda_pergunta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.campo_template_id is not null then
    select
      case when new.pergunta_cliente then new.pergunta_cliente else c.pergunta_cliente end,
      coalesce(new.label_portal, c.label_portal),
      case when new.sensibilidade <> 'normal' then new.sensibilidade else c.sensibilidade end
    into new.pergunta_cliente, new.label_portal, new.sensibilidade
    from public.metodo_campo c
    where c.id = new.campo_template_id;
  end if;

  -- campo próprio (sem template) nunca nasce como pergunta: quem decide
  -- que uma pergunta nova vai ao portal é a cerimonialista, na tela.
  new.pergunta_cliente := coalesce(new.pergunta_cliente, false);
  new.sensibilidade    := coalesce(new.sensibilidade, 'normal');
  return new;
end $$;

drop trigger if exists trg_campo_herda_pergunta on public.evento_campo_valor;
create trigger trg_campo_herda_pergunta
  before insert on public.evento_campo_valor
  for each row execute function public.trg_campo_herda_pergunta();

-- ------------------------------------------------------------
-- 2) A auditoria
-- ------------------------------------------------------------
-- Append-only: sem policy de INSERT/UPDATE/DELETE. Só as funções
-- SECURITY DEFINER abaixo escrevem — o mesmo desenho de
-- roteiro_item_log (031), que já provou funcionar com dois canais
-- (fornecedor e cerimonialista) escrevendo no mesmo histórico.
create table if not exists public.evento_campo_escrita (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events (id) on delete cascade,
  -- nulo no marco de conferência: ele é do BLOCO, não de um campo
  campo_id          uuid references public.evento_campo_valor (id) on delete set null,
  evento_decisao_id uuid references public.evento_decisao (id) on delete cascade,
  autor_user_id     uuid references auth.users (id) on delete set null,
  origem            text not null check (origem in ('cliente', 'equipe', 'conferencia')),
  campo_label       text,
  valor_anterior    text,
  valor_novo        text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_campo_escrita_evento
  on public.evento_campo_escrita (event_id, created_at desc);
create index if not exists idx_campo_escrita_decisao
  on public.evento_campo_escrita (evento_decisao_id, created_at desc);

comment on table public.evento_campo_escrita is
  'Quem escreveu, quando, e o valor anterior. Append-only: só as RPCs escrevem. O marco de conferência tem campo_id nulo e origem=conferencia.';

alter table public.evento_campo_escrita enable row level security;

-- A equipe do evento LÊ o histórico (é o diff da reconferência).
-- A cliente não lê: o histórico é ferramenta de trabalho da profissional.
drop policy if exists evento_campo_escrita_select on public.evento_campo_escrita;
create policy evento_campo_escrita_select on public.evento_campo_escrita
  for select using (event_id in (select public.eventos_visiveis()));

-- ------------------------------------------------------------
-- 3) Notificação de portal
-- ------------------------------------------------------------
-- CHECK como SUPERCONJUNTO dos valores que já existem (a lista veio da
-- 069; conferida contra os tipos em uso no banco antes de alterar).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor',
    'orcamento_aprovado', 'orcamento_recusado', 'compromisso',
    'portal'
  ));

-- ------------------------------------------------------------
-- 4) A porta de escrita
-- ------------------------------------------------------------
-- Uma função serve as DUAS pontas (portal e Planejamento). A diferença
-- é a origem, derivada no servidor: quem pode editar o evento é equipe;
-- quem só é cliente é cliente. O client não escolhe.
create or replace function public.portal_escrever_campo(
  p_campo_id           uuid,
  p_valor              jsonb,
  p_updated_at_visto   timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campo    public.evento_campo_valor%rowtype;
  v_dec      public.evento_decisao%rowtype;
  v_equipe   boolean;
  v_cliente  boolean;
  v_origem   text;
  v_anterior text;
  v_novo     text;
  v_texto    text;
  v_num      numeric;
  v_data     date;
  v_link     text;
  v_evento   public.events%rowtype;
  v_resp_uid uuid;
  v_titulo   text;
  v_uid      uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false, 'erro', 'sem_sessao');
  end if;

  -- FOR UPDATE: segura a linha até o fim da transação. Sem isto, duas
  -- gravações simultâneas passariam as duas pela checagem de versão.
  select * into v_campo
  from public.evento_campo_valor
  where id = p_campo_id
  for update;

  if not found then
    return json_build_object('ok', false, 'erro', 'campo_inexistente');
  end if;

  select * into v_dec from public.evento_decisao where id = v_campo.evento_decisao_id;
  select * into v_evento from public.events where id = v_campo.event_id;

  v_equipe  := public.pode_editar_evento(v_campo.event_id);
  v_cliente := public.sou_cliente_do_evento(v_campo.event_id);

  if not (v_equipe or v_cliente) then
    -- nem equipe nem cliente: a resposta é a mesma de campo inexistente,
    -- para não confirmar que o id existe
    return json_build_object('ok', false, 'erro', 'campo_inexistente');
  end if;

  v_origem := case when v_equipe then 'equipe' else 'cliente' end;

  -- Guardas que valem SÓ para a cliente. Trocar o id na chamada não
  -- alcança campo de trabalho, decisão da cerimonialista, bloco já
  -- fechado, nem campo escondido do portal.
  if v_origem = 'cliente' then
    if v_dec.responsavel not in ('noivos', 'ambos') then
      return json_build_object('ok', false, 'erro', 'nao_e_sua');
    end if;
    if v_dec.estado <> 'pendente' then
      return json_build_object('ok', false, 'erro', 'bloco_fechado');
    end if;
    if not v_campo.pergunta_cliente or not v_campo.visivel_portal then
      return json_build_object('ok', false, 'erro', 'nao_e_pergunta');
    end if;
    -- fornecedor é cadastro da empresa; anexo é upload com outra guarda
    if v_campo.tipo in ('fornecedor', 'anexo') then
      return json_build_object('ok', false, 'erro', 'tipo_nao_permitido');
    end if;
  end if;

  -- Trava otimista. A cliente é OBRIGADA a dizer que versão viu — sem
  -- isso ela poderia pular a trava mandando nulo, e a correção que a
  -- cerimonialista acabou de fazer sumiria sem aviso. Para a equipe o
  -- nulo é tolerado (o drawer tem caminhos que gravam sem ter lido).
  if v_origem = 'cliente' and p_updated_at_visto is null then
    return json_build_object('ok', false, 'erro', 'versao_ausente');
  end if;

  if p_updated_at_visto is not null
     and v_campo.updated_at is distinct from p_updated_at_visto then
    return json_build_object(
      'ok', false,
      'conflito', true,
      'updated_at', v_campo.updated_at,
      'valor_atual', coalesce(
        v_campo.valor_texto,
        v_campo.valor_numero::text,
        v_campo.valor_bool::text,
        v_campo.valor_data::text,
        v_campo.valor_opcao
      )
    );
  end if;

  -- valor anterior, para o log
  v_anterior := coalesce(
    v_campo.valor_texto, v_campo.valor_numero::text, v_campo.valor_bool::text,
    v_campo.valor_data::text, v_campo.valor_opcao
  );

  -- ---- validação POR TIPO, com o tipo vindo da LINHA ----
  -- null (ou 'null' jsonb) apaga a resposta — é uma resposta válida.
  if p_valor is null or jsonb_typeof(p_valor) = 'null' then
    update public.evento_campo_valor
       set valor_texto = null, valor_numero = null, valor_bool = null,
           valor_data = null, valor_opcao = null,
           updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := null;

  elsif v_campo.tipo in ('numero', 'moeda') then
    if jsonb_typeof(p_valor) <> 'number' then
      return json_build_object('ok', false, 'erro', 'valor_invalido');
    end if;
    v_num := (p_valor #>> '{}')::numeric;
    update public.evento_campo_valor
       set valor_numero = v_num, updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := v_num::text;

  elsif v_campo.tipo = 'sim_nao' then
    if jsonb_typeof(p_valor) <> 'boolean' then
      return json_build_object('ok', false, 'erro', 'valor_invalido');
    end if;
    update public.evento_campo_valor
       set valor_bool = (p_valor #>> '{}')::boolean, updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := p_valor #>> '{}';

  elsif v_campo.tipo = 'data' then
    begin
      v_data := (p_valor #>> '{}')::date;
    exception when others then
      return json_build_object('ok', false, 'erro', 'data_invalida');
    end;
    update public.evento_campo_valor
       set valor_data = v_data, updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := v_data::text;

  elsif v_campo.tipo = 'escolha' then
    v_texto := p_valor #>> '{}';
    if v_campo.opcoes is null or not (v_texto = any (v_campo.opcoes)) then
      return json_build_object('ok', false, 'erro', 'opcao_invalida');
    end if;
    update public.evento_campo_valor
       set valor_opcao = v_texto, updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := v_texto;

  elsif v_campo.tipo = 'fornecedor' then
    -- só a equipe chega aqui (a cliente já foi barrada acima)
    begin
      update public.evento_campo_valor
         set valor_supplier_id = (p_valor #>> '{}')::uuid, updated_at = now(),
             aguarda_conferencia = false
       where id = p_campo_id;
    exception when others then
      return json_build_object('ok', false, 'erro', 'fornecedor_invalido');
    end;
    v_novo := p_valor #>> '{}';

  else
    -- texto e anexo (o anexo guarda o caminho do Storage em valor_texto)
    v_texto := p_valor #>> '{}';
    if length(v_texto) > 4000 then
      return json_build_object('ok', false, 'erro', 'texto_longo');
    end if;
    update public.evento_campo_valor
       set valor_texto = v_texto, updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := v_texto;
  end if;

  -- ---- auditoria, na MESMA transação da escrita ----
  insert into public.evento_campo_escrita
    (event_id, campo_id, evento_decisao_id, autor_user_id, origem,
     campo_label, valor_anterior, valor_novo)
  values
    (v_campo.event_id, v_campo.id, v_campo.evento_decisao_id, v_uid, v_origem,
     coalesce(v_campo.label_portal, v_campo.label), v_anterior, v_novo);

  -- ---- aviso para quem cuida do evento ----
  -- Agregado pelo link: 20 respostas da noiva no mesmo bloco viram UM
  -- aviso, não vinte. (notifications não tem event_id; o link é a chave
  -- natural, e é para onde o sino leva.)
  if v_origem = 'cliente' then
    v_link := '/eventos/' || v_campo.event_id || '/planejamento?decisao=' || v_campo.evento_decisao_id;
    v_titulo := 'A cliente respondeu em ' || coalesce(v_dec.titulo, 'uma decisão');

    select me.user_id into v_resp_uid
    from public.membros_equipe me
    where me.id = v_evento.cerimonialista_responsavel_id;

    -- responsável pelo evento e criadora; sem duplicar quando é a mesma
    if not exists (
      select 1 from public.notifications n
      where n.link = v_link and n.read_at is null
        and n.cerimonialista_id = coalesce(v_resp_uid, v_evento.cerimonialista_id)
    ) then
      insert into public.notifications (cerimonialista_id, type, title, message, link)
      values (coalesce(v_resp_uid, v_evento.cerimonialista_id), 'portal', v_titulo,
              'Confira o bloco quando puder.', v_link);
    else
      update public.notifications
         set title = v_titulo, created_at = now()
       where link = v_link and read_at is null
         and cerimonialista_id = coalesce(v_resp_uid, v_evento.cerimonialista_id);
    end if;

    if v_resp_uid is not null and v_evento.cerimonialista_id is distinct from v_resp_uid then
      if not exists (
        select 1 from public.notifications n
        where n.link = v_link and n.read_at is null
          and n.cerimonialista_id = v_evento.cerimonialista_id
      ) then
        insert into public.notifications (cerimonialista_id, type, title, message, link)
        values (v_evento.cerimonialista_id, 'portal', v_titulo,
                'Confira o bloco quando puder.', v_link);
      end if;
    end if;
  end if;

  select * into v_campo from public.evento_campo_valor where id = p_campo_id;
  return json_build_object('ok', true, 'updated_at', v_campo.updated_at, 'valor', v_novo);
end $$;

revoke all on function public.portal_escrever_campo(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.portal_escrever_campo(uuid, jsonb, timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 5) Conferir o bloco
-- ------------------------------------------------------------
-- Desliga a marca de TODOS os campos da decisão e grava o marco. NÃO
-- decide a decisão: decidir gera tarefas e sincroniza o financeiro
-- (083), e reverter não desfaz a parte financeira — é ato separado.
create or replace function public.conferir_decisao(p_decisao_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_qtd   int;
  v_uid   uuid := auth.uid();
begin
  select event_id into v_event from public.evento_decisao where id = p_decisao_id;
  if v_event is null then
    return json_build_object('ok', false, 'erro', 'decisao_inexistente');
  end if;
  if not public.pode_editar_evento(v_event) then
    return json_build_object('ok', false, 'erro', 'sem_permissao');
  end if;

  update public.evento_campo_valor
     set aguarda_conferencia = false
   where evento_decisao_id = p_decisao_id
     and aguarda_conferencia;
  get diagnostics v_qtd = row_count;

  -- o marco: daqui para a frente, o diff da reconferência é o que vier
  -- depois desta linha
  insert into public.evento_campo_escrita
    (event_id, campo_id, evento_decisao_id, autor_user_id, origem, campo_label)
  values (v_event, null, p_decisao_id, v_uid, 'conferencia', null);

  -- o aviso do sino já cumpriu o papel
  update public.notifications
     set read_at = now()
   where link = '/eventos/' || v_event || '/planejamento?decisao=' || p_decisao_id
     and read_at is null;

  return json_build_object('ok', true, 'conferidos', v_qtd);
end $$;

revoke all on function public.conferir_decisao(uuid) from public, anon;
grant execute on function public.conferir_decisao(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6) O que mudou desde a última conferência
-- ------------------------------------------------------------
-- Alimenta o "mostrando apenas o que mudou": as escritas posteriores ao
-- último marco de conferência daquela decisão.
create or replace function public.portal_diff_da_decisao(p_decisao_id uuid)
returns table (
  campo_id       uuid,
  campo_label    text,
  valor_anterior text,
  valor_novo     text,
  origem         text,
  quando         timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with marco as (
    select coalesce(max(created_at), '-infinity'::timestamptz) as em
    from public.evento_campo_escrita
    where evento_decisao_id = p_decisao_id and origem = 'conferencia'
  ),
  -- uma linha por campo: o valor ANTES do bloco de mudanças e o último
  distintos as (
    select distinct on (e.campo_id)
      e.campo_id, e.campo_label, e.valor_novo, e.origem, e.created_at
    from public.evento_campo_escrita e, marco m
    where e.evento_decisao_id = p_decisao_id
      and e.origem <> 'conferencia'
      and e.created_at > m.em
    order by e.campo_id, e.created_at desc
  ),
  primeiros as (
    select distinct on (e.campo_id) e.campo_id, e.valor_anterior
    from public.evento_campo_escrita e, marco m
    where e.evento_decisao_id = p_decisao_id
      and e.origem <> 'conferencia'
      and e.created_at > m.em
    order by e.campo_id, e.created_at asc
  )
  select d.campo_id, d.campo_label, p.valor_anterior, d.valor_novo, d.origem, d.created_at
  from distintos d
  join primeiros p on p.campo_id = d.campo_id
  where exists (
    select 1 from public.evento_decisao ed
    where ed.id = p_decisao_id and public.pode_ver_evento(ed.event_id)
  )
  order by d.created_at desc;
$$;

revoke all on function public.portal_diff_da_decisao(uuid) from public, anon;
grant execute on function public.portal_diff_da_decisao(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7) Relatório
-- ------------------------------------------------------------
do $$
declare
  v_perguntas int;
  v_sensiveis int;
begin
  select count(*) into v_perguntas from public.evento_campo_valor where pergunta_cliente;
  select count(*) into v_sensiveis from public.metodo_campo where sensibilidade <> 'normal';
  raise notice '--- 091 ---';
  raise notice 'campos que a cliente pode responder: %', v_perguntas;
  raise notice 'campos sensiveis no template (ainda 0 — a F5 semeia): %', v_sensiveis;
  raise notice 'RPCs: portal_escrever_campo, conferir_decisao, portal_diff_da_decisao';
end $$;

commit;
