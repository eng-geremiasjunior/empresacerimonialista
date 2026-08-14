-- 096 — Guia de estilo
--
-- O que era "Inspirações" (imagens soltas) amadurece: a identidade visual
-- do casamento num documento só — paleta, flores, materiais, trajes,
-- papelaria e referências.
--
-- Onde cada coisa mora, e por quê:
--   * a BIBLIOTECA de paletas é da EMPRESA (a mesma serve todos os
--     casamentos) — vive no Catálogo, não no evento;
--   * o GUIA é do EVENTO, e é o produto da decisão "Fazer o briefing de
--     decoração" (decoracao_briefing) — mesmo molde de decisao_curadoria,
--     que pendura a rodada de opções na decisão que a originou;
--   * as REFERÊNCIAS são as inspirações que já existem (evento_inspiracao)
--     — a tabela não muda de nome nem de dono, só ganha o autor da frase.
--
-- O ponto sensível: flor vetada carrega motivo, e um dos motivos é
-- alergia. Dado de saúde não vai para quem executa. Por isso o veto tem
-- DOIS motivos: o interno (a cerimonialista lê) e o que sai para o
-- fornecedor. A floricultura precisa saber que não é para usar lírio;
-- não precisa saber que a noiva tem alergia.
--
-- Medido antes de escrever (2026-08-14): evento_inspiracao 0 linhas;
-- paleta_cores / estilo_desejado / flores_cortejo / paleta_madrinhas com
-- 6 instâncias cada e NENHUMA com valor. Nada a migrar, nada a perder.
-- Por isso esta migração só ADICIONA: nenhum campo do método é aposentado.

begin;

