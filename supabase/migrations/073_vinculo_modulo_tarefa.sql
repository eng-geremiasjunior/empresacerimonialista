-- 073 — Vínculo real entre tarefa e módulo (Execução / Financeiro)
--
-- Alguns itens do blueprint existem porque alimentam outro módulo: "Montar
-- o roteiro e o cronograma do dia" é o que a Execução do evento usa;
-- "Confirmar quantidade para buffet e bar" e as parcelas mexem no
-- Financeiro. Em vez de um selo decorativo, marcamos o vínculo no dado e a
-- tarefa vira um atalho real para aquele módulo.

-- ------------------------------------------------------------
-- 1) Coluna no blueprint e na tarefa (a gerada herda)
-- ------------------------------------------------------------
alter table public.metodo_tarefa
  add column if not exists vinculo_modulo text
  check (vinculo_modulo is null or vinculo_modulo in ('execucao', 'financeiro'));

alter table public.tasks
  add column if not exists vinculo_modulo text
  check (vinculo_modulo is null or vinculo_modulo in ('execucao', 'financeiro'));

-- ------------------------------------------------------------
-- 2) Marcar os itens do blueprint (por título, chave estável do seed)
-- ------------------------------------------------------------
update public.metodo_tarefa set vinculo_modulo = 'execucao'
  where titulo in (
    'Montar o roteiro e o cronograma do dia',
    'Realizar a visita técnica final',
    'Arquivar o OK dos fornecedores',
    'Enviar o roteiro para a equipe',
    'Imprimir os roteiros'
  );

update public.metodo_tarefa set vinculo_modulo = 'financeiro'
  where titulo = 'Confirmar quantidade para buffet e bar'
     or titulo ilike 'Pagar% parcela%';

-- ------------------------------------------------------------
-- 3) Geração herda o vínculo (mantém shift da 4D e categoria 'geral')
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
  v_shift int := 0;
begin
  select * into v_dec from public.evento_decisao where id = p_evento_decisao_id;
  if not found or v_dec.decisao_template_id is null then
    return;
  end if;

  select empresa_id, date into v_emp, v_data
  from public.events where id = v_dec.event_id;

  if v_data is not null
     and v_dec.offset_ideal_dias is not null
     and v_dec.prazo_previsto is not null then
    v_shift := v_dec.prazo_previsto - (v_data - v_dec.offset_ideal_dias);
  end if;

  insert into public.tasks (
    event_id, empresa_id, title, status, category, priority,
    responsavel, evento_decisao_id, metodo_tarefa_id, vinculo_modulo, due_date
  )
  select
    v_dec.event_id, v_emp, mt.titulo, 'pendente', 'geral', 'media',
    mt.responsavel, v_dec.id, mt.id, mt.vinculo_modulo,
    case
      when v_data is null or mt.offset_ideal_dias is null then null
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

-- ------------------------------------------------------------
-- 4) Backfill das tarefas já geradas
--    UPDATE...FROM: a tabela-alvo (t) não entra num JOIN ON do FROM.
-- ------------------------------------------------------------
update public.tasks t
set vinculo_modulo = mt.vinculo_modulo
from public.metodo_tarefa mt
where mt.id = t.metodo_tarefa_id
  and t.vinculo_modulo is null
  and mt.vinculo_modulo is not null;
