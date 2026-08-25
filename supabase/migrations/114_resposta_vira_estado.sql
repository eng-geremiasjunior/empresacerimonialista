-- ============================================================
-- Vela — Migração 114: a resposta do fornecedor vira estado operacional
-- ============================================================
-- A releitura do dono, agora com o primeiro tipo que muda o cronograma:
--
--   tarefa → solicitação → fornecedor responde → dado atualizado →
--   consequência operacional
--
-- A solicitação de HORÁRIO carrega o snapshot do que o Vela acredita
-- ("Chegada do buffet — 12:00") e o fornecedor confirma ou corrige.
-- Confirmar promove a estimativa a firme (origem fornecedor). Corrigir
-- move o item e registra a divergência. A precedência da 112 não quebra:
-- o que ELA definiu (manual) nunca é sobrescrito — nesse caso a
-- divergência vira aviso, não escrita.
--
-- E o segundo pedaço: o campo de hora TIPADO no Planejamento. O horário
-- de liberação do espaço deixa de ser texto livre ("9h da manhã") e vira
-- time de verdade — é ele que alimenta o aviso de conflito com a
-- montagem no Cronograma.
--
-- Convergente: pode rodar quantas vezes for preciso.

begin;

-- ------------------------------------------------------------
-- 1) O tipo novo e o vínculo com o item do roteiro
-- ------------------------------------------------------------
alter table public.solicitacao_fornecedor
  drop constraint if exists solicitacao_fornecedor_tipo_check;
alter table public.solicitacao_fornecedor
  add constraint solicitacao_fornecedor_tipo_check
  check (tipo in ('confirmacao', 'contrato', 'horario'));

alter table public.solicitacao_fornecedor
  add column if not exists roteiro_item_id uuid
  references public.roteiro_items (id) on delete set null;

-- ------------------------------------------------------------
-- 2) O campo de hora tipado (Planejamento)
-- ------------------------------------------------------------
alter table public.metodo_campo
  drop constraint if exists metodo_campo_tipo_check;
alter table public.metodo_campo
  add constraint metodo_campo_tipo_check
  check (tipo in ('texto', 'numero', 'moeda', 'sim_nao',
                  'escolha', 'data', 'hora', 'anexo', 'fornecedor'));

alter table public.evento_campo_valor
  drop constraint if exists evento_campo_valor_tipo_check;
alter table public.evento_campo_valor
  add constraint evento_campo_valor_tipo_check
  check (tipo in ('texto', 'numero', 'moeda', 'sim_nao',
                  'escolha', 'data', 'hora', 'anexo', 'fornecedor'));

alter table public.evento_campo_valor
  add column if not exists valor_hora time;

-- O horário de liberação do espaço vira hora de verdade — no template e
-- nas instâncias já criadas. O que estava escrito em texto é aproveitado
-- quando dá para ler ("9h", "09:00", "9:30h"); o resto fica para ela
-- preencher no campo novo, que agora é um seletor de hora.
update public.metodo_campo
set tipo = 'hora'
where codigo = 'liberacao_fornecedores' and tipo = 'texto';

update public.evento_campo_valor
set tipo = 'hora'
where codigo = 'liberacao_fornecedores' and tipo = 'texto';

update public.evento_campo_valor
set valor_hora = (
      replace(regexp_replace(lower(valor_texto), '[^0-9:]', '', 'g'), '::', ':')
      || case when position(':' in valor_texto) = 0 then ':00' else '' end
    )::time
where codigo = 'liberacao_fornecedores'
  and tipo = 'hora'
  and valor_hora is null
  and lower(coalesce(valor_texto, '')) ~ '^\s*\d{1,2}(:\d{2})?\s*h?(rs)?\s*$';

