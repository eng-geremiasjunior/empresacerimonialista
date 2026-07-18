-- ============================================================
-- Vela — Migração 033: duração estimada + leitura rica do cronograma
-- (Etapa 3 de 4). Execute depois da 032.
-- ============================================================

begin;

-- Duração estimada do item (minutos) — só para exibição.
alter table public.roteiro_items
  add column if not exists duracao_minutos integer;

-- ------------------------------------------------------------
-- Leitura consolidada do cronograma de um evento para a timeline
-- da cerimonialista (traz status_novo, horários reais, responsável,
-- observação, obrigatória, duração + fornecedor e sua 1ª categoria).
-- SECURITY DEFINER com checagem por pode_ver_evento (respeita cargos).
-- ------------------------------------------------------------
create or replace function public.cronograma_evento(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.pode_ver_evento(p_event_id) then '[]'::jsonb
    else coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'time', ri.time,
            'title', ri.title,
            'description', ri.description,
            'supplier_id', ri.supplier_id,
            'supplier_name', s.name,
            'supplier_categoria', (
              select sc.categoria
              from public.supplier_categorias sc
              where sc.supplier_id = ri.supplier_id
              order by sc.categoria
              limit 1
            ),
            'status_novo', ri.status_novo,
            'horario_real_inicio', ri.horario_real_inicio,
            'horario_real_fim', ri.horario_real_fim,
            'observacao', ri.observacao,
            'responsavel_nome', ri.responsavel_nome,
            'responsavel_telefone', ri.responsavel_telefone,
            'etapa_obrigatoria', coalesce(ri.etapa_obrigatoria, false),
            'duracao_minutos', ri.duracao_minutos
          )
          order by ri.time nulls last, ri."order"
        )
        from public.roteiro_items ri
        left join public.suppliers s on s.id = ri.supplier_id
        where ri.event_id = p_event_id
      ),
      '[]'::jsonb
    )
  end
$$;

revoke all on function public.cronograma_evento(uuid) from public, anon;
grant execute on function public.cronograma_evento(uuid) to authenticated, service_role;

commit;