-- ============================================================
-- 1) BIBLIOTECA DE PALETAS — da empresa, não do evento
-- ============================================================
-- empresa_id nulo = paleta de sistema, legível por todas as empresas e
-- editável por nenhuma. É o acervo que já vem pronto.
create table if not exists public.paleta_biblioteca (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas (id) on delete cascade,
  nome       text not null,
  sensacao   text,
  ordem      int not null default 0,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paleta_biblioteca_cor (
  id        uuid primary key default gen_random_uuid(),
  paleta_id uuid not null references public.paleta_biblioteca (id) on delete cascade,
  nome      text not null,
  papel     text not null default 'apoio'
            check (papel in ('principal', 'apoio', 'neutro', 'acento')),
  hex       text not null check (hex ~* '^#[0-9a-f]{6}$'),
  ordem     int not null default 0
);

create index if not exists idx_paleta_empresa on public.paleta_biblioteca (empresa_id, ordem);
create index if not exists idx_paleta_cor on public.paleta_biblioteca_cor (paleta_id, ordem);

alter table public.paleta_biblioteca enable row level security;
alter table public.paleta_biblioteca_cor enable row level security;

-- Ler: a da minha empresa + as de sistema. Escrever: SÓ a da minha
-- empresa (as de sistema são acervo, ninguém edita).
drop policy if exists paleta_select on public.paleta_biblioteca;
create policy paleta_select on public.paleta_biblioteca
  for select using (
    empresa_id is null
    or empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  );

drop policy if exists paleta_write on public.paleta_biblioteca;
create policy paleta_write on public.paleta_biblioteca
  for all using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists paleta_cor_select on public.paleta_biblioteca_cor;
create policy paleta_cor_select on public.paleta_biblioteca_cor
  for select using (
    paleta_id in (
      select p.id from public.paleta_biblioteca p
      where p.empresa_id is null
         or p.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    )
  );

drop policy if exists paleta_cor_write on public.paleta_biblioteca_cor;
create policy paleta_cor_write on public.paleta_biblioteca_cor
  for all using (
    paleta_id in (
      select p.id from public.paleta_biblioteca p
      where p.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    )
  )
  with check (
    paleta_id in (
      select p.id from public.paleta_biblioteca p
      where p.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    )
  );

-- ============================================================
-- 2) O GUIA DO EVENTO
-- ============================================================
create table if not exists public.evento_guia_estilo (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null unique references public.events (id) on delete cascade,
  -- a decisão que originou o guia (decoracao_briefing). Nulo é aceito:
  -- se o método daquela empresa não tiver a decisão, o guia existe assim
  -- mesmo — o documento não pode depender da forma do método.
  evento_decisao_id uuid references public.evento_decisao (id) on delete set null,
  empresa_id        uuid references public.empresas (id),
  -- de onde a paleta veio; a cópia é por VALOR (trocar a paleta da
  -- biblioteca não pode reescrever o guia de um casamento já aprovado)
  paleta_id         uuid references public.paleta_biblioteca (id) on delete set null,
  nome              text not null default 'Guia de estilo',
  sensacao          text,
  situacao          text not null default 'montagem'
                    check (situacao in ('montagem', 'aguardando', 'aprovado', 'alterado')),
  aprovado_em       timestamptz,
  aprovado_por      uuid references auth.users (id) on delete set null,
  aprovado_nome     text,
  -- papelaria: um bloco só, sempre um por guia
  papelaria_fontes     text,
  papelaria_nome_casal text,
  papelaria_data       text,
  papelaria_local      text,
  papelaria_nota       text,
  criado_por        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.evento_guia_cor (
  id        uuid primary key default gen_random_uuid(),
  guia_id   uuid not null references public.evento_guia_estilo (id) on delete cascade,
  nome      text not null,
  papel     text not null default 'apoio'
            check (papel in ('principal', 'apoio', 'neutro', 'acento')),
  hex       text not null check (hex ~* '^#[0-9a-f]{6}$'),
  nota      text,
  foto_path text,
  ordem     int not null default 0
);

create table if not exists public.evento_guia_flor (
  id        uuid primary key default gen_random_uuid(),
  guia_id   uuid not null references public.evento_guia_estilo (id) on delete cascade,
  nome      text not null,
  epoca     text,
  nota      text,
  foto_path text,
  vetada    boolean not null default false,
  -- O motivo em duas versões. O interno pode dizer "alergia da noiva";
  -- o do fornecedor diz só o que ele precisa para executar.
  motivo_interno    text,
  motivo_fornecedor text,
  -- mesma régua da 091: nada além de 'normal' sai por superfície externa
  sensibilidade     text not null default 'normal'
                    check (sensibilidade in ('normal', 'alergia')),
  ordem     int not null default 0
);

create table if not exists public.evento_guia_material (
  id        uuid primary key default gen_random_uuid(),
  guia_id   uuid not null references public.evento_guia_estilo (id) on delete cascade,
  nome      text not null,
  nota      text,
  foto_path text,
  ordem     int not null default 0
);

create table if not exists public.evento_guia_traje (
  id        uuid primary key default gen_random_uuid(),
  guia_id   uuid not null references public.evento_guia_estilo (id) on delete cascade,
  papel     text not null check (papel in ('madrinhas', 'padrinhos')),
  hex       text check (hex ~* '^#[0-9a-f]{6}$'),
  descricao text,
  unique (guia_id, papel)
);

-- Append-only, como evento_campo_escrita (091): aprovação anterior NUNCA
-- é apagada quando o guia muda depois de aprovado.
create table if not exists public.evento_guia_historico (
  id            uuid primary key default gen_random_uuid(),
  guia_id       uuid not null references public.evento_guia_estilo (id) on delete cascade,
  tipo          text not null
                check (tipo in ('montado', 'enviado', 'aprovado', 'ajuste_pedido', 'alterado')),
  texto         text not null,
  autor_user_id uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_guia_evento on public.evento_guia_estilo (event_id);
create index if not exists idx_guia_cor on public.evento_guia_cor (guia_id, ordem);
create index if not exists idx_guia_flor on public.evento_guia_flor (guia_id, vetada, ordem);
create index if not exists idx_guia_material on public.evento_guia_material (guia_id, ordem);
create index if not exists idx_guia_hist on public.evento_guia_historico (guia_id, created_at desc);

drop trigger if exists trg_fill_empresa on public.evento_guia_estilo;
create trigger trg_fill_empresa before insert on public.evento_guia_estilo
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_guia_estilo enable row level security;
alter table public.evento_guia_cor enable row level security;
alter table public.evento_guia_flor enable row level security;
alter table public.evento_guia_material enable row level security;
alter table public.evento_guia_traje enable row level security;
alter table public.evento_guia_historico enable row level security;

-- Equipe: padrão do evento. Cliente: lê o guia dela SEMPRE (mesmo em
-- montagem — ver o documento nascendo faz parte), mas nunca escreve
-- direto; aprovar e pedir ajuste passam por RPC.
drop policy if exists guia_select on public.evento_guia_estilo;
create policy guia_select on public.evento_guia_estilo
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists guia_write on public.evento_guia_estilo;
create policy guia_write on public.evento_guia_estilo
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists portal_guia_select on public.evento_guia_estilo;
create policy portal_guia_select on public.evento_guia_estilo
  for select using (event_id in (select public.eventos_da_cliente()));

-- As filhas seguem o guia. Uma função evita repetir o mesmo subselect em
-- dez policies (e evita divergirem quando uma for editada).
create or replace function public.pode_ver_guia(p_guia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.evento_guia_estilo g
    where g.id = p_guia_id
      and (g.event_id in (select public.eventos_visiveis())
           or g.event_id in (select public.eventos_da_cliente()))
  );
$$;

create or replace function public.pode_editar_guia(p_guia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.evento_guia_estilo g
    where g.id = p_guia_id and public.pode_editar_evento(g.event_id)
  );
$$;

revoke all on function public.pode_ver_guia(uuid) from public, anon;
revoke all on function public.pode_editar_guia(uuid) from public, anon;
grant execute on function public.pode_ver_guia(uuid) to authenticated;
grant execute on function public.pode_editar_guia(uuid) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['evento_guia_cor', 'evento_guia_flor',
                           'evento_guia_material', 'evento_guia_traje',
                           'evento_guia_historico']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (public.pode_ver_guia(guia_id))',
      t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.pode_editar_guia(guia_id)) '
      || 'with check (public.pode_editar_guia(guia_id))',
      t || '_write', t);
  end loop;
