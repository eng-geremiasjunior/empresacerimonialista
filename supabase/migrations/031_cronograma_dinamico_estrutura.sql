-- ============================================================
-- Vela — Migração 031: cronograma dinâmico — estrutura (Etapa 1 de 4)
--
-- Estrutura ANTIGA (inspecionada antes desta migração):
--   roteiro_items(id, event_id, time [TIME nullable], title, description,
--                 supplier_id, "order", status, created_at, empresa_id)
--   status antigo: 'pendente' | 'em_andamento' | 'concluido' (109 itens:
--   70 pendente, 18 em_andamento, 21 concluido)
--
-- DECISÕES:
--  - NÃO renomeamos `time`: todo o app o utiliza e esta etapa não muda
--    telas. `time` É o horário previsto; rename fica para quando as
--    telas migrarem (Etapa 3).
--  - `time` é TIME: o cálculo de variação combina com events.date e
--    compara no fuso America/Sao_Paulo (horario_real_* é timestamptz UTC).
--  - `status` antigo coexiste com `status_novo`. Um trigger mantém os
--    dois em sincronia enquanto as telas antigas ainda escrevem no campo
--    antigo (pendente<->planejado; sem equivalente antigo p/ 'problema').
--  - Funções são SECURITY DEFINER mas SEM grant para anon: o acesso
--    público do fornecedor virá na Etapa 2 via wrapper autenticado por
--    HASH do link (padrão do projeto). REVOKE de PUBLIC incluído.
--
-- Execute no SQL Editor do Supabase (depois da 030).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Novas colunas em roteiro_items
-- ------------------------------------------------------------

alter table public.roteiro_items
  add column if not exists horario_real_inicio timestamptz,
  add column if not exists horario_real_fim    timestamptz,
  add column if not exists status_novo         text not null default 'planejado',
  add column if not exists etapa_obrigatoria   boolean not null default false,
  add column if not exists responsavel_nome    text,
  add column if not exists responsavel_telefone text,
  add column if not exists observacao          text;

alter table public.roteiro_items drop constraint if exists roteiro_items_status_novo_check;
alter table public.roteiro_items
  add constraint roteiro_items_status_novo_check
  check (status_novo in ('planejado', 'em_andamento', 'concluido', 'problema'));

-- Backfill do status antigo -> novo:
--   'pendente'     -> 'planejado'
--   'em_andamento' -> 'em_andamento'
--   'concluido'    -> 'concluido'
update public.roteiro_items set status_novo = 'planejado'    where status = 'pendente';
update public.roteiro_items set status_novo = 'em_andamento' where status = 'em_andamento';
update public.roteiro_items set status_novo = 'concluido'    where status = 'concluido';

-- ------------------------------------------------------------
-- 1b) Sincronia entre status antigo e novo (coexistência).
--     Telas atuais escrevem em `status`; o trigger reflete em
--     `status_novo` — a menos que o próprio UPDATE já tenha mudado
--     `status_novo` (caso das funções novas), que então prevalece.
-- ------------------------------------------------------------

create or replace function public.sync_status_roteiro_item()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and new.status_novo is not distinct from old.status_novo then
    new.status_novo := case new.status
      when 'pendente'     then 'planejado'
      when 'em_andamento' then 'em_andamento'
      when 'concluido'    then 'concluido'
      else new.status_novo
    end;
    -- concluir pela tela antiga também carimba o horário real de fim
    if new.status = 'concluido' and new.horario_real_fim is null then
      new.horario_real_fim := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_status_roteiro on public.roteiro_items;
create trigger trg_sync_status_roteiro
  before update on public.roteiro_items
  for each row execute function public.sync_status_roteiro_item();

-- ------------------------------------------------------------
-- 2) Log/histórico por item (a "linha do tempo viva")
-- ------------------------------------------------------------

