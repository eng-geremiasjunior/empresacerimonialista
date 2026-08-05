-- 068 — Correção da geração 4C: categoria válida
--
-- A 067 setava tasks.category com o nome do objetivo ("Buffet e bar"),
-- mas category tem CHECK fixo (005): só som/buffet/decoracao/... /geral.
-- Isso violava a constraint e abortava a geração ao decidir.
--
-- A provenância da tarefa já vem do vínculo evento_decisao_id ("gerada
-- por X" na tela), então a categoria não precisa carregar o objetivo —
-- usa 'geral'. Só isto muda na função.

create or replace function public.gerar_tarefas_da_decisao(p_evento_decisao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dec   public.evento_decisao%rowtype;
  v_emp   uuid;
  v_data  date;
begin
  select * into v_dec from public.evento_decisao where id = p_evento_decisao_id;
  if not found or v_dec.decisao_template_id is null then
    return;
  end if;

  select empresa_id, date into v_emp, v_data
  from public.events where id = v_dec.event_id;

  insert into public.tasks (
    event_id, empresa_id, title, status, category, priority,
    responsavel, evento_decisao_id, metodo_tarefa_id, due_date
  )
  select
    v_dec.event_id, v_emp, mt.titulo, 'pendente',
    'geral',              -- category tem CHECK fixo; provenância vem do vínculo
    'media',
    mt.responsavel, v_dec.id, mt.id,
    case
      when v_data is null or mt.offset_ideal_dias is null then null
      else greatest(current_date, v_data - mt.offset_ideal_dias)
    end
  from public.metodo_tarefa mt
  where mt.decisao_id = v_dec.decisao_template_id
  on conflict (evento_decisao_id, metodo_tarefa_id)
    where evento_decisao_id is not null and metodo_tarefa_id is not null
    do nothing;
end $$;
