-- ============================================================
-- 177 — AS ESCOLHAS DE MÃO DUPLA
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Portal da família, fase 2 (desenho "Portal da Família v2", 25/09/2026).
-- Regra do dono: a cerimonialista manda opções E a família escolhe OU
-- propõe a dela, em qualquer decisão. Limitar demais as escolhas afasta.
--
-- O que nasce:
--   * decisao_proposta — a opção que a FAMÍLIA propõe (foto, link,
--     fornecedor, texto). A cerimonialista aceita ou responde. Mesma
--     ideia das sugestões de cronograma da 092: a família nunca edita o
--     trabalho da cerimonialista; ela propõe numa tabela própria.
--   * portal_escolhas(evento) — as decisões que a tela Escolhas mostra,
--     com quem decide, o prazo e o estado (evento_objetivo continua
--     fechado para a família; o nome do assunto sai por aqui).
--   * portal_desfazer_escolha(curadoria) — a família volta atrás
--     enquanto a decisão não fechou.
--
-- Quem decide segue o método: responsavel 'noivos' = a família decide;
-- 'ambos' = decidem juntas; 'cerimonialista' = ela decide, a família
-- sugere. A decisão só fica "decidida" quando a cerimonialista fecha no
-- Planejamento (é o que gera as tarefas).

