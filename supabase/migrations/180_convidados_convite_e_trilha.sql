-- ============================================================
-- 180 — Os convidados, o convite e a trilha (Portal da família v2, fase 5)
-- ============================================================
-- 1) O RSVP por pessoa: faixa (adulto, 6 a 12, 0 a 5) e sexo OPCIONAL de
--    quem confirma e de cada acompanhante, e as restrições em categoria.
--    Os acompanhantes são os NOMINAIS da 129 (evento_acompanhante): o
--    gatilho de lá já mantém acompanhantes/criancas, que é o que o buffet,
--    as mesas e a porta leem. Aqui eles só ganham faixa e sexo.
-- 2) A trilha da noite: uma música por momento, escolhida pela família.
-- 3) O convite com a cara da festa: a cor, o retrato (SÓ quando o
--    responsável ligou "usar no convite") e a música da entrada.
-- 4) O salão para a família: as mesas e os elementos, só leitura.
-- 5) "Usar o retrato no convite" é decisão do responsável, não da
--    debutante (o convite sai para fora da família).
--
-- Idempotente. Termina com a conferência (tudo true).

-- ------------------------------------------------------------
-- 1) O convidado por pessoa
-- ------------------------------------------------------------
alter table public.evento_convidado
  add column if not exists faixa text,
  add column if not exists sexo  text;
alter table public.evento_acompanhante
  add column if not exists faixa text,
  add column if not exists sexo  text;

alter table public.evento_convidado drop constraint if exists convidado_faixa_check;
alter table public.evento_convidado add constraint convidado_faixa_check
  check (faixa is null or faixa in ('adulto', '6-12', '0-5'));
alter table public.evento_convidado drop constraint if exists convidado_sexo_check;
alter table public.evento_convidado add constraint convidado_sexo_check
  check (sexo is null or sexo in ('feminino', 'masculino', 'nd'));
alter table public.evento_acompanhante drop constraint if exists acompanhante_faixa_check;
alter table public.evento_acompanhante add constraint acompanhante_faixa_check
  check (faixa is null or faixa in ('adulto', '6-12', '0-5'));
alter table public.evento_acompanhante drop constraint if exists acompanhante_sexo_check;
alter table public.evento_acompanhante add constraint acompanhante_sexo_check
  check (sexo is null or sexo in ('feminino', 'masculino', 'nd'));

-- A resposta do convite com cada pessoa. p_pessoas[0] é quem recebeu o
-- convite (só faixa e sexo contam); o resto são os acompanhantes. Mesmas
-- travas do convite de sempre: link válido, RSVP aberto e ninguém do
-- grupo passou pela porta (148).
create or replace function public.responder_convite_por_pessoa(
  p_hash        text,
  p_confirmacao text,
  p_pessoas     jsonb default '[]'::jsonb,
  p_restricoes  text[] default '{}',
  p_recado      text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_c      public.evento_convidado%rowtype;
  v_aberto boolean;
  v_eu     jsonb;
  v_p      jsonb;
  v_faixa  text;
  v_nome   text;
  v_rest   text[];
  i        int;
begin
  if p_confirmacao not in ('confirmado', 'nao_vai') then
    return json_build_object('ok', false, 'erro', 'resposta_invalida');
  end if;
  if p_pessoas is null or jsonb_typeof(p_pessoas) <> 'array' then
    p_pessoas := '[]'::jsonb;
  end if;

  select * into v_c from public.evento_convidado where hash = p_hash for update;
  if not found then
    return json_build_object('ok', false, 'erro', 'convite_invalido');
  end if;
  select e.rsvp_aberto is not false into v_aberto from public.events e where e.id = v_c.event_id;
  if not coalesce(v_aberto, true) then
    return json_build_object('ok', false, 'erro', 'encerrado');
  end if;
  if exists (select 1 from public.evento_chegada ch where ch.convidado_id = v_c.id) then
    return json_build_object('ok', false, 'erro', 'ja_na_festa');
  end if;

  if p_confirmacao = 'nao_vai' then
    update public.evento_convidado
       set confirmacao = 'nao_vai', restricao_tipo = '{}',
           recado = nullif(left(btrim(coalesce(p_recado, '')), 500), ''),
           confirmado_em = now(), confirmado_via = 'link', updated_at = now()
     where id = v_c.id;
    delete from public.evento_acompanhante where convidado_id = v_c.id;
    update public.evento_convidado set acompanhantes = 0, criancas = 0 where id = v_c.id;
    return json_build_object('ok', true, 'confirmacao', 'nao_vai');
  end if;

  v_eu := coalesce(p_pessoas -> 0, '{}'::jsonb);
  select coalesce(array_agg(distinct r), '{}') into v_rest
    from unnest(coalesce(p_restricoes, '{}')) r
   where r in ('vegano', 'vegetariano', 'sem_gluten', 'sem_lactose', 'alergia', 'outro');

  update public.evento_convidado
     set confirmacao    = 'confirmado',
         faixa          = case when v_eu ->> 'faixa' in ('adulto', '6-12', '0-5') then v_eu ->> 'faixa' else coalesce(faixa, 'adulto') end,
         sexo           = case when v_eu ->> 'sexo' in ('feminino', 'masculino', 'nd') then v_eu ->> 'sexo' else null end,
         restricao_tipo = v_rest,
         recado         = nullif(left(btrim(coalesce(p_recado, '')), 500), ''),
         confirmado_em  = now(),
         confirmado_via = 'link',
         updated_at     = now()
   where id = v_c.id;

  -- os acompanhantes: a lista inteira é substituída (no máximo 10); o
  -- gatilho da 129 refaz acompanhantes e crianças a cada linha
  delete from public.evento_acompanhante where convidado_id = v_c.id;
  update public.evento_convidado set acompanhantes = 0, criancas = 0 where id = v_c.id;
  for i in 1 .. least(jsonb_array_length(p_pessoas) - 1, 10) loop
    v_p := p_pessoas -> i;
    v_faixa := case when v_p ->> 'faixa' in ('adulto', '6-12', '0-5') then v_p ->> 'faixa' else 'adulto' end;
    v_nome := coalesce(nullif(left(btrim(coalesce(v_p ->> 'nome', '')), 120), ''), 'Acompanhante ' || i);
    insert into public.evento_acompanhante (convidado_id, nome, eh_crianca, ordem, faixa, sexo)
    values (v_c.id, v_nome, v_faixa <> 'adulto', i * 10, v_faixa,
            case when v_p ->> 'sexo' in ('feminino', 'masculino', 'nd') then v_p ->> 'sexo' end);
  end loop;

  return json_build_object('ok', true, 'confirmacao', 'confirmado',
                           'pessoas', 1 + greatest(0, least(jsonb_array_length(p_pessoas) - 1, 10)));
end $$;

revoke all on function public.responder_convite_por_pessoa(text, text, jsonb, text[], text) from public;
grant execute on function public.responder_convite_por_pessoa(text, text, jsonb, text[], text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2) A trilha da noite
-- ------------------------------------------------------------
create table if not exists public.evento_trilha (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id) on delete cascade,
  momento      text not null,
  titulo       text not null,
  artista      text,
  capa_url     text,
  preview_url  text,
  duracao_s    int,
  link         text,
  escolhido_por      uuid references auth.users (id) on delete set null,
  escolhido_por_nome text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, momento)
);

