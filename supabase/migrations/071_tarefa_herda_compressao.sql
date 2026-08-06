-- 071 — Tarefas herdam a compressão da decisão (coerência 4C ↔ 4D)
--
-- A 4D comprime a DECISÃO (prazo_previsto) quando o prazo do casal é menor
-- que o do método. Mas gerar_tarefas_da_decisao (068) ainda datava as
-- TAREFAS por data_evento − offset_da_tarefa (offset cru do método). Num
-- casamento de 6 meses a decisão aparecia comprimida, mas as tarefas que
-- ela gera caíam quase todas em greatest(hoje, …) = hoje, perdendo a
-- inteligência da compressão.
--
-- Correção: as tarefas deslocam-se pelo MESMO tanto que a decisão deslocou.
--   deslocamento = prazo_previsto − (data_evento − offset_da_decisão)
--   due_date     = clamp[hoje .. data_evento] de (data_evento − offset_tarefa + deslocamento)
-- Quando o método cabe, prazo_previsto = data_evento − offset_da_decisão,
-- logo o deslocamento é 0 e nada muda (comportamento da 068 preservado).

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
  v_shift int := 0;   -- deslocamento (dias) que a decisão sofreu na compressão
begin
  select * into v_dec from public.evento_decisao where id = p_evento_decisao_id;
  if not found or v_dec.decisao_template_id is null then
    return;
  end if;

  select empresa_id, date into v_emp, v_data
  from public.events where id = v_dec.event_id;

  -- Deslocamento herdado: quanto a compressão moveu a decisão em relação à
  -- sua data ideal de método. Sem data/offset/prazo, fica 0 (sem herança).
  if v_data is not null
     and v_dec.offset_ideal_dias is not null
     and v_dec.prazo_previsto is not null then
    v_shift := v_dec.prazo_previsto - (v_data - v_dec.offset_ideal_dias);
  end if;

  insert into public.tasks (
    event_id, empresa_id, title, status, category, priority,
    responsavel, evento_decisao_id, metodo_tarefa_id, due_date
  )
  select
    v_dec.event_id, v_emp, mt.titulo, 'pendente',
    'geral',
    'media',
    mt.responsavel, v_dec.id, mt.id,
    case
      when v_data is null or mt.offset_ideal_dias is null then null
      -- data do método deslocada pela compressão da decisão, presa à
      -- janela [hoje .. data do evento].
      else greatest(
             current_date,
             least(v_data, (v_data - mt.offset_ideal_dias) + v_shift)
           )
    end
  from public.metodo_tarefa mt
  where mt.decisao_id = v_dec.decisao_template_id
  on conflict (evento_decisao_id, metodo_tarefa_id)
    where evento_decisao_id is not null and metodo_tarefa_id is not null
    do nothing;
end $$;

-- Backfill das tarefas já geradas e ainda não concluídas (não reescreve
-- data de trabalho já feito). Aplica o mesmo deslocamento.
update public.tasks t
set due_date = greatest(
      current_date,
      least(e.date, (e.date - mt.offset_ideal_dias)
                    + (d.prazo_previsto - (e.date - d.offset_ideal_dias)))
    )
from public.evento_decisao d
join public.events e on e.id = d.event_id
join public.metodo_tarefa mt on mt.id = t.metodo_tarefa_id
where t.evento_decisao_id = d.id
  and t.metodo_tarefa_id is not null
  and t.status <> 'concluido'
  and e.date is not null
  and d.offset_ideal_dias is not null
  and d.prazo_previsto is not null
  and mt.offset_ideal_dias is not null;
