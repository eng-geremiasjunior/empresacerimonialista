-- ============================================================
-- Vela — Migração 092: o que a cliente monta, escolhe e sugere
--
-- Cinco assuntos numa migração só, porque são todos ADITIVOS: tabela
-- nova, policy nova, tela nova. Nenhum toca caminho que já existe — ao
-- contrário da 091, que mudou a escrita que a cerimonialista já usava e
-- por isso subiu sozinha.
--
--   1. Convidados + confirmação de presença por link (sem login)
--   2. Cortejo (padrinhos, madrinhas, damas, pajens, porta-aliança)
--   3. Inspirações (imagens por assunto) + retrato da cliente
--   4. Escolhas curadas (a cerimonialista publica 2–4 opções)
--   5. Sugestões de cronograma (a cliente sugere; nunca edita)
--   + os campos sensíveis (alergia/medicamento), que só entram AGORA
--     porque o gate de saída da 091 já está no ar.
--
-- DADOS DE TERCEIROS: telefone e e-mail de convidados e padrinhos não
-- são das clientes da cerimonialista. Eles nunca saem em rota pública,
-- em URL, em log ou no contexto da IA. A RPC pública de confirmação
-- devolve o nome do PRÓPRIO convidado e mais nada da lista.
--
-- CONVERGENTE: pode ser reexecutada. Sem tabela temporária.
-- Execute no SQL Editor do Supabase (depois da 091).
-- ============================================================

begin;

-- ============================================================
-- 1) CONVIDADOS E CONFIRMAÇÃO DE PRESENÇA
-- ============================================================
-- events.guests continua sendo a ESTIMATIVA (número que a cerimonialista
-- usa para orçar). Esta tabela é a lista nominal — coisa diferente, e
-- por isso nenhuma das duas substitui a outra.
create table if not exists public.evento_convidado (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),

  nome        text not null,
  -- dado de terceiro: nunca sai em rota pública nem em URL
  telefone    text,
  email       text,

  lado        text check (lado is null or lado in ('noiva', 'noivo')),
  grupo       text,
  mesa        text,

  confirmacao text not null default 'aguardando'
              check (confirmacao in ('aguardando', 'confirmado', 'nao_vai')),
  acompanhantes int not null default 0 check (acompanhantes >= 0),
  criancas      int not null default 0 check (criancas >= 0),
  restricao_alimentar text,
  observacao  text,

  -- credencial pública individual (mesmo molde de roteiro_links, 002):
  -- não deriva de nada pessoal, então o link não vaza dado de quem é
  hash        text unique not null
              default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  confirmado_em    timestamptz,
  confirmado_via   text check (confirmado_via is null or confirmado_via in ('link', 'manual')),

  origem      text not null default 'equipe' check (origem in ('cliente', 'equipe')),
  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_convidado_evento on public.evento_convidado (event_id, nome);
create index if not exists idx_convidado_confirmacao on public.evento_convidado (event_id, confirmacao);

comment on table public.evento_convidado is
  'Lista nominal de convidados. events.guests continua sendo a estimativa para orçamento — são coisas diferentes.';
comment on column public.evento_convidado.hash is
  'Credencial do convite individual. A rota pública devolve só o nome DESTE convidado, nunca a lista.';

drop trigger if exists trg_fill_empresa on public.evento_convidado;
create trigger trg_fill_empresa before insert on public.evento_convidado
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_convidado enable row level security;

-- equipe: padrão do evento (leitura pelo InitPlan da 039)
drop policy if exists convidado_select on public.evento_convidado;
create policy convidado_select on public.evento_convidado
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists convidado_insert on public.evento_convidado;
create policy convidado_insert on public.evento_convidado
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists convidado_update on public.evento_convidado;
create policy convidado_update on public.evento_convidado
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists convidado_delete on public.evento_convidado;
create policy convidado_delete on public.evento_convidado
  for delete using (public.pode_editar_evento(event_id));

