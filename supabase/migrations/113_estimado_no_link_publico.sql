-- ============================================================
-- Vela — Migração 113: a estimativa se declara também no link público
-- ============================================================
-- Decisão do dono: horário calculado pela âncora aparece como estimado
-- em TODA superfície — inclusive para o fornecedor. Estimativa que se
-- disfarça de horário acertado cobra o preço no dia do evento.
--
-- Cópia fiel da roteiro_publico vigente (032) com UMA chave a mais no
-- jsonb: origem_horario. É metadado de um horário que o link já expõe;
-- nenhum dado novo vaza. O jsonb continua sendo allowlist campo a campo.
--
-- Convergente: pode rodar quantas vezes for preciso.

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
            'etapa_obrigatoria', ri.etapa_obrigatoria,
            'origem_horario', ri.origem_horario
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

-- Conferência: deve voltar "true".
select 'link do fornecedor devolve a origem do horario' as verificacao,
       pg_get_functiondef('public.roteiro_publico(text)'::regprocedure)
         like '%origem_horario%' as aplicou;
