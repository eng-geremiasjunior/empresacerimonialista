-- 098 — Croqui do salão: mesas, elementos e alocação de convidados
--
-- O mapa de mesas em escala real. A escala não é enfeite: é ela que
-- permite medir corredor de circulação e transformar o croqui em
-- instrução de montagem para o dia.
--
-- Medido antes de escrever (2026-08-17): 5 convidados no banco, TODOS
-- com a coluna mesa (text) nula. A coluna era texto livre digitado pela
-- cliente no portal — dois problemas de uma vez: ninguém validava se a
-- mesa existia, e a equipe não tinha onde criar mesas. Ela morre aqui,
-- sem migração de dados porque não há dado.
--
-- Coordenadas em CENTÍMETROS INTEIROS. Sem float: casa com o snap de
-- 25 cm da tela, e o viewBox do SVG passa a ser o próprio salão em cm
-- (2000×1500 para 20×15 m) — o desenho usa a coordenada do banco sem
-- nenhuma conversão de escala.
--
-- Segurança (regras do dono, verbatim no briefing):
--   * restrição alimentar e acessibilidade são dados de saúde de
--     TERCEIROS (a maioria não é cliente de ninguém aqui) — nunca saem
--     nominalmente: o buffet recebe contagem por mesa, não nome;
--   * o motivo de duas pessoas não sentarem juntas é assunto de família
--     — anotação interna, nunca em impresso nem compartilhamento;
--   * nenhuma rota pública devolve a lista de convidados — e por isso
--     esta migração NÃO cria nenhuma RPC security definer;
--   * nesta etapa só a equipe vê o croqui: zero policy de portal.
--
-- Execute no SQL Editor do Supabase (depois da 097).

begin;

-- ============================================================
-- 1) O SALÃO
-- ============================================================
-- Um por evento. Sem linha = croqui ainda não começou — a tela usa
-- isso para mostrar o passo "informe as medidas do espaço".
create table if not exists public.evento_salao (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null unique references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),

  nome        text,
  largura_cm  int not null default 2000 check (largura_cm between 300 and 20000),
  altura_cm   int not null default 1500 check (altura_cm between 300 and 20000),
  observacao  text,

  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.evento_salao is
  'Medidas reais do espaço, em cm. O viewBox do croqui é exatamente largura_cm × altura_cm.';

-- ============================================================
-- 2) AS MESAS
-- ============================================================
create table if not exists public.evento_mesa (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),

  rotulo      text not null,
  tipo        text not null default 'redonda_8'
              check (tipo in ('redonda_8', 'redonda_10', 'retangular', 'imperial', 'noivos', 'bolo')),
  lugares     int not null default 8 check (lugares between 1 and 40),

  x_cm        int not null default 100,
  y_cm        int not null default 100,
  rotacao     int not null default 0 check (rotacao between 0 and 359),
  -- nulos = medida padrão do tipo (redonda_8 ⌀150, redonda_10 ⌀180,
  -- retangular 240×100, imperial 400×120). Preencher permite ajustar
  -- ao mobiliário que o buffet realmente tem.
  largura_cm  int check (largura_cm is null or largura_cm between 30 and 2000),
  altura_cm   int check (altura_cm is null or altura_cm between 30 and 2000),

  -- true = a ordem do convidado NA mesa é o lugar dele (mesa dos
  -- noivos, dos pais). false = mesa livre, só conta gente.
  assento_marcado boolean not null default false,

  ordem       int not null default 0,
  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_mesa_evento on public.evento_mesa (event_id, ordem);

-- alvo dos FKs compostos abaixo: referenciar a mesa JUNTO com o evento
alter table public.evento_mesa
  drop constraint if exists uq_mesa_evento_id;
alter table public.evento_mesa
  add constraint uq_mesa_evento_id unique (event_id, id);

comment on column public.evento_mesa.assento_marcado is
  'Quando true, ordem_na_mesa do convidado é o assento (esquerda→direita). Só nas mesas de honra.';

