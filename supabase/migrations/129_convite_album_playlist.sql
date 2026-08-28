-- ============================================================
-- Vela — Migração 129: o convite digital completo
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O site do casamento (128) vira o CONVITE: envelope, capa, contagem,
-- história com foto, dress code, RSVP de verdade, presentes, álbum ao
-- vivo, música e recados. Esta migração traz o chão de tudo isso.
--
-- 1) evento_site ganha o conteúdo que o desenho pede (história com
--    título e foto, dress code em duas partes, prazo do RSVP, as três
--    cores que mandam na página, o bloco de presentes e as opções de
--    menu). Tudo entra na FOTOGRAFIA da publicação (128) — o público
--    continua vendo só o que a cerimonialista publicou.
--
-- 2) O acompanhante ganha NOME, sem quebrar ninguém. Medição: cinco
--    superfícies contam `1 + acompanhantes` (folha do buffet, croqui,
--    lembrete, portal, e-mail). Por isso o nome vira tabela filha e o
--    inteiro CONTINUA sendo a verdade da contagem — mantido em dia por
--    gatilho. Uma fonte (os nomes), um espelho (o número).
--
-- 3) Álbum ao vivo, música e recado: três listas do convidado, cada uma
--    com o mesmo desenho — a linha nasce visível (decisão do dono: a
--    graça é o mural enchendo durante a festa), e a remoção é de um
--    toque para o casal e para a equipe.
--
-- 4) O espaço ganha os horários que o cronograma vai pedir (liberação,
--    término e desmontagem) — a entidade nasceu para isso na 128.
--
-- Segurança: o convidado escreve por RPC com o hash do EVENTO como
-- credencial, nunca por policy anon em tabela. Foto vai por token
-- assinado (o molde dos contratos, 110), nunca abrindo bucket ao anon.

-- ------------------------------------------------------------
-- 1) O CONTEÚDO DO CONVITE
-- ------------------------------------------------------------
alter table public.evento_site
  -- história: título próprio ("Do mesmo mar, sete anos depois") + foto
  add column if not exists historia_titulo text,
  add column if not exists foto_casal_path text,
  -- dress code em duas partes: o rótulo curto e o detalhe
  add column if not exists dress_code_titulo text,
  -- "responder até" — o convite pede prazo, não silêncio
  add column if not exists rsvp_prazo date,
  -- as três cores do convite; null = o padrão da casa
  add column if not exists cor_acento text,
  add column if not exists cor_tinta text,
  add column if not exists cor_fundo text,
  -- presentes: conteúdo, nunca transação (o registry é outra fatia)
  add column if not exists presentes_texto text,
  add column if not exists pix_chave text,
  add column if not exists pix_titular text,
  add column if not exists presentes_link text,
  -- opções de menu que o convidado escolhe no RSVP
  add column if not exists menu_opcoes text[] not null default '{}',
  -- os três blocos que o casal liga ou desliga
  add column if not exists recados_aberto boolean not null default false;

-- cor só entra como #rrggbb: o valor vai direto para o style da página
do $$
begin
  alter table public.evento_site drop constraint if exists evento_site_cores_check;
  alter table public.evento_site add constraint evento_site_cores_check check (
    (cor_acento is null or cor_acento ~ '^#[0-9a-fA-F]{6}$') and
    (cor_tinta  is null or cor_tinta  ~ '^#[0-9a-fA-F]{6}$') and
    (cor_fundo  is null or cor_fundo  ~ '^#[0-9a-fA-F]{6}$')
  );
end $$;

-- ------------------------------------------------------------
-- 2) O ACOMPANHANTE COM NOME
-- ------------------------------------------------------------
create table if not exists public.evento_acompanhante (
  id           uuid primary key default gen_random_uuid(),
  convidado_id uuid not null references public.evento_convidado (id) on delete cascade,
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id) on delete cascade,
  nome         text not null check (char_length(btrim(nome)) between 1 and 120),
  eh_crianca   boolean not null default false,
  ordem        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_acompanhante_convidado
  on public.evento_acompanhante (convidado_id, ordem);
create index if not exists idx_acompanhante_evento
  on public.evento_acompanhante (event_id);

-- event_id e empresa_id derivam do convidado — nunca de quem insere
create or replace function public.fill_dados_do_convidado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select c.event_id, c.empresa_id into new.event_id, new.empresa_id
  from public.evento_convidado c where c.id = new.convidado_id;
  return new;
