-- ============================================================
-- 185 — O site da noiva: blocos, modelo e a revisão do dono
-- ============================================================
-- Decisão do dono (30/09/2026): quem monta e publica o site é a NOIVA
-- (a família, no portal). Cada publicação passa pela revisão DELE, o
-- dono do sistema, antes de ir ao ar — filtro contra conteúdo impróprio.
-- A cerimonialista não mexe no site (decisão de 30/09): vê o estado e é
-- avisada no sino. Isto substitui a regra da 128, em que a cerimonialista
-- congelava a fotografia com um clique.
--
-- O que muda:
--   1) evento_site ganha a ESTRUTURA (a ordem dos blocos, quais aparecem
--      e o conteúdo dos blocos novos) e o TEMA (o modelo e as cores), e
--      as colunas da revisão.
--   2) site_fotografia / site_montado: a fotografia e a página montada
--      viram funções internas, as mesmas para o público, a prévia da
--      noiva e a tela de revisão do dono. site_publico passa a chamá-las
--      — o JSON que ela devolve continua o mesmo, com estrutura e tema a
--      mais dentro de "site".
--   3) A noiva: salvar a estrutura, ver a prévia e enviar para revisão.
--      Endereço (slug) ela escolhe até a primeira aprovação.
--   4) O dono (só a chave de serviço, pelo /admin): a fila, a versão
--      para revisar ao lado da que está no ar, e aprovar ou recusar.
--   5) publicar_site passa a ser da FAMÍLIA: tira do ar ou devolve ao ar a
--      ÚLTIMA versão aprovada — conteúdo novo só entra pela revisão. O
--      dono também tira do ar pelo /admin (moderação depois de aprovado).
--   6) O sino ganha o tipo 'site' (a cerimonialista sabe que foi ao ar).
--
-- Sites que já estavam publicados contam como aprovados (a fotografia
-- deles é a de sempre). Idempotente. Termina com a conferência (tudo true).

-- ------------------------------------------------------------
-- 1) COLUNAS
-- ------------------------------------------------------------
alter table public.evento_site
  add column if not exists estrutura           jsonb not null default '[]'::jsonb,
  add column if not exists tema                jsonb not null default '{}'::jsonb,
  add column if not exists revisao_status      text  not null default 'rascunho',
  add column if not exists revisao_conteudo    jsonb,
  add column if not exists revisao_enviada_em  timestamptz,
  add column if not exists revisao_enviada_por uuid references auth.users (id) on delete set null,
  add column if not exists revisao_motivo      text,
  add column if not exists revisado_em         timestamptz;

alter table public.evento_site drop constraint if exists evento_site_revisao_check;
alter table public.evento_site add constraint evento_site_revisao_check check (
  revisao_status in ('rascunho', 'em_analise', 'aprovado', 'recusado')
  and jsonb_typeof(estrutura) = 'array'
  and jsonb_typeof(tema) = 'object'
  and (revisao_motivo is null or char_length(revisao_motivo) <= 300)
);

-- quem já foi ao ar pela regra antiga conta como aprovado (só roda
-- sobre 'rascunho': depois da primeira revisão o estado nunca volta a ele)
update public.evento_site
   set revisao_status = 'aprovado',
       revisado_em    = coalesce(revisado_em, publicado_em)
 where publicado_conteudo is not null
   and revisao_status = 'rascunho';

-- a fila do dono: só o que espera, do mais antigo ao mais novo
create index if not exists evento_site_fila_idx
  on public.evento_site (revisao_enviada_em)
  where revisao_status = 'em_analise';