end $$;

-- ============================================================
-- 3) REFERÊNCIAS — as inspirações que já existem
-- ============================================================
-- A tabela continua sendo a mesma, com o mesmo dono e as mesmas policies.
-- O que faltava era o autor da frase: "o que agradou" é fala de alguém.
alter table public.evento_inspiracao
  add column if not exists autor text;

comment on column public.evento_inspiracao.legenda is
  'O "o que agradou" do guia de estilo: a frase de quem escolheu a imagem.';

-- ============================================================
-- 4) DISTRIBUIÇÃO POR FATIA
-- ============================================================
-- Cada fornecedor recebe o pedaço dele, nunca o guia inteiro: a
-- floricultura vê cores e flores; a papelaria vê cores e papelaria.
-- Molde de credencial da 032 (hash na URL, função SECURITY DEFINER).
create table if not exists public.guia_compartilhamento (
  id                uuid primary key default gen_random_uuid(),
  guia_id           uuid not null references public.evento_guia_estilo (id) on delete cascade,
  supplier_id       uuid not null references public.suppliers (id) on delete cascade,
  -- as seções que ESTE fornecedor enxerga
  secoes            text[] not null default array['cores']::text[],
  hash              text not null unique,
  compartilhado_por uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (guia_id, supplier_id)
);

create index if not exists idx_guia_comp_hash on public.guia_compartilhamento (hash);

alter table public.guia_compartilhamento enable row level security;

drop policy if exists guia_comp_select on public.guia_compartilhamento;
create policy guia_comp_select on public.guia_compartilhamento
  for select using (public.pode_ver_guia(guia_id));
drop policy if exists guia_comp_write on public.guia_compartilhamento;
create policy guia_comp_write on public.guia_compartilhamento
  for all using (public.pode_editar_guia(guia_id))
  with check (public.pode_editar_guia(guia_id));

