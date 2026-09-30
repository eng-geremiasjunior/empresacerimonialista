-- ============================================================
-- 186 — Consertos da revisão do site (depois dos dois céticos da 185)
-- ============================================================
-- A 185 foi aplicada antes da revisão dos dois agentes céticos. Eles
-- acharam furos na promessa "cada publicação passa pelo dono" e na
-- decisão "a cerimonialista não mexe no site". Esta migração fecha os
-- furos, sem mudar nada do que a página pública mostra hoje:
--
--   1) A equipe não escreve mais direto em evento_site: a policy
--      site_write (128) caía por cima de tudo — publicado, fotografia,
--      revisão, estrutura, foto de outra pasta. Sai. A família escreve só
--      pelas funções; a equipe só lê.
--   2) As três funções antigas do convite (portal_salvar_site,
--      portal_ajustar_convite, portal_definir_blocos) deixam de aceitar a
--      equipe.
--   3) A equipe não consegue se ligar como "família" de um evento: o
--      login do portal só é ligado pelo sistema (chave de serviço).
--   4) Site que o DONO tirou do ar não volta sem nova aprovação (antes,
--      reenviar para revisão e religar trazia de volta a versão tirada).
--      E a recusa de uma versão nova não impede mais a família de
--      religar a última versão aprovada. Coluna retirado_pelo_dono_em.
--   5) O dono aprova exatamente a versão que viu: cada envio ganha um
--      número (revisao_versao), e aprovar/recusar confere o número.
--   6) Endereço: publicar exige ter escolhido o endereço; ele não muda
--      com o site no ar, em análise ou depois de aprovado; no máximo 5
--      trocas por evento.
--   7) Validação dos blocos: só as chaves conhecidas, id com caracteres
--      simples, conteúdo só no texto livre (título e texto), cor nula não
--      passa.
--   8) O aviso no sino nunca derruba a decisão, vai só para quem é da
--      equipe ativa, e a prévia só mostra o motivo da recusa à família.
--
-- Idempotente. Termina com a conferência (tudo true).

-- ------------------------------------------------------------
-- 1) COLUNAS NOVAS
-- ------------------------------------------------------------
alter table public.evento_site
  add column if not exists retirado_pelo_dono_em timestamptz,
  add column if not exists revisao_versao        int not null default 0;

-- a foto da história é sempre da pasta DESTE evento (a função da 130 já
-- conferia; agora a tabela também). NOT VALID: vale para o que for
-- escrito daqui para frente, sem reler as linhas antigas.
alter table public.evento_site drop constraint if exists evento_site_foto_da_pasta_check;
alter table public.evento_site add constraint evento_site_foto_da_pasta_check
  check (foto_casal_path is null or foto_casal_path like event_id::text || '/%') not valid;

-- ------------------------------------------------------------
-- 2) A EQUIPE NÃO ESCREVE MAIS DIRETO EM evento_site
-- ------------------------------------------------------------
drop policy if exists site_write on public.evento_site;

-- ------------------------------------------------------------
-- 3) O LOGIN DO PORTAL SÓ É LIGADO PELO SISTEMA
-- ------------------------------------------------------------
-- As policies de evento_acesso (086) deixam a equipe criar e editar o
-- vínculo; sem esta trava ela poderia pôr o PRÓPRIO login como família e
-- ganhar o site. O sistema liga o login pela chave de serviço (convite,
-- "abrir como a família") e pelo gatilho de cadastro — nenhum deles roda
-- como 'authenticated'.
create or replace function public.evento_acesso_login_so_pelo_sistema()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' and (
       (tg_op = 'INSERT' and new.user_id is not null)
       or (tg_op = 'UPDATE' and new.user_id is distinct from old.user_id)) then
    raise exception 'o login do portal só é ligado pelo convite';
  end if;
  return new;
end $$;

drop trigger if exists trg_login_so_pelo_sistema on public.evento_acesso;
create trigger trg_login_so_pelo_sistema
  before insert or update on public.evento_acesso
  for each row execute function public.evento_acesso_login_so_pelo_sistema();