-- ------------------------------------------------------------
-- 2) A FOTOGRAFIA E A PÁGINA MONTADA (internas)
-- ------------------------------------------------------------
-- A fotografia: o texto do casal que sai para o público, mais a
-- estrutura e o tema. Evento (data, local) e espaço (hospedagem) NÃO
-- entram — são lidos ao vivo, como desde a 128.
create or replace function public.site_fotografia(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'mensagem',          s.mensagem,
    'historia',          s.historia,
    'historia_titulo',   s.historia_titulo,
    'foto_casal_path',   s.foto_casal_path,
    'dress_code',        s.dress_code,
    'dress_code_titulo', s.dress_code_titulo,
    'presentes_texto',   s.presentes_texto,
    'pix_chave',         s.pix_chave,
    'pix_titular',       s.pix_titular,
    'presentes_link',    s.presentes_link,
    'blocos',            s.blocos,
    'estrutura',         s.estrutura,
    'tema',              s.tema
  )
  from public.evento_site s
  where s.event_id = p_event_id
$$;

revoke all on function public.site_fotografia(uuid) from public, anon, authenticated;

-- A página montada com um conteúdo qualquer (o publicado, o da prévia
-- ou o que espera revisão). Mesmo corpo da site_publico da 129 — nada
-- de convidados, financeiro, fornecedor, planejamento ou cortejo.
create or replace function public.site_montado(p_event_id uuid, p_conteudo jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'evento', (
      select json_build_object(
        'tipo', e.type::text,
        'anfitrioes', coalesce(nullif(trim(e.name), ''), 'os anfitriões'),
        'data', e.date, 'hora', e.time,
        'local', e.location, 'cidade', e.city,
        'capa_url', e.cover_image_url
      )
      from public.events e where e.id = s.event_id
    ),
    'empresa', (
      select json_build_object('nome', emp.nome, 'logo_url', emp.logo_url)
      from public.events e
      join public.empresas emp on emp.id = e.empresa_id
      where e.id = s.event_id
    ),
    'site', p_conteudo,
    'cores', json_build_object(
      'acento', s.cor_acento, 'tinta', s.cor_tinta, 'fundo', s.cor_fundo
    ),
    'paleta', (
      select json_agg(json_build_object(
               'nome', c.nome, 'papel', c.papel, 'hex', c.hex)
             order by c.ordem)
      from public.evento_guia_estilo g
      join public.evento_guia_cor c on c.guia_id = g.id
      where g.event_id = s.event_id
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
      where e.id = s.event_id
    ),
    'rsvp', (
      select json_build_object('aberto', e.rsvp_aberto is not false,
                               'hash', e.rsvp_hash,
                               'prazo', s.rsvp_prazo,
                               'menu', s.menu_opcoes)
      from public.events e where e.id = s.event_id
    ),
    'blocos', json_build_object(
      'album', s.album_aberto,
      'playlist', s.playlist_aberta,
      'recados', s.recados_aberto
    ),
    'album', case when s.album_aberto then (
      select json_agg(json_build_object('path', f.storage_path, 'autor', f.autor)
             order by f.created_at desc)
      from (select * from public.evento_album_foto
            where event_id = s.event_id and not oculta
            order by created_at desc limit 120) f
    ) else null end,
    'recados', case when s.recados_aberto then (
      select json_agg(json_build_object('nome', r.nome, 'texto', r.texto)
             order by r.created_at desc)
      from (select * from public.evento_recado
            where event_id = s.event_id and not oculto
            order by created_at desc limit 60) r
    ) else null end,
    'slug_atual', (select slug from public.site_slugs
                   where event_id = s.event_id and atual),
    'indexavel', s.indexavel
  )
  from public.evento_site s
  where s.event_id = p_event_id
$$;

revoke all on function public.site_montado(uuid, jsonb) from public, anon, authenticated;

-- A página pública: a mesma régua de sempre (só o que está no ar, pelo
-- hash ou pelo slug, atual ou aposentado), agora montada pela função.
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
    select es.event_id as ev_id, es.publicado_conteudo, a.por_slug, a.slug_usado
    from alvo a
    join public.evento_site es on es.event_id = a.event_id
    where es.publicado
  )
  select (
    public.site_montado(s.ev_id, s.publicado_conteudo)
    || jsonb_build_object(
         'ref_e_slug_antigo',
         (s.por_slug and s.slug_usado is distinct from
            (select slug from public.site_slugs where event_id = s.ev_id and atual)))
  )::json
  from s
