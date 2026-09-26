-- ============================================================
-- 181 — A paleta e os fornecedores da família (Portal v2, fase 6)
-- ============================================================
-- 1) PALETA: a família monta as 3 a 5 cores da festa (nome + cor), a
--    partir do zero ou de uma das paletas da cerimonialista. Grava no guia
--    de estilo de sempre (096) — o da cerimonialista, que ela continua
--    vendo e editando no Planejamento. Guia aprovado que a família muda
--    vira "alterado", com autor no histórico e aviso no sino.
-- 2) FORNECEDORES: os da cerimonialista (nome, categoria, se já está
--    contratado e o que faz na noite — pelo roteiro), sem contato, sem
--    valor, sem documento; e os "da família" (fotógrafo do tio, a
--    maquiadora de sempre), que a família cadastra e a equipe lê.
--
-- Idempotente. Termina com a conferência (tudo true).

-- ------------------------------------------------------------
-- 1) A paleta
-- ------------------------------------------------------------
create or replace function public.portal_paleta(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.sou_cliente_do_evento(p_event_id) then null
    else json_build_object(
      'guia', (select json_build_object('id', g.id, 'situacao', g.situacao, 'sensacao', g.sensacao,
                                        'aprovado_nome', g.aprovado_nome)
                 from public.evento_guia_estilo g where g.event_id = p_event_id),
      'cores', coalesce((select json_agg(json_build_object('nome', c.nome, 'hex', c.hex, 'papel', c.papel) order by c.ordem)
                           from public.evento_guia_cor c
                           join public.evento_guia_estilo g on g.id = c.guia_id
                          where g.event_id = p_event_id), '[]'::json),
      'paletas', coalesce((select json_agg(json_build_object(
                             'id', p.id, 'nome', p.nome, 'sensacao', p.sensacao,
                             'cores', (select coalesce(json_agg(json_build_object('nome', pc.nome, 'hex', pc.hex) order by pc.ordem), '[]'::json)
                                         from public.paleta_biblioteca_cor pc where pc.paleta_id = p.id))
                           order by p.ordem, p.nome)
                           from public.paleta_biblioteca p
                           join public.events e on e.id = p_event_id
                          where p.empresa_id = e.empresa_id or p.empresa_id is null), '[]'::json)
    )
  end;
$$;

revoke all on function public.portal_paleta(uuid) from public, anon;
grant execute on function public.portal_paleta(uuid) to authenticated;

-- p_cores: [{nome, hex}] — a ordem é a da tela; a primeira é a principal
create or replace function public.portal_paleta_salvar(p_event_id uuid, p_cores jsonb, p_sensacao text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guia  public.evento_guia_estilo%rowtype;
  v_nome  text;
  v_c     jsonb;
  v_i     int := 0;
  v_ev    public.events%rowtype;
  v_resp  uuid;
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    return json_build_object('ok', false, 'erro', 'sem_acesso');
  end if;
  if p_cores is null or jsonb_typeof(p_cores) <> 'array'
     or jsonb_array_length(p_cores) < 1 or jsonb_array_length(p_cores) > 5 then
    return json_build_object('ok', false, 'erro', 'quantas');
  end if;
  for v_c in select * from jsonb_array_elements(p_cores) loop
    if coalesce(v_c ->> 'hex', '') !~* '^#[0-9a-f]{6}$'
       or char_length(btrim(coalesce(v_c ->> 'nome', ''))) not between 1 and 40 then
      return json_build_object('ok', false, 'erro', 'cor');
    end if;
  end loop;

  v_nome := coalesce(
    (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
      where ea.event_id = p_event_id and ea.user_id = auth.uid() and ea.status = 'ativo' limit 1),
    'A família');

  select * into v_guia from public.evento_guia_estilo where event_id = p_event_id for update;
  if not found then
    insert into public.evento_guia_estilo (event_id, nome, sensacao, situacao, criado_por)
    values (p_event_id, 'Guia de estilo', nullif(left(btrim(coalesce(p_sensacao, '')), 200), ''), 'montagem', auth.uid())
    returning * into v_guia;
  else
    update public.evento_guia_estilo
       set sensacao = coalesce(nullif(left(btrim(coalesce(p_sensacao, '')), 200), ''), sensacao),
           situacao = case when situacao = 'aprovado' then 'alterado' else situacao end,
           updated_at = now()
     where id = v_guia.id;
  end if;

  delete from public.evento_guia_cor where guia_id = v_guia.id;
  for v_c in select * from jsonb_array_elements(p_cores) loop
    insert into public.evento_guia_cor (guia_id, nome, papel, hex, ordem)
    values (v_guia.id, left(btrim(v_c ->> 'nome'), 40), case when v_i = 0 then 'principal' else 'apoio' end,
            lower(v_c ->> 'hex'), v_i * 10);
    v_i := v_i + 1;
  end loop;

  insert into public.evento_guia_historico (guia_id, tipo, texto, autor_user_id)
  values (v_guia.id, 'alterado', v_nome || ' mudou a paleta (' || v_i || ' cores)', auth.uid());

  -- avisa quem cuida do evento (nunca derruba a gravação)
  begin
    select * into v_ev from public.events where id = p_event_id;
    select me.user_id into v_resp from public.membros_equipe me where me.id = v_ev.cerimonialista_responsavel_id;
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal', left(v_nome || ' mudou a paleta da festa', 200),
            'Veja no guia de estilo.', '/eventos/' || p_event_id || '/planejamento');
  exception when others then
    null;
  end;
  return json_build_object('ok', true);
end $$;

revoke all on function public.portal_paleta_salvar(uuid, jsonb, text) from public, anon;
grant execute on function public.portal_paleta_salvar(uuid, jsonb, text) to authenticated;

-- ------------------------------------------------------------
-- 2) Os fornecedores da festa
-- ------------------------------------------------------------
create or replace function public.portal_fornecedores_da_festa(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select o.supplier_id from public.evento_fornecedor_orcamento o where o.event_id = p_event_id
    union
    select r.supplier_id from public.roteiro_items r where r.event_id = p_event_id and r.supplier_id is not null
  )
  select case
    when not public.sou_cliente_do_evento(p_event_id) then null
    else coalesce((
      select json_agg(json_build_object(
          'id', s.id,
          'nome', s.name,
          'categoria', s.category,
          'contratado', exists (select 1 from public.evento_fornecedor_orcamento o
                                 where o.event_id = p_event_id and o.supplier_id = s.id
                                   and (o.assinado_em is not null or coalesce(o.valor_alocado, 0) > 0)),
          'na_noite', coalesce((select json_agg(json_build_object('hora', r.time, 'titulo', r.title)
                                               order by r.time nulls last, r."order")
                                  from public.roteiro_items r
                                 where r.event_id = p_event_id and r.supplier_id = s.id), '[]'::json)
        ) order by s.name)
      from ids join public.suppliers s on s.id = ids.supplier_id), '[]'::json)
  end;
