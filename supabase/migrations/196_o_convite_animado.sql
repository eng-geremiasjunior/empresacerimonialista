-- ============================================================
-- 196 — O CONVITE ANIMADO
-- ============================================================
-- O convite que o convidado recebe pelo WhatsApp e abre no celular (os 9
-- desenhos de design_handoff_convites, 02/10/2026). É outra coisa que o
-- site: tem um botão só, que leva ao site do casal, e nenhuma confirmação
-- de presença (essa é do site). Endereço: /c/<endereço-do-site>/convite.
--
-- A noiva escolhe o modelo (c01 a c09), a fonte (os 8 pares do site), a
-- paleta, o jeito dos nomes, a frase, o local e a foto.
--
-- SEM REVISÃO DO DONO, por decisão dele: o convite não sobe foto. A foto
-- é o CAMINHO de uma foto do balde 'site', e só sai se aparece no site no
-- ar (que já passou pela revisão) — conferido aqui e no servidor, que é
-- quem assina a URL. Os textos (frase, local, pais) vão ao ar quando o
-- casal salva.
--
-- SÓ O CASAL GRAVA. Como o site desde a 186 (nenhuma escrita do site
-- aceita a equipe), salvar o convite é coisa do casal: nível 'casal' no
-- portal ('gestao' + 'escrever' — o 'escrever' também barra o visitante
-- do catálogo, 195, que passa em 'gestao'). A equipe lê.
--
-- 1) evento_convite: uma linha por evento. RLS ligada e privilégios de
--    escrita tirados de anon e authenticated: ninguém escreve pela API,
--    só pela RPC. A trava do visitante do catálogo (195) também aqui.
-- 2) portal_convite(evento): o que está salvo, para o editor (a equipe
--    ou quem tem acesso de família ao evento).
-- 3) portal_salvar_convite(evento, dados): grava; lista fechada de
--    chaves; tipo, tamanho e formato conferidos aqui.
-- 4) convite_publico(endereço): o anônimo. Só com o site PUBLICADO e o
--    convite salvo; só o que o modelo desenha; a foto só se aparece no
--    site no ar.
--
-- Aditiva e convergente (pode rodar de novo, inclusive depois de editada:
-- o CHECK é recriado). Termina com a conferência (tudo true).
-- ============================================================

-- ------------------------------------------------------------
-- 0) Pré-condições: sem elas, nada roda (melhor parar aqui que no meio)
-- ------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.familia_pode(uuid, text)') is null
     or to_regprocedure('public.portal_pode(uuid, text)') is null then
    raise exception '196: falta a 189 (familia_pode / portal_pode)';
  end if;
  if to_regprocedure('public.sou_login_vitrine()') is null
     or to_regprocedure('public.vitrine_nao_grava()') is null then
    raise exception '196: falta a 195 (a trava do visitante do catálogo)';
  end if;
  if to_regprocedure('public.site_so_o_que_aparece(jsonb)') is null then
    raise exception '196: falta a 191 (site_so_o_que_aparece)';
  end if;
  if to_regprocedure('public.fill_empresa_from_event()') is null
     or to_regprocedure('public.eventos_visiveis()') is null then
    raise exception '196: falta a 021/023 (fill_empresa_from_event / eventos_visiveis)';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) A tabela