-- ------------------------------------------------------------------
-- 1) A proposta da família
-- ------------------------------------------------------------------
create table if not exists public.decisao_proposta (
  id                 uuid primary key default gen_random_uuid(),
  evento_decisao_id  uuid not null references public.evento_decisao (id) on delete cascade,
  event_id           uuid not null references public.events (id) on delete cascade,
  empresa_id         uuid references public.empresas (id),
  titulo             text not null,
  texto              text,
  link               text,
  fornecedor_nome    text,
  foto_path          text,
  autor_nome         text,
  criado_por         uuid references auth.users (id) on delete set null,
  estado             text not null default 'aguardando',
  resposta           text,
  respondida_em      timestamptz,
  respondida_por     uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_decisao_proposta_evento
  on public.decisao_proposta (event_id, evento_decisao_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'decisao_proposta_estado_chk') then
    alter table public.decisao_proposta add constraint decisao_proposta_estado_chk
      check (estado in ('aguardando', 'aceita', 'recusada'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decisao_proposta_tamanhos_chk') then
    alter table public.decisao_proposta add constraint decisao_proposta_tamanhos_chk
      check (char_length(btrim(titulo)) between 1 and 80
             and (texto is null or char_length(texto) <= 600)
             and (fornecedor_nome is null or char_length(fornecedor_nome) <= 80)
             and (resposta is null or char_length(resposta) <= 600));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'decisao_proposta_link_chk') then
    alter table public.decisao_proposta add constraint decisao_proposta_link_chk
      check (link is null or (char_length(link) <= 300 and link ~* '^https?://'));
  end if;
  -- a foto só pode morar na pasta do PRÓPRIO evento (balde inspiracoes)
  if not exists (select 1 from pg_constraint where conname = 'decisao_proposta_foto_chk') then
    alter table public.decisao_proposta add constraint decisao_proposta_foto_chk
      check (foto_path is null or foto_path like event_id::text || '/%');
  end if;
end $$;

drop trigger if exists trg_fill_empresa on public.decisao_proposta;
create trigger trg_fill_empresa before insert on public.decisao_proposta
  for each row execute function public.fill_empresa_from_event();

-- antes de gravar: a decisão é DAQUELE evento, o autor é quem está
-- logado, e a família só cria proposta aguardando (não se auto-aceita)
create or replace function public.trg_proposta_antes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev uuid;
begin
  if tg_op = 'INSERT' then
    select ed.event_id into v_ev from public.evento_decisao ed where ed.id = new.evento_decisao_id;
    if v_ev is null or v_ev <> new.event_id then
      raise exception 'decisão de outro evento';
    end if;
    new.criado_por := auth.uid();
    new.autor_nome := coalesce(
      (select ea.nome from public.evento_acesso ea
        where ea.event_id = new.event_id and ea.user_id = auth.uid() and ea.status = 'ativo'
        limit 1),
      (select m.nome from public.membros_equipe m where m.user_id = auth.uid() limit 1)
    );
    if not public.pode_editar_evento(new.event_id) then
      new.estado := 'aguardando';
      new.resposta := null;
      new.respondida_em := null;
      new.respondida_por := null;
    end if;
    return new;
  end if;

  -- UPDATE (só a equipe chega aqui, pela policy)
  new.updated_at := now();
  if new.estado is distinct from old.estado or new.resposta is distinct from old.resposta then
    new.respondida_em := now();
    new.respondida_por := auth.uid();
  end if;
  -- o que a família escreveu não muda
  new.titulo := old.titulo;
  new.texto := old.texto;
  new.link := old.link;
  new.fornecedor_nome := old.fornecedor_nome;
  new.foto_path := old.foto_path;
  new.autor_nome := old.autor_nome;
  new.criado_por := old.criado_por;
  new.evento_decisao_id := old.evento_decisao_id;
  new.event_id := old.event_id;
  return new;
end $$;

revoke all on function public.trg_proposta_antes() from public, anon;

drop trigger if exists trg_proposta_antes on public.decisao_proposta;
create trigger trg_proposta_antes before insert or update on public.decisao_proposta
  for each row execute function public.trg_proposta_antes();

-- depois de criar: avisa quem cuida do evento (padrão agregado da 092)
create or replace function public.trg_proposta_avisa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev   public.events%rowtype;
  v_resp uuid;
  v_tit  text;
  v_link text;
begin
  if public.pode_editar_evento(new.event_id) then
    return null; -- a própria equipe não se avisa
  end if;
  select * into v_ev from public.events where id = new.event_id;
  select titulo into v_tit from public.evento_decisao where id = new.evento_decisao_id;
  select me.user_id into v_resp from public.membros_equipe me
   where me.id = v_ev.cerimonialista_responsavel_id;
  v_link := '/eventos/' || new.event_id || '/planejamento?decisao=' || new.evento_decisao_id;
  if not exists (
    select 1 from public.notifications n
    where n.link = v_link and n.read_at is null
      and n.cerimonialista_id = coalesce(v_resp, v_ev.cerimonialista_id)
  ) then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal',
            'A família propôs uma opção em ' || coalesce(v_tit, 'uma decisão'),
            'Veja no Planejamento.', v_link);
  end if;
  return null;
exception when others then
  -- aviso nunca derruba a proposta
  return null;
end $$;

revoke all on function public.trg_proposta_avisa() from public, anon;

drop trigger if exists trg_proposta_avisa on public.decisao_proposta;
create trigger trg_proposta_avisa after insert on public.decisao_proposta
  for each row execute function public.trg_proposta_avisa();

alter table public.decisao_proposta enable row level security;

drop policy if exists decisao_proposta_select on public.decisao_proposta;
create policy decisao_proposta_select on public.decisao_proposta
  for select using (
    public.pode_ver_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

drop policy if exists decisao_proposta_insert on public.decisao_proposta;
create policy decisao_proposta_insert on public.decisao_proposta
  for insert with check (
    public.pode_editar_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

-- responder é da equipe
drop policy if exists decisao_proposta_update on public.decisao_proposta;
create policy decisao_proposta_update on public.decisao_proposta
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

-- a família tira a PRÓPRIA proposta enquanto ninguém respondeu
drop policy if exists decisao_proposta_delete on public.decisao_proposta;
create policy decisao_proposta_delete on public.decisao_proposta
  for delete using (
    public.pode_editar_evento(event_id)
    or (event_id in (select public.eventos_da_cliente())
        and criado_por = auth.uid()
        and estado = 'aguardando')
  );

-- ------------------------------------------------------------------
-- 2) As decisões da tela Escolhas
-- ------------------------------------------------------------------
create or replace function public.portal_escolhas(p_event_id uuid)
returns table (
  id              uuid,
  titulo          text,
  objetivo_nome   text,
  responsavel     text,
  prazo_previsto  date,
  estado          text,
  decidida_em     timestamptz,
  ordem           int
)
language sql
stable
security definer
set search_path = public
as $$
  select ed.id, ed.titulo, eo.nome, ed.responsavel, ed.prazo_previsto,
         ed.estado, ed.decidida_em, ed.ordem
  from public.evento_decisao ed
  join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
  where ed.event_id = p_event_id
    and eo.ativo
    and ed.estado <> 'nao_se_aplica'
    and (public.sou_cliente_do_evento(p_event_id)
         or public.pode_ver_evento(p_event_id))
    and (
      ed.responsavel in ('noivos', 'ambos')
      or exists (select 1 from public.decisao_curadoria c
                  where c.evento_decisao_id = ed.id and c.estado <> 'rascunho')
      or exists (select 1 from public.decisao_proposta p
                  where p.evento_decisao_id = ed.id)
    )
  order by ed.prazo_previsto asc nulls last, ed.ordem asc;
$$;

revoke all on function public.portal_escolhas(uuid) from public, anon;
grant execute on function public.portal_escolhas(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 3) Desfazer a escolha enquanto a decisão não fechou
-- ------------------------------------------------------------------
create or replace function public.portal_desfazer_escolha(p_curadoria_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur public.decisao_curadoria%rowtype;
  v_est text;
begin
  select * into v_cur from public.decisao_curadoria where id = p_curadoria_id for update;
  if not found or not public.sou_cliente_do_evento(v_cur.event_id) then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if v_cur.estado <> 'escolhida' then
    return json_build_object('ok', false, 'erro', 'nada_a_desfazer');
  end if;
  select estado into v_est from public.evento_decisao where id = v_cur.evento_decisao_id;
  if v_est = 'decidida' then
    return json_build_object('ok', false, 'erro', 'ja_decidida');
  end if;
  update public.decisao_curadoria
     set estado = 'publicada', escolhida_opcao_id = null,
         respondida_em = null, updated_at = now()
   where id = p_curadoria_id;
  return json_build_object('ok', true);
end $$;

revoke all on function public.portal_desfazer_escolha(uuid) from public, anon;
grant execute on function public.portal_desfazer_escolha(uuid) to authenticated;

-- ------------------------------------------------------------------
-- 4) Conferência — tudo true
-- ------------------------------------------------------------------
select 'a tabela das propostas existe, com RLS ligada' as item,
       coalesce((select c.relrowsecurity from pg_class c
                  where c.oid = to_regclass('public.decisao_proposta')), false) as ok
union all
select 'quatro policies (ler, propor, responder, tirar)',
       (select count(*) = 4 from pg_policies
         where schemaname = 'public' and tablename = 'decisao_proposta')
union all
select 'os quatro CHECKs no lugar',
       (select count(*) = 4 from pg_constraint
         where conrelid = 'public.decisao_proposta'::regclass
           and conname like 'decisao_proposta_%_chk')
union all
select 'os três gatilhos no lugar',
       (select count(*) = 3 from pg_trigger t join pg_class c on c.oid = t.tgrelid
         where c.relname = 'decisao_proposta'
           and t.tgname in ('trg_fill_empresa', 'trg_proposta_antes', 'trg_proposta_avisa'))
union all
select 'anon não chama as funções novas; authenticated sim',
       not has_function_privilege('anon', 'public.portal_escolhas(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_desfazer_escolha(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_escolhas(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_desfazer_escolha(uuid)', 'execute');
