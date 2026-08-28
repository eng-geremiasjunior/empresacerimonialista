-- ============================================================
-- Vela — Migração 128: o site do casamento (espaços + evento_site)
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A página pública que já existe por evento (rsvp_hash) cresce e vira o
-- site do casamento. Esta migração cria o chão:
--
--   espacos / espaco_hospedagem — o conhecimento do LUGAR, que acumula:
--     a cerimonialista cadastra as pousadas de um espaço uma vez e todo
--     evento futuro ali herda a lista (a lógica do CRM de fornecedores).
--     Por EMPRESA: duas cerimonialistas na mesma fazenda têm dois
--     cadastros — a nota é ativo de cada uma. Anotado: um dia isso pode
--     virar um cadastro compartilhado de locais.
--     Colunas de liberação de montagem / término / desmontagem entram
--     numa fatia futura — a entidade já é o lugar delas.
--
--   evento_site — o conteúdo do site, com a regra de publicação por
--     FOTOGRAFIA: tudo nasce rascunho; publicar congela o conteúdo num
--     jsonb e é a fotografia que o público vê. O casal edita depois à
--     vontade — o ar não muda até a cerimonialista repassar e publicar
--     de novo. Dado do EVENTO (data, hora, local) e do ESPAÇO
--     (hospedagens) são lidos AO VIVO: casamento que muda de data não
--     pode ficar com o site mentindo para 130 pessoas, e pousada que
--     fechou sai do site na hora — os dois são conteúdo da equipe, a
--     mão dela já está neles.
--
--   site_slugs — o endereço bonito, com memória: o slug atual e todos os
--     anteriores. Mudar slug (só despublicado, com confirmação na tela)
--     nunca apaga o antigo — ele redireciona para sempre, porque link de
--     casamento vai para convite impresso. Unicidade GLOBAL, atual e
--     histórico juntos: slug aposentado não pode ser tomado por outro
--     casal, senão o convite impresso de um abre o site do outro.
--
-- Régua da página pública (a RPC no fim): devolve o que o endereço
-- autoriza e NADA além — nunca lista nem contagem de convidados (nem
-- events.guests), nunca financeiro, fornecedor, planejamento ou cortejo.
-- O site nasce noindex; `indexavel` existe desligada e sem tela.

-- ------------------------------------------------------------
-- 1) ESPAÇOS — o lugar, por empresa
-- ------------------------------------------------------------
create table if not exists public.espacos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  nome        text not null,
  endereco    text,
  cidade      text,
  -- transfer/transporte mora no espaço: responde à mesma pergunta do
  -- convidado que a hospedagem ("estou vindo de fora, e agora?")
  transporte  text,
  -- nota interna dela sobre o lugar (não sai no site)
  nota        text,
  -- o espaço contratável costuma ser um fornecedor; igreja e casa da
  -- família não precisam ser — por isso opcional
  supplier_id uuid references public.suppliers (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_espacos_empresa on public.espacos (empresa_id, nome);

create table if not exists public.espaco_hospedagem (
  id          uuid primary key default gen_random_uuid(),
  espaco_id   uuid not null references public.espacos (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete cascade,
  nome        text not null,
  distancia   text,
  faixa_preco text,
  nota        text,
  link        text,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_espaco_hospedagem on public.espaco_hospedagem (espaco_id, ordem);

-- empresa_id da hospedagem deriva do espaço (padrão da casa: o gatilho
-- deriva SEMPRE, não confia em quem insere)
create or replace function public.fill_empresa_from_espaco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.espaco_id is not null then
    select empresa_id into new.empresa_id
    from public.espacos where id = new.espaco_id;
  end if;
  return new;
end $$;

-- INSERT **e** UPDATE de espaco_id: só com o insert, dava para reapontar
-- uma hospedagem própria para o espaço de OUTRA empresa (a policy olha
-- empresa_id, que não mudava) e a linha aparecia no site publicado dela.
-- Com a derivação também no update, o WITH CHECK barra.
drop trigger if exists trg_fill_empresa on public.espaco_hospedagem;
create trigger trg_fill_empresa
  before insert or update of espaco_id on public.espaco_hospedagem
  for each row execute function public.fill_empresa_from_espaco();

alter table public.events
  add column if not exists espaco_id uuid references public.espacos (id) on delete set null;

-- RLS no molde de suppliers (024): empresa toda lê; assistente não
-- escreve; apagar fica com quem responde pela empresa.
alter table public.espacos enable row level security;
alter table public.espaco_hospedagem enable row level security;

drop policy if exists espacos_select on public.espacos;
create policy espacos_select on public.espacos
  for select using (empresa_id = (select empresa_id from public.meu_cargo()));
drop policy if exists espacos_insert on public.espacos;
create policy espacos_insert on public.espacos
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );
drop policy if exists espacos_update on public.espacos;
create policy espacos_update on public.espacos
  for update using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );
drop policy if exists espacos_delete on public.espacos;
create policy espacos_delete on public.espacos
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
  );