-- ------------------------------------------------------------
-- 4) AS FUNÇÕES ANTIGAS DO CONVITE: SÓ A FAMÍLIA
-- ------------------------------------------------------------
-- Mesmo corpo da 128 e da 130; só a checagem muda.
create or replace function public.portal_salvar_site(
  p_event_id   uuid,
  p_mensagem   text,
  p_historia   text,
  p_dress_code text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;
  if length(coalesce(p_mensagem, '')) > 2000
     or length(coalesce(p_historia, '')) > 4000
     or length(coalesce(p_dress_code, '')) > 400 then
    raise exception 'texto longo demais';
  end if;

  insert into public.evento_site (event_id, mensagem, historia, dress_code, atualizado_por)
  values (p_event_id, nullif(trim(p_mensagem), ''), nullif(trim(p_historia), ''),
          nullif(trim(p_dress_code), ''), auth.uid())
  on conflict (event_id) do update
    set mensagem       = nullif(trim(p_mensagem), ''),
        historia       = nullif(trim(p_historia), ''),
        dress_code     = nullif(trim(p_dress_code), ''),
        atualizado_por = auth.uid(),
        updated_at     = now();
end $$;

revoke all on function public.portal_salvar_site(uuid, text, text, text) from public, anon;
grant execute on function public.portal_salvar_site(uuid, text, text, text) to authenticated;

create or replace function public.portal_ajustar_convite(
  p_event_id          uuid,
  p_historia_titulo   text,
  p_dress_code_titulo text,
  p_cor_acento        text,
  p_cor_tinta         text,
  p_cor_fundo         text,
  p_presentes_texto   text,
  p_pix_chave         text,
  p_pix_titular       text,
  p_presentes_link    text,
  p_foto_casal_path   text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hex constant text := '^#[0-9a-fA-F]{6}$';
  v_link text := nullif(btrim(coalesce(p_presentes_link, '')), '');
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;

  if (p_cor_acento is not null and p_cor_acento !~ v_hex)
     or (p_cor_tinta is not null and p_cor_tinta !~ v_hex)
     or (p_cor_fundo is not null and p_cor_fundo !~ v_hex) then
    raise exception 'cor inválida: use o formato #rrggbb';
  end if;

  if v_link is not null and v_link !~* '^https?://' then
    raise exception 'o link da lista precisa começar com https://';
  end if;

  insert into public.evento_site (event_id, atualizado_por)
  values (p_event_id, auth.uid())
  on conflict (event_id) do nothing;

  update public.evento_site
     set historia_titulo   = nullif(left(btrim(coalesce(p_historia_titulo, '')), 120), ''),
         dress_code_titulo = nullif(left(btrim(coalesce(p_dress_code_titulo, '')), 60), ''),
         cor_acento        = p_cor_acento,
         cor_tinta         = p_cor_tinta,
         cor_fundo         = p_cor_fundo,
         presentes_texto   = nullif(left(btrim(coalesce(p_presentes_texto, '')), 400), ''),
         pix_chave         = nullif(left(btrim(coalesce(p_pix_chave, '')), 120), ''),
         pix_titular       = nullif(left(btrim(coalesce(p_pix_titular, '')), 120), ''),
         presentes_link    = v_link,
         foto_casal_path   = case
                               when p_foto_casal_path is null then foto_casal_path
                               when p_foto_casal_path = '' then null
                               when p_foto_casal_path like (p_event_id::text || '/%')
                                 then p_foto_casal_path
                               else foto_casal_path
                             end,
         atualizado_por    = auth.uid(),
         updated_at        = now()
   where event_id = p_event_id;
end $$;

revoke all on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.portal_ajustar_convite(
  uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.portal_definir_blocos(
  p_event_id uuid,
  p_album    boolean,
  p_playlist boolean,
  p_recados  boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;

  insert into public.evento_site (event_id, atualizado_por)
  values (p_event_id, auth.uid())
  on conflict (event_id) do nothing;

  update public.evento_site
     set album_aberto    = coalesce(p_album, album_aberto),
         playlist_aberta = coalesce(p_playlist, playlist_aberta),
         recados_aberto  = coalesce(p_recados, recados_aberto),
         atualizado_por  = auth.uid(),
         updated_at      = now()
   where event_id = p_event_id;
end $$;

revoke all on function public.portal_definir_blocos(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.portal_definir_blocos(uuid, boolean, boolean, boolean) to authenticated;

-- ------------------------------------------------------------
-- 5) A ESTRUTURA: VALIDAÇÃO FECHADA
-- ------------------------------------------------------------
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
       or exists (select 1 from jsonb_object_keys(v_bloco) k
                  where k not in ('id', 'tipo', 'variante', 'visivel', 'conteudo'))
       or (v_bloco ? 'id' and (jsonb_typeof(v_bloco->'id') <> 'string'
                               or v_bloco->>'id' !~ '^[A-Za-z0-9_-]{1,40}$'))
       or (v_bloco ? 'variante' and (jsonb_typeof(v_bloco->'variante') <> 'string'
                                     or v_bloco->>'variante' !~ '^[a-z0-9-]{1,30}$'))
       or (v_bloco ? 'visivel' and jsonb_typeof(v_bloco->'visivel') <> 'boolean') then
      raise exception 'bloco inválido';
    end if;

    -- conteúdo, por enquanto, só no texto livre (título e texto). Cada
    -- bloco novo ganha a sua regra aqui quando ganhar desenho (caminho de
    -- foto dentro da pasta do evento, link só https…).
    if v_bloco ? 'conteudo' and (
         jsonb_typeof(v_bloco->'conteudo') <> 'object'
         or v_bloco->>'tipo' <> 'texto'
         or exists (select 1 from jsonb_each(v_bloco->'conteudo') c
                    where c.key not in ('titulo', 'texto') or jsonb_typeof(c.value) <> 'string')
         or char_length(coalesce(v_bloco->'conteudo'->>'titulo', '')) > 120
         or char_length(coalesce(v_bloco->'conteudo'->>'texto', '')) > 4000) then
      raise exception 'conteúdo do bloco inválido';
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
         or exists (select 1 from jsonb_each(v_valor) c
                    where c.key not in ('fundo', 'superficie', 'tinta', 'suave', 'acento')
                       or jsonb_typeof(c.value) <> 'string'
                       or c.value #>> '{}' !~ v_hex) then
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

-- ------------------------------------------------------------
-- 6) A PRÉVIA: o motivo da recusa é só da família
-- ------------------------------------------------------------
create or replace function public.portal_previa_site(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_site public.evento_site%rowtype;
  v_familia boolean := public.sou_cliente_do_evento(p_event_id);
begin
  if not (v_familia or public.pode_editar_evento(p_event_id)) then
    raise exception 'sem permissão para este evento';
  end if;
  select * into v_site from public.evento_site where event_id = p_event_id;
  if not found then
    return null;
  end if;
  return public.site_montado(p_event_id, public.site_fotografia(p_event_id))
    || jsonb_build_object(
         'revisao', jsonb_build_object(
           'status',      v_site.revisao_status,
           'enviada_em',  v_site.revisao_enviada_em,
           'motivo',      case when v_familia then v_site.revisao_motivo end,
           'revisado_em', v_site.revisado_em,
           'retirado',    v_site.retirado_pelo_dono_em is not null),
         'publicado',    v_site.publicado,
         'publicado_em', v_site.publicado_em);
end $$;

revoke all on function public.portal_previa_site(uuid) from public, anon;
grant execute on function public.portal_previa_site(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7) PUBLICAR = ENVIAR PARA REVISÃO (com endereço e número da versão)
-- ------------------------------------------------------------
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
  if not public.sou_cliente_do_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;
  select * into v_site from public.evento_site where event_id = p_event_id;
  if not found then
    raise exception 'monte o site antes de publicar';
  end if;
  -- o endereço vai junto para a revisão e congela na aprovação
  if v_site.slug is null then
    raise exception 'escolha o endereço do site antes de publicar';
  end if;

  update public.evento_site
     set revisao_conteudo    = public.site_fotografia(p_event_id),
         revisao_status      = 'em_analise',
         revisao_versao      = v_site.revisao_versao + 1,
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

-- ------------------------------------------------------------
-- 8) O ENDEREÇO: só a família, só antes de ir ao ar, até 5 trocas
-- ------------------------------------------------------------
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
  if found and (v_site.slug_congelado_em is not null or v_site.publicado) then
    raise exception 'o endereço já foi publicado e não muda mais';
  end if;
  if found and v_site.revisao_status = 'em_analise' then
    raise exception 'o site está em análise — o endereço muda depois da resposta';
  end if;
  if found and v_site.slug = v_slug then
    return; -- nada a fazer
  end if;

  if v_slug is null
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or length(v_slug) < 3 or length(v_slug) > 40 then
    raise exception 'endereço inválido: use letras minúsculas, números e hífens (3 a 40)';
  end if;
  if v_slug in ('admin', 'api', 'login', 'portal', 'confirmar', 'confirmacao',
                'guia', 'orcamento', 'orcamentos', 'fornecedor', 'fornecedores',
                'agendar', 'eventos', 'ajuda', 'privacidade', 'auth', 'imprimir',
                'convite', 'site', 'www', 'c', 'app', 'nova-senha', 'clientes') then
    raise exception 'este endereço é reservado';
  end if;
  -- cada troca reserva o endereço para sempre: teto contra quem tenta
  -- guardar nomes por script
  if (select count(*) from public.site_slugs where event_id = p_event_id) >= 5 then
    raise exception 'o endereço já foi trocado muitas vezes — fale com o suporte';
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
-- 9) O DONO: a fila, a versão com número, decidir e tirar do ar
-- ------------------------------------------------------------
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
           'no_ar',      s.publicado)
         order by s.revisao_enviada_em), '[]'::jsonb)
  from public.evento_site s
  join public.events e on e.id = s.event_id
  left join public.empresas emp on emp.id = e.empresa_id
  where s.revisao_status = 'em_analise'