$$;

revoke all on function public.site_publico(text) from public;
grant execute on function public.site_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) A NOIVA
-- ------------------------------------------------------------
-- A estrutura: a lista de blocos (tipo, variante, visível, conteúdo) e
-- o tema (modelo e cores). Tudo conferido aqui: o tipo vem de uma lista
-- fechada, cor só #rrggbb, e tamanho com teto — é texto que vai para a
-- rua (depois da revisão).
create or replace function public.portal_salvar_estrutura_site(
  p_event_id  uuid,
  p_estrutura jsonb,
  p_tema      jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tipos constant text[] := array[
    'capa', 'contagem', 'mensagem', 'historia', 'momentos', 'local',
    'dress_code', 'rsvp', 'presentes', 'hospedagem', 'galeria', 'especiais',
    'video', 'enquete', 'perguntas', 'album', 'playlist', 'mural', 'texto',
    'rodape'];
  v_hex constant text := '^#[0-9a-fA-F]{6}$';
  v_bloco jsonb;
  v_chave text;
  v_valor jsonb;
begin
  -- só a família: a cerimonialista não mexe no site (decisão de 30/09)
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;

  if p_estrutura is null or jsonb_typeof(p_estrutura) <> 'array' then
    raise exception 'estrutura inválida';
  end if;
  if jsonb_array_length(p_estrutura) > 40 or octet_length(p_estrutura::text) > 100000 then
    raise exception 'o site passou do tamanho — tire um bloco ou encurte um texto';
  end if;
  for v_bloco in select * from jsonb_array_elements(p_estrutura) loop
    -- coalesce: sem "tipo" a comparação dá nulo, e nulo não levanta
    if jsonb_typeof(v_bloco) <> 'object'
       or not coalesce(v_bloco->>'tipo' = any (v_tipos), false)
       or (v_bloco ? 'id' and (jsonb_typeof(v_bloco->'id') <> 'string'
                               or char_length(v_bloco->>'id') > 40))
       or (v_bloco ? 'variante' and (jsonb_typeof(v_bloco->'variante') <> 'string'
                                     or v_bloco->>'variante' !~ '^[a-z0-9-]{1,30}$'))
       or (v_bloco ? 'visivel' and jsonb_typeof(v_bloco->'visivel') <> 'boolean')
       or (v_bloco ? 'conteudo' and (jsonb_typeof(v_bloco->'conteudo') <> 'object'
                                     or octet_length((v_bloco->'conteudo')::text) > 20000)) then
      raise exception 'bloco inválido';
    end if;
  end loop;

  if p_tema is null or jsonb_typeof(p_tema) <> 'object' then
    raise exception 'tema inválido';
  end if;
  for v_chave, v_valor in select * from jsonb_each(p_tema) loop
    if v_chave = 'modelo' then
      if jsonb_typeof(v_valor) <> 'string' or v_valor #>> '{}' !~ '^[a-z0-9-]{1,30}$' then
        raise exception 'modelo inválido';
      end if;
    elsif v_chave = 'cores' then
      if jsonb_typeof(v_valor) <> 'object'
         or exists (select 1 from jsonb_each_text(v_valor) c
                    where c.key not in ('fundo', 'superficie', 'tinta', 'suave', 'acento')
                       or c.value !~ v_hex) then
        raise exception 'cor inválida: use o formato #rrggbb';
      end if;
    elsif v_chave = 'fontes' then
      if jsonb_typeof(v_valor) <> 'string' or v_valor #>> '{}' !~ '^[a-z0-9-]{1,30}$' then
        raise exception 'fontes inválidas';
      end if;
    else
      raise exception 'tema inválido';
    end if;
  end loop;

  insert into public.evento_site (event_id, atualizado_por)
  values (p_event_id, auth.uid())
  on conflict (event_id) do nothing;

  update public.evento_site
     set estrutura      = p_estrutura,
         tema           = p_tema,
         atualizado_por = auth.uid(),
         updated_at     = now()
   where event_id = p_event_id;
end $$;

revoke all on function public.portal_salvar_estrutura_site(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.portal_salvar_estrutura_site(uuid, jsonb, jsonb) to authenticated;

-- A prévia: a página montada com o que está escrito AGORA, mais o
-- estado da revisão. Só para quem é do evento.
create or replace function public.portal_previa_site(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site public.evento_site%rowtype;
begin
  if not (public.sou_cliente_do_evento(p_event_id)
          or public.pode_editar_evento(p_event_id)) then
    raise exception 'sem permissão para este evento';
  end if;
  select * into v_site from public.evento_site where event_id = p_event_id;
  if not found then
    return null;
  end if;
  return public.site_montado(p_event_id, public.site_fotografia(p_event_id))
    || jsonb_build_object(
         'revisao', jsonb_build_object(
           'status',     v_site.revisao_status,
           'enviada_em', v_site.revisao_enviada_em,
           'motivo',     v_site.revisao_motivo,
           'revisado_em', v_site.revisado_em),
         'publicado', v_site.publicado,
         'publicado_em', v_site.publicado_em);
end $$;

revoke all on function public.portal_previa_site(uuid) from public, anon;
grant execute on function public.portal_previa_site(uuid) to authenticated;

-- Publicar = mandar para a revisão do dono. A fotografia congela AQUI:
-- o que ele revisa é exatamente o que vai ao ar, mesmo que a noiva siga
-- editando. A versão aprovada antes continua no ar até a nova passar.
-- Reenviar com uma versão já na fila troca a versão e mantém o lugar.
create or replace function public.portal_enviar_site_para_revisao(p_event_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.evento_site%rowtype;
begin
  -- só a família publica (a equipe não envia em nome dela)
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;
  select * into v_site from public.evento_site where event_id = p_event_id;
  if not found then
    raise exception 'monte o site antes de publicar';
  end if;

  update public.evento_site
     set revisao_conteudo    = public.site_fotografia(p_event_id),
         revisao_status      = 'em_analise',
         revisao_enviada_em  = case when v_site.revisao_status = 'em_analise'
                                    then coalesce(v_site.revisao_enviada_em, now())
                                    else now() end,
         revisao_enviada_por = auth.uid(),
         revisao_motivo      = null,
         updated_at          = now()
   where event_id = p_event_id;
end $$;

revoke all on function public.portal_enviar_site_para_revisao(uuid) from public, anon;
grant execute on function public.portal_enviar_site_para_revisao(uuid) to authenticated;

-- O endereço passa a ser da FAMÍLIA, e só até a primeira aprovação
-- (convite impresso não muda). A equipe não mexe mais (decisão de 30/09).
-- A regra da 128 continua: único no mundo, reservados fora, e o antigo
-- redireciona para sempre.
create or replace function public.definir_slug_site(
  p_event_id uuid,
  p_slug     text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(p_slug));
  v_site public.evento_site%rowtype;
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;

  select * into v_site from public.evento_site where event_id = p_event_id;
  if found and (v_site.publicado or v_site.slug_congelado_em is not null) then
    raise exception 'o endereço já foi publicado e não muda mais';
  end if;
  if found and v_site.slug = v_slug then
    return; -- nada a fazer
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or length(v_slug) < 3 or length(v_slug) > 40 then
    raise exception 'endereço inválido: use letras minúsculas, números e hífens (3 a 40)';
  end if;
  if v_slug in ('admin', 'api', 'login', 'portal', 'confirmar', 'confirmacao',
                'guia', 'orcamento', 'orcamentos', 'fornecedor', 'fornecedores',
                'agendar', 'eventos', 'ajuda', 'privacidade', 'auth', 'imprimir',
                'convite', 'site', 'www', 'c', 'app', 'nova-senha', 'clientes') then
    raise exception 'este endereço é reservado';
  end if;

  -- a ordem importa (128): rebaixar o atual antes de inserir o novo
  update public.site_slugs
     set atual = false
   where event_id = p_event_id and atual;

  insert into public.site_slugs (slug, event_id, atual)
  values (v_slug, p_event_id, false)
  on conflict (slug) do nothing;
  if not exists (select 1 from public.site_slugs
                 where slug = v_slug and event_id = p_event_id) then
    raise exception 'este endereço já está em uso';
  end if;

  update public.site_slugs
     set atual = true
   where event_id = p_event_id and slug = v_slug;

  insert into public.evento_site (event_id, slug, atualizado_por)
  values (p_event_id, v_slug, auth.uid())
  on conflict (event_id) do update
    set slug = v_slug, atualizado_por = auth.uid(), updated_at = now();
end $$;

revoke all on function public.definir_slug_site(uuid, text) from public, anon;
grant execute on function public.definir_slug_site(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 4) O DONO (só a chave de serviço, pelo /admin)
-- ------------------------------------------------------------
-- A fila: o que espera revisão, do mais antigo ao mais novo. Só o que a
-- tela precisa para escolher — o conteúdo vem na função seguinte.
create or replace function public.admin_fila_sites()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'event_id',   s.event_id,
           'empresa',    emp.nome,
           'evento',     coalesce(nullif(trim(e.name), ''), e.type::text),
           'tipo',       e.type::text,
           'data',       e.date,
           'enviada_em', s.revisao_enviada_em,
           'slug',       s.slug,
           'no_ar',      s.publicado_conteudo is not null)
         order by s.revisao_enviada_em), '[]'::jsonb)
  from public.evento_site s
  join public.events e on e.id = s.event_id
  left join public.empresas emp on emp.id = e.empresa_id
  where s.revisao_status = 'em_analise'
$$;

revoke all on function public.admin_fila_sites() from public, anon, authenticated;
grant execute on function public.admin_fila_sites() to service_role;

-- A versão para revisar e a que está no ar, montadas do mesmo jeito que
-- o público vai ver.
create or replace function public.admin_site_para_revisar(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status',     s.revisao_status,
    'enviada_em', s.revisao_enviada_em,
    'pendente',   case when s.revisao_conteudo is not null
                       then public.site_montado(s.event_id, s.revisao_conteudo) end,
    'no_ar',      case when s.publicado_conteudo is not null
                       then public.site_montado(s.event_id, s.publicado_conteudo) end,
    'publicado',  s.publicado)
  from public.evento_site s
  where s.event_id = p_event_id
$$;

revoke all on function public.admin_site_para_revisar(uuid) from public, anon, authenticated;
grant execute on function public.admin_site_para_revisar(uuid) to service_role;

-- Aprovar põe no ar a versão revisada (e congela o endereço); recusar
-- guarda o motivo, que a noiva lê. A versão que estava no ar segue no ar
-- quando a nova é recusada. O sino avisa a cerimonialista do evento.
create or replace function public.admin_decidir_site(
  p_event_id uuid,
  p_aprovar  boolean,
  p_motivo   text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_site public.evento_site%rowtype;
  v_ev   public.events%rowtype;
  v_aviso uuid;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  select * into v_site from public.evento_site where event_id = p_event_id for update;
  if not found or v_site.revisao_status <> 'em_analise' or v_site.revisao_conteudo is null then
    raise exception 'este site não está esperando revisão';
  end if;
  select * into v_ev from public.events where id = p_event_id;

  if p_aprovar then
    update public.evento_site
       set publicado          = true,
           publicado_conteudo = v_site.revisao_conteudo,
           publicado_em       = now(),
           publicado_por      = null,
           evento_dados_na_publicacao = jsonb_build_object(
             'date', v_ev.date, 'time', v_ev.time,
             'location', v_ev.location, 'city', v_ev.city),
           slug_congelado_em  = coalesce(v_site.slug_congelado_em,
                                         case when v_site.slug is not null then now() end),
           revisao_status     = 'aprovado',
           revisao_conteudo   = null,
           revisao_motivo     = null,
           revisado_em        = now(),
           updated_at         = now()
     where event_id = p_event_id;
  else
    if v_motivo is null or char_length(v_motivo) > 300 then
      raise exception 'diga o motivo da recusa (até 300 caracteres)';
    end if;
    update public.evento_site
       set revisao_status   = 'recusado',
           revisao_conteudo = null,
           revisao_motivo   = v_motivo,
           revisado_em      = now(),
           updated_at       = now()
     where event_id = p_event_id;
  end if;

  -- o sino vai para a responsável do evento (membro → usuário, como na
  -- 162); sem responsável, para a dona da empresa
  select coalesce(
    (select m.user_id from public.membros_equipe m where m.id = v_ev.cerimonialista_responsavel_id),
    (select emp.owner_user_id from public.empresas emp where emp.id = v_ev.empresa_id)
  ) into v_aviso;

  if v_aviso is not null then
    insert into public.notifications (cerimonialista_id, empresa_id, type, title, message, link)
    values (
      v_aviso,
      v_ev.empresa_id,
      'site',
      case when p_aprovar
           then 'O site de ' || coalesce(nullif(trim(v_ev.name), ''), 'um evento') || ' está no ar'
           else 'O site de ' || coalesce(nullif(trim(v_ev.name), ''), 'um evento') || ' voltou para ajustes' end,
      -- o motivo da recusa fica entre a família e o dono: ela só vê o estado
      case when p_aprovar then 'A versão que a família publicou foi aprovada.'
           else 'A família vai ajustar e publicar de novo.' end,
      '/eventos/' || p_event_id::text || '/area-do-cliente'
    );
  end if;
end $$;

revoke all on function public.admin_decidir_site(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_decidir_site(uuid, boolean, text) to service_role;

-- O dono tira do ar um site já aprovado (moderação depois da aprovação,
-- ex.: denúncia). A família vê o motivo; publicar de novo passa pela
-- revisão.
create or replace function public.admin_tirar_site_do_ar(
  p_event_id uuid,
  p_motivo   text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_motivo is null or char_length(v_motivo) > 300 then
    raise exception 'diga o motivo (até 300 caracteres)';
  end if;
  update public.evento_site
     set publicado        = false,
         revisao_status   = 'recusado',
         revisao_conteudo = null,
         revisao_motivo   = v_motivo,
         revisado_em      = now(),
         updated_at       = now()
   where event_id = p_event_id;
  if not found then
    raise exception 'site não encontrado';
  end if;
end $$;

revoke all on function public.admin_tirar_site_do_ar(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_tirar_site_do_ar(uuid, text) to service_role;

-- ------------------------------------------------------------
-- 5) A FAMÍLIA tira do ar e devolve ao ar
-- ------------------------------------------------------------
-- Conteúdo novo só entra pela revisão. Aqui a família só liga e desliga
-- a ÚLTIMA versão aprovada (a fotografia guardada). A cerimonialista não
-- mexe no site (decisão de 30/09) — nem aqui. Devolver ao ar depois que
-- o DONO tirou exige nova revisão: o estado fica 'recusado'.
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
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;
  select * into v_site from public.evento_site where event_id = p_event_id;
  if not found then
    raise exception 'monte o site antes de publicar';
  end if;

  if p_publicado then
    if v_site.publicado_conteudo is null or v_site.revisao_status = 'recusado' then
      raise exception 'o site precisa passar pela revisão antes de voltar ao ar';
    end if;
    update public.evento_site
       set publicado = true, updated_at = now()
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
-- 6) O SINO GANHA 'site'
-- ------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor',
    'orcamento_aprovado', 'orcamento_recusado', 'compromisso',
    'portal', 'orcamento_comentario', 'pedido_orcamento', 'site'
  ));

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'as colunas da estrutura e da revisão existem' as item,
       (select count(*) = 8 from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_site'
           and column_name in ('estrutura', 'tema', 'revisao_status', 'revisao_conteudo',
                               'revisao_enviada_em', 'revisao_enviada_por',
                               'revisao_motivo', 'revisado_em')) as ok
union all
select 'site publicado pela regra antiga conta como aprovado',
       not exists (select 1 from public.evento_site
                    where publicado_conteudo is not null and revisao_status = 'rascunho')
union all
select 'anon só executa a site_publico (nenhuma função nova)',
       has_function_privilege('anon', 'public.site_publico(text)', 'execute')
       and not has_function_privilege('anon', 'public.site_fotografia(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.site_montado(uuid, jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)', 'execute')
       and not has_function_privilege('anon', 'public.portal_previa_site(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.portal_enviar_site_para_revisao(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.admin_fila_sites()', 'execute')
       and not has_function_privilege('anon', 'public.admin_decidir_site(uuid, boolean, text)', 'execute')
       and not has_function_privilege('anon', 'public.admin_tirar_site_do_ar(uuid, text)', 'execute')
union all
select 'quem entra no sistema não chama a montagem nem as funções do dono',
       not has_function_privilege('authenticated', 'public.site_montado(uuid, jsonb)', 'execute')
       and not has_function_privilege('authenticated', 'public.site_fotografia(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_fila_sites()', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_site_para_revisar(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_decidir_site(uuid, boolean, text)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_tirar_site_do_ar(uuid, text)', 'execute')
union all
select 'a chave de serviço decide',
       has_function_privilege('service_role', 'public.admin_decidir_site(uuid, boolean, text)', 'execute')
       and has_function_privilege('service_role', 'public.admin_fila_sites()', 'execute')
       and has_function_privilege('service_role', 'public.admin_site_para_revisar(uuid)', 'execute')
       and has_function_privilege('service_role', 'public.admin_tirar_site_do_ar(uuid, text)', 'execute')
union all
select 'as funções da noiva exigem vínculo com o evento',
       pg_get_functiondef('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)'::regprocedure) like '%sou_cliente_do_evento%'
       and pg_get_functiondef('public.portal_previa_site(uuid)'::regprocedure) like '%sou_cliente_do_evento%'
       and pg_get_functiondef('public.portal_enviar_site_para_revisao(uuid)'::regprocedure) like '%sou_cliente_do_evento%'
union all
select 'a página pública só serve o que está no ar',
       pg_get_functiondef('public.site_publico(text)'::regprocedure) like '%where es.publicado%'
union all
select 'a cerimonialista não mexe no site (montar, enviar, endereço, ligar/desligar)',
       pg_get_functiondef('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.portal_enviar_site_para_revisao(uuid)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.definir_slug_site(uuid, text)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure) not like '%pode_editar_evento%'
union all
select 'ligar de novo não põe conteúdo novo no ar',
       pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure) not like '%site_fotografia%'
       and pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure) like '%precisa passar pela revisão%'
union all
select 'o casal continua SEM escrita direta em evento_site',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'evento_site'
           and cmd in ('UPDATE', 'ALL')
           and coalesce(qual, with_check) like '%eventos_da_cliente%')
union all
select 'o sino aceita o tipo site',
       exists (select 1 from pg_constraint c
                where c.conname = 'notifications_type_check'
                  and pg_get_constraintdef(c.oid) like '%''site''%');