end $$;

drop trigger if exists trg_fill_dados on public.evento_acompanhante;
create trigger trg_fill_dados before insert on public.evento_acompanhante
  for each row execute function public.fill_dados_do_convidado();

-- O ESPELHO: evento_convidado.acompanhantes e .criancas continuam sendo
-- a contagem que o buffet, o croqui e os lembretes leem. Aqui eles
-- passam a ser derivados dos nomes — para os dois nunca discordarem.
create or replace function public.sincronizar_contagem_acompanhantes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_convidado uuid := coalesce(new.convidado_id, old.convidado_id);
begin
  update public.evento_convidado c
     set acompanhantes = (
           select count(*) from public.evento_acompanhante a
           where a.convidado_id = v_convidado and not a.eh_crianca),
         criancas = (
           select count(*) from public.evento_acompanhante a
           where a.convidado_id = v_convidado and a.eh_crianca),
         updated_at = now()
   where c.id = v_convidado;
  return null;
end $$;

drop trigger if exists trg_sincronizar_contagem on public.evento_acompanhante;
create trigger trg_sincronizar_contagem
  after insert or update or delete on public.evento_acompanhante
  for each row execute function public.sincronizar_contagem_acompanhantes();

alter table public.evento_acompanhante enable row level security;

drop policy if exists acompanhante_select on public.evento_acompanhante;
create policy acompanhante_select on public.evento_acompanhante
  for select using (
    event_id in (select public.eventos_visiveis())
    or event_id in (select public.eventos_da_cliente())
  );
drop policy if exists acompanhante_write on public.evento_acompanhante;
create policy acompanhante_write on public.evento_acompanhante
  for all using (
    public.pode_editar_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  )
  with check (
    public.pode_editar_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

-- o que o convidado escreve no RSVP, além do nome
alter table public.evento_convidado
  add column if not exists menu_escolhido text,
  add column if not exists recado text;

-- ------------------------------------------------------------
-- 3) ÁLBUM, MÚSICA E RECADO — as três listas do convidado
-- ------------------------------------------------------------
create table if not exists public.evento_album_foto (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id) on delete cascade,
  storage_path text not null,
  -- quem mandou: o nome que a pessoa digitou (convidado não tem conta) e,
  -- quando veio pelo convite individual, o vínculo com a linha dele
  autor        text,
  convidado_id uuid references public.evento_convidado (id) on delete set null,
  legenda      text,
  -- nasce visível (decisão do dono: moderar 400 fotas de madrugada não
  -- acontece); esconder é de um toque, para o casal e para a equipe
  oculta       boolean not null default false,
  oculta_em    timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_album_evento
  on public.evento_album_foto (event_id, created_at desc);

