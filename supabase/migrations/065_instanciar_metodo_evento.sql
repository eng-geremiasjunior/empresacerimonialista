-- 065 — Instanciar o método ao criar o evento + aposentar o checklist plano
--
-- Substitui o "checklist simples" que criar_evento_do_orcamento semeava
-- (052): a árvore do método (objetivos → decisões → guias) passa a ser o
-- Planejamento do evento. Sistema em teste, sem dado real — troca direta.
--
-- As TAREFAs não são geradas aqui: nascem quando uma decisão é tomada, na
-- etapa seguinte. Aqui só a árvore é instanciada.

-- ------------------------------------------------------------
-- 1) Cópia template → instância (snapshot por evento)
-- ------------------------------------------------------------
-- Idempotente: se o evento já tem objetivos instanciados, não faz nada.
-- Cobre TODA forma de criar evento (orçamento e manual), porque é chamada
-- por trigger no insert de events.
create or replace function public.instanciar_metodo_evento(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  -- text, não o domínio: castar events.type para tipo_evento_catalogo
  -- lançaria erro e abortaria a criação do evento se algum type estivesse
  -- fora dos 9 valores. Comparando como texto, um tipo desconhecido apenas
  -- não casa nenhum template (no-op), nunca quebra o insert.
  v_tipo    text;
begin
  select empresa_id, type into v_empresa, v_tipo
  from public.events where id = p_event_id;

  if v_empresa is null or v_tipo is null then
    return;
  end if;

  -- já instanciado?
  if exists (select 1 from public.evento_objetivo where event_id = p_event_id) then
    return;
  end if;

  -- Objetivos
  insert into public.evento_objetivo
    (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem)
  select p_event_id, v_empresa, o.id, o.nome, o.descricao, o.ordem
  from public.metodo_objetivo o
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  -- Decisões, ligadas ao objetivo instanciado correspondente
  insert into public.evento_decisao
    (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
     titulo, descricao, responsavel, offset_ideal_dias, prioridade, ordem)
  select eo.id, p_event_id, v_empresa, d.id,
         d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias, d.prioridade, d.ordem
  from public.metodo_decisao d
  join public.metodo_objetivo o on o.id = d.objetivo_id
  join public.evento_objetivo eo
    on eo.event_id = p_event_id and eo.objetivo_template_id = o.id
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  -- Guias, ligados à decisão instanciada correspondente
  insert into public.evento_guia
    (evento_decisao_id, event_id, empresa_id, texto, ordem)
  select ed.id, p_event_id, v_empresa, g.texto, g.ordem
  from public.metodo_guia g
  join public.evento_decisao ed
    on ed.event_id = p_event_id and ed.decisao_template_id = g.decisao_id;
end $$;

-- ------------------------------------------------------------
-- 2) Trigger no insert de events
-- ------------------------------------------------------------
-- AFTER INSERT porque a cópia lê events.empresa_id/type já gravados.
create or replace function public.trg_instanciar_metodo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.instanciar_metodo_evento(new.id);
  return new;
end $$;

drop trigger if exists trg_instanciar_metodo on public.events;
create trigger trg_instanciar_metodo
  after insert on public.events
  for each row execute function public.trg_instanciar_metodo();