$$;

revoke all on function public.admin_fila_sites() from public, anon, authenticated;
grant execute on function public.admin_fila_sites() to service_role;

create or replace function public.admin_site_para_revisar(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'status',     s.revisao_status,
    'versao',     s.revisao_versao,
    'enviada_em', s.revisao_enviada_em,
    'slug',       s.slug,
    'retirado',   s.retirado_pelo_dono_em is not null,
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

-- o sino da equipe: a responsável ATIVA do evento (membro → usuário), ou
-- a dona da empresa. Nunca derruba quem chamou.
create or replace function public.avisar_equipe_do_site(
  p_event_id uuid,
  p_titulo   text,
  p_texto    text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ev    public.events%rowtype;
  v_aviso uuid;
begin
  select * into v_ev from public.events where id = p_event_id;
  select coalesce(
    (select m.user_id from public.membros_equipe m
      where m.id = v_ev.cerimonialista_responsavel_id
        and m.empresa_id = v_ev.empresa_id
        and m.status = 'ativo'
        and m.user_id is not null),
    (select emp.owner_user_id from public.empresas emp where emp.id = v_ev.empresa_id)
  ) into v_aviso;

  if v_aviso is not null then
    begin
      insert into public.notifications (cerimonialista_id, empresa_id, type, title, message, link)
      values (v_aviso, v_ev.empresa_id, 'site', p_titulo, p_texto,
              '/eventos/' || p_event_id::text || '/area-do-cliente');
    exception when others then
      null; -- aviso nunca derruba
    end;
  end if;
end $$;

revoke all on function public.avisar_equipe_do_site(uuid, text, text) from public, anon, authenticated;

drop function if exists public.admin_decidir_site(uuid, boolean, text);
create or replace function public.admin_decidir_site(
  p_event_id uuid,
  p_aprovar  boolean,
  p_motivo   text,
  p_versao   int
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
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_nome text;
begin
  select * into v_site from public.evento_site where event_id = p_event_id for update;
  if not found or v_site.revisao_status <> 'em_analise' or v_site.revisao_conteudo is null then
    raise exception 'este site não está esperando revisão';
  end if;
  -- o dono aprova exatamente o que viu
  if v_site.revisao_versao is distinct from p_versao then
    raise exception 'chegou uma versão nova enquanto você revisava — abra de novo';
  end if;
  select * into v_ev from public.events where id = p_event_id;
  v_nome := coalesce(nullif(trim(v_ev.name), ''), 'um evento');

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
           retirado_pelo_dono_em = null,
           revisao_status     = 'aprovado',
           revisao_conteudo   = null,
           revisao_motivo     = null,
           revisado_em        = now(),
           updated_at         = now()
     where event_id = p_event_id;
    perform public.avisar_equipe_do_site(p_event_id,
      'O site de ' || v_nome || ' está no ar',
      'A versão que a família publicou foi aprovada.');
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
    -- o motivo fica entre a família e o dono: a equipe só vê o estado
    perform public.avisar_equipe_do_site(p_event_id,
      'O site de ' || v_nome || ' voltou para ajustes',
      'A família vai ajustar e publicar de novo.');
  end if;
end $$;

revoke all on function public.admin_decidir_site(uuid, boolean, text, int) from public, anon, authenticated;
grant execute on function public.admin_decidir_site(uuid, boolean, text, int) to service_role;

-- Tirar do ar um site já aprovado (moderação). A versão que estiver na
-- fila continua na fila; religar só com nova aprovação.
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
  v_nome text;
begin
  if v_motivo is null or char_length(v_motivo) > 300 then
    raise exception 'diga o motivo (até 300 caracteres)';
  end if;
  update public.evento_site
     set publicado             = false,
         retirado_pelo_dono_em = now(),
         revisao_status        = case when revisao_status = 'em_analise'
                                      then 'em_analise' else 'recusado' end,
         revisao_motivo        = v_motivo,
         revisado_em           = now(),
         updated_at            = now()
   where event_id = p_event_id;
  if not found then
    raise exception 'site não encontrado';
  end if;
  select coalesce(nullif(trim(e.name), ''), 'um evento') into v_nome
    from public.events e where e.id = p_event_id;
  perform public.avisar_equipe_do_site(p_event_id,
    'O site de ' || v_nome || ' saiu do ar',
    'O eorganizei tirou o site do ar. A família vê o motivo no portal.');
end $$;

revoke all on function public.admin_tirar_site_do_ar(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_tirar_site_do_ar(uuid, text) to service_role;

-- ------------------------------------------------------------
-- 10) A FAMÍLIA LIGA E DESLIGA: o que o dono tirou só volta aprovado
-- ------------------------------------------------------------
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
    if v_site.publicado_conteudo is null or v_site.retirado_pelo_dono_em is not null then
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
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'as colunas novas existem' as item,
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_site'
           and column_name in ('retirado_pelo_dono_em', 'revisao_versao')) as ok
union all
select 'ninguém escreve direto em evento_site (só pelas funções)',
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'evento_site'
                      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))