alter table public.evento_trilha drop constraint if exists evento_trilha_campos_check;
alter table public.evento_trilha add constraint evento_trilha_campos_check
  check (momento in ('entrada', 'valsa', 'principe', 'velas', 'parabens', 'balada')
         and char_length(btrim(titulo)) between 1 and 160
         and (artista is null or char_length(artista) <= 160)
         and (duracao_s is null or duracao_s between 1 and 3600)
         -- só endereços https, e só de onde a tela sabe tocar ou abrir
         and (capa_url is null or capa_url ~ '^https://[a-z0-9.-]*mzstatic\.com/')
         and (preview_url is null or preview_url ~ '^https://[a-z0-9.-]*(itunes\.apple\.com|mzstatic\.com)/')
         and (link is null or link ~ '^https://(open\.spotify\.com|(www\.|m\.|music\.)?youtube\.com|youtu\.be|music\.apple\.com)/'));

drop trigger if exists trg_fill_empresa on public.evento_trilha;
create trigger trg_fill_empresa before insert on public.evento_trilha
  for each row execute function public.fill_empresa_from_event();

create or replace function public.trg_trilha_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.escolhido_por := auth.uid();
  new.escolhido_por_nome := coalesce(
    (select nullif(btrim(ea.nome), '') from public.evento_acesso ea
      where ea.event_id = new.event_id and ea.user_id = auth.uid() and ea.status = 'ativo' limit 1),
    (select nullif(btrim(m.nome), '') from public.membros_equipe m where m.user_id = auth.uid() limit 1));
  if tg_op = 'UPDATE' then
    new.event_id := old.event_id;
    new.momento := old.momento;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.trg_trilha_autor() from public, anon;

drop trigger if exists trg_trilha_autor on public.evento_trilha;
create trigger trg_trilha_autor before insert or update on public.evento_trilha
  for each row execute function public.trg_trilha_autor();

alter table public.evento_trilha enable row level security;

drop policy if exists evento_trilha_select on public.evento_trilha;
create policy evento_trilha_select on public.evento_trilha
  for select to authenticated using (
    public.pode_ver_evento(event_id) or event_id in (select public.eventos_da_cliente())
  );
drop policy if exists evento_trilha_escrita on public.evento_trilha;
create policy evento_trilha_escrita on public.evento_trilha
  for all to authenticated
  using (public.pode_editar_evento(event_id) or event_id in (select public.eventos_da_cliente()))
  with check (public.pode_editar_evento(event_id) or event_id in (select public.eventos_da_cliente()));

