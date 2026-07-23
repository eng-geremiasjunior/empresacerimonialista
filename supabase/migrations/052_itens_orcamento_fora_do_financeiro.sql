-- ============================================================
-- Vela — Migração 052: itens do orçamento saem do Financeiro real
--
-- Decisão de produto (Opção B): o que foi vendido na proposta é RESUMO
-- INFORMATIVO. A receita de verdade do evento continua nascendo só quando
-- a cerimonialista gera as parcelas pelo módulo Financeiro.
--
-- Por que REMOVER a criação das transactions em vez de marcá-las com uma
-- flag e filtrar:
--   * Uma linha em `transactions` que não é transação é uma armadilha
--     permanente: todo relatório, soma e gráfico futuro precisaria lembrar
--     do filtro. Basta um esquecimento para o valor voltar a ser contado
--     em dobro.
--   * O dado não se perde: os itens já vivem em orcamento_itens, ligados
--     ao evento por orcamentos.evento_gerado_id. A tela lê de lá.
--
-- Tudo o mais da 049/050 continua: checklist, fases e roteiro sugerido.
--
-- Execute no SQL Editor do Supabase (depois da 051).
-- ============================================================

begin;

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

  for v_item in select * from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb)) loop
    insert into public.tasks (event_id, title, status, priority, category)
    values (
      v_event, v_item->>'title', 'pendente',
      coalesce(v_item->>'priority', 'media'),
      coalesce(v_item->>'category', 'geral')
    );
  end loop;

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

  -- SEM transactions: os itens do orçamento são resumo informativo, lido
  -- de orcamento_itens pela tela do Financeiro. As receitas reais são as
  -- parcelas geradas pela cerimonialista.

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
end;
$$;

revoke all on function public.criar_evento_do_orcamento(text, jsonb, jsonb, date, jsonb) from public;
grant execute on function public.criar_evento_do_orcamento(text, jsonb, jsonb, date, jsonb)
  to anon, authenticated;

commit;
