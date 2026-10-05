-- ============================================================
-- 200 — A lista vai ao ar sem esperar a prova de vida
-- ============================================================
-- Decisão dele (05/10/2026): "o pagamento no cartão depende do
-- processamento da Pagar.me; a hora de transferir os recursos à noiva é que
-- exige a validação". A 197 só deixava a lista ir ao ar (e o convidado
-- pagar) com a conta que recebe APROVADA (status active, prova de vida
-- feita). Agora basta a conta CADASTRADA na Pagar.me — o recebedor criado,
-- com o id dele — e não recusada, suspensa, bloqueada ou inativa. O
-- dinheiro entra no saldo do recebedor; a transferência para o banco do
-- casal continua esperando a prova de vida, do lado da Pagar.me.
--
-- Duas funções da 197, copiadas por inteiro, com UMA condição trocada em
-- cada (gerada por script a partir do texto da 197, para nada mais mudar):
--   · portal_salvar_lista: pôr a lista no ar;
--   · lista_publica: o "pode_pagar" que a página do convidado lê.
-- As permissões (grant/revoke) são as mesmas da 197 e vão de novo abaixo.
-- Convergente: pode rodar mais de uma vez.

begin;

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

  -- no ar com a conta que recebe CADASTRADA (05/10/2026, decisão dele): a
  -- Pagar.me processa o pagamento; a prova de vida só segura a
  -- transferência para a conta do casal. Sem conta nenhuma, ou com a conta
  -- recusada ou bloqueada, não há para onde dividir.
  if coalesce((p_lista ->> 'publicada')::boolean, false)
     and not exists (select 1 from public.evento_recebedor r
                      where r.event_id = p_event_id
                        and r.pagarme_recipient_id is not null
                        and r.status not in ('refused', 'suspended', 'blocked', 'inactive')) then
    raise exception 'conta que recebe não cadastrada';
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
           -- dá para pagar com a conta CADASTRADA (05/10/2026): a prova de
           -- vida só segura a transferência, não o pagamento
           'pode_pagar', exists (select 1 from public.evento_recebedor r
                                  where r.event_id = s.event_id
                                    and r.pagarme_recipient_id is not null
                                    and r.status not in ('refused', 'suspended', 'blocked', 'inactive')),
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

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'salvar: no ar com a conta cadastrada (não mais só a aprovada)' as item,
       pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%conta que recebe não cadastrada%'
       and pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) not like '%r.status = ''active''%' as ok
union all
select 'salvar: continua só o casal',
       pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%familia_pode(p_event_id, ''gestao'')%'
       and pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%familia_pode(p_event_id, ''escrever'')%'
union all
select 'público: pode pagar com a conta cadastrada',
       pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%pagarme_recipient_id is not null%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) not like '%r.status = ''active''%'
union all
select 'público: só com o site no ar e a lista publicada',
       pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%es.publicado%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%l.publicada%'
union all
select 'as duas continuam security definer',
       (select bool_and(p.prosecdef) from pg_proc p
         where p.oid in ('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure,
                         'public.lista_publica(text)'::regprocedure))
union all
select 'o anônimo lê a lista pública e não grava',
       has_function_privilege('anon', 'public.lista_publica(text)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_lista(uuid, jsonb, jsonb)', 'execute');