-- ------------------------------------------------------------
-- 3) O convite com a cara da festa (pelo hash, sem login)
-- ------------------------------------------------------------
-- Lista fechada: a cor, o retrato só com o "usar no convite" ligado, a
-- música da entrada, e a resposta DESTE convidado (para mudar). Nada da
-- lista, nada de contato.
create or replace function public.convite_da_festa(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'tipo',     e.type,
    'nome_evento', e.name,
    'cor',      case when s.event_id is null then null
                     else json_build_object('l', s.cor_l, 'c', s.cor_c, 'h', s.cor_h) end,
    'retrato_path', case when s.retrato_no_convite then s.retrato_path end,
    'entrada',  (select json_build_object('titulo', t.titulo, 'artista', t.artista, 'preview_url', t.preview_url)
                   from public.evento_trilha t
                  where t.event_id = e.id and t.momento = 'entrada'),
    'faixa',    c.faixa,
    'sexo',     c.sexo,
    'pessoas',  coalesce((select json_agg(json_build_object(
                             'nome', a.nome,
                             'faixa', coalesce(a.faixa, case when a.eh_crianca then '6-12' else 'adulto' end),
                             'sexo', a.sexo) order by a.ordem)
                            from public.evento_acompanhante a where a.convidado_id = c.id), '[]'::json),
    'restricoes', c.restricao_tipo,
    'recado',   c.recado
  )
  from public.evento_convidado c
  join public.events e on e.id = c.event_id
  left join public.evento_portal_estilo s on s.event_id = e.id
  where c.hash = p_hash;
$$;

revoke all on function public.convite_da_festa(text) from public;
grant execute on function public.convite_da_festa(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) O salão para a família (só leitura)
-- ------------------------------------------------------------
create or replace function public.portal_salao(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.sou_cliente_do_evento(p_event_id) then null
    else json_build_object(
      'mesas', coalesce((
        select json_agg(json_build_object(
            'id', m.id, 'rotulo', m.rotulo, 'tipo', m.tipo, 'lugares', m.lugares,
            'x', m.x_cm, 'y', m.y_cm) order by m.rotulo)
        from public.evento_mesa m where m.event_id = p_event_id), '[]'::json),
      'elementos', coalesce((
        select json_agg(json_build_object(
            'tipo', el.tipo, 'rotulo', el.rotulo, 'x', el.x_cm, 'y', el.y_cm,
            'largura', el.largura_cm, 'altura', el.altura_cm))
        from public.evento_elemento el
        where el.event_id = p_event_id and el.tipo in ('pista', 'palco', 'bar')), '[]'::json)
    )
  end;
$$;

revoke all on function public.portal_salao(uuid) from public, anon;
grant execute on function public.portal_salao(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) "Usar o retrato no convite" é do responsável
-- ------------------------------------------------------------
create or replace function public.trg_retrato_no_convite_do_responsavel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.retrato_no_convite is distinct from old.retrato_no_convite
     and exists (select 1 from public.evento_acesso ea
                  where ea.event_id = new.event_id and ea.user_id = auth.uid()
                    and ea.status = 'ativo' and ea.papel = 'debutante') then
    new.retrato_no_convite := old.retrato_no_convite;
  end if;
  return new;
end $$;

revoke all on function public.trg_retrato_no_convite_do_responsavel() from public, anon;

drop trigger if exists trg_retrato_no_convite on public.evento_portal_estilo;
create trigger trg_retrato_no_convite before update on public.evento_portal_estilo
  for each row execute function public.trg_retrato_no_convite_do_responsavel();

-- ------------------------------------------------------------
-- 6) Conferência — tudo true
-- ------------------------------------------------------------
select 'convidado e acompanhante guardam faixa e sexo' as item,
       (select count(*) = 4 from information_schema.columns
         where table_schema = 'public' and table_name in ('evento_convidado', 'evento_acompanhante')
           and column_name in ('faixa', 'sexo')) as ok
union all
select 'a trilha existe, com RLS ligada e duas policies',
       coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.evento_trilha')), false)
       and (select count(*) = 2 from pg_policies where schemaname = 'public' and tablename = 'evento_trilha')
union all
select 'o convite público responde e mostra a festa (anônimo executa)',
       has_function_privilege('anon', 'public.responder_convite_por_pessoa(text, text, jsonb, text[], text)', 'execute')
       and has_function_privilege('anon', 'public.convite_da_festa(text)', 'execute')
union all
select 'o convite público não entrega contato',
       (select p.prosrc !~* 'telefone|email|acessibilidade|restricao_alimentar'
          from pg_proc p where p.proname = 'convite_da_festa' and p.pronamespace = 'public'::regnamespace)
union all
select 'o salão só para quem está logado',
       not has_function_privilege('anon', 'public.portal_salao(uuid)', 'execute')
union all
select 'os gatilhos no lugar',
       (select count(*) = 3 from pg_trigger t
         where not t.tgisinternal
           and ((t.tgrelid = 'public.evento_trilha'::regclass and t.tgname in ('trg_fill_empresa', 'trg_trilha_autor'))
             or (t.tgrelid = 'public.evento_portal_estilo'::regclass and t.tgname = 'trg_retrato_no_convite')));