-- ------------------------------------------------------------
-- 3) Aposentar o checklist plano em criar_evento_do_orcamento
-- ------------------------------------------------------------
-- Recria a função da 052 SEM o loop de tasks (p_tasks). O parâmetro
-- continua na assinatura para não quebrar a chamada existente, mas é
-- ignorado — o método instanciado pelo trigger substitui aquele checklist.
-- Fases e roteiro seguem como estavam (não são "checklist simples").
create or replace function public.criar_evento_do_orcamento(
  p_hash        text,
  p_tasks       jsonb default '[]'::jsonb,
  p_phases      jsonb default '[]'::jsonb,
  p_data_evento date default null,
  p_roteiro     jsonb default '[]'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc       public.orcamentos%rowtype;
  v_uid       uuid;
  v_client    uuid;
  v_event     uuid;
  v_data      date;
  v_item      jsonb;
  v_tel_dig   text;
  v_email     text;
  v_nome      text;
begin
  select * into v_orc from public.orcamentos where hash_publico = p_hash;
  if not found then
    return json_build_object('error', 'orçamento não encontrado');
  end if;

  if v_orc.evento_gerado_id is not null then
    return json_build_object(
      'success', true, 'evento_id', v_orc.evento_gerado_id, 'ja_existia', true
    );
  end if;

  if v_orc.status <> 'aprovado' then
    return json_build_object('error', 'orçamento não está aprovado');
  end if;
  if v_orc.ficha_preenchida_em is null then
    return json_build_object('error', 'ficha de cadastro ainda não preenchida');
  end if;

  v_data := coalesce(p_data_evento, v_orc.data_evento);
  if v_data is null then
    return json_build_object(
      'error', 'sem_data',
      'mensagem', 'defina a data do evento para gerá-lo'
    );
  end if;

  select coalesce(
    (select m.user_id from public.membros_equipe m
      where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_uid;

  if v_uid is null then
    return json_build_object('error', 'empresa sem responsável definido');
  end if;

  v_nome  := coalesce(nullif(trim(v_orc.ficha_nome), ''), v_orc.contato_nome);
  v_email := coalesce(nullif(trim(v_orc.ficha_email), ''), v_orc.contato_email);
  v_tel_dig := regexp_replace(
    coalesce(nullif(trim(v_orc.ficha_whatsapp), ''),
             nullif(trim(v_orc.ficha_telefone), ''),
             v_orc.contato_telefone, ''), '\D', '', 'g');

  select c.id into v_client
  from public.clients c
  where c.empresa_id = v_orc.empresa_id
    and (
      (
        length(v_tel_dig) >= 8
        and (
          right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 8) = right(v_tel_dig, 8)
          or right(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g'), 8) = right(v_tel_dig, 8)
        )
      )
      or (
        v_email is not null and c.email is not null
        and lower(trim(c.email)) = lower(trim(v_email))
      )
    )
  order by c.created_at
  limit 1;

  if v_client is null then
    insert into public.clients (
      cerimonialista_id, empresa_id, name, phone, whatsapp, email,
      instagram, address, city
    )
    values (
      v_uid, v_orc.empresa_id, v_nome,
      nullif(coalesce(v_orc.ficha_telefone, v_orc.contato_telefone), ''),
      nullif(v_orc.ficha_whatsapp, ''),
      v_email,
      nullif(v_orc.ficha_instagram, ''),
      nullif(v_orc.ficha_endereco, ''),
      coalesce(nullif(v_orc.ficha_cidade, ''), v_orc.cidade_evento)
    )
    returning id into v_client;
  end if;

  -- O insert dispara trg_instanciar_metodo, que monta a árvore do método.
  insert into public.events (
    cerimonialista_id, empresa_id, client_id, type, date,
    location, city, guests, contract_value, status,
    cerimonialista_responsavel_id
  )
  values (
    v_uid, v_orc.empresa_id, v_client, v_orc.tipo_evento, v_data,
    nullif(v_orc.local_evento, ''), nullif(v_orc.cidade_evento, ''),
    v_orc.numero_convidados, v_orc.valor_total, 'confirmado',
    v_orc.cerimonialista_responsavel_id
  )
  returning id into v_event;

  -- Checklist plano APOSENTADO: o método (trigger) é o Planejamento agora.
  -- p_tasks é ignorado de propósito.

  for v_item in select * from jsonb_array_elements(coalesce(p_phases, '[]'::jsonb)) loop
    insert into public.event_phases (event_id, name, "order")
    values (v_event, v_item->>'name', coalesce((v_item->>'order')::int, 0));
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_roteiro, '[]'::jsonb)) loop
    insert into public.roteiro_items (
      event_id, empresa_id, title, "order", time, status
    )
    values (
      v_event, v_orc.empresa_id, v_item->>'title',
      coalesce((v_item->>'order')::int, 0), null, 'pendente'
    );
  end loop;

  update public.orcamentos
  set evento_gerado_id = v_event, updated_at = now()
  where id = v_orc.id;

  insert into public.activities (
    cerimonialista_id, category, type, title, description, event_id, event_name
  )
  values (
    v_uid, 'evento', 'evento_criado',
    'Evento criado a partir de orçamento aprovado',
    'Orçamento de ' || v_nome || ' aprovado em ' ||
      to_char(coalesce(v_orc.respondido_em, now()), 'DD/MM/YYYY') ||
      ' — R$ ' || to_char(v_orc.valor_total, 'FM999G999G990D00'),
    v_event, v_nome
  );

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (
    v_uid, 'evento',
    'Evento criado: ' || v_nome,
    'Gerado automaticamente a partir do orçamento aprovado',
    '/eventos/' || v_event
  );

  return json_build_object(
    'success', true,
    'evento_id', v_event,
    'cliente_id', v_client,
    'ja_existia', false
  );
end $$;

revoke all on function public.criar_evento_do_orcamento(text, jsonb, jsonb, date, jsonb) from public;
grant execute on function public.criar_evento_do_orcamento(text, jsonb, jsonb, date, jsonb)
  to anon, authenticated;
