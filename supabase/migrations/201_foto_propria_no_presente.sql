-- ============================================================
-- 201 — A foto própria no presente
-- ============================================================
-- Pedido dele (05/10/2026): o casal cria o presente e não tinha como pôr
-- a foto. Agora cada presente da lista pode ter a foto do casal, que vale
-- mais que a do catálogo; sem ela, a do catálogo (pelo código) ou a
-- inicial do nome, como antes.
--
-- A foto mora no balde 'site' (191), com a mesma forma de caminho das
-- fotos do site: {evento}/{uuid}.jpg|webp. O balde é privado e sem policy
-- para quem entra: o servidor confere que é o casal e emite a URL de envio
-- assinada; para mostrar, assina a URL de leitura. O banco só guarda o
-- caminho, conferido por site_foto_ok (a foto é DESTE evento).
--
-- Três funções, copiadas por inteiro (geradas por script do texto da 200 e
-- da 197), com só o que a foto pede:
--   · portal_salvar_lista: aceita a chave 'foto' em cada presente; sem a
--     chave, a foto que já estava fica (a tela de antes não apaga nada);
--   · portal_lista (o portal) e lista_publica (o convidado): devolvem a foto.
-- A regra da 200 (no ar com a conta CADASTRADA) continua igual.
-- As permissões (grant/revoke) vão de novo, as mesmas. Convergente.

begin;

alter table public.evento_presente add column if not exists foto text;

do $$
begin
  alter table public.evento_presente drop constraint if exists evento_presente_foto_check;
  alter table public.evento_presente add constraint evento_presente_foto_check
    check (foto is null or foto ~ ('^' || event_id::text || '/[0-9a-f-]{36}\.(jpg|webp)$'));
end $$;

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
      if v_k not in ('id', 'codigo', 'categoria', 'titulo', 'valor_centavos', 'quantidade', 'foto') then
        raise exception 'campo desconhecido no presente: %', v_k;
      end if;
    end loop;
    if jsonb_typeof(v_item -> 'id') <> 'string'
       or (v_item ->> 'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(v_item -> 'categoria') <> 'string'
       or jsonb_typeof(v_item -> 'titulo') <> 'string'
       or jsonb_typeof(v_item -> 'valor_centavos') <> 'number'
       or jsonb_typeof(coalesce(v_item -> 'quantidade', '1'::jsonb)) <> 'number'
       or jsonb_typeof(coalesce(v_item -> 'codigo', 'null'::jsonb)) not in ('string', 'null')
       -- a foto própria (201): nula, ou uma foto DESTE evento no balde 'site'
       or not public.site_foto_ok(v_item -> 'foto', p_event_id) then
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
      id, event_id, codigo, categoria, titulo, valor_centavos, quantidade, foto, ordem, removido, updated_at)
    values (
      v_id, p_event_id,
      nullif(btrim(v_item ->> 'codigo'), ''),
      btrim(v_item ->> 'categoria'),
      btrim(v_item ->> 'titulo'),
      (v_item ->> 'valor_centavos')::numeric::integer,
      coalesce((v_item ->> 'quantidade')::numeric::integer, 1),
      nullif(btrim(v_item ->> 'foto'), ''),
      v_ordem, false, now())
    on conflict (id) do update set
      codigo = excluded.codigo,
      -- sem a chave 'foto' (a tela de antes), a foto que já estava fica
      foto = case when v_item ? 'foto' then excluded.foto else p.foto end,
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
                 'foto', p.foto,
                 'comprados', (select count(*) from public.presente_pagamento g
                                where g.presente_id = p.id and g.status = 'pago'))
               order by p.ordem, p.created_at)
          from public.evento_presente p
         where p.event_id = p_event_id and not p.removido), '[]'::json))
  end;
$$;

revoke all on function public.portal_lista(uuid) from public, anon;
grant execute on function public.portal_lista(uuid) to authenticated;

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
                      'foto', p.foto,
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
select 'a coluna foto existe, com a regra do caminho' as item,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'evento_presente' and column_name = 'foto')
       and exists (select 1 from pg_constraint where conname = 'evento_presente_foto_check') as ok
union all
select 'salvar: aceita a foto, conferida por site_foto_ok',
       pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%site_foto_ok(v_item -> ''foto'', p_event_id)%'
union all
select 'salvar: sem a chave, a foto que estava fica',
       pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%v_item ? ''foto'' then excluded.foto else p.foto%'
union all
select 'salvar: a regra da 200 continua (conta cadastrada) e só o casal',
       pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%conta que recebe não cadastrada%'
       and pg_get_functiondef('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure) like '%familia_pode(p_event_id, ''gestao'')%'
union all
select 'o portal e a página do convidado devolvem a foto',
       pg_get_functiondef('public.portal_lista(uuid)'::regprocedure) like '%''foto'', p.foto%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%''foto'', p.foto%'
union all
select 'público: a regra da 200 continua (pode_pagar com a conta cadastrada)',
       pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%pagarme_recipient_id is not null%'
       and pg_get_functiondef('public.lista_publica(text)'::regprocedure) like '%l.publicada%'
union all
select 'as três continuam security definer',
       (select bool_and(p.prosecdef) from pg_proc p
         where p.oid in ('public.portal_salvar_lista(uuid, jsonb, jsonb)'::regprocedure,
                         'public.portal_lista(uuid)'::regprocedure,
                         'public.lista_publica(text)'::regprocedure))
union all
select 'o anônimo lê só a lista pública',
       has_function_privilege('anon', 'public.lista_publica(text)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_lista(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.portal_lista(uuid)', 'execute');
