-- ============================================================
-- 179 — As tarefas da família (Portal da família v2, fase 4)
-- ============================================================
-- A tela Tarefas do portal tem dois tipos de tarefa na lista da família:
--
--   A CERIMONIALISTA PEDIU: as tarefas do evento com responsável
--   'noivos' ou 'ambos' (já nascem do método: "1ª prova do vestido").
--   A família lê só título, prazo, hora e local (nunca a descrição, que
--   pode ser nota interna) e marca como feita; a equipe vê quem marcou.
--
--   VOCÊS INCLUÍRAM: tarefas próprias da família (familia_tarefa). A
--   família cria, marca e apaga; a equipe lê.
--
-- "O que a cerimonialista está fazendo" continua saindo do quadro da 173
-- (decisões), sem abrir a tabela de tarefas dela.
--
-- A noite e a corte não precisam de banco novo: o roteiro já aceita
-- sugestão de horário (092) e o cortejo já tem ordem e o "quem é para
-- ela" (o_que_leva).
--
-- Idempotente. Termina com a conferência (tudo true).

-- ------------------------------------------------------------
-- 1) Quem da família concluiu, na própria tarefa
-- ------------------------------------------------------------
alter table public.tasks
  add column if not exists concluida_pela_familia_nome text,
  add column if not exists concluida_pela_familia_em  timestamptz;

-- a tarefa voltou a aberta (por qualquer caminho): a marca sai junto
create or replace function public.trg_concluida_pela_familia_limpa()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'concluido' and new.status is distinct from 'concluido' then
    new.concluida_pela_familia_nome := null;
    new.concluida_pela_familia_em := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_concluida_pela_familia_limpa on public.tasks;
create trigger trg_concluida_pela_familia_limpa before update on public.tasks
  for each row execute function public.trg_concluida_pela_familia_limpa();

-- ------------------------------------------------------------
-- 2) As tarefas próprias da família
-- ------------------------------------------------------------
create table if not exists public.familia_tarefa (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  empresa_id     uuid references public.empresas (id) on delete cascade,
  titulo         text not null,
  detalhe        text,
  quando         date,
  quem           text,
  feita_em       timestamptz,
  feita_por_nome text,
  criado_por     uuid references auth.users (id) on delete set null,
  autor_nome     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.familia_tarefa drop constraint if exists familia_tarefa_textos_check;
alter table public.familia_tarefa add constraint familia_tarefa_textos_check
  check (char_length(btrim(titulo)) between 1 and 120
         and (detalhe is null or char_length(detalhe) <= 160)
         and (quem is null or char_length(quem) <= 40));

create index if not exists idx_familia_tarefa_evento on public.familia_tarefa (event_id, quando);

drop trigger if exists trg_fill_empresa on public.familia_tarefa;
create trigger trg_fill_empresa before insert on public.familia_tarefa
  for each row execute function public.fill_empresa_from_event();

-- autor e "quem marcou": do login, nunca do navegador
create or replace function public.trg_familia_tarefa_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
                   where ea.event_id = new.event_id and ea.user_id = auth.uid()
                     and ea.status = 'ativo' limit 1);
begin
  if tg_op = 'INSERT' then
    new.criado_por := auth.uid();
    new.autor_nome := v_nome;
    if new.feita_em is not null then
      new.feita_em := now();
      new.feita_por_nome := v_nome;
    else
      new.feita_por_nome := null;
    end if;
  else
    new.criado_por := old.criado_por;
    new.autor_nome := old.autor_nome;
    new.event_id := old.event_id;
    if new.feita_em is null then
      new.feita_por_nome := null;
    elsif old.feita_em is null then
      new.feita_em := now();
      new.feita_por_nome := v_nome;
    else
      new.feita_em := old.feita_em;
      new.feita_por_nome := old.feita_por_nome;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.trg_familia_tarefa_antes() from public, anon;

drop trigger if exists trg_familia_tarefa_antes on public.familia_tarefa;
create trigger trg_familia_tarefa_antes before insert or update on public.familia_tarefa
  for each row execute function public.trg_familia_tarefa_antes();

alter table public.familia_tarefa enable row level security;

