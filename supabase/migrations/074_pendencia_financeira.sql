-- 074 — Pendência financeira: a automação determinística do dinheiro
--
-- Regra do produto: automatizar só o REPETITIVO e DETERMINÍSTICO, e nunca
-- movimentar dinheiro sozinho. Concluir "Pagar 1ª parcela do buffet" ou
-- "Confirmar quantidade para buffet e bar" SEMPRE gera trabalho financeiro
-- — isso é determinístico. Quanto, para quem e quando, não é.
--
-- Por isso a automação cria uma PENDÊNCIA (rascunho), não um lançamento:
--   * transactions tem CHECK duro (conta='fornecedor' exige supplier_id;
--     'assessoria' exige supplier_id nulo). Inventar linha ali seria dado
--     financeiro falso, que suja relatório e prestação de contas.
--   * a cerimonialista confirma a pendência informando valor/fornecedor/
--     data — aí vira transaction de verdade.

create table if not exists public.financeiro_pendencia (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid,
  -- tarefa que originou (rastreabilidade e idempotência)
  task_id     uuid references public.tasks (id) on delete cascade,
  titulo      text not null,
  -- 'pagamento'  = concluiu uma tarefa de parcela → lançar a saída
  -- 'revisao'    = a contagem mudou → revisar custo de buffet/bar
  tipo        text not null check (tipo in ('pagamento', 'revisao')),
  status      text not null default 'aberta'
              check (status in ('aberta', 'resolvida', 'descartada')),
  -- lançamento gerado ao confirmar (fecha o ciclo)
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at  timestamptz not null default now(),
  resolvida_em timestamptz
);

-- Uma pendência por tarefa: concluir/reabrir/concluir não duplica.
create unique index if not exists uq_pendencia_task
  on public.financeiro_pendencia (task_id) where task_id is not null;

create index if not exists idx_pendencia_evento
  on public.financeiro_pendencia (event_id, status);

drop trigger if exists trg_fill_empresa on public.financeiro_pendencia;
create trigger trg_fill_empresa before insert on public.financeiro_pendencia
  for each row execute function public.fill_empresa_from_event();

-- RLS: mesmo molde das outras tabelas de evento.
alter table public.financeiro_pendencia enable row level security;

drop policy if exists "pendencia_select" on public.financeiro_pendencia;
create policy "pendencia_select" on public.financeiro_pendencia
  for select using (public.pode_ver_evento(event_id));

drop policy if exists "pendencia_insert" on public.financeiro_pendencia;
create policy "pendencia_insert" on public.financeiro_pendencia
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists "pendencia_update" on public.financeiro_pendencia;
create policy "pendencia_update" on public.financeiro_pendencia
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists "pendencia_delete" on public.financeiro_pendencia;
create policy "pendencia_delete" on public.financeiro_pendencia
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- Gatilho: concluir tarefa com vínculo financeiro abre a pendência
-- ------------------------------------------------------------
create or replace function public.trg_tarefa_pendencia_financeira()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
begin
  if new.vinculo_modulo is distinct from 'financeiro' then
    return new;
  end if;

  -- Concluiu: abre a pendência (idempotente pelo unique em task_id).
  if new.status = 'concluido' and coalesce(old.status, '') <> 'concluido' then
    v_tipo := case
      when new.title ilike 'Confirmar quantidade%' then 'revisao'
      else 'pagamento'
    end;

    insert into public.financeiro_pendencia (event_id, task_id, titulo, tipo)
    values (new.event_id, new.id, new.title, v_tipo)
    on conflict (task_id) where task_id is not null do nothing;

  -- Reabriu a tarefa: a pendência ainda não resolvida perde o sentido.
  elsif old.status = 'concluido' and new.status <> 'concluido' then
    delete from public.financeiro_pendencia
    where task_id = new.id and status = 'aberta';
  end if;

  return new;
end $$;

drop trigger if exists trg_tarefa_pendencia on public.tasks;
create trigger trg_tarefa_pendencia
  after update of status on public.tasks
  for each row execute function public.trg_tarefa_pendencia_financeira();