$$;

revoke all on function public.portal_fornecedores_da_festa(uuid) from public, anon;
grant execute on function public.portal_fornecedores_da_festa(uuid) to authenticated;

create table if not exists public.familia_fornecedor (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete cascade,
  nome        text not null,
  o_que_faz   text,
  contato     text,
  contratado  boolean not null default false,
  criado_por  uuid references auth.users (id) on delete set null,
  autor_nome  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.familia_fornecedor drop constraint if exists familia_fornecedor_textos_check;
alter table public.familia_fornecedor add constraint familia_fornecedor_textos_check
  check (char_length(btrim(nome)) between 1 and 80
         and (o_que_faz is null or char_length(o_que_faz) <= 120)
         and (contato is null or char_length(contato) <= 80));

create index if not exists idx_familia_fornecedor_evento on public.familia_fornecedor (event_id, created_at);

drop trigger if exists trg_fill_empresa on public.familia_fornecedor;
create trigger trg_fill_empresa before insert on public.familia_fornecedor
  for each row execute function public.fill_empresa_from_event();

create or replace function public.trg_familia_fornecedor_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := auth.uid();
    new.autor_nome := (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
                        where ea.event_id = new.event_id and ea.user_id = auth.uid() and ea.status = 'ativo' limit 1);
  else
    new.criado_por := old.criado_por;
    new.autor_nome := old.autor_nome;
    new.event_id := old.event_id;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.trg_familia_fornecedor_autor() from public, anon;

drop trigger if exists trg_familia_fornecedor_autor on public.familia_fornecedor;
create trigger trg_familia_fornecedor_autor before insert or update on public.familia_fornecedor
  for each row execute function public.trg_familia_fornecedor_autor();

alter table public.familia_fornecedor enable row level security;

drop policy if exists familia_fornecedor_select on public.familia_fornecedor;
create policy familia_fornecedor_select on public.familia_fornecedor
  for select to authenticated using (
    public.pode_ver_evento(event_id) or event_id in (select public.eventos_da_cliente())
  );
drop policy if exists familia_fornecedor_escrita on public.familia_fornecedor;
create policy familia_fornecedor_escrita on public.familia_fornecedor
  for all to authenticated
  using (event_id in (select public.eventos_da_cliente()))
  with check (event_id in (select public.eventos_da_cliente()));

-- ------------------------------------------------------------
-- 3) Conferência — tudo true
-- ------------------------------------------------------------
select 'as funções do portal existem e o anônimo não executa' as item,
       not has_function_privilege('anon', 'public.portal_paleta(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_paleta_salvar(uuid, jsonb, text)', 'execute')
       and not has_function_privilege('anon', 'public.portal_fornecedores_da_festa(uuid)', 'execute') as ok
union all
select 'os fornecedores da festa não entregam contato, valor nem documento',
       (select p.prosrc !~* 'phone|telefone|email|cpf|cnpj|valor_negociado|notes'
          from pg_proc p where p.proname = 'portal_fornecedores_da_festa' and p.pronamespace = 'public'::regnamespace)
union all
select 'fornecedores da família: RLS ligada, a equipe lê e a família escreve',
       coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.familia_fornecedor')), false)
       and (select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'familia_fornecedor')
union all
select 'os gatilhos no lugar',
       (select count(*) = 2 from pg_trigger t
         where not t.tgisinternal and t.tgrelid = 'public.familia_fornecedor'::regclass
           and t.tgname in ('trg_fill_empresa', 'trg_familia_fornecedor_autor'));