-- ------------------------------------------------------------
-- 3) A leitura pública carrega o snapshot
-- ------------------------------------------------------------
create or replace function public.consultar_pendencias_fornecedor(p_hash text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso public.fornecedor_acesso%rowtype;
begin
  select * into v_acesso
  from public.fornecedor_acesso
  where hash = p_hash;

  if not found then return null; end if;
  if v_acesso.revogado_em is not null then return null; end if;
  if v_acesso.expira_em < now() then return null; end if;

  -- Conta a abertura só quando faz diferença: sem o intervalo, cada F5 do
  -- fornecedor era um UPDATE — e "abriu o link 47 vezes" viraria contador
  -- de refresh, não sinal. Cinco minutos preservam o que o número afirma
  -- ("entrou na página depois do envio") sem transformar consulta em
  -- escrita a cada tecla.
  update public.fornecedor_acesso
  set aberturas = aberturas + 1, ultima_abertura = now()
  where id = v_acesso.id
    and (ultima_abertura is null or ultima_abertura < now() - interval '5 minutes');

  return (
    select json_build_object(
      'fornecedor', (
        select json_build_object('nome', s.name)
        from public.suppliers s where s.id = v_acesso.supplier_id
      ),
      'empresa', (
        select json_build_object('nome', e.nome, 'logo_url', e.logo_url)
        from public.empresas e where e.id = v_acesso.empresa_id
      ),
      'pendencias', coalesce((
        select json_agg(
          json_build_object(
            'id', sf.id,
            'tipo', sf.tipo,
            'titulo', sf.titulo,
            'status', sf.status,
            'prazo_ate', sf.prazo_ate,
            'respondida_em', sf.respondida_em,
            -- snapshot do que o Vela acredita hoje: a solicitação de
            -- horário carrega o item, e o fornecedor confirma ou corrige
            'roteiro_item', case
              when sf.tipo = 'horario' and sf.roteiro_item_id is not null then (
                select json_build_object(
                  'titulo', ri.title,
                  'horario', ri.time,
                  'origem', ri.origem_horario
                )
                from public.roteiro_items ri
                where ri.id = sf.roteiro_item_id
              )
              else null
            end,
            'evento', json_build_object(
              'nome', coalesce(ev.name, c.name),
              'data', ev.date,
              'local', ev.location
            )
          ) order by ev.date, sf.created_at
        )
        from public.solicitacao_fornecedor sf
        join public.events ev on ev.id = sf.event_id
        left join public.clients c on c.id = ev.client_id
        where sf.supplier_id = v_acesso.supplier_id
          and sf.empresa_id = v_acesso.empresa_id
          and ev.status <> 'concluido'
          and (
            sf.status in ('enviada', 'reenviada')
            -- Pendente que já venceu também aparece: a página é o lugar
            -- onde está tudo, e a cerimonialista pode ter mandado o link
            -- por fora, sem passar pela fila. O que ainda não venceu fica
            -- de fora — mostrar seria cobrar antes da hora.
            or (
              sf.status = 'pendente'
              and (
                sf.dispara_em is null
                or sf.dispara_em <= (now() at time zone 'America/Sao_Paulo')::date
              )
            )
            or (sf.status = 'respondida' and sf.respondida_em > now() - interval '7 days')
          )
      ), '[]'::json)
    )
  );
end;
$$;

revoke all on function public.consultar_pendencias_fornecedor(text) from public;
grant execute on function public.consultar_pendencias_fornecedor(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) A resposta escreve de volta no cronograma
-- ------------------------------------------------------------
create or replace function public.responder_solicitacao(
  p_hash          text,
  p_solicitacao_id uuid,
  p_resposta      jsonb
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso public.fornecedor_acesso%rowtype;
  v_sol    public.solicitacao_fornecedor%rowtype;
  v_sincronizou int := 0;
  v_item   public.roteiro_items%rowtype;
  v_nova   time;
  v_forn   text;
begin
  select * into v_acesso from public.fornecedor_acesso where hash = p_hash;
  if not found
     or v_acesso.revogado_em is not null
     or v_acesso.expira_em < now() then
    return json_build_object('error', 'link inválido');
  end if;

  select * into v_sol
  from public.solicitacao_fornecedor
  where id = p_solicitacao_id
    and supplier_id = v_acesso.supplier_id
    and empresa_id  = v_acesso.empresa_id
  for update;

  if not found then
    return json_build_object('error', 'solicitação não encontrada');
  end if;
  -- 'pendente' entra aqui porque o fornecedor pode chegar pela página
  -- antes de a fila ter mandado a mensagem. Resposta adiantada é resposta
  -- boa: fecha a pendência e evita a cobrança que sairia amanhã.
  if v_sol.status not in ('pendente', 'enviada', 'reenviada') then
    return json_build_object('error', 'esta solicitação já foi respondida');
  end if;

  update public.solicitacao_fornecedor
  set status = 'respondida',
      respondida_em = now(),
      resposta = p_resposta,
      updated_at = now()
  where id = v_sol.id;

  -- Confirmação sincroniza os DOIS registros antigos, como a RPC da 019
  -- sempre fez: supplier_confirmations (a aba de fornecedores do evento)
  -- e roteiro_links.confirmed — que é o que a saúde do evento, os cards e
  -- o alerta do Copiloto realmente leem. A primeira versão desta função
  -- atualizava só o primeiro, e o comentário afirmava o contrário: o
  -- fornecedor respondia pela Central e o anel do evento continuava
  -- cobrando a confirmação que ele acabara de dar.
  if v_sol.tipo = 'confirmacao' then
    update public.supplier_confirmations
    set status = case
          when coalesce(p_resposta->>'confirmado', 'true') = 'false' then 'recusado'
          else 'confirmado'
        end,
        responded_at = now()
    where event_id = v_sol.event_id and supplier_id = v_sol.supplier_id;
    get diagnostics v_sincronizou = row_count;

    update public.roteiro_links
    set confirmed = (coalesce(p_resposta->>'confirmado', 'true') <> 'false')
    where event_id = v_sol.event_id and supplier_id = v_sol.supplier_id;
  end if;

  -- Horário: a resposta vira estado operacional. Confirmar promove a
  -- estimativa a firme (origem fornecedor); corrigir move o item e
  -- registra a divergência. A precedência não quebra: o que ELA definiu
  -- (manual) nunca é sobrescrito — a divergência vira aviso, não escrita.
  if v_sol.tipo = 'horario' and v_sol.roteiro_item_id is not null then
    select * into v_item from public.roteiro_items
    where id = v_sol.roteiro_item_id;

    select s.name into v_forn from public.suppliers s
    where s.id = v_sol.supplier_id;

    if found and v_item.id is not null then
      begin
        v_nova := nullif(p_resposta->>'hora_chegada', '')::time;
      exception when others then
        v_nova := null;
      end;

      if v_nova is null then
        -- confirmou o horário que está lá
        if coalesce(v_item.origem_horario, '') <> 'manual' then
          update public.roteiro_items
          set origem_horario = 'fornecedor'
          where id = v_item.id;
        end if;
        insert into public.notifications
          (cerimonialista_id, empresa_id, type, title, message, link)
        select ev.cerimonialista_id, v_sol.empresa_id, 'fornecedor',
               v_forn || ' confirmou o horário',
               v_item.title || ' às ' || to_char(v_item.time, 'HH24:MI'),
               '/eventos/' || v_sol.event_id || '/roteiro'
        from public.events ev
        where ev.id = v_sol.event_id and ev.cerimonialista_id is not null;

      elsif coalesce(v_item.origem_horario, '') = 'manual' then
        -- divergência ANOTADA, não aplicada: manual não se sobrescreve
        insert into public.notifications
          (cerimonialista_id, empresa_id, type, title, message, link)
        select ev.cerimonialista_id, v_sol.empresa_id, 'fornecedor',
               v_forn || ' pediu outro horário',
               v_item.title || ': pediu ' || to_char(v_nova, 'HH24:MI') ||
                 ' · mantido ' || to_char(v_item.time, 'HH24:MI') ||
                 ', definido por você',
               '/eventos/' || v_sol.event_id || '/roteiro'
        from public.events ev
        where ev.id = v_sol.event_id and ev.cerimonialista_id is not null;

      else
        -- divergência APLICADA: fornecedor sobrescreve estimativa
        insert into public.notifications
          (cerimonialista_id, empresa_id, type, title, message, link)
        select ev.cerimonialista_id, v_sol.empresa_id, 'fornecedor',
               v_forn || ' corrigiu o horário',
               v_item.title || ': ' || to_char(v_nova, 'HH24:MI') ||
                 case when v_item.time is not null
                      then ' (era ' || to_char(v_item.time, 'HH24:MI') || ')'
                      else '' end,
               '/eventos/' || v_sol.event_id || '/roteiro'
        from public.events ev
        where ev.id = v_sol.event_id and ev.cerimonialista_id is not null;

        update public.roteiro_items
        set time = v_nova, origem_horario = 'fornecedor'
        where id = v_item.id;
      end if;

      -- o aviso específico já saiu; o genérico "respondeu" não repete
      v_sincronizou := 1;
    end if;
  end if;

  -- O registro antigo tem gatilho proprio de notificacao (019). Quando ele
  -- existe, o aviso ja saiu por la; repetir daqui duplicaria na tela dela.
  if v_sincronizou = 0 then
    insert into public.notifications
      (cerimonialista_id, empresa_id, type, title, message, link)
    select ev.cerimonialista_id, v_sol.empresa_id, 'fornecedor',
           s.name || ' respondeu',
           v_sol.titulo,
           '/eventos/' || v_sol.event_id || '/fornecedores'
    from public.events ev
    join public.suppliers s on s.id = v_sol.supplier_id
    where ev.id = v_sol.event_id and ev.cerimonialista_id is not null;
  end if;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.responder_solicitacao(text, uuid, jsonb) from public;
grant execute on function public.responder_solicitacao(text, uuid, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 5) A escrita de campo entende hora
-- ------------------------------------------------------------
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
  v_hora     time;
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
        v_campo.valor_hora::text,
        v_campo.valor_opcao
      )
    );
  end if;

  -- valor anterior, para o log
  v_anterior := coalesce(
    v_campo.valor_texto, v_campo.valor_numero::text, v_campo.valor_bool::text,
    v_campo.valor_data::text, v_campo.valor_hora::text, v_campo.valor_opcao
  );

  -- ---- validação POR TIPO, com o tipo vindo da LINHA ----
  -- null (ou 'null' jsonb) apaga a resposta — é uma resposta válida.
  if p_valor is null or jsonb_typeof(p_valor) = 'null' then
    update public.evento_campo_valor
       set valor_texto = null, valor_numero = null, valor_bool = null,
           valor_data = null, valor_hora = null, valor_opcao = null,
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

  elsif v_campo.tipo = 'hora' then
    begin
      v_hora := (p_valor #>> '{}')::time;
    exception when others then
      return json_build_object('ok', false, 'erro', 'hora_invalida');
    end;
    update public.evento_campo_valor
       set valor_hora = v_hora, updated_at = now(),
           aguarda_conferencia = (v_origem = 'cliente')
     where id = p_campo_id;
    v_novo := to_char(v_hora, 'HH24:MI');

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

commit;

-- ------------------------------------------------------------
-- Conferência: todas as linhas devem voltar "true".
-- ------------------------------------------------------------
select 'tipo horario aceito na solicitação' as verificacao,
       exists (
         select 1 from information_schema.check_constraints
         where constraint_name = 'solicitacao_fornecedor_tipo_check'
           and check_clause like '%horario%') as aplicou
union all
select 'vínculo com o item do roteiro criado',
       exists (
         select 1 from information_schema.columns
         where table_name = 'solicitacao_fornecedor'
           and column_name = 'roteiro_item_id')
union all
select 'campo de hora tipado existe',
       exists (
         select 1 from information_schema.columns
         where table_name = 'evento_campo_valor' and column_name = 'valor_hora')
union all
select 'liberação do espaço virou hora (template)',
       not exists (
         select 1 from public.metodo_campo
         where codigo = 'liberacao_fornecedores' and tipo <> 'hora')
union all
select 'consultar carrega o snapshot',
       pg_get_functiondef('public.consultar_pendencias_fornecedor(text)'::regprocedure)
         like '%roteiro_item%'
union all
select 'responder escreve no cronograma',
       pg_get_functiondef('public.responder_solicitacao(text, uuid, jsonb)'::regprocedure)
         like '%origem_horario%'
union all
select 'escrever campo entende hora',
       pg_get_functiondef('public.portal_escrever_campo(uuid, jsonb, timestamptz)'::regprocedure)
         like '%valor_hora%'
union all
select 'confirmação sincroniza roteiro_links',
       pg_get_functiondef('public.responder_solicitacao(text, uuid, jsonb)'::regprocedure)
         like '%update public.roteiro_links%';