-- ============================================================
-- 5) A CLIENTE APROVA (ou pede ajuste)
-- ============================================================
-- Direção oposta à da conferência (091): lá a cerimonialista aceita o que
-- a cliente escreveu; aqui a cliente aceita o que a cerimonialista
-- montou. A MECÂNICA é a mesma — estado + marco no histórico + aviso
-- agregado — e é ela que se reaproveita.
create or replace function public.aprovar_guia_estilo(p_guia_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guia  public.evento_guia_estilo%rowtype;
  v_ev    public.events%rowtype;
  v_resp  uuid;
  v_link  text;
  v_nome  text;
begin
  select * into v_guia from public.evento_guia_estilo where id = p_guia_id for update;
  if not found then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if not public.sou_cliente_do_evento(v_guia.event_id) then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if v_guia.situacao not in ('aguardando', 'alterado') then
    return json_build_object('ok', false, 'erro', 'nao_esta_para_aprovar');
  end if;

  select coalesce(ea.nome, c.name)
    into v_nome
    from public.evento_acesso ea
    left join public.clients c on c.id = ea.client_id
   where ea.event_id = v_guia.event_id and ea.user_id = auth.uid()
   limit 1;

  update public.evento_guia_estilo
     set situacao = 'aprovado',
         aprovado_em = now(),
         aprovado_por = auth.uid(),
         aprovado_nome = coalesce(v_nome, 'a cliente'),
         updated_at = now()
   where id = p_guia_id;

  insert into public.evento_guia_historico (guia_id, tipo, texto, autor_user_id)
  values (p_guia_id, 'aprovado',
          'Aprovado por ' || coalesce(v_nome, 'a cliente'), auth.uid());

  select * into v_ev from public.events where id = v_guia.event_id;
  select me.user_id into v_resp from public.membros_equipe me
   where me.id = v_ev.cerimonialista_responsavel_id;
  v_link := '/eventos/' || v_guia.event_id || '/planejamento';

  if not exists (
    select 1 from public.notifications n
    where n.link = v_link and n.read_at is null
      and n.cerimonialista_id = coalesce(v_resp, v_ev.cerimonialista_id)
      and n.title like 'Guia de estilo aprovado%'
  ) then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal',
            'Guia de estilo aprovado',
            'Já pode enviar aos fornecedores.', v_link);
  end if;

  return json_build_object('ok', true);
end $$;

revoke all on function public.aprovar_guia_estilo(uuid) from public, anon;
grant execute on function public.aprovar_guia_estilo(uuid) to authenticated;

-- "Prefiro comentar antes" — mesmo peso do aprovar, nunca escape escondido.
create or replace function public.pedir_ajuste_guia(p_guia_id uuid, p_mensagem text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guia public.evento_guia_estilo%rowtype;
  v_ev   public.events%rowtype;
  v_resp uuid;
  v_link text;
begin
  select * into v_guia from public.evento_guia_estilo where id = p_guia_id for update;
  if not found or not public.sou_cliente_do_evento(v_guia.event_id) then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if coalesce(trim(p_mensagem), '') = '' then
    return json_build_object('ok', false, 'erro', 'mensagem_vazia');
  end if;

  insert into public.evento_guia_historico (guia_id, tipo, texto, autor_user_id)
  values (p_guia_id, 'ajuste_pedido', left(trim(p_mensagem), 600), auth.uid());

  select * into v_ev from public.events where id = v_guia.event_id;
  select me.user_id into v_resp from public.membros_equipe me
   where me.id = v_ev.cerimonialista_responsavel_id;
  v_link := '/eventos/' || v_guia.event_id || '/planejamento';

  if not exists (
    select 1 from public.notifications n
    where n.link = v_link and n.read_at is null
      and n.cerimonialista_id = coalesce(v_resp, v_ev.cerimonialista_id)
      and n.title like 'Comentário no guia%'
  ) then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal',
            'Comentário no guia de estilo',
            left(trim(p_mensagem), 140), v_link);
  end if;

  return json_build_object('ok', true);