union all
select 'a equipe e o anon continuam lendo só pelo que já existia',
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'evento_site'
                  and policyname = 'site_select')
union all
select 'nenhuma função do site aceita a equipe para escrever',
       pg_get_functiondef('public.portal_salvar_site(uuid, text, text, text)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.portal_ajustar_convite(uuid, text, text, text, text, text, text, text, text, text, text)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.portal_definir_blocos(uuid, boolean, boolean, boolean)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.portal_enviar_site_para_revisao(uuid)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.definir_slug_site(uuid, text)'::regprocedure) not like '%pode_editar_evento%'
       and pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure) not like '%pode_editar_evento%'
union all
select 'o login do portal só é ligado pelo sistema',
       exists (select 1 from pg_trigger
                where tgname = 'trg_login_so_pelo_sistema' and not tgisinternal)
union all
select 'o dono aprova a versão que viu (a antiga assinatura saiu)',
       to_regprocedure('public.admin_decidir_site(uuid, boolean, text)') is null
       and to_regprocedure('public.admin_decidir_site(uuid, boolean, text, int)') is not null
       and pg_get_functiondef('public.admin_decidir_site(uuid, boolean, text, int)'::regprocedure) like '%revisao_versao is distinct from p_versao%'
union all
select 'o que o dono tirou do ar só volta aprovado',
       pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure) like '%retirado_pelo_dono_em is not null%'
