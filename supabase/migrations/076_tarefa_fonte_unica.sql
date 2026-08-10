-- 076 — Tarefa como fonte única (consolidação da tela de Organização)
--
-- Fecha o modelo Objetivo→Decisão→Tarefa: a tarefa que nasce da decisão
-- (4C) vira a única fonte; o checklist legado (tarefas órfãs, sem decisão
-- de origem) é REMOVIDO — é dado de teste do modelo velho, sistema não
-- está no ar. As superfícies duplicadas (/tarefas com CRUD, aba do evento)
-- são aposentadas no código.
--
-- Campos novos: só os essenciais aprovados — fornecedor, local, valor e a
-- SEGUNDA data (trigger do convite, núcleo do Secretário Executivo:
-- vencimento = quando fazer; convite = quando chamar o fornecedor, mais
-- cedo, para garantir espaço na agenda dele). Esforço/dependência/anexos
-- ficaram de fora de propósito (não inchar antes do uso real).

-- ------------------------------------------------------------
-- 1) Colunas essenciais na tarefa
-- ------------------------------------------------------------
alter table public.tasks
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null,
  add column if not exists local text,
  add column if not exists valor numeric,
  -- a segunda data: quando o convite ao fornecedor deve sair (D-21 etc.).
  -- offset em dias antes do EVENTO (mesma régua do método), e a data
  -- materializada para o cron da etapa B varrer barato.
  add column if not exists convite_offset_dias int,
  add column if not exists convite_data date;

create index if not exists idx_tasks_supplier on public.tasks (supplier_id)
  where supplier_id is not null;

-- ------------------------------------------------------------
-- 2) Sub-checklist da tarefa
-- ------------------------------------------------------------
-- Passos dentro de uma tarefa ("ligar", "agendar", "confirmar por escrito").
-- event_id denormalizado para a RLS por evento não precisar de join.
create table if not exists public.task_checklist (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  empresa_id uuid,
  texto      text not null,
  feito      boolean not null default false,
  ordem      int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_checklist_task
  on public.task_checklist (task_id, ordem);

drop trigger if exists trg_fill_empresa on public.task_checklist;
create trigger trg_fill_empresa before insert on public.task_checklist
  for each row execute function public.fill_empresa_from_event();

alter table public.task_checklist enable row level security;

drop policy if exists "task_checklist_select" on public.task_checklist;
create policy "task_checklist_select" on public.task_checklist
  for select using (public.pode_ver_evento(event_id));

drop policy if exists "task_checklist_insert" on public.task_checklist;
create policy "task_checklist_insert" on public.task_checklist
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists "task_checklist_update" on public.task_checklist;
create policy "task_checklist_update" on public.task_checklist
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists "task_checklist_delete" on public.task_checklist;
create policy "task_checklist_delete" on public.task_checklist
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 3) Remover o checklist legado (tarefas órfãs, sem decisão de origem)
-- ------------------------------------------------------------
-- Dado de teste do modelo velho. FKs seguras: compromisso.task_id é
-- ON DELETE SET NULL; financeiro_pendencia.task_id é ON DELETE CASCADE.
-- NÃO toca nas tarefas do método (evento_decisao_id preenchido) — a regra
-- de reversão da 4C (remover_tarefas_da_decisao preserva concluídas)
-- continua intacta, sem alteração naquela função.
delete from public.tasks where evento_decisao_id is null;

-- ------------------------------------------------------------
-- 4) Fornecedor herdado do blueprint quando a decisão tem um só vínculo
-- ------------------------------------------------------------
-- (nada a fazer aqui por ora: o vínculo tarefa→fornecedor é preenchido
-- pela cerimonialista no drawer; automatizar herança fica para a etapa B)