end $$;

revoke all on function public.pedir_ajuste_guia(uuid, text) from public, anon;
grant execute on function public.pedir_ajuste_guia(uuid, text) to authenticated;

-- ============================================================
-- 6) O GUIA QUE O FORNECEDOR VÊ
-- ============================================================
-- Três guardas ao mesmo tempo:
--   1. o hash tem de existir (é a credencial);
--   2. o guia tem de estar aprovado — nada chega ao fornecedor antes de
--      o casal aprovar;
--   3. só as seções da FATIA daquele fornecedor.
-- E o motivo do veto que sai é o motivo_fornecedor. O interno não é
-- selecionado em lugar nenhum desta função.
create or replace function public.guia_publico(p_hash text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_comp   public.guia_compartilhamento%rowtype;
  v_guia   public.evento_guia_estilo%rowtype;
  v_ev     public.events%rowtype;
  v_forn   text;
  v_secoes text[];
  v_out    json;
begin
  select * into v_comp from public.guia_compartilhamento where hash = p_hash;
  if not found then
    return null;
  end if;

  select * into v_guia from public.evento_guia_estilo where id = v_comp.guia_id;
  if not found or v_guia.situacao not in ('aprovado', 'alterado') then
    return null;
  end if;

  select * into v_ev from public.events where id = v_guia.event_id;
  select s.name into v_forn from public.suppliers s where s.id = v_comp.supplier_id;
  v_secoes := v_comp.secoes;

  select json_build_object(
    'guia_nome',   v_guia.nome,
    'sensacao',    v_guia.sensacao,
    'fornecedor',  v_forn,
    'evento_data', v_ev.date,
    'aprovado_em', v_guia.aprovado_em,
    'secoes',      v_secoes,
    'cores', case when 'cores' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', c.nome, 'papel', c.papel, 'hex', c.hex, 'nota', c.nota,
        'foto_path', c.foto_path) order by c.ordem), '[]'::json)
      from public.evento_guia_cor c where c.guia_id = v_guia.id
    ) else null end,
    'flores', case when 'flores' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', f.nome, 'epoca', f.epoca, 'nota', f.nota,
        'foto_path', f.foto_path) order by f.ordem), '[]'::json)
      from public.evento_guia_flor f
      where f.guia_id = v_guia.id and not f.vetada
    ) else null end,
    -- o veto sai com o motivo DO FORNECEDOR; motivo_interno não aparece
    -- em nenhum ramo desta função
    'vetadas', case when 'flores' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', f.nome,
        'motivo', coalesce(nullif(trim(f.motivo_fornecedor), ''), 'não usar')
      ) order by f.ordem), '[]'::json)
      from public.evento_guia_flor f
      where f.guia_id = v_guia.id and f.vetada
    ) else null end,
    'materiais', case when 'materiais' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', m.nome, 'nota', m.nota, 'foto_path', m.foto_path)
        order by m.ordem), '[]'::json)
      from public.evento_guia_material m where m.guia_id = v_guia.id
    ) else null end,
    'trajes', case when 'trajes' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'papel', t.papel, 'hex', t.hex, 'descricao', t.descricao)), '[]'::json)
      from public.evento_guia_traje t where t.guia_id = v_guia.id
    ) else null end,
    'papelaria', case when 'papelaria' = any(v_secoes) then json_build_object(
      'fontes', v_guia.papelaria_fontes,
      'nome_casal', v_guia.papelaria_nome_casal,
      'data', v_guia.papelaria_data,
      'local', v_guia.papelaria_local,
      'nota', v_guia.papelaria_nota
    ) else null end,
    'referencias', case when 'referencias' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'assunto', i.assunto, 'agradou', i.legenda, 'autor', i.autor,
        'foto_path', i.storage_path) order by i.created_at), '[]'::json)
      from public.evento_inspiracao i where i.event_id = v_guia.event_id
    ) else null end
  ) into v_out;

  return v_out;