drop policy if exists espaco_hospedagem_select on public.espaco_hospedagem;
create policy espaco_hospedagem_select on public.espaco_hospedagem
  for select using (empresa_id = (select empresa_id from public.meu_cargo()));
drop policy if exists espaco_hospedagem_write on public.espaco_hospedagem;
create policy espaco_hospedagem_write on public.espaco_hospedagem
  for all using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  )
  with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );

-- ------------------------------------------------------------
-- 2) EVENTO_SITE — rascunho + fotografia publicada
-- ------------------------------------------------------------
create table if not exists public.evento_site (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null unique references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete cascade,

  -- rascunho: o que o casal escreve (portal) e os blocos práticos da
  -- equipe. Vira público SÓ pela fotografia.
  mensagem    text,
  historia    text,
  dress_code  text,
  blocos      jsonb not null default '[]'::jsonb
              check (jsonb_typeof(blocos) = 'array'),

  -- endereço bonito (o registro com história vive em site_slugs)
  slug        text unique,
  slug_congelado_em timestamptz,

  -- publicação por fotografia
  publicado           boolean not null default false,
  publicado_conteudo  jsonb,
  publicado_em        timestamptz,
  publicado_por       uuid references auth.users (id) on delete set null,
  -- data/hora/local NO MOMENTO da publicação — só para a tela da equipe
  -- avisar "o evento mudou depois de publicado; a mensagem do casal pode
  -- citar a data antiga". O site serve o dado AO VIVO, nunca este.
  evento_dados_na_publicacao jsonb,

  -- opções (sem tela nesta fatia; noindex é o padrão do sistema)
  indexavel       boolean not null default false,
  album_aberto    boolean not null default false,
  playlist_aberta boolean not null default false,

  atualizado_por uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_fill_empresa on public.evento_site;
create trigger trg_fill_empresa before insert on public.evento_site
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_site enable row level security;

-- equipe lê e escreve; o casal NÃO tem policy — escreve os campos dele
-- por RPC (portal_salvar_site), que limita as colunas. Público não lê a
-- tabela em hipótese nenhuma: só a RPC site_publico.
drop policy if exists site_select on public.evento_site;
create policy site_select on public.evento_site
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists site_write on public.evento_site;
create policy site_write on public.evento_site
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists portal_site_select on public.evento_site;
create policy portal_site_select on public.evento_site
  for select using (event_id in (select public.eventos_da_cliente()));

-- ------------------------------------------------------------
-- 3) SITE_SLUGS — o endereço, com memória eterna
-- ------------------------------------------------------------
create table if not exists public.site_slugs (
  slug       text primary key,
  event_id   uuid not null references public.events (id) on delete cascade,
  atual      boolean not null default true,
  created_at timestamptz not null default now()
);

-- um único slug ATUAL por evento; os demais são história e redirecionam
create unique index if not exists uq_site_slugs_atual
  on public.site_slugs (event_id) where atual;

alter table public.site_slugs enable row level security;
drop policy if exists site_slugs_select on public.site_slugs;
create policy site_slugs_select on public.site_slugs
  for select using (
    event_id in (select public.eventos_visiveis())
    or event_id in (select public.eventos_da_cliente())
  );
-- escrita só pela RPC definir_slug_site (security definer)

-- ------------------------------------------------------------
-- 4) RPCs de escrita
-- ------------------------------------------------------------

-- O casal escreve SÓ o que é dele: mensagem, história, dress code.
-- RPC em vez de policy de update porque policy não limita coluna — e os
-- blocos práticos, o slug e a publicação são da equipe.
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
  if not (public.sou_cliente_do_evento(p_event_id)
          or public.pode_editar_evento(p_event_id)) then
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

-- O slug: válido, único no MUNDO (atual + história), reservados fora, e
-- só muda com o site despublicado (a confirmação explícita fica na
-- tela). O antigo nunca é apagado — vira redirecionamento eterno.
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
  if not public.pode_editar_evento(p_event_id) then
    raise exception 'sem permissão para este evento';
  end if;

  select * into v_site from public.evento_site where event_id = p_event_id;
  if found and v_site.publicado then
    raise exception 'despublique o site para mudar o endereço';
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

  -- A ORDEM IMPORTA: rebaixar o atual ANTES de inserir o novo. O índice
  -- uq_site_slugs_atual é único por evento onde atual — inserir já com
  -- atual=true estourava 23505 em TODA segunda troca de endereço (o
  -- `on conflict (slug)` arbitra o PK, nunca o índice parcial). Medido
  -- contra o banco antes de corrigir. Se o slug for de outro evento, o
  -- raise abaixo desfaz este rebaixamento junto com o resto.
  update public.site_slugs
     set atual = false
   where event_id = p_event_id and atual;

  -- único no mundo, contando os aposentados: convite impresso de um
  -- casal não pode abrir o site de outro
  insert into public.site_slugs (slug, event_id, atual)
  values (v_slug, p_event_id, false)
  on conflict (slug) do nothing;
  if not exists (select 1 from public.site_slugs
                 where slug = v_slug and event_id = p_event_id) then
    raise exception 'este endereço já está em uso';
  end if;

  -- o escolhido passa a ser o atual; os anteriores continuam
  -- redirecionando para sempre
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