create table if not exists public.evento_musica (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id) on delete cascade,
  titulo       text not null check (char_length(btrim(titulo)) between 1 and 160),
  artista      text,
  sugerida_por text,
  convidado_id uuid references public.evento_convidado (id) on delete set null,
  -- o casal decide o que vai para o DJ; vetada é a lista do "não tocar"
  estado       text not null default 'sugerida'
               check (estado in ('sugerida', 'aprovada', 'vetada')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_musica_evento
  on public.evento_musica (event_id, estado, created_at);

create table if not exists public.evento_recado (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id) on delete cascade,
  nome         text,
  texto        text not null check (char_length(btrim(texto)) between 1 and 1000),
  convidado_id uuid references public.evento_convidado (id) on delete set null,
  oculto       boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_recado_evento
  on public.evento_recado (event_id, created_at desc);

-- empresa_id derivado do evento nas três (o gatilho da 092)
do $$
declare t text;
begin
  foreach t in array array['evento_album_foto', 'evento_musica', 'evento_recado'] loop
    execute format('drop trigger if exists trg_fill_empresa on public.%I', t);
    execute format(
      'create trigger trg_fill_empresa before insert on public.%I
         for each row execute function public.fill_empresa_from_event()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Equipe e casal leem e mexem; o convidado NÃO tem policy — ele escreve
-- só pelas RPCs abaixo, com o hash do evento como credencial.
do $$
declare t text;
begin
  foreach t in array array['evento_album_foto', 'evento_musica', 'evento_recado'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (
         event_id in (select public.eventos_visiveis())
         or event_id in (select public.eventos_da_cliente()))',
      t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all using (
         public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente()))
       with check (
         public.pode_editar_evento(event_id)
         or event_id in (select public.eventos_da_cliente()))',
      t || '_write', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4) O BUCKET DO ÁLBUM
-- ------------------------------------------------------------
-- Bucket próprio: abrir `inspiracoes` (o mural do casal) a foto de
-- convidado misturaria curadoria com festa. Privado, como todos os de
-- evento — a página pública recebe URLs assinadas pelo servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album', 'album', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

-- Leitura/escrita pela equipe e pelo casal (o convidado sobe por token
-- assinado emitido pela rota, nunca por policy — molde da 110).
create or replace function public.pode_ver_album(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.pode_ver_evento(p_folder::uuid)
      or public.sou_cliente_do_evento(p_folder::uuid);
exception when others then
  return false;  -- policy que explode é policy que não protege (097)
end $$;

create or replace function public.pode_mexer_album(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.pode_editar_evento(p_folder::uuid)
      or public.sou_cliente_do_evento(p_folder::uuid);
exception when others then
  return false;
end $$;

drop policy if exists "album_ver" on storage.objects;
create policy "album_ver" on storage.objects for select to authenticated
  using (bucket_id = 'album'
         and public.pode_ver_album((storage.foldername(name))[1]));
drop policy if exists "album_subir" on storage.objects;
create policy "album_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'album'
              and public.pode_mexer_album((storage.foldername(name))[1]));
drop policy if exists "album_apagar" on storage.objects;
create policy "album_apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'album'
         and public.pode_mexer_album((storage.foldername(name))[1]));

-- ------------------------------------------------------------
-- 5) O ESPAÇO GANHA OS HORÁRIOS
-- ------------------------------------------------------------
-- Pertencem ao LUGAR, não ao evento: quem loca a fazenda descobre uma
-- vez que a montagem libera às 8h e o som para à meia-noite, e todo
-- casamento ali herda. O cronograma por âncora vai ler daqui.
alter table public.espacos
  add column if not exists liberacao_montagem time,
  add column if not exists termino_som time,
  add column if not exists desmontagem_ate time,
  add column if not exists restricoes text;

