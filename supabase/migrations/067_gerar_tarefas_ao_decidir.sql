-- 067 — Geração de tarefas ao decidir (etapa 4C, lógica)
--
-- Copiloto por regras: quando uma evento_decisao vira 'decidida', as
-- tarefas do blueprint daquela decisão nascem na Organização, com
-- vencimento calculado e responsável herdado. Determinístico, sem IA.
--
-- Regras:
--   * só 'decidida' gera; 'nao_se_aplica' não gera nada;
--   * idempotente (o unique parcial de tasks impede duplicar);
--   * reverter 'decidida' → 'pendente'/'nao_se_aplica' remove as tarefas
--     geradas que NÃO foram concluídas; as concluídas ficam (não se apaga
--     trabalho feito).

-- ------------------------------------------------------------
-- 1) Gerar
-- ------------------------------------------------------------
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
    return; -- sem template de origem, nada a gerar
  end if;

  select empresa_id, date into v_emp, v_data
  from public.events where id = v_dec.event_id;

  -- Uma tarefa por blueprint da decisão-modelo. O unique parcial
  -- (evento_decisao_id, metodo_tarefa_id) garante que decidir de novo não
  -- duplica. ON CONFLICT DO NOTHING cobre a corrida.
  insert into public.tasks (
    event_id, empresa_id, title, status, category, priority,
    responsavel, evento_decisao_id, metodo_tarefa_id, due_date
  )
  select
    v_dec.event_id, v_emp, mt.titulo, 'pendente',
    -- categoria = o objetivo, para agrupar na Organização
    (select eo.nome from public.evento_objetivo eo where eo.id = v_dec.evento_objetivo_id),
    'media',
    mt.responsavel, v_dec.id, mt.id,
    -- vencimento = data do evento menos o offset do blueprint; nunca no
    -- passado (compressão de prazo real é a 4D).
    case
      when v_data is null or mt.offset_ideal_dias is null then null
      else greatest(current_date, v_data - mt.offset_ideal_dias)
    end
  from public.metodo_tarefa mt
  where mt.decisao_id = v_dec.decisao_template_id
  -- O predicado repete o do índice parcial uq_tasks_decisao_blueprint;
  -- sem ele o Postgres não acha o árbitro e o INSERT falha.
  on conflict (evento_decisao_id, metodo_tarefa_id)
    where evento_decisao_id is not null and metodo_tarefa_id is not null
    do nothing;
end $$;

-- ------------------------------------------------------------
-- 2) Remover ao reverter (preservando o que foi concluído)
-- ------------------------------------------------------------
create or replace function public.remover_tarefas_da_decisao(p_evento_decisao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.tasks
  where evento_decisao_id = p_evento_decisao_id
    and metodo_tarefa_id is not null      -- só as geradas pelo método
    and status <> 'concluido';            -- concluída fica: não apaga trabalho
end $$;

-- ------------------------------------------------------------
-- 3) Trigger na mudança de estado da decisão
-- ------------------------------------------------------------
-- Hook único: pega toda alteração de estado, venha da tela de
-- Planejamento (4B) ou de onde for.
create or replace function public.trg_decisao_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'decidida' and coalesce(old.estado, '') <> 'decidida' then
    perform public.gerar_tarefas_da_decisao(new.id);
  elsif old.estado = 'decidida' and new.estado <> 'decidida' then
    perform public.remover_tarefas_da_decisao(new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_decisao_estado on public.evento_decisao;
create trigger trg_decisao_estado
  after update of estado on public.evento_decisao
  for each row execute function public.trg_decisao_estado();