-- Publicar: congela a fotografia. Despublicar: o site sai do ar na hora
-- (a fotografia fica guardada para a tela mostrar o que estava público).
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
             'mensagem',   v_site.mensagem,
             'historia',   v_site.historia,
             'dress_code', v_site.dress_code,
             'blocos',     v_site.blocos
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
-- 5) A PÁGINA PÚBLICA — site_publico(p_ref)
-- ------------------------------------------------------------
-- p_ref é hash do evento OU slug (atual ou aposentado). Devolve null se
-- não existir ou não estiver publicado. Conteúdo do casal vem da
-- FOTOGRAFIA; dado do evento e hospedagens vêm AO VIVO. `slug_atual` e
-- `ref_e_slug_antigo` deixam a página redirecionar o endereço aposentado.
--
-- O que NUNCA sai daqui: lista ou contagem de convidados (nem
-- events.guests), financeiro, fornecedores, planejamento, cortejo,
-- qualquer foto de bucket privado, notas internas do espaço.
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
    'paleta', (
      select json_agg(json_build_object(
               'nome', c.nome, 'papel', c.papel, 'hex', c.hex)
             order by c.ordem)
      from public.evento_guia_estilo g
      join public.evento_guia_cor c on c.guia_id = g.id
      where g.event_id = s.ev_id
        and g.situacao in ('aprovado', 'alterado')
    ),
    -- espaço e hospedagens SEMPRE da mesma empresa do evento: esta
    -- função é security definer, então sem estes dois filtros um vínculo
    -- apontado para o espaço de outra empresa exfiltraria o cadastro
    -- dela (nome, preço, nota) na página pública.
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
                               'hash', e.rsvp_hash)
      from public.events e where e.id = s.ev_id
    ),
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

comment on function public.site_publico(text) is
  'O site do casamento como o convidado vê, por hash ou slug. Fotografia para o conteúdo do casal; ao vivo para evento e hospedagens. Nunca devolve convidados, contagens, financeiro ou dado interno.';

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'espacos e espaco_hospedagem existem' as item,
       to_regclass('public.espacos') is not null
       and to_regclass('public.espaco_hospedagem') is not null as ok
union all
select 'events.espaco_id existe',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'events'
                 and column_name = 'espaco_id')
union all
select 'evento_site e site_slugs existem',
       to_regclass('public.evento_site') is not null
       and to_regclass('public.site_slugs') is not null
union all
select 'um slug atual por evento (índice parcial)',
       exists (select 1 from pg_indexes
               where schemaname = 'public' and indexname = 'uq_site_slugs_atual')
union all
select 'site_publico existe e anon executa',
       has_function_privilege('anon', 'public.site_publico(text)', 'execute')
union all
select 'as RPCs de escrita negam anon',
       not has_function_privilege('anon', 'public.portal_salvar_site(uuid, text, text, text)', 'execute')
       and not has_function_privilege('anon', 'public.definir_slug_site(uuid, text)', 'execute')
       and not has_function_privilege('anon', 'public.publicar_site(uuid, boolean)', 'execute')
union all
select 'a página serve a FOTOGRAFIA (não o rascunho)',
       (pg_get_functiondef('public.site_publico(text)'::regprocedure)
         like '%publicado_conteudo%')
union all
select 'a página nunca menciona convidados nem contagem',
       (pg_get_functiondef('public.site_publico(text)'::regprocedure) not like '%convidado%')
       and (pg_get_functiondef('public.site_publico(text)'::regprocedure) not like '%guests%')
union all
select 'mudar slug exige despublicar',
       (pg_get_functiondef('public.definir_slug_site(uuid, text)'::regprocedure)
         like '%despublique%')
union all
select 'slug aposentado nunca é liberado (unicidade no PK, sem delete)',
       (pg_get_functiondef('public.definir_slug_site(uuid, text)'::regprocedure)
         not like '%delete from public.site_slugs%')
union all
select 'publicar congela também os dados do evento (para o aviso de divergência)',
       (pg_get_functiondef('public.publicar_site(uuid, boolean)'::regprocedure)
         like '%evento_dados_na_publicacao%')
union all
select 'evento_site sem policy anon',
       not exists (select 1 from pg_policies
                   where schemaname = 'public' and tablename = 'evento_site'
                     and 'anon' = any(roles))
union all
select 'trocar de endereço rebaixa o atual ANTES de inserir o novo',
       (pg_get_functiondef('public.definir_slug_site(uuid, text)'::regprocedure)
         like '%values (v_slug, p_event_id, false)%')
union all
select 'hospedagem re-deriva a empresa também no update do espaço',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.espaco_hospedagem'::regclass
                 and tgname = 'trg_fill_empresa'
                 -- 28 = INSERT|UPDATE no bitmap de tgtype
                 and (tgtype & 4) > 0 and (tgtype & 16) > 0)
union all
select 'a página pública só serve espaço da MESMA empresa do evento',
       (pg_get_functiondef('public.site_publico(text)'::regprocedure)
         like '%esp.empresa_id = e.empresa_id%');