create table if not exists public.roteiro_item_log (
  id              uuid primary key default gen_random_uuid(),
  roteiro_item_id uuid not null references public.roteiro_items (id) on delete cascade,
  tipo_evento     text not null
                  check (tipo_evento in (
                    'visualizado', 'iniciado', 'concluido',
                    'problema_reportado', 'observacao_adicionada',
                    'editado_pela_cerimonialista', 'status_atualizado'
                  )),
  descricao       text,
  origem          text not null default 'fornecedor'
                  check (origem in ('fornecedor', 'cerimonialista', 'sistema')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_roteiro_item_log_item
  on public.roteiro_item_log (roteiro_item_id, created_at desc);

alter table public.roteiro_item_log enable row level security;

-- Leitura segue a visibilidade do evento (mesmo padrão das demais
-- tabelas-filhas — cobre proprietária/coordenadora/responsável/assistente).
drop policy if exists "roteiro_item_log_empresa" on public.roteiro_item_log;
drop policy if exists "roteiro_item_log_select" on public.roteiro_item_log;
create policy "roteiro_item_log_select" on public.roteiro_item_log
  for select using (
    exists (
      select 1 from public.roteiro_items ri
      where ri.id = roteiro_item_id
        and public.pode_ver_evento(ri.event_id)
    )
  );
-- Sem policy de INSERT/UPDATE/DELETE: escrita só pelas funções
-- SECURITY DEFINER abaixo.

-- ------------------------------------------------------------
-- 3) Função agnóstica de canal: atualizar status de um item
--    (Etapa 2 chamará via wrapper com hash; futuro webhook WhatsApp idem)
-- ------------------------------------------------------------

create or replace function public.atualizar_status_item(
  p_roteiro_item_id uuid,
  p_novo_status     text,
  p_observacao      text default null,
  p_origem          text default 'fornecedor'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item          public.roteiro_items%rowtype;
  v_descricao_log text;
  v_tipo_log      text;
  v_status_antigo text;
begin
  if p_novo_status not in ('planejado', 'em_andamento', 'concluido', 'problema') then
    return json_build_object('error', 'status inválido');
  end if;
  if p_origem not in ('fornecedor', 'cerimonialista', 'sistema') then
    return json_build_object('error', 'origem inválida');
  end if;

  select * into v_item from public.roteiro_items where id = p_roteiro_item_id;
  if not found then
    return json_build_object('error', 'item não encontrado');
  end if;

  -- Equivalente no campo antigo (mantém as telas atuais coerentes).
  -- 'problema' não existe no antigo: preserva o valor atual.
  v_status_antigo := case p_novo_status
    when 'planejado'    then 'pendente'
    when 'em_andamento' then 'em_andamento'
    when 'concluido'    then 'concluido'
    else v_item.status
  end;

  update public.roteiro_items set
    status_novo = p_novo_status,
    status      = v_status_antigo,
    horario_real_inicio = case
      when p_novo_status = 'em_andamento' and horario_real_inicio is null
      then now() else horario_real_inicio end,
    horario_real_fim = case
      when p_novo_status = 'concluido' then now() else horario_real_fim end,
    observacao = coalesce(p_observacao, observacao)
  where id = p_roteiro_item_id;

  v_tipo_log := case p_novo_status
    when 'em_andamento' then 'iniciado'
    when 'concluido'    then 'concluido'
    when 'problema'     then 'problema_reportado'
    else 'status_atualizado'
  end;
  v_descricao_log := case p_novo_status
    when 'em_andamento' then 'Fornecedor iniciou a etapa'
    when 'concluido'    then 'Etapa concluída'
    when 'problema'     then 'Problema reportado'
    else 'Status atualizado'
  end;
  if p_origem = 'cerimonialista' then
    v_descricao_log := replace(v_descricao_log, 'Fornecedor', 'Cerimonialista');
  end if;

  insert into public.roteiro_item_log (roteiro_item_id, tipo_evento, descricao, origem)
  values (p_roteiro_item_id, v_tipo_log, v_descricao_log, p_origem);

  if p_observacao is not null and length(trim(p_observacao)) > 0 then
    insert into public.roteiro_item_log (roteiro_item_id, tipo_evento, descricao, origem)
    values (p_roteiro_item_id, 'observacao_adicionada',
            'Observação: ' || trim(p_observacao), p_origem);
  end if;

  return json_build_object('success', true, 'status', p_novo_status);
end;
$$;

-- Visualização do fornecedor (anti-spam: 1 registro a cada 5 minutos)
create or replace function public.registrar_visualizacao_item(p_roteiro_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.roteiro_item_log
    where roteiro_item_id = p_roteiro_item_id
      and tipo_evento = 'visualizado'
      and created_at > now() - interval '5 minutes'
  ) then
    insert into public.roteiro_item_log (roteiro_item_id, tipo_evento, descricao, origem)
    values (p_roteiro_item_id, 'visualizado', 'Fornecedor visualizou', 'fornecedor');
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4) Variação previsto vs. real. `time` (TIME) + events.date compõem o
--    previsto; horario_real_inicio (timestamptz/UTC) é convertido para
--    America/Sao_Paulo antes de comparar.
-- ------------------------------------------------------------

create or replace function public.calcular_variacao_horario(p_roteiro_item_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_item     public.roteiro_items%rowtype;
  v_previsto timestamp;
  v_real     timestamp;
  v_diff_min int;
begin
  select * into v_item from public.roteiro_items where id = p_roteiro_item_id;
  if not found then
    return json_build_object('status', 'sem_dado');
  end if;

  if v_item.horario_real_inicio is null or v_item.time is null then
    return json_build_object('status', 'sem_dado');
  end if;

  select (e.date + v_item.time)::timestamp into v_previsto
  from public.events e where e.id = v_item.event_id;
  if v_previsto is null then
    return json_build_object('status', 'sem_dado');
  end if;

  v_real := v_item.horario_real_inicio at time zone 'America/Sao_Paulo';
  v_diff_min := round(extract(epoch from (v_real - v_previsto)) / 60);

  if v_diff_min < 0 then
    return json_build_object('status', 'antecipado', 'minutos', abs(v_diff_min));
  elsif v_diff_min > 5 then
    return json_build_object('status', 'atrasado', 'minutos', v_diff_min);
  else
    return json_build_object('status', 'no_horario', 'minutos', 0);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 5) Permissões: nada para anon nesta etapa (Etapa 2 cria o wrapper
--    público autenticado por hash). Cerimonialista logada pode usar.
-- ------------------------------------------------------------

revoke all on function public.atualizar_status_item(uuid, text, text, text) from public, anon;
revoke all on function public.registrar_visualizacao_item(uuid) from public, anon;
revoke all on function public.calcular_variacao_horario(uuid) from public, anon;

grant execute on function public.atualizar_status_item(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.registrar_visualizacao_item(uuid) to authenticated, service_role;
grant execute on function public.calcular_variacao_horario(uuid) to authenticated, service_role;

commit;

-- ============================================================
-- VALIDAÇÃO (após o commit):
-- select status, status_novo, count(*) from public.roteiro_items
--   group by 1, 2 order by 1;  -- mapeamento antigo -> novo
-- ============================================================