-- ============================================================
-- 3) OS ELEMENTOS DO ESPAÇO
-- ============================================================
-- Porta, coluna, saída de emergência… É o que transforma croqui em
-- planta: a saída de emergência participa do cálculo de obstrução.
create table if not exists public.evento_elemento (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),

  tipo        text not null
              check (tipo in ('porta', 'banheiro', 'bar', 'praca_alimentacao',
                              'coluna', 'saida_emergencia', 'pista', 'palco')),
  rotulo      text,
  x_cm        int not null default 100,
  y_cm        int not null default 100,
  rotacao     int not null default 0 check (rotacao between 0 and 359),
  largura_cm  int not null default 100 check (largura_cm between 20 and 3000),
  altura_cm   int not null default 100 check (altura_cm between 20 and 3000),

  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_elemento_evento on public.evento_elemento (event_id, tipo);

-- ============================================================
-- 4) O CONVIDADO GANHA MESA DE VERDADE (E PERDE O TEXTO LIVRE)
-- ============================================================
alter table public.evento_convidado
  add column if not exists mesa_id uuid
    references public.evento_mesa (id) on delete set null;

-- FK não passa por RLS: sem esta amarração, um id de mesa de OUTRO
-- evento seria aceito. O FK simples acima cuida do "mesa apagada →
-- convidado solto"; este composto garante que a mesa é do mesmo evento.
-- (Com mesa_id nulo, MATCH SIMPLE não valida nada — os dois convivem.)
alter table public.evento_convidado
  drop constraint if exists fk_convidado_mesa_mesmo_evento;
alter table public.evento_convidado
  add constraint fk_convidado_mesa_mesmo_evento
  foreign key (event_id, mesa_id) references public.evento_mesa (event_id, id);

-- só lida quando a mesa tem assento_marcado; nas demais é ignorada
alter table public.evento_convidado
  add column if not exists ordem_na_mesa int;

alter table public.evento_convidado
  add column if not exists eh_crianca boolean not null default false;

-- o adulto responsável pela criança — a saúde da mesa avisa quando a
-- criança está numa mesa sem o responsável dela
alter table public.evento_convidado
  add column if not exists responsavel_id uuid
    references public.evento_convidado (id) on delete set null;

-- mesma amarração de evento do mesa_id, pelo mesmo motivo
alter table public.evento_convidado
  drop constraint if exists uq_convidado_evento_id;
alter table public.evento_convidado
  add constraint uq_convidado_evento_id unique (event_id, id);
alter table public.evento_convidado
  drop constraint if exists fk_responsavel_mesmo_evento;
alter table public.evento_convidado
  add constraint fk_responsavel_mesmo_evento
  foreign key (event_id, responsavel_id) references public.evento_convidado (event_id, id);

-- categoria fechada: é DAQUI que sai a contagem do buffet, e contagem
-- só funciona sobre categoria. O texto livre continua existindo em
-- restricao_alimentar (092) como detalhe interno da equipe.
alter table public.evento_convidado
  add column if not exists restricao_tipo text[] not null default '{}';

alter table public.evento_convidado
  drop constraint if exists convidado_restricao_tipo_check;
alter table public.evento_convidado
  add constraint convidado_restricao_tipo_check
  check (restricao_tipo <@ array['vegano', 'vegetariano', 'sem_gluten',
                                 'sem_lactose', 'alergia', 'outro']::text[]);

-- dado de saúde de terceiro: mesma régua da alergia (092) — nunca em
-- rota pública, nunca nominal em impresso de fornecedor
alter table public.evento_convidado
  add column if not exists acessibilidade text;

create index if not exists idx_convidado_mesa
  on public.evento_convidado (event_id, mesa_id) where mesa_id is not null;

comment on column public.evento_convidado.restricao_tipo is
  'Categorias fechadas para a CONTAGEM do buffet (por mesa, sem nomes). O detalhe nominal fica em restricao_alimentar, interno da equipe.';
comment on column public.evento_convidado.acessibilidade is
  'Dado de saúde de terceiro. Nunca sai em rota pública nem nominalmente em impresso de fornecedor — só contagem.';

-- a coluna de texto livre morre (5 convidados no banco, todos com nula)
alter table public.evento_convidado drop column if exists mesa;

-- ============================================================
-- 5) QUEM SENTA COM QUEM (E QUEM NÃO PODE)
-- ============================================================
create table if not exists public.evento_convidado_relacao (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  empresa_id   uuid references public.empresas (id),

  convidado_a  uuid not null references public.evento_convidado (id) on delete cascade,
  convidado_b  uuid not null references public.evento_convidado (id) on delete cascade,
  tipo         text not null check (tipo in ('junto', 'separado')),
  -- assunto de família. NUNCA entra em impresso, RPC pública ou
  -- contexto de IA — mesma régua do motivo_interno da flor vetada (096)
  motivo_interno text,

  criado_por   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),

  check (convidado_a <> convidado_b)
);