union all
select 'publicar exige o endereço',
       pg_get_functiondef('public.portal_enviar_site_para_revisao(uuid)'::regprocedure) like '%escolha o endereço%'
union all
select 'anon e quem entra no sistema não chamam as funções do dono nem as internas',
       not has_function_privilege('anon', 'public.admin_site_para_revisar(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_site_para_revisar(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.admin_decidir_site(uuid, boolean, text, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_decidir_site(uuid, boolean, text, int)', 'execute')
       and not has_function_privilege('authenticated', 'public.admin_tirar_site_do_ar(uuid, text)', 'execute')
       and not has_function_privilege('authenticated', 'public.avisar_equipe_do_site(uuid, text, text)', 'execute')
       and not has_function_privilege('anon', 'public.avisar_equipe_do_site(uuid, text, text)', 'execute')
union all
select 'a chave de serviço decide',
       has_function_privilege('service_role', 'public.admin_decidir_site(uuid, boolean, text, int)', 'execute')
       and has_function_privilege('service_role', 'public.admin_tirar_site_do_ar(uuid, text)', 'execute')
       and has_function_privilege('service_role', 'public.admin_site_para_revisar(uuid)', 'execute')
union all
select 'a validação do bloco fecha as chaves e o conteúdo',
       pg_get_functiondef('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)'::regprocedure) like '%jsonb_object_keys%'
       and pg_get_functiondef('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)'::regprocedure) like '%conteúdo do bloco inválido%'
       and pg_get_functiondef('public.portal_salvar_estrutura_site(uuid, jsonb, jsonb)'::regprocedure) like '%jsonb_typeof(c.value) <> ''string''%'
union all
select 'a página pública continua só com o que está no ar',
       pg_get_functiondef('public.site_publico(text)'::regprocedure) like '%where es.publicado%';