-- cliente: a lista é DELA — monta, edita e remove
drop policy if exists portal_convidado_select on public.evento_convidado;
create policy portal_convidado_select on public.evento_convidado
  for select using (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_convidado_insert on public.evento_convidado;
create policy portal_convidado_insert on public.evento_convidado
  for insert with check (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_convidado_update on public.evento_convidado;
create policy portal_convidado_update on public.evento_convidado
  for update using (event_id in (select public.eventos_da_cliente()))
  with check (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_convidado_delete on public.evento_convidado;
create policy portal_convidado_delete on public.evento_convidado
  for delete using (event_id in (select public.eventos_da_cliente()));

-- ------------------------------------------------------------
-- 1b) A porta pública do convidado (sem login)
-- ------------------------------------------------------------
-- Devolve o nome de quem foi convidado e o mínimo do evento. NUNCA a
-- lista, nunca contato de ninguém — nem do próprio convidado, que já
-- sabe quem é e não precisa ver o telefone de volta.
create or replace function public.consultar_convite_convidado(p_hash text)
returns table (
  nome            text,
  confirmacao     text,
  acompanhantes   int,
  criancas        int,
  restricao_alimentar text,
  evento_tipo     text,
  evento_data     date,
  evento_hora     time,
  evento_local    text,
  evento_cidade   text,
  anfitrioes      text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.nome, c.confirmacao, c.acompanhantes, c.criancas, c.restricao_alimentar,
    e.type::text, e.date, e.time, e.location, e.city,
    coalesce(nullif(trim(e.name), ''), 'os noivos') as anfitrioes
  from public.evento_convidado c
  join public.events e on e.id = c.event_id
  where c.hash = p_hash;
$$;

revoke all on function public.consultar_convite_convidado(text) from public;
grant execute on function public.consultar_convite_convidado(text) to anon, authenticated;

-- A resposta do convidado. O hash é a credencial; nada mais é aceito do
-- lado de fora (nem o id, nem o evento).
create or replace function public.responder_convite_convidado(
  p_hash          text,
  p_confirmacao   text,
  p_acompanhantes int default 0,
  p_criancas      int default 0,
  p_restricao     text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.evento_convidado%rowtype;
begin
  if p_confirmacao not in ('confirmado', 'nao_vai') then
    return json_build_object('ok', false, 'erro', 'resposta_invalida');
  end if;

  select * into v_conv from public.evento_convidado where hash = p_hash for update;
  if not found then
    return json_build_object('ok', false, 'erro', 'convite_invalido');
  end if;

  update public.evento_convidado
     set confirmacao   = p_confirmacao,
         acompanhantes = case when p_confirmacao = 'confirmado'
                              then greatest(0, least(coalesce(p_acompanhantes, 0), 20)) else 0 end,
         criancas      = case when p_confirmacao = 'confirmado'
                              then greatest(0, least(coalesce(p_criancas, 0), 20)) else 0 end,
         restricao_alimentar = case when p_confirmacao = 'confirmado'
                              then nullif(left(trim(coalesce(p_restricao, '')), 400), '') else null end,
         confirmado_em  = now(),
         confirmado_via = 'link',
         updated_at     = now()
   where id = v_conv.id;

  return json_build_object('ok', true, 'confirmacao', p_confirmacao);
end $$;

revoke all on function public.responder_convite_convidado(text, text, int, int, text) from public;
grant execute on function public.responder_convite_convidado(text, text, int, int, text) to anon, authenticated;

-- ============================================================
-- 2) CORTEJO
-- ============================================================
-- Lista dinâmica: a pessoa entra quando é convidada, não há "5 linhas de
-- padrinho" esperando preenchimento. Campo vazio simplesmente não
-- aparece na tela.
create table if not exists public.evento_cortejo_pessoa (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),

  papel       text not null check (papel in
                ('padrinho', 'madrinha', 'dama', 'pajem', 'porta_alianca')),
  nome        text not null,
  -- dado de terceiro, mesma regra dos convidados
  contato     text,
  o_que_leva  text,
  responsavel text,
  chegada     text,
  ordem       int not null default 0,

  origem      text not null default 'cliente' check (origem in ('cliente', 'equipe')),
  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_cortejo_evento on public.evento_cortejo_pessoa (event_id, papel, ordem);

drop trigger if exists trg_fill_empresa on public.evento_cortejo_pessoa;
create trigger trg_fill_empresa before insert on public.evento_cortejo_pessoa
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_cortejo_pessoa enable row level security;

drop policy if exists cortejo_select on public.evento_cortejo_pessoa;
create policy cortejo_select on public.evento_cortejo_pessoa
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists cortejo_insert on public.evento_cortejo_pessoa;
create policy cortejo_insert on public.evento_cortejo_pessoa
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists cortejo_update on public.evento_cortejo_pessoa;
create policy cortejo_update on public.evento_cortejo_pessoa
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists cortejo_delete on public.evento_cortejo_pessoa;
create policy cortejo_delete on public.evento_cortejo_pessoa
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists portal_cortejo_select on public.evento_cortejo_pessoa;
create policy portal_cortejo_select on public.evento_cortejo_pessoa
  for select using (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_cortejo_insert on public.evento_cortejo_pessoa;
create policy portal_cortejo_insert on public.evento_cortejo_pessoa
  for insert with check (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_cortejo_update on public.evento_cortejo_pessoa;
create policy portal_cortejo_update on public.evento_cortejo_pessoa
  for update using (event_id in (select public.eventos_da_cliente()))
  with check (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_cortejo_delete on public.evento_cortejo_pessoa;
create policy portal_cortejo_delete on public.evento_cortejo_pessoa
  for delete using (event_id in (select public.eventos_da_cliente()));

-- ============================================================
-- 3) INSPIRAÇÕES E RETRATO
-- ============================================================
create table if not exists public.evento_inspiracao (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id),
  assunto      text not null default 'geral',
  storage_path text not null,
  legenda      text,
  ordem        int not null default 0,
  origem       text not null default 'cliente' check (origem in ('cliente', 'equipe')),
  criado_por   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_inspiracao_evento on public.evento_inspiracao (event_id, assunto, ordem);

drop trigger if exists trg_fill_empresa on public.evento_inspiracao;
create trigger trg_fill_empresa before insert on public.evento_inspiracao
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_inspiracao enable row level security;

drop policy if exists inspiracao_select on public.evento_inspiracao;
create policy inspiracao_select on public.evento_inspiracao
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists inspiracao_write on public.evento_inspiracao;
create policy inspiracao_write on public.evento_inspiracao
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists portal_inspiracao_select on public.evento_inspiracao;
create policy portal_inspiracao_select on public.evento_inspiracao
  for select using (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_inspiracao_insert on public.evento_inspiracao;
create policy portal_inspiracao_insert on public.evento_inspiracao
  for insert with check (event_id in (select public.eventos_da_cliente()));
drop policy if exists portal_inspiracao_delete on public.evento_inspiracao;
create policy portal_inspiracao_delete on public.evento_inspiracao
  for delete using (event_id in (select public.eventos_da_cliente()));

-- O retrato da cliente vive no vínculo (é da PESSOA naquele evento).
alter table public.evento_acesso
  add column if not exists retrato_path text;

-- ------------------------------------------------------------
-- 3b) Bucket privado das imagens da cliente
-- ------------------------------------------------------------
-- Molde da 085: privado, caminho começa pelo event_id, e a permissão sai
-- de funções SECURITY DEFINER (subquery em events dentro de policy de
-- storage.objects esbarra na RLS — lição da 030/085).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspiracoes', 'inspiracoes', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

create or replace function public.pode_ver_imagem_evento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pode_ver_evento(p_folder::uuid)
      or public.sou_cliente_do_evento(p_folder::uuid);
$$;

create or replace function public.pode_subir_imagem_evento(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pode_editar_evento(p_folder::uuid)
      or public.sou_cliente_do_evento(p_folder::uuid);
$$;

revoke all on function public.pode_ver_imagem_evento(text) from public, anon;
revoke all on function public.pode_subir_imagem_evento(text) from public, anon;
grant execute on function public.pode_ver_imagem_evento(text) to authenticated;
grant execute on function public.pode_subir_imagem_evento(text) to authenticated;

drop policy if exists "inspiracoes_select" on storage.objects;
create policy "inspiracoes_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'inspiracoes'
         and public.pode_ver_imagem_evento((storage.foldername(name))[1]));

drop policy if exists "inspiracoes_insert" on storage.objects;
create policy "inspiracoes_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inspiracoes'
              and public.pode_subir_imagem_evento((storage.foldername(name))[1]));

drop policy if exists "inspiracoes_update" on storage.objects;
create policy "inspiracoes_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'inspiracoes'
         and public.pode_subir_imagem_evento((storage.foldername(name))[1]));

drop policy if exists "inspiracoes_delete" on storage.objects;
create policy "inspiracoes_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'inspiracoes'
         and public.pode_subir_imagem_evento((storage.foldername(name))[1]));

-- ============================================================
-- 4) ESCOLHAS CURADAS
-- ============================================================
-- A opção é uma REFERÊNCIA, não um cadastro: durante o Planejamento o
-- fornecedor ainda é "aquele buffet que apareceu na conversa". Mostrar
-- três opções não pode obrigar a cadastrar três fornecedores e depois
-- descartar dois — o vínculo com o CRM (supplier_id) só é preenchido
-- quando fecha.
create table if not exists public.decisao_curadoria (
  id                uuid primary key default gen_random_uuid(),
  evento_decisao_id uuid not null unique references public.evento_decisao (id) on delete cascade,
  event_id          uuid not null references public.events (id) on delete cascade,
  empresa_id        uuid references public.empresas (id),
  estado            text not null default 'rascunho'
                    check (estado in ('rascunho', 'publicada', 'escolhida', 'recusada')),
  escolhida_opcao_id uuid,
  -- o motivo é da CLIENTE quando recusa tudo
  motivo_recusa     text,
  publicada_em      timestamptz,
  respondida_em     timestamptz,
  criado_por        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.decisao_opcao (
  id            uuid primary key default gen_random_uuid(),
  curadoria_id  uuid not null references public.decisao_curadoria (id) on delete cascade,
  nome          text not null,
  descricao     text,
  valor         numeric(12, 2),
  inclui        text[],
  prazo_reserva date,
  -- a nota é da cerimonialista: por que ela colocou esta opção na mesa
  nota          text,
  foto_path     text,
  recomendada   boolean not null default false,
  -- só no fechamento: até lá a opção é referência, não cadastro
  supplier_id   uuid references public.suppliers (id) on delete set null,
  ordem         int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_curadoria_evento on public.decisao_curadoria (event_id, estado);
create index if not exists idx_opcao_curadoria on public.decisao_opcao (curadoria_id, ordem);

-- uma recomendada por rodada
create unique index if not exists uq_opcao_recomendada
  on public.decisao_opcao (curadoria_id) where recomendada;

drop trigger if exists trg_fill_empresa on public.decisao_curadoria;
create trigger trg_fill_empresa before insert on public.decisao_curadoria
  for each row execute function public.fill_empresa_from_event();

alter table public.decisao_curadoria enable row level security;
alter table public.decisao_opcao enable row level security;

drop policy if exists curadoria_select on public.decisao_curadoria;
create policy curadoria_select on public.decisao_curadoria
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists curadoria_write on public.decisao_curadoria;
create policy curadoria_write on public.decisao_curadoria
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

-- a cliente vê a rodada só depois de publicada (rascunho é trabalho dela)
drop policy if exists portal_curadoria_select on public.decisao_curadoria;
create policy portal_curadoria_select on public.decisao_curadoria
  for select using (
    event_id in (select public.eventos_da_cliente())
    and estado in ('publicada', 'escolhida', 'recusada')
  );

drop policy if exists opcao_select on public.decisao_opcao;
create policy opcao_select on public.decisao_opcao
  for select using (
    curadoria_id in (
      select c.id from public.decisao_curadoria c
      where c.event_id in (select public.eventos_visiveis())
    )
  );
drop policy if exists opcao_write on public.decisao_opcao;
create policy opcao_write on public.decisao_opcao
  for all using (
    curadoria_id in (
      select c.id from public.decisao_curadoria c
      where public.pode_editar_evento(c.event_id)
    )
  )
  with check (
    curadoria_id in (
      select c.id from public.decisao_curadoria c
      where public.pode_editar_evento(c.event_id)
    )
  );

drop policy if exists portal_opcao_select on public.decisao_opcao;
create policy portal_opcao_select on public.decisao_opcao
  for select using (
    curadoria_id in (
      select c.id from public.decisao_curadoria c
      where c.event_id in (select public.eventos_da_cliente())
        and c.estado in ('publicada', 'escolhida', 'recusada')
    )
  );

-- A resposta da cliente: escolhe uma OU recusa todas com motivo.
create or replace function public.responder_curadoria(
  p_curadoria_id uuid,
  p_opcao_id     uuid default null,
  p_motivo       text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur   public.decisao_curadoria%rowtype;
  v_ok    boolean;
  v_link  text;
  v_ev    public.events%rowtype;
  v_resp  uuid;
  v_tit   text;
begin
  select * into v_cur from public.decisao_curadoria where id = p_curadoria_id for update;
  if not found then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if not public.sou_cliente_do_evento(v_cur.event_id) then
    return json_build_object('ok', false, 'erro', 'inexistente');
  end if;
  if v_cur.estado <> 'publicada' then
    return json_build_object('ok', false, 'erro', 'ja_respondida');
  end if;

  if p_opcao_id is not null then
    select exists (select 1 from public.decisao_opcao where id = p_opcao_id and curadoria_id = p_curadoria_id)
      into v_ok;
    if not v_ok then
      return json_build_object('ok', false, 'erro', 'opcao_invalida');
    end if;
    update public.decisao_curadoria
       set estado = 'escolhida', escolhida_opcao_id = p_opcao_id,
           respondida_em = now(), updated_at = now()
     where id = p_curadoria_id;
  else
    if coalesce(trim(p_motivo), '') = '' then
      return json_build_object('ok', false, 'erro', 'motivo_obrigatorio');
    end if;
    update public.decisao_curadoria
       set estado = 'recusada', motivo_recusa = left(trim(p_motivo), 600),
           respondida_em = now(), updated_at = now()
     where id = p_curadoria_id;
  end if;

  -- avisa quem cuida do evento (mesmo padrão agregado da 091)
  select * into v_ev from public.events where id = v_cur.event_id;
  select titulo into v_tit from public.evento_decisao where id = v_cur.evento_decisao_id;
  select me.user_id into v_resp from public.membros_equipe me
   where me.id = v_ev.cerimonialista_responsavel_id;
  v_link := '/eventos/' || v_cur.event_id || '/planejamento?decisao=' || v_cur.evento_decisao_id;

  if not exists (
    select 1 from public.notifications n
    where n.link = v_link and n.read_at is null
      and n.cerimonialista_id = coalesce(v_resp, v_ev.cerimonialista_id)
  ) then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal',
            case when p_opcao_id is not null
                 then 'A cliente escolheu em ' || coalesce(v_tit, 'uma decisão')
                 else 'A cliente recusou as opções de ' || coalesce(v_tit, 'uma decisão') end,
            'Veja no Planejamento.', v_link);
  end if;

  return json_build_object('ok', true);
end $$;

revoke all on function public.responder_curadoria(uuid, uuid, text) from public, anon;
grant execute on function public.responder_curadoria(uuid, uuid, text) to authenticated;

-- ============================================================
-- 5) SUGESTÕES DE CRONOGRAMA
-- ============================================================
-- A cliente NUNCA edita roteiro_items — nem lê a tabela. Ela sugere numa
-- tabela própria, e a sugestão só encosta no cronograma quando a
-- cerimonialista aceita. Por construção, sugestão pendente ou recusada
-- não aparece no link do fornecedor.
create table if not exists public.roteiro_sugestao (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  empresa_id      uuid references public.empresas (id),
  -- nulo = "queremos um momento novo"
  roteiro_item_id uuid references public.roteiro_items (id) on delete cascade,
  tipo            text not null check (tipo in ('horario', 'momento_novo')),
  horario_sugerido time,
  titulo_sugerido  text,
  mensagem        text,
  estado          text not null default 'pendente'
                  check (estado in ('pendente', 'aceita', 'recusada')),
  -- o motivo é da CERIMONIALISTA quando recusa
  motivo_recusa   text,
  autor_user_id   uuid references auth.users (id) on delete set null,
  decidida_por    uuid references auth.users (id) on delete set null,
  decidida_em     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_sugestao_evento on public.roteiro_sugestao (event_id, estado, created_at desc);

drop trigger if exists trg_fill_empresa on public.roteiro_sugestao;
create trigger trg_fill_empresa before insert on public.roteiro_sugestao
  for each row execute function public.fill_empresa_from_event();

alter table public.roteiro_sugestao enable row level security;

drop policy if exists sugestao_select on public.roteiro_sugestao;
create policy sugestao_select on public.roteiro_sugestao
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists sugestao_update on public.roteiro_sugestao;
create policy sugestao_update on public.roteiro_sugestao
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists sugestao_delete on public.roteiro_sugestao;
create policy sugestao_delete on public.roteiro_sugestao
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists portal_sugestao_select on public.roteiro_sugestao;
create policy portal_sugestao_select on public.roteiro_sugestao
  for select using (event_id in (select public.eventos_da_cliente()));

-- A criação passa por RPC para validar que o item é DAQUELE evento — a
-- cliente não lê roteiro_items, então manda um id que o servidor confere.
create or replace function public.sugerir_no_cronograma(
  p_event_id  uuid,
  p_tipo      text,
  p_item_id   uuid default null,
  p_horario   time default null,
  p_titulo    text default null,
  p_mensagem  text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok   boolean;
  v_id   uuid;
  v_ev   public.events%rowtype;
  v_resp uuid;
  v_link text;
begin
  if not public.sou_cliente_do_evento(p_event_id) then
    return json_build_object('ok', false, 'erro', 'sem_acesso');
  end if;
  if p_tipo not in ('horario', 'momento_novo') then
    return json_build_object('ok', false, 'erro', 'tipo_invalido');
  end if;

  if p_tipo = 'horario' then
    if p_item_id is null or p_horario is null then
      return json_build_object('ok', false, 'erro', 'faltou_dado');
    end if;
    select exists (
      select 1 from public.roteiro_items ri
      where ri.id = p_item_id and ri.event_id = p_event_id
    ) into v_ok;
    if not v_ok then
      return json_build_object('ok', false, 'erro', 'item_invalido');
    end if;
  else
    if coalesce(trim(p_titulo), '') = '' then
      return json_build_object('ok', false, 'erro', 'faltou_titulo');
    end if;
  end if;

  insert into public.roteiro_sugestao
    (event_id, roteiro_item_id, tipo, horario_sugerido, titulo_sugerido,
     mensagem, autor_user_id)
  values
    (p_event_id,
     case when p_tipo = 'horario' then p_item_id else null end,
     p_tipo, p_horario,
     nullif(left(trim(coalesce(p_titulo, '')), 120), ''),
     nullif(left(trim(coalesce(p_mensagem, '')), 600), ''),
     auth.uid())
  returning id into v_id;

  select * into v_ev from public.events where id = p_event_id;
  select me.user_id into v_resp from public.membros_equipe me
   where me.id = v_ev.cerimonialista_responsavel_id;
  v_link := '/eventos/' || p_event_id || '/roteiro';

  if not exists (
    select 1 from public.notifications n
    where n.link = v_link and n.read_at is null
      and n.cerimonialista_id = coalesce(v_resp, v_ev.cerimonialista_id)
  ) then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (coalesce(v_resp, v_ev.cerimonialista_id), 'portal',
            'A cliente sugeriu um ajuste no cronograma',
            'Aceitar ou recusar na Execução do evento.', v_link);
  end if;

  return json_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.sugerir_no_cronograma(uuid, text, uuid, time, text, text) from public, anon;
grant execute on function public.sugerir_no_cronograma(uuid, text, uuid, time, text, text) to authenticated;

-- O programa do dia como a cliente vê: horário, título e duração. SEM
-- responsável, telefone, observação interna ou status de execução.
create or replace function public.portal_programa_do_dia(p_event_id uuid)
returns table (
  id       uuid,
  hora     time,
  titulo   text,
  duracao  int
)
language sql
stable
security definer
set search_path = public
as $$
  select ri.id, ri.time, ri.title, ri.duracao_minutos
  from public.roteiro_items ri
  where ri.event_id = p_event_id
    and (public.sou_cliente_do_evento(p_event_id)
         or public.pode_ver_evento(p_event_id))
  order by ri.time nulls last, ri."order";
$$;

revoke all on function public.portal_programa_do_dia(uuid) from public, anon;
grant execute on function public.portal_programa_do_dia(uuid) to authenticated;

-- ============================================================
-- 6) CAMPOS SENSÍVEIS (o gate da 091 já está no ar)
-- ============================================================
-- Alergia e medicamento entram agora, e não antes, porque a 091 já
-- exclui sensibilidade <> 'normal' de tudo que sai do sistema.
--
-- A decisão nasce por empresa, no template, para todo evento novo já
-- receber. Idempotente pelo código.
do $$
declare
  r record;
  v_obj uuid;
  v_dec uuid;
begin
  for r in select distinct empresa_id, tipo_evento from public.metodo_objetivo loop
    -- pendura em "Estrutura" (o objetivo mais geral); se não houver, no
    -- primeiro objetivo daquele tipo de evento
    select id into v_obj from public.metodo_objetivo
     where empresa_id = r.empresa_id and tipo_evento = r.tipo_evento
       and codigo = 'estrutura'
     limit 1;
    if v_obj is null then
      select id into v_obj from public.metodo_objetivo
       where empresa_id = r.empresa_id and tipo_evento = r.tipo_evento
       order by ordem limit 1;
    end if;
    if v_obj is null then continue; end if;

    select id into v_dec from public.metodo_decisao
     where objetivo_id = v_obj and codigo = 'cuidados_noivos';
    if v_dec is null then
      insert into public.metodo_decisao
        (objetivo_id, empresa_id, codigo, titulo, responsavel,
         offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
      values (v_obj, r.empresa_id, 'cuidados_noivos',
              'Cuidados com os noivos no dia', 'noivos', 30, 15, 60, 40, 90)
      returning id into v_dec;
    end if;

    insert into public.metodo_campo
      (decisao_id, empresa_id, codigo, label, tipo, ordem,
       pergunta_cliente, label_portal, sensibilidade)
    select v_dec, r.empresa_id, 'alergias',
           'Alergias', 'texto', 1, true,
           'Alguém de vocês tem alergia? (inclusive alimentar)', 'alergia'
    where not exists (
      select 1 from public.metodo_campo where decisao_id = v_dec and codigo = 'alergias');

    insert into public.metodo_campo
      (decisao_id, empresa_id, codigo, label, tipo, ordem,
       pergunta_cliente, label_portal, sensibilidade)
    select v_dec, r.empresa_id, 'medicamentos',
           'Medicamentos de uso contínuo', 'texto', 2, true,
           'Algum medicamento que precisamos ter à mão?', 'medicamento'
    where not exists (
      select 1 from public.metodo_campo where decisao_id = v_dec and codigo = 'medicamentos');
  end loop;
end $$;

-- Os eventos que JÁ EXISTEM não passam pela instanciação de novo, então
-- a pergunta nasceria morta para todos eles. Aqui a decisão e os dois
-- campos entram nos eventos em andamento — vazios, como qualquer campo
-- recém-instanciado. Idempotente pelo template de origem.
insert into public.evento_decisao
  (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
   titulo, responsavel, offset_ideal_dias, offset_min_dias, offset_max_dias,
   prioridade, ordem)
select eo.id, eo.event_id, eo.empresa_id, d.id,
       d.titulo, d.responsavel, d.offset_ideal_dias, d.offset_min_dias,
       d.offset_max_dias, d.prioridade, d.ordem
from public.metodo_decisao d
join public.evento_objetivo eo on eo.objetivo_template_id = d.objetivo_id
where d.codigo = 'cuidados_noivos'
  and not exists (
    select 1 from public.evento_decisao ed
    where ed.event_id = eo.event_id and ed.decisao_template_id = d.id
  );

insert into public.evento_campo_valor
  (evento_decisao_id, event_id, empresa_id, campo_template_id,
   codigo, label, tipo, opcoes, unidade, ordem,
   pergunta_cliente, label_portal, sensibilidade)
select ed.id, ed.event_id, ed.empresa_id, c.id,
       c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem,
       c.pergunta_cliente, c.label_portal, c.sensibilidade
from public.metodo_campo c
join public.metodo_decisao d on d.id = c.decisao_id and d.codigo = 'cuidados_noivos'
join public.evento_decisao ed on ed.decisao_template_id = d.id
where not exists (
  select 1 from public.evento_campo_valor v
  where v.evento_decisao_id = ed.id and v.codigo = c.codigo
);

-- ------------------------------------------------------------
-- 6b) Alergia compartilhada com UM fornecedor, por ato explícito
-- ------------------------------------------------------------
-- Medicamento nunca sai. Alergia sai só onde a cerimonialista mandar
-- sair, um fornecedor de cada vez, e some quando ela desfaz.
create table if not exists public.evento_alergia_compartilhada (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  supplier_id     uuid not null references public.suppliers (id) on delete cascade,
  compartilhado_por uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (event_id, supplier_id)
);

alter table public.evento_alergia_compartilhada enable row level security;

drop policy if exists alergia_comp_select on public.evento_alergia_compartilhada;
create policy alergia_comp_select on public.evento_alergia_compartilhada
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists alergia_comp_write on public.evento_alergia_compartilhada;
create policy alergia_comp_write on public.evento_alergia_compartilhada
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

-- O link público do roteiro passa a mostrar a alergia SÓ para o
-- fornecedor com quem ela foi compartilhada, e só se já estiver
-- conferida. Função separada: a RPC do roteiro (032) não muda.
create or replace function public.roteiro_publico_alergia(link_hash text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select string_agg(v.valor_texto, ' · ')
  from public.roteiro_links l
  join public.evento_alergia_compartilhada a
    on a.event_id = l.event_id and a.supplier_id = l.supplier_id
  join public.evento_campo_valor v
    on v.event_id = l.event_id
   and v.sensibilidade = 'alergia'
   and v.valor_texto is not null
   and not v.aguarda_conferencia
  where l.hash = link_hash;
$$;

revoke all on function public.roteiro_publico_alergia(text) from public;
grant execute on function public.roteiro_publico_alergia(text) to anon, authenticated;

comment on function public.roteiro_publico_alergia(text) is
  'Alergia para o link daquele fornecedor. Só com compartilhamento explícito e só depois de conferida. Medicamento NUNCA passa por aqui.';

-- ------------------------------------------------------------
-- 7) Relatório
-- ------------------------------------------------------------
do $$
declare
  v_sens int;
  v_dec  int;
begin
  select count(*) into v_sens from public.metodo_campo where sensibilidade <> 'normal';
  select count(*) into v_dec from public.metodo_decisao where codigo = 'cuidados_noivos';
  raise notice '--- 092 ---';
  raise notice 'tabelas novas: evento_convidado, evento_cortejo_pessoa, evento_inspiracao, decisao_curadoria, decisao_opcao, roteiro_sugestao, evento_alergia_compartilhada';
  raise notice 'bucket privado inspiracoes: criado';
  raise notice 'campos sensiveis no template: % (em % decisoes de cuidados)', v_sens, v_dec;
end $$;

commit;