-- ------------------------------------------------------------
-- 6) AS RPCs DO CONVIDADO (hash do evento = credencial)
-- ------------------------------------------------------------
-- Uma função resolve o evento a partir do hash e diz se o convite está
-- de pé: publicado e com o bloco pedido ligado. As três escritas do
-- convidado passam por ela.
create or replace function public.evento_do_convite(p_hash text, p_bloco text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.events e
  join public.evento_site s on s.event_id = e.id
  where e.rsvp_hash = p_hash
    and s.publicado
    and case p_bloco
          when 'album'    then s.album_aberto
          when 'playlist' then s.playlist_aberta
          when 'recado'   then s.recados_aberto
          else true
        end;
$$;

revoke all on function public.evento_do_convite(text, text) from public, anon;

-- --- recado ao casal ---
create or replace function public.deixar_recado(
  p_hash  text,
  p_nome  text,
  p_texto text
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_event uuid; v_texto text := btrim(coalesce(p_texto, ''));
begin
  v_event := public.evento_do_convite(p_hash, 'recado');
  if v_event is null then return json_build_object('ok', false, 'erro', 'fechado'); end if;
  if v_texto = '' or char_length(v_texto) > 1000 then
    return json_build_object('ok', false, 'erro', 'texto');
  end if;
  -- teto por evento: mural é para a festa, não para robô
  if (select count(*) from public.evento_recado where event_id = v_event) >= 2000 then
    return json_build_object('ok', false, 'erro', 'cheio');
  end if;

  insert into public.evento_recado (event_id, nome, texto)
  values (v_event, nullif(left(btrim(coalesce(p_nome, '')), 80), ''), v_texto);
  return json_build_object('ok', true);
end $$;

revoke all on function public.deixar_recado(text, text, text) from public;
grant execute on function public.deixar_recado(text, text, text) to anon, authenticated;

-- --- sugestão de música ---
create or replace function public.sugerir_musica(
  p_hash    text,
  p_titulo  text,
  p_artista text,
  p_nome    text
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_event uuid; v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  v_event := public.evento_do_convite(p_hash, 'playlist');
  if v_event is null then return json_build_object('ok', false, 'erro', 'fechado'); end if;
  if v_titulo = '' or char_length(v_titulo) > 160 then
    return json_build_object('ok', false, 'erro', 'titulo');
  end if;
  if (select count(*) from public.evento_musica where event_id = v_event) >= 1000 then
    return json_build_object('ok', false, 'erro', 'cheio');
  end if;
  -- a mesma música duas vezes é ruído para o DJ
  if exists (select 1 from public.evento_musica
             where event_id = v_event and lower(titulo) = lower(v_titulo)) then
    return json_build_object('ok', true, 'repetida', true);
  end if;

  insert into public.evento_musica (event_id, titulo, artista, sugerida_por)
  values (v_event, v_titulo,
          nullif(left(btrim(coalesce(p_artista, '')), 120), ''),
          nullif(left(btrim(coalesce(p_nome, '')), 80), ''));
  return json_build_object('ok', true);
end $$;

revoke all on function public.sugerir_musica(text, text, text, text) from public;
grant execute on function public.sugerir_musica(text, text, text, text) to anon, authenticated;

-- --- a foto do álbum (a linha; o arquivo sobe por token na rota) ---
create or replace function public.registrar_foto_album(
  p_hash    text,
  p_caminho text,
  p_autor   text,
  p_legenda text
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_event uuid;
begin
  v_event := public.evento_do_convite(p_hash, 'album');
  if v_event is null then return json_build_object('ok', false, 'erro', 'fechado'); end if;
  -- o caminho tem que ser da pasta DESTE evento: a rota monta, mas
  -- confirmar aqui impede que um caminho forjado registre foto alheia
  if p_caminho is null or p_caminho not like (v_event::text || '/%') then
    return json_build_object('ok', false, 'erro', 'caminho');
  end if;
  if (select count(*) from public.evento_album_foto where event_id = v_event) >= 3000 then
    return json_build_object('ok', false, 'erro', 'cheio');
  end if;

  insert into public.evento_album_foto (event_id, storage_path, autor, legenda)
  values (v_event, p_caminho,
          nullif(left(btrim(coalesce(p_autor, '')), 80), ''),
          nullif(left(btrim(coalesce(p_legenda, '')), 200), ''));
  return json_build_object('ok', true);
end $$;

revoke all on function public.registrar_foto_album(text, text, text, text) from public, anon;
-- só o servidor registra (a rota valida o hash e emite o token)

-- ------------------------------------------------------------
-- 6b) A FOTOGRAFIA PASSA A CONGELAR O CONVITE INTEIRO
-- ------------------------------------------------------------
-- A 128 congelava mensagem, história, dress code e blocos. Os campos
-- novos são da mesma natureza (texto do casal que sai para 130 pessoas)
-- e entram na fotografia — senão o PIX e o título da história nunca
-- chegariam ao convite. Cor, prazo, menu e os blocos ligados seguem ao
-- vivo de propósito: são configuração, não texto publicado.
create or replace function public.publicar_site(
  p_event_id  uuid,
  p_publicado boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.evento_site%rowtype;
begin
  if not public.pode_editar_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;
  select * into v_site from public.evento_site where event_id = p_event_id;
  if not found then
    raise exception 'monte o site antes de publicar';
  end if;

  if p_publicado then
    update public.evento_site
       set publicado          = true,
           publicado_conteudo = jsonb_build_object(
             'mensagem',          v_site.mensagem,
             'historia',          v_site.historia,
             'historia_titulo',   v_site.historia_titulo,
             'foto_casal_path',   v_site.foto_casal_path,
             'dress_code',        v_site.dress_code,
             'dress_code_titulo', v_site.dress_code_titulo,
             'presentes_texto',   v_site.presentes_texto,
             'pix_chave',         v_site.pix_chave,
             'pix_titular',       v_site.pix_titular,
             'presentes_link',    v_site.presentes_link,
             'blocos',            v_site.blocos
           ),
           publicado_em  = now(),
           publicado_por = auth.uid(),
           evento_dados_na_publicacao = (
             select jsonb_build_object(
               'date', e.date, 'time', e.time,
               'location', e.location, 'city', e.city)
             from public.events e where e.id = p_event_id
           ),
           slug_congelado_em = coalesce(v_site.slug_congelado_em,
                                        case when v_site.slug is not null then now() end),
           updated_at = now()
     where event_id = p_event_id;
  else
    update public.evento_site
       set publicado = false, updated_at = now()
     where event_id = p_event_id;
  end if;
end $$;

revoke all on function public.publicar_site(uuid, boolean) from public, anon;
grant execute on function public.publicar_site(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 7) A PÁGINA PÚBLICA — site_publico ganha o convite inteiro
-- ------------------------------------------------------------
-- Mesma régua da 128: fotografia para o conteúdo do casal, ao vivo para
-- evento e espaço. Agora com as cores, os presentes, o menu e as três
-- listas do convidado. Continua sem NADA de convidados (nem contagem),
-- financeiro, fornecedor, planejamento ou cortejo.
create or replace function public.site_publico(p_ref text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with alvo as (
    select e.id as event_id, false as por_slug, null::text as slug_usado
    from public.events e
    where e.rsvp_hash = p_ref
    union all
    select s.event_id, true, s.slug
    from public.site_slugs s
    where s.slug = lower(p_ref)
    limit 1
  ),
  s as (
    select es.*, a.por_slug, a.slug_usado, a.event_id as ev_id
    from alvo a
    join public.evento_site es on es.event_id = a.event_id
    where es.publicado
  )
  select json_build_object(
    'evento', (
      select json_build_object(
        'tipo', e.type::text,
        'anfitrioes', coalesce(nullif(trim(e.name), ''), 'os anfitriões'),
        'data', e.date, 'hora', e.time,
        'local', e.location, 'cidade', e.city,
        'capa_url', e.cover_image_url
      )
      from public.events e where e.id = s.ev_id
    ),
    'empresa', (
      select json_build_object('nome', emp.nome, 'logo_url', emp.logo_url)
      from public.events e
      join public.empresas emp on emp.id = e.empresa_id
      where e.id = s.ev_id
    ),
    'site', s.publicado_conteudo,
    'cores', json_build_object(
      'acento', s.cor_acento, 'tinta', s.cor_tinta, 'fundo', s.cor_fundo
    ),
    'paleta', (
      select json_agg(json_build_object(
               'nome', c.nome, 'papel', c.papel, 'hex', c.hex)
             order by c.ordem)
      from public.evento_guia_estilo g
      join public.evento_guia_cor c on c.guia_id = g.id
      where g.event_id = s.ev_id
        and g.situacao in ('aprovado', 'alterado')
    ),
    'espaco', (
      select json_build_object(
        'transporte', esp.transporte,
        'hospedagens', (
          select json_agg(json_build_object(
                   'nome', h.nome, 'distancia', h.distancia,
                   'faixa_preco', h.faixa_preco, 'nota', h.nota,
                   'link', h.link)
                 order by h.ordem, h.nome)
          from public.espaco_hospedagem h
          where h.espaco_id = esp.id
            and h.empresa_id = esp.empresa_id
        )
      )
      from public.events e
      join public.espacos esp
        on esp.id = e.espaco_id and esp.empresa_id = e.empresa_id
      where e.id = s.ev_id
    ),
    'rsvp', (
      select json_build_object('aberto', e.rsvp_aberto is not false,
                               'hash', e.rsvp_hash,
                               'prazo', s.rsvp_prazo,
                               'menu', s.menu_opcoes)
      from public.events e where e.id = s.ev_id
    ),
    'blocos', json_build_object(
      'album', s.album_aberto,
      'playlist', s.playlist_aberta,
      'recados', s.recados_aberto
    ),
    -- as fotos visíveis; a URL assinada é montada no servidor da página
    'album', case when s.album_aberto then (
      select json_agg(json_build_object('path', f.storage_path, 'autor', f.autor)
             order by f.created_at desc)
      from (select * from public.evento_album_foto
            where event_id = s.ev_id and not oculta
            order by created_at desc limit 120) f
    ) else null end,
    'recados', case when s.recados_aberto then (
      select json_agg(json_build_object('nome', r.nome, 'texto', r.texto)
             order by r.created_at desc)
      from (select * from public.evento_recado
            where event_id = s.ev_id and not oculto
            order by created_at desc limit 60) r
    ) else null end,
    'slug_atual', (select slug from public.site_slugs
                   where event_id = s.ev_id and atual),
    'ref_e_slug_antigo', (s.por_slug and s.slug_usado is distinct from
                          (select slug from public.site_slugs
                           where event_id = s.ev_id and atual)),
    'indexavel', s.indexavel
  )
  from s
$$;

revoke all on function public.site_publico(text) from public;
grant execute on function public.site_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 8) O RSVP FECHADO PASSA A VALER NO LINK INDIVIDUAL
-- ------------------------------------------------------------
-- Medido: responder_convite_convidado (092) não olhava rsvp_aberto — a
-- cliente encerrava as confirmações e quem tinha o link individual
-- continuava respondendo. Agora a válvula vale nas duas portas. O resto
-- da função é o de 092, com os campos novos do convite.
--
-- O DROP abaixo não é higiene, é a correção: `create or replace` com
-- assinatura NOVA cria uma SOBRECARGA e deixa a antiga de pé — medido
-- em produção, a versão de 5 parâmetros continuava respondendo (e é
-- exatamente ela que o componente chama hoje), então a válvula nova não
-- valeria para ninguém. Cai a antiga; a nova atende os dois formatos
-- porque os dois últimos parâmetros têm default.
drop function if exists public.responder_convite_convidado(text, text, int, int, text);
create or replace function public.responder_convite_convidado(
  p_hash          text,
  p_confirmacao   text,
  p_acompanhantes int  default 0,
  p_criancas      int  default 0,
  p_restricao     text default null,
  p_menu          text default null,
  p_recado        text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_c public.evento_convidado%rowtype; v_aberto boolean;
begin
  if p_confirmacao not in ('confirmado', 'nao_vai') then
    return json_build_object('ok', false, 'erro', 'resposta_invalida');
  end if;

  select * into v_c from public.evento_convidado where hash = p_hash for update;
  if not found then
    return json_build_object('ok', false, 'erro', 'convite_invalido');
  end if;

  select e.rsvp_aberto is not false into v_aberto
  from public.events e where e.id = v_c.event_id;
  if not v_aberto then
    return json_build_object('ok', false, 'erro', 'encerrado');
  end if;

  update public.evento_convidado
     set confirmacao   = p_confirmacao,
         acompanhantes = case when p_confirmacao = 'confirmado'
                              then greatest(0, least(coalesce(p_acompanhantes, 0), 20))
                              else 0 end,
         criancas      = case when p_confirmacao = 'confirmado'
                              then greatest(0, least(coalesce(p_criancas, 0), 20))
                              else 0 end,
         restricao_alimentar = case when p_confirmacao = 'confirmado'
                                    then nullif(left(btrim(coalesce(p_restricao, '')), 400), '')
                                    else null end,
         menu_escolhido = case when p_confirmacao = 'confirmado'
                               then nullif(left(btrim(coalesce(p_menu, '')), 60), '')
                               else null end,
         recado         = nullif(left(btrim(coalesce(p_recado, '')), 500), ''),
         confirmado_em  = now(),
         confirmado_via = 'link',
         updated_at     = now()
   where id = v_c.id;

  return json_build_object('ok', true, 'confirmacao', p_confirmacao,
                           'evento_id', v_c.event_id, 'convidado_id', v_c.id);
end $$;

revoke all on function public.responder_convite_convidado(text, text, int, int, text, text, text) from public;
grant execute on function public.responder_convite_convidado(text, text, int, int, text, text, text) to anon, authenticated;

-- Os acompanhantes NOMINAIS do convite: substituem a lista inteira do
-- convidado (o gatilho reescreve a contagem que o buffet lê).
create or replace function public.registrar_acompanhantes(
  p_hash  text,
  p_nomes jsonb
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_c public.evento_convidado%rowtype;
  v_item jsonb;
  v_ordem int := 0;
  v_nome text;
begin
  select * into v_c from public.evento_convidado where hash = p_hash;
  if not found then
    return json_build_object('ok', false, 'erro', 'convite_invalido');
  end if;
  if jsonb_typeof(coalesce(p_nomes, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_nomes, '[]'::jsonb)) > 20 then
    return json_build_object('ok', false, 'erro', 'lista');
  end if;

  delete from public.evento_acompanhante where convidado_id = v_c.id;
  for v_item in select * from jsonb_array_elements(coalesce(p_nomes, '[]'::jsonb)) loop
    v_nome := btrim(coalesce(v_item->>'nome', ''));
    if v_nome <> '' then
      v_ordem := v_ordem + 10;
      insert into public.evento_acompanhante (convidado_id, nome, eh_crianca, ordem)
      values (v_c.id, left(v_nome, 120),
              coalesce((v_item->>'crianca')::boolean, false), v_ordem);
    end if;
  end loop;

  return json_build_object('ok', true);
end $$;

revoke all on function public.registrar_acompanhantes(text, jsonb) from public;
grant execute on function public.registrar_acompanhantes(text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'evento_site tem o conteúdo do convite' as item,
       (select count(*) = 12 from information_schema.columns
        where table_schema = 'public' and table_name = 'evento_site'
          and column_name in ('historia_titulo','foto_casal_path','dress_code_titulo',
                              'rsvp_prazo','cor_acento','cor_tinta','cor_fundo',
                              'presentes_texto','pix_chave','pix_titular',
                              'presentes_link','menu_opcoes')) as ok
union all
select 'cor só aceita #rrggbb',
       exists (select 1 from pg_constraint
               where conrelid = 'public.evento_site'::regclass
                 and conname = 'evento_site_cores_check')
union all
select 'acompanhante nominal existe e deriva do convidado',
       to_regclass('public.evento_acompanhante') is not null
       and exists (select 1 from pg_trigger
                   where tgrelid = 'public.evento_acompanhante'::regclass
                     and tgname = 'trg_fill_dados')
union all
select 'a contagem que o buffet lê é mantida por gatilho',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.evento_acompanhante'::regclass
                 and tgname = 'trg_sincronizar_contagem')
union all
select 'as três listas do convidado existem',
       to_regclass('public.evento_album_foto') is not null
       and to_regclass('public.evento_musica') is not null
       and to_regclass('public.evento_recado') is not null
union all
select 'nenhuma delas tem policy para anon',
       not exists (select 1 from pg_policies
                   where schemaname = 'public'
                     and tablename in ('evento_album_foto','evento_musica','evento_recado')
                     and 'anon' = any(roles))
union all
select 'bucket album existe, privado, 8 MB, só imagem',
       exists (select 1 from storage.buckets
               where id = 'album' and public = false and file_size_limit = 8388608)
union all
select 'o storage do álbum não tem policy para anon',
       not exists (select 1 from pg_policies
                   where schemaname = 'storage' and tablename = 'objects'
                     and policyname like 'album_%' and 'anon' = any(roles))
union all
select 'o convidado escreve por RPC (recado e música), nunca em tabela',
       has_function_privilege('anon', 'public.deixar_recado(text, text, text)', 'execute')
       and has_function_privilege('anon', 'public.sugerir_musica(text, text, text, text)', 'execute')
union all
select 'registrar foto do álbum é só do servidor',
       not has_function_privilege('anon',
         'public.registrar_foto_album(text, text, text, text)', 'execute')
union all
select 'bloco fechado no site fecha a escrita do convidado',
       (pg_get_functiondef('public.evento_do_convite(text, text)'::regprocedure)
         like '%album_aberto%')
union all
select 'o link individual passa a respeitar as confirmações encerradas',
       (pg_get_functiondef(
          'public.responder_convite_convidado(text, text, int, int, text, text, text)'::regprocedure)
         like '%rsvp_aberto%')
union all
select 'e existe UMA só versão dela (a sobrecarga antiga caiu)',
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'responder_convite_convidado')
union all
select 'a fotografia da publicação congela o convite inteiro (PIX incluso)',
       (pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure)
         like '%pix_chave%')
union all
select 'o espaço guarda os horários do lugar',
       (select count(*) = 4 from information_schema.columns
        where table_schema = 'public' and table_name = 'espacos'
          and column_name in ('liberacao_montagem','termino_som','desmontagem_ate','restricoes'))
union all
select 'a página pública serve o convite (cores, blocos, álbum)',
       (pg_get_functiondef('public.site_publico(text)'::regprocedure) like '%cor_acento%')
       and (pg_get_functiondef('public.site_publico(text)'::regprocedure) like '%album_aberto%')
union all
select 'a página pública continua sem convidados nem contagem',
       (pg_get_functiondef('public.site_publico(text)'::regprocedure) not like '%evento_convidado%')
       and (pg_get_functiondef('public.site_publico(text)'::regprocedure) not like '%guests%');