-- o par é o mesmo nas duas direções: (Ana, Bia) e (Bia, Ana) são UMA relação
-- (o unique(a,b) da primeira versão desta migração deixava o par
-- invertido passar — sai de cena)
alter table public.evento_convidado_relacao
  drop constraint if exists evento_convidado_relacao_convidado_a_convidado_b_key;
create unique index if not exists uq_relacao_par
  on public.evento_convidado_relacao
  (event_id, least(convidado_a, convidado_b), greatest(convidado_a, convidado_b));

create index if not exists idx_relacao_evento on public.evento_convidado_relacao (event_id);

-- os dois lados amarrados ao mesmo evento (FK não passa por RLS)
alter table public.evento_convidado_relacao
  drop constraint if exists fk_relacao_a_mesmo_evento;
alter table public.evento_convidado_relacao
  add constraint fk_relacao_a_mesmo_evento
  foreign key (event_id, convidado_a) references public.evento_convidado (event_id, id);
alter table public.evento_convidado_relacao
  drop constraint if exists fk_relacao_b_mesmo_evento;
alter table public.evento_convidado_relacao
  add constraint fk_relacao_b_mesmo_evento
  foreign key (event_id, convidado_b) references public.evento_convidado (event_id, id);

comment on column public.evento_convidado_relacao.motivo_interno is
  'Assunto de família. Só em tela logada da equipe: nunca em impresso, compartilhamento, RPC pública ou contexto de IA.';

-- ============================================================
-- 6) EMPRESA_ID AUTOMÁTICO + UPDATED_AT + DEFAULTS EM LOTE
-- ============================================================
drop trigger if exists trg_fill_empresa on public.evento_salao;
create trigger trg_fill_empresa before insert on public.evento_salao
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.evento_mesa;
create trigger trg_fill_empresa before insert on public.evento_mesa
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.evento_elemento;
create trigger trg_fill_empresa before insert on public.evento_elemento
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_fill_empresa on public.evento_convidado_relacao;
create trigger trg_fill_empresa before insert on public.evento_convidado_relacao
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_touch on public.evento_salao;
create trigger trg_touch before update on public.evento_salao
  for each row execute function public.set_updated_at();

drop trigger if exists trg_touch on public.evento_mesa;
create trigger trg_touch before update on public.evento_mesa
  for each row execute function public.set_updated_at();

-- o aprendizado da 093: insert em lote do PostgREST manda NULL explícito
-- nas colunas omitidas, e NULL explícito não aciona DEFAULT. A tela cria
-- várias mesas de uma vez ("adicionar 10 redondas") — saneia aqui.
create or replace function public.trg_mesa_defaults()
returns trigger
language plpgsql
as $$
begin
  new.tipo            := coalesce(new.tipo, 'redonda_8');
  new.lugares         := coalesce(new.lugares, 8);
  new.x_cm            := coalesce(new.x_cm, 100);
  new.y_cm            := coalesce(new.y_cm, 100);
  new.rotacao         := coalesce(new.rotacao, 0);
  new.assento_marcado := coalesce(new.assento_marcado, false);
  new.ordem           := coalesce(new.ordem, 0);
  return new;
end $$;

drop trigger if exists trg_mesa_defaults on public.evento_mesa;
create trigger trg_mesa_defaults
  before insert or update on public.evento_mesa
  for each row execute function public.trg_mesa_defaults();

create or replace function public.trg_elemento_defaults()
returns trigger
language plpgsql
as $$
begin
  new.x_cm       := coalesce(new.x_cm, 100);
  new.y_cm       := coalesce(new.y_cm, 100);
  new.rotacao    := coalesce(new.rotacao, 0);
  new.largura_cm := coalesce(new.largura_cm, 100);
  new.altura_cm  := coalesce(new.altura_cm, 100);
  return new;
end $$;

drop trigger if exists trg_elemento_defaults on public.evento_elemento;
create trigger trg_elemento_defaults
  before insert or update on public.evento_elemento
  for each row execute function public.trg_elemento_defaults();