-- ------------------------------------------------------------
create table if not exists public.evento_convite (
  event_id          uuid primary key references public.events (id) on delete cascade,
  empresa_id        uuid references public.empresas (id) on delete cascade,
  modelo            text not null default 'c01',
  fonte             text,
  paleta            text,
  modo_nome         text,
  forma             text,
  hora              text,
  frase             text,
  referencia        text,
  local             text,
  endereco          text,
  cidade            text,
  local_recepcao    text,
  endereco_recepcao text,
  pais1             text,
  pais2             text,
  foto              text,
  atualizado_por    uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- fechada antes de qualquer outra coisa: se algo abaixo falhar, a tabela
-- não fica aberta pela API até alguém rodar de novo
alter table public.evento_convite enable row level security;
revoke all on table public.evento_convite from anon;
revoke insert, update, delete, truncate, references, trigger on table public.evento_convite from authenticated;

-- o CHECK é recriado a cada rodada (num statement só: se uma linha salva
-- violar a regra nova, nada muda): editar a lista (um modelo novo, um par
-- de fonte novo) e rodar de novo vale
do $$
begin
  alter table public.evento_convite drop constraint if exists evento_convite_valores_check;
  alter table public.evento_convite add constraint evento_convite_valores_check check (
    modelo ~ '^c0[1-9]$'
    and (fonte is null or fonte in ('essencial', 'maison', 'atelier', 'caligrafia',
                                    'riviera', 'bilhete', 'soiree', 'relicario'))
    and (paleta is null or paleta ~ '^[a-z0-9-]{1,30}$')
    and (modo_nome is null or modo_nome in ('Nomes', 'Iniciais', 'Iniciais + nomes'))
    and (forma is null or forma in ('Violino', 'Nota musical'))
    and (hora is null or hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and (frase is null or char_length(frase) <= 220)
    and (referencia is null or char_length(referencia) <= 60)
    and (local is null or char_length(local) <= 80)
    and (endereco is null or char_length(endereco) <= 120)
    and (cidade is null or char_length(cidade) <= 60)
    and (local_recepcao is null or char_length(local_recepcao) <= 80)
    and (endereco_recepcao is null or char_length(endereco_recepcao) <= 120)
    and (pais1 is null or char_length(pais1) <= 120)
    and (pais2 is null or char_length(pais2) <= 120)
    -- a forma do caminho do balde 'site' (a mesma da site_foto_ok, 191)
    and (foto is null or foto ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|webp)$')
  );
end $$;

create or replace trigger trg_fill_empresa before insert on public.evento_convite
  for each row execute function public.fill_empresa_from_event();

-- a trava do visitante do catálogo (195): o prefixo a0_ roda antes dos
-- outros BEFORE (ordem alfabética)
create or replace trigger a0_vitrine_nao_grava
  before insert or update or delete on public.evento_convite
  for each row when (public.sou_login_vitrine())
  execute function public.vitrine_nao_grava();

-- a equipe lê; a família lê e grava pelas RPCs; ninguém escreve pela API
drop policy if exists evento_convite_select on public.evento_convite;
create policy evento_convite_select on public.evento_convite
  for select using (event_id in (select public.eventos_visiveis()));

-- ------------------------------------------------------------
-- 2) O que está salvo (o editor do portal)
-- ------------------------------------------------------------
create or replace function public.portal_convite(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
           'modelo', c.modelo, 'fonte', c.fonte, 'paleta', c.paleta,
           'modo_nome', c.modo_nome, 'forma', c.forma, 'hora', c.hora,
           'frase', c.frase, 'referencia', c.referencia,
           'local', c.local, 'endereco', c.endereco, 'cidade', c.cidade,
           'local_recepcao', c.local_recepcao, 'endereco_recepcao', c.endereco_recepcao,
           'pais1', c.pais1, 'pais2', c.pais2, 'foto', c.foto,
           'updated_at', c.updated_at)
    from public.evento_convite c
   where c.event_id = p_event_id
     and public.portal_pode(p_event_id, 'ver');
$$;

revoke all on function public.portal_convite(uuid) from public, anon;
grant execute on function public.portal_convite(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) Gravar (só o casal)
-- ------------------------------------------------------------
-- p_dados: o convite INTEIRO (o editor manda tudo; chave ausente = null).
-- Cada valor é texto ou null. Texto vazio vira null (= o que vem do
-- evento ou do desenho), menos nos campos do local, onde '' é "deixar em
-- branco". Chave fora da lista: erro (nada é ignorado em silêncio).
create or replace function public.portal_salvar_convite(p_event_id uuid, p_dados jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_chaves constant text[] := array[
    'modelo', 'fonte', 'paleta', 'modo_nome', 'forma', 'hora', 'frase', 'referencia',
    'local', 'endereco', 'cidade', 'local_recepcao', 'endereco_recepcao',
    'pais1', 'pais2', 'foto'];
  -- os campos do local: '' fica '' (a noiva apagou de propósito)
  v_do_local constant text[] := array[
    'local', 'endereco', 'cidade', 'local_recepcao', 'endereco_recepcao'];
  v_k text;
  v_v jsonb;
  v text[] := array[]::text[];
  v_val text;
  i int;
begin
  -- o casal: nível 'casal' ('gestao') que escreve ('escrever' barra o
  -- visitante do catálogo); nem a equipe, nem a chave de serviço
  if p_event_id is null
     or not (public.familia_pode(p_event_id, 'gestao')
             and public.familia_pode(p_event_id, 'escrever')) then
    raise exception 'sem permissão';
  end if;
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then
    raise exception 'dados do convite inválidos';
  end if;

  for v_k, v_v in select key, value from jsonb_each(p_dados) loop
    if not (v_k = any (v_chaves)) then
      raise exception 'campo desconhecido no convite: %', v_k;
    end if;
    if jsonb_typeof(v_v) not in ('string', 'null') then
      raise exception 'campo do convite precisa ser texto: %', v_k;
    end if;
  end loop;

  -- os valores na ordem de v_chaves; ausente ou null = null
  for i in 1 .. array_length(v_chaves, 1) loop
    v_val := btrim(p_dados ->> v_chaves[i]);
    if v_val = '' and not (v_chaves[i] = any (v_do_local)) then
      v_val := null;
    end if;
    v := array_append(v, v_val);
  end loop;

  -- a foto é do próprio evento (a pasta do balde é o id do evento)
  if v[16] is not null and left(v[16], 37) <> p_event_id::text || '/' then
    raise exception 'foto de outro evento';
  end if;

  insert into public.evento_convite as c (
    event_id, modelo, fonte, paleta, modo_nome, forma, hora, frase, referencia,
    local, endereco, cidade, local_recepcao, endereco_recepcao, pais1, pais2, foto,
    atualizado_por, updated_at)
  values (
    p_event_id, coalesce(v[1], 'c01'), v[2], v[3], v[4], v[5], v[6], v[7], v[8],
    v[9], v[10], v[11], v[12], v[13], v[14], v[15], v[16],
    auth.uid(), now())
  on conflict (event_id) do update set
    modelo = excluded.modelo,
    fonte = excluded.fonte,
    paleta = excluded.paleta,
    modo_nome = excluded.modo_nome,
    forma = excluded.forma,
    hora = excluded.hora,
    frase = excluded.frase,
    referencia = excluded.referencia,
    local = excluded.local,
    endereco = excluded.endereco,
    cidade = excluded.cidade,
    local_recepcao = excluded.local_recepcao,
    endereco_recepcao = excluded.endereco_recepcao,
    pais1 = excluded.pais1,
    pais2 = excluded.pais2,
    foto = excluded.foto,
    atualizado_por = excluded.atualizado_por,
    updated_at = now();
end;
$$;

revoke all on function public.portal_salvar_convite(uuid, jsonb) from public, anon;
grant execute on function public.portal_salvar_convite(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 4) O convidado (anônimo)
-- ------------------------------------------------------------
-- Pelo endereço do site, atual ou antigo (a página manda o antigo para o
-- atual). Site fora do ar = nada. Só o que o modelo desenha (pais e
-- recepção: o 09; a forma da abertura: o 01; a referência: o 01 e o 09),
-- e a foto só se ela aparece no site no ar — a régua do anônimo (191):
-- só recebe o que aparece.
create or replace function public.convite_publico(p_ref text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
           'modelo', c.modelo, 'fonte', c.fonte, 'paleta', c.paleta,
           'modo_nome', c.modo_nome,
           'forma', case when c.modelo = 'c01' then c.forma end,
           'hora', c.hora,
           'frase', c.frase,
           'referencia', case when c.modelo in ('c01', 'c09') then c.referencia end,
           'local', c.local, 'endereco', c.endereco, 'cidade', c.cidade,
           'local_recepcao', case when c.modelo = 'c09' then c.local_recepcao end,
           'endereco_recepcao', case when c.modelo = 'c09' then c.endereco_recepcao end,
           'pais1', case when c.modelo = 'c09' then c.pais1 end,
           'pais2', case when c.modelo = 'c09' then c.pais2 end,
           'foto', case when c.foto is not null
                         and strpos(public.site_so_o_que_aparece(es.publicado_conteudo)::text, c.foto) > 0
                        then c.foto end)
    from public.site_slugs s
    join public.evento_site es on es.event_id = s.event_id and es.publicado
    join public.evento_convite c on c.event_id = s.event_id
   where s.slug = lower(btrim(p_ref))
   limit 1;
$$;

revoke all on function public.convite_publico(text) from public;
grant execute on function public.convite_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Conferência (tudo true)
-- ------------------------------------------------------------
select 'evento_convite com RLS' as verificacao,
       coalesce((select relrowsecurity from pg_class where oid = 'public.evento_convite'::regclass), false) as ok
union all
select 'anon não lê a tabela',
       not has_table_privilege('anon', 'public.evento_convite', 'select')
union all
select 'ninguém da API grava na tabela',
       not has_table_privilege('authenticated', 'public.evento_convite', 'insert')
       and not has_table_privilege('authenticated', 'public.evento_convite', 'update')
       and not has_table_privilege('authenticated', 'public.evento_convite', 'delete')
union all
select 'só a policy de leitura',
       coalesce((select count(*) = 1 and bool_and(cmd = 'SELECT') from pg_policies
                  where schemaname = 'public' and tablename = 'evento_convite'), false)
union all
select 'gatilho da empresa',
       exists (select 1 from pg_trigger
                where tgname = 'trg_fill_empresa' and tgrelid = 'public.evento_convite'::regclass)
union all
select 'a trava do visitante do catálogo (195) também aqui',
       exists (select 1 from pg_trigger
                where tgname = 'a0_vitrine_nao_grava' and tgrelid = 'public.evento_convite'::regclass)
union all
select 'o CHECK, com a lista de hoje',
       coalesce((select pg_get_constraintdef(oid) like '%relicario%'
                        and pg_get_constraintdef(oid) like '%webp%'
                        and pg_get_constraintdef(oid) like '%c0[1-9]%'
                   from pg_constraint
                  where conrelid = 'public.evento_convite'::regclass
                    and conname = 'evento_convite_valores_check'), false)
union all
select 'anon não lê o salvo nem salva',
       not has_function_privilege('anon', 'public.portal_convite(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_convite(uuid, jsonb)', 'execute')
union all
select 'quem entra lê o salvo e chama o salvar',
       has_function_privilege('authenticated', 'public.portal_convite(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_salvar_convite(uuid, jsonb)', 'execute')
union all
select 'anon lê o convite público',
       has_function_privilege('anon', 'public.convite_publico(text)', 'execute')
union all
select 'salvar: só o casal (sem a equipe)',
       pg_get_functiondef('public.portal_salvar_convite(uuid, jsonb)'::regprocedure)
         like '%familia_pode(p_event_id, ''gestao'')%'
       and pg_get_functiondef('public.portal_salvar_convite(uuid, jsonb)'::regprocedure)
         like '%familia_pode(p_event_id, ''escrever'')%'
       and pg_get_functiondef('public.portal_salvar_convite(uuid, jsonb)'::regprocedure)
         not like '%pode_editar_evento%'
union all
select 'ler o salvo exige acesso ao evento',
       pg_get_functiondef('public.portal_convite(uuid)'::regprocedure)
         like '%portal_pode(p_event_id, ''ver'')%'
union all
select 'público só com o site publicado e só a foto que aparece',
       pg_get_functiondef('public.convite_publico(text)'::regprocedure) like '%es.publicado%'
       and pg_get_functiondef('public.convite_publico(text)'::regprocedure) like '%site_so_o_que_aparece%';
