-- 062 — Execução do evento: dependência entre itens e horário original
--
-- O cronograma vira uma visão de raias por fornecedor, onde várias
-- equipes aparecem em paralelo. Para o "+15 min" empurrar a cadeia certa
-- e ainda mostrar o horário combinado, faltavam três campos.
--
-- Nada é removido: todos os campos e o comportamento atual continuam.
-- A regra que recusava dois itens no mesmo horário era da aplicação, não
-- do banco — saiu junto com esta etapa.

alter table public.roteiro_items
  -- item que precisa terminar antes deste. on delete set null: apagar o
  -- anterior não pode levar o dependente junto.
  add column if not exists depende_de uuid
    references public.roteiro_items (id) on delete set null,

  -- dura  = tem de terminar antes, então um atraso empurra este item
  -- suave = ideal terminar antes, mas pode correr em paralelo (não empurra)
  add column if not exists tipo_dependencia text,

  -- horário combinado originalmente. Só é preenchido no primeiro atraso,
  -- para a tela mostrar "era HH:MM" riscado sem perder o planejado.
  add column if not exists time_original time;

alter table public.roteiro_items
  drop constraint if exists roteiro_items_tipo_dependencia_check;
alter table public.roteiro_items
  add constraint roteiro_items_tipo_dependencia_check
  check (tipo_dependencia is null or tipo_dependencia in ('dura', 'suave'));

-- Um item não pode depender de si mesmo. Ciclos maiores (A→B→A) não dão
-- para barrar com CHECK; quem percorre a cadeia guarda os visitados.
alter table public.roteiro_items
  drop constraint if exists roteiro_items_dependencia_nao_circular;
alter table public.roteiro_items
  add constraint roteiro_items_dependencia_nao_circular
  check (depende_de is null or depende_de <> id);

-- A cadeia é percorrida a partir do "anterior": quem depende deste item?
create index if not exists idx_roteiro_items_depende_de
  on public.roteiro_items (depende_de)
  where depende_de is not null;

-- ------------------------------------------------------------
-- Consulta do cronograma devolve os campos novos
-- ------------------------------------------------------------
-- Mesma funcao, com dependencia e horario original no retorno: a tela
-- de raias usa isso para desenhar a cascata e o "era HH:MM".
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
            'duracao_minutos', ri.duracao_minutos,
            'depende_de', ri.depende_de,
            'tipo_dependencia', ri.tipo_dependencia,
            'time_original', ri.time_original
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