-- a equipe lê; só a família escreve
drop policy if exists familia_tarefa_select on public.familia_tarefa;
create policy familia_tarefa_select on public.familia_tarefa
  for select to authenticated using (
    public.pode_ver_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

drop policy if exists familia_tarefa_insert on public.familia_tarefa;
create policy familia_tarefa_insert on public.familia_tarefa
  for insert to authenticated with check (event_id in (select public.eventos_da_cliente()));

drop policy if exists familia_tarefa_update on public.familia_tarefa;
create policy familia_tarefa_update on public.familia_tarefa
  for update to authenticated
  using (event_id in (select public.eventos_da_cliente()))
  with check (event_id in (select public.eventos_da_cliente()));

drop policy if exists familia_tarefa_delete on public.familia_tarefa;
create policy familia_tarefa_delete on public.familia_tarefa
  for delete to authenticated using (event_id in (select public.eventos_da_cliente()));

-- ------------------------------------------------------------
-- 3) As funções do portal
-- ------------------------------------------------------------
-- 3a) O que a cerimonialista pediu à família. Lista fechada de campos:
-- nada de descrição, valor, fornecedor.
create or replace function public.portal_tarefas_pedidas(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.sou_cliente_do_evento(p_event_id) then null
    else coalesce((
      select json_agg(json_build_object(
          'id',        t.id,
          'titulo',    t.title,
          'prazo',     t.due_date,
          'hora',      t.due_time,
          'local',     t.local,
          'feita',     t.status = 'concluido',
          'feita_por', t.concluida_pela_familia_nome,
          'feita_em',  t.concluida_pela_familia_em
        ) order by t.due_date nulls last, t.title)
      from public.tasks t
      where t.event_id = p_event_id
        and t.responsavel in ('noivos', 'ambos')), '[]'::json)
  end;
$$;

revoke all on function public.portal_tarefas_pedidas(uuid) from public, anon;
grant execute on function public.portal_tarefas_pedidas(uuid) to authenticated;

-- 3b) Marcar como feita (ou desfazer) o que a cerimonialista pediu
create or replace function public.portal_concluir_tarefa(p_task_id uuid, p_feita boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t    public.tasks%rowtype;
  v_nome text;
  v_ev   public.events%rowtype;
  v_resp uuid;
begin
  select * into v_t from public.tasks where id = p_task_id for update;
  if not found or v_t.event_id is null
     or not public.sou_cliente_do_evento(v_t.event_id)
     or coalesce(v_t.responsavel, '') not in ('noivos', 'ambos') then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;

  if not p_feita then
    if v_t.status <> 'concluido' then
      return json_build_object('ok', true);
    end if;
    -- só desfaz o que a própria família marcou
    if v_t.concluida_pela_familia_em is null then
      return json_build_object('ok', false, 'erro', 'marcada_pela_equipe');
    end if;
    update public.tasks set status = 'pendente' where id = v_t.id;
    return json_build_object('ok', true);
  end if;

  if v_t.status = 'concluido' then
    return json_build_object('ok', true);
  end if;

  v_nome := coalesce(
    (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
      where ea.event_id = v_t.event_id and ea.user_id = auth.uid() and ea.status = 'ativo'
      limit 1),
    'A família');
  update public.tasks
     set status = 'concluido',
         concluida_pela_familia_nome = v_nome,
         concluida_pela_familia_em = now()
   where id = v_t.id;

  -- avisa quem cuida do evento (nunca derruba a conclusão)
  begin
    select * into v_ev from public.events where id = v_t.event_id;
    select me.user_id into v_resp from public.membros_equipe me
     where me.id = v_ev.cerimonialista_responsavel_id;
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal',
            left(v_nome || ' concluiu: ' || v_t.title, 200),
            'Veja nas tarefas do evento.', '/eventos/' || v_t.event_id || '/organizacao');
  exception when others then
    null;
  end;
  return json_build_object('ok', true);
end $$;

revoke all on function public.portal_concluir_tarefa(uuid, boolean) from public, anon;
grant execute on function public.portal_concluir_tarefa(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 4) Conferência — tudo true
-- ------------------------------------------------------------
select 'tasks guarda quem da família concluiu' as item,
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'tasks'
           and column_name in ('concluida_pela_familia_nome', 'concluida_pela_familia_em')) as ok
union all
select 'a tabela das tarefas da família existe, com RLS ligada',
       coalesce((select c.relrowsecurity from pg_class c
                  where c.oid = to_regclass('public.familia_tarefa')), false)
union all
select 'quatro policies (a equipe lê, a família escreve)',
       (select count(*) = 4 from pg_policies
         where schemaname = 'public' and tablename = 'familia_tarefa')
union all
select 'a família lê do pedido só título, prazo, hora e local',
       (select p.prosrc !~* 'description|valor|supplier'
          from pg_proc p where p.proname = 'portal_tarefas_pedidas'
           and p.pronamespace = 'public'::regnamespace)
union all
select 'o anônimo não executa as funções do portal',
       not has_function_privilege('anon', 'public.portal_tarefas_pedidas(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_concluir_tarefa(uuid, boolean)', 'execute')
union all
select 'os gatilhos no lugar',
       (select count(*) = 3 from pg_trigger t
         where not t.tgisinternal
           and ((t.tgrelid = 'public.tasks'::regclass and t.tgname = 'trg_concluida_pela_familia_limpa')
             or (t.tgrelid = 'public.familia_tarefa'::regclass
                 and t.tgname in ('trg_fill_empresa', 'trg_familia_tarefa_antes'))));
