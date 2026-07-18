-- ============================================================
-- Vela — Migração 032: link público do fornecedor com ações
-- (Etapa 2 de 4 do Cronograma dinâmico)
--
-- Reaproveita o MESMO hash de roteiro_links (nada de sistema paralelo):
--  1) roteiro_publico(hash) passa a retornar os campos novos por item
--     (status_novo, horários reais, observação, responsável, obrigatória)
--  2) wrappers PÚBLICOS autenticados por hash chamam as funções da
--     Etapa 1 (atualizar_status_item / registrar_visualizacao_item) —
--     o hash é a credencial; o item precisa pertencer ao mesmo
--     evento+fornecedor do link, senão recusa
--  3) problema reportado gera notificação imediata para a cerimonialista
--     (trigger no log → notifications; o sino já tem Realtime)
--  4) roteiro_item_log entra na publicação Realtime (usada na Etapa 4)
--
-- Execute no SQL Editor do Supabase (depois da 031).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) roteiro_publico com os campos do cronograma dinâmico
-- ------------------------------------------------------------

create or replace function public.roteiro_publico(link_hash text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'event', jsonb_build_object(
      'type', e.type,
      'date', e.date,
      'location', e.location,
      'client_name', c.name
    ),
    'supplier', jsonb_build_object('name', s.name),
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'time', ri.time,
            'title', ri.title,
            'description', ri.description,
            'status', ri.status,
            'status_novo', ri.status_novo,
            'horario_real_inicio', ri.horario_real_inicio,
            'horario_real_fim', ri.horario_real_fim,
            'observacao', ri.observacao,
            'responsavel_nome', ri.responsavel_nome,
            'etapa_obrigatoria', ri.etapa_obrigatoria
          )
          order by ri.time nulls last, ri."order"
        )
        from public.roteiro_items ri
        where ri.event_id = l.event_id
          and ri.supplier_id = l.supplier_id
      ),
      '[]'::jsonb
    )
  )
  from public.roteiro_links l
  join public.events e on e.id = l.event_id
  join public.suppliers s on s.id = l.supplier_id
  left join public.clients c on c.id = e.client_id
  where l.hash = link_hash
$$;

grant execute on function public.roteiro_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) Wrappers públicos (hash como credencial)
-- ------------------------------------------------------------

-- Valida que o item pertence ao evento+fornecedor do hash. Retorna o id
-- do item validado ou null.
create or replace function public._item_do_link(p_hash text, p_item_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ri.id
  from public.roteiro_links l
  join public.roteiro_items ri
    on ri.event_id = l.event_id and ri.supplier_id = l.supplier_id
  where l.hash = p_hash and ri.id = p_item_id
$$;

revoke all on function public._item_do_link(text, uuid) from public, anon;

create or replace function public.atualizar_status_item_publico(
  p_hash        text,
  p_item_id     uuid,
  p_novo_status text,
  p_observacao  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item uuid;
begin
  v_item := public._item_do_link(p_hash, p_item_id);
  if v_item is null then
    return json_build_object('error', 'link ou item inválido');
  end if;

  -- Fornecedor só transita entre estes estados (não "desfaz" para
  -- planejado pela página pública).
  if p_novo_status not in ('em_andamento', 'concluido', 'problema') then
    return json_build_object('error', 'status inválido');
  end if;

  -- Problema exige descrição.
  if p_novo_status = 'problema'
     and (p_observacao is null or length(trim(p_observacao)) = 0) then
    return json_build_object('error', 'descreva o problema');
  end if;

  return public.atualizar_status_item(v_item, p_novo_status, p_observacao, 'fornecedor');
end;
$$;

create or replace function public.registrar_visualizacao_publica(
  p_hash    text,
  p_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item uuid;
begin
  v_item := public._item_do_link(p_hash, p_item_id);
  if v_item is not null then
    perform public.registrar_visualizacao_item(v_item);
  end if;
end;
$$;

grant execute on function public.atualizar_status_item_publico(text, uuid, text, text) to anon, authenticated;
grant execute on function public.registrar_visualizacao_publica(text, uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Problema reportado → notificação imediata para a cerimonialista.
--    Trigger no LOG (agnóstico de canal: página pública hoje, WhatsApp
--    amanhã). Tipo 'fornecedor' já é aceito pelo CHECK de notifications.
-- ------------------------------------------------------------

create or replace function public.notificar_problema_roteiro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id  uuid;
  v_titulo    text;
  v_dono      uuid;
  v_label     text;
begin
  if new.tipo_evento <> 'problema_reportado' then
    return new;
  end if;

  select ri.event_id, ri.title into v_event_id, v_titulo
  from public.roteiro_items ri where ri.id = new.roteiro_item_id;
  if v_event_id is null then
    return new;
  end if;

  select e.cerimonialista_id, public.event_label(e.type, e.client_id)
    into v_dono, v_label
  from public.events e where e.id = v_event_id;

  insert into public.notifications (cerimonialista_id, type, title, message, link)
  values (
    v_dono,
    'fornecedor',
    'Problema reportado: ' || coalesce(v_titulo, 'item do cronograma'),
    coalesce(v_label, 'Evento'),
    '/eventos/' || v_event_id || '/roteiro'
  );

  return new;
end;
$$;

drop trigger if exists trg_notificar_problema on public.roteiro_item_log;
create trigger trg_notificar_problema
  after insert on public.roteiro_item_log
  for each row execute function public.notificar_problema_roteiro();

-- ------------------------------------------------------------
-- 4) Realtime do log (Etapa 4 vai assinar; inofensivo agora)
-- ------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.roteiro_item_log;
exception
  when duplicate_object then null;
end $$;

commit;