-- o convidado ganhou colunas novas com default — o trigger da 093
-- ganha os coalesce delas
create or replace function public.trg_convidado_defaults()
returns trigger
language plpgsql
as $$
begin
  new.confirmacao   := coalesce(new.confirmacao, 'aguardando');
  new.acompanhantes := coalesce(new.acompanhantes, 0);
  new.criancas      := coalesce(new.criancas, 0);
  new.origem        := coalesce(new.origem, 'equipe');
  new.eh_crianca    := coalesce(new.eh_crianca, false);
  new.restricao_tipo := coalesce(new.restricao_tipo, '{}');
  return new;
end $$;

-- ============================================================
-- 7) RLS — SÓ A EQUIPE, PELA AUTORIZAÇÃO QUE JÁ EXISTE
-- ============================================================
-- Leitura pelo InitPlan (forma de conjunto, avaliada uma vez por
-- consulta); escrita pela correlata pode_editar_evento. Nenhuma policy
-- de portal: nesta etapa a cliente não vê o croqui.
alter table public.evento_salao enable row level security;
alter table public.evento_mesa enable row level security;
alter table public.evento_elemento enable row level security;
alter table public.evento_convidado_relacao enable row level security;

drop policy if exists salao_select on public.evento_salao;
create policy salao_select on public.evento_salao
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists salao_write on public.evento_salao;
create policy salao_write on public.evento_salao
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists salao_update on public.evento_salao;
create policy salao_update on public.evento_salao
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists salao_delete on public.evento_salao;
create policy salao_delete on public.evento_salao
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists mesa_select on public.evento_mesa;
create policy mesa_select on public.evento_mesa
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists mesa_insert on public.evento_mesa;
create policy mesa_insert on public.evento_mesa
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists mesa_update on public.evento_mesa;
create policy mesa_update on public.evento_mesa
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists mesa_delete on public.evento_mesa;
create policy mesa_delete on public.evento_mesa
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists elemento_select on public.evento_elemento;
create policy elemento_select on public.evento_elemento
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists elemento_insert on public.evento_elemento;
create policy elemento_insert on public.evento_elemento
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists elemento_update on public.evento_elemento;
create policy elemento_update on public.evento_elemento
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists elemento_delete on public.evento_elemento;
create policy elemento_delete on public.evento_elemento
  for delete using (public.pode_editar_evento(event_id));

drop policy if exists relacao_select on public.evento_convidado_relacao;
create policy relacao_select on public.evento_convidado_relacao
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists relacao_insert on public.evento_convidado_relacao;
create policy relacao_insert on public.evento_convidado_relacao
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists relacao_update on public.evento_convidado_relacao;
create policy relacao_update on public.evento_convidado_relacao
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists relacao_delete on public.evento_convidado_relacao;
create policy relacao_delete on public.evento_convidado_relacao
  for delete using (public.pode_editar_evento(event_id));

-- A cliente continua lendo e escrevendo a LISTA de convidados (policies
-- portal_convidado_* da 092, intocadas) — e mesa_id ela LÊ (é como o
-- portal mostra "mesa 7"). Mas quem aloca é a equipe, e "a tela não
-- envia" não é proteção: com o JWT dela a API aceita qualquer coluna.
-- RLS é por linha, não por coluna — o guarda vai em trigger. Quem não
-- pode editar o evento como equipe tem a alocação preservada (update)
-- ou zerada (insert), sem erro: o formulário do portal manda a linha
-- inteira e não pode quebrar por isso.
-- auth.uid() nulo = service role (scripts de verificação): passa direto.
create or replace function public.trg_convidado_protege_mesa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.pode_editar_evento(new.event_id) then
    if tg_op = 'UPDATE' then
      new.mesa_id       := old.mesa_id;
      new.ordem_na_mesa := old.ordem_na_mesa;
    else
      new.mesa_id       := null;
      new.ordem_na_mesa := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_convidado_protege_mesa on public.evento_convidado;
create trigger trg_convidado_protege_mesa
  before insert or update on public.evento_convidado
  for each row execute function public.trg_convidado_protege_mesa();

commit;

do $$
begin
  raise notice '098 aplicada: evento_salao, evento_mesa, evento_elemento, evento_convidado_relacao; convidado com mesa_id/restricao_tipo/acessibilidade; coluna mesa (text) removida.';
end $$;