end $$;

revoke all on function public.guia_publico(text) from public;
grant execute on function public.guia_publico(text) to anon, authenticated;

comment on function public.guia_publico(text) is
  'O guia como o fornecedor vê: só se aprovado, só a fatia daquele hash, e o veto sai com motivo_fornecedor. motivo_interno NUNCA é lido aqui.';

-- ============================================================
-- 7) ACERVO INICIAL DE PALETAS (sistema — legível por todas)
-- ============================================================
-- Idempotente pelo nome: rodar de novo não duplica.
do $$
declare
  v_id uuid;
  p    record;
begin
  for p in
    select * from (values
      ('Manhã de Campo',
       'Terracota queimada com verde de oliveira e muito creme. Serve a um casamento de fim de tarde no campo, com mesa longa e luz baixa.',
       1,
       array['Terracota de Vaso|principal|#A9603F',
             'Verde Oliveira|apoio|#8C9377',
             'Creme de Linho|neutro|#E9DFCD',
             'Areia Clara|neutro|#D8C9B2',
             'Dourado Antigo|acento|#B08A4F']),
      ('Sal e Névoa',
       'Azul acinzentado com branco quebrado e madeira clara. Casamento de praia sem tema náutico, com luz de fim de manhã.',
       2,
       array['Azul de Névoa|principal|#7C8B99',
             'Branco Quebrado|neutro|#F1EDE6',
             'Areia Molhada|neutro|#C9BBA6',
             'Verde Sálvia|apoio|#9AA894',
             'Prata Velha|acento|#A8A9A4']),
      ('Jardim ao Meio-dia',
       'Rosa empoeirado com verde folha e muito branco. Cerimônia ao ar livre, com sombra de árvore e mesa posta clara.',
       3,
       array['Rosa Empoeirado|principal|#C08C86',
             'Verde Folha|apoio|#7E8F6B',
             'Branco de Cal|neutro|#F4F1EA',
             'Bege Rosado|neutro|#DFCFC4',
             'Latão|acento|#B0904F']),
      ('Noite de Veludo',
       'Vinho profundo com verde escuro e dourado baixo. Recepção fechada, luz de vela, mesa escura.',
       4,
       array['Vinho de Garrafa|principal|#6B2F3A',
             'Verde Profundo|apoio|#3F5045',
             'Creme Antigo|neutro|#E6DCC8',
             'Marrom Tabaco|neutro|#7A5B45',
             'Ouro Velho|acento|#A98547'])
    ) as t(nome, sensacao, ordem, cores)
  loop
    select id into v_id from public.paleta_biblioteca
     where empresa_id is null and nome = p.nome;

    if v_id is null then
      insert into public.paleta_biblioteca (empresa_id, nome, sensacao, ordem)
      values (null, p.nome, p.sensacao, p.ordem)
      returning id into v_id;

      insert into public.paleta_biblioteca_cor (paleta_id, nome, papel, hex, ordem)
      select v_id,
             split_part(c, '|', 1),
             split_part(c, '|', 2),
             split_part(c, '|', 3),
             i - 1
        from unnest(p.cores) with ordinality as u(c, i);
    end if;
  end loop;
end $$;

-- ============================================================
-- 8) Relatório
-- ============================================================
do $$
declare
  v_pal int;
  v_cor int;
begin
  select count(*) into v_pal from public.paleta_biblioteca where empresa_id is null;
  select count(*) into v_cor from public.paleta_biblioteca_cor;
  raise notice '--- 096 ---';
  raise notice 'tabelas novas: paleta_biblioteca(+cor), evento_guia_estilo, evento_guia_cor/flor/material/traje/historico, guia_compartilhamento';
  raise notice 'evento_inspiracao ganhou a coluna autor (o "o que agradou" ja morava em legenda)';
  raise notice 'paletas de sistema: % (% cores)', v_pal, v_cor;
  raise notice 'veto com dois motivos: motivo_interno (equipe) e motivo_fornecedor (sai no link)';
end $$;

commit;
