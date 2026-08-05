-- 064 — Método do evento: OBJETIVO → DECISÃO → GUIA (template + instância)
--
-- Modelo de 3 níveis, não 2 (crítico):
--   OBJETIVO  = assunto do casamento ("Buffet e recepção"). Planejamento.
--   DECISÃO   = escolha dentro do objetivo ("Escolher buffet"). Um objetivo
--               tem várias decisões — achatar tudo em "decisão" cansaria a
--               cerimonialista depois de muitos eventos.
--   GUIA      = perguntas que ajudam a DECIDIR (não subtarefa; ajuda a
--               pensar, não a executar). Pendura na decisão.
--
-- TAREFA (execução administrativa) NÃO entra aqui: é gerada quando uma
-- decisão é tomada, e isso vem na etapa seguinte. Aqui só a árvore.
--
-- Template vs instância:
--   metodo_*  = Playbook da empresa, editável, reutilizável por tipo de
--               evento. O método da Gio é só o seed inicial, não verdade fixa.
--   evento_*  = a árvore instanciada no evento real, com estado próprio.
--               Snapshot: editar o template depois não altera eventos já
--               criados.
--
-- offset_ideal_dias e prioridade são DOIS campos separados de propósito:
-- num casal de prazo curto o offset não cabe, mas a prioridade não muda
-- (fechar buffet segue sendo o mais importante). A compressão futura
-- redistribui pela prioridade ignorando o offset que não cabe — fundir os
-- dois tornaria isso impossível.

-- ============================================================
-- 1) TEMPLATE (Playbook da empresa)
-- ============================================================

create table if not exists public.metodo_objetivo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo_evento public.tipo_evento_catalogo not null,
  -- chave natural do seed: idempotência e vínculo com as decisões.
  codigo      text not null,
  nome        text not null,
  descricao   text,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, tipo_evento, codigo)
);

create table if not exists public.metodo_decisao (
  id          uuid primary key default gen_random_uuid(),
  objetivo_id uuid not null references public.metodo_objetivo (id) on delete cascade,
  -- denormalizado para a RLS por empresa não precisar de join.
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  codigo      text not null,
  titulo      text not null,
  descricao   text,
  responsavel text not null default 'ambos'
              check (responsavel in ('noivos', 'cerimonialista', 'ambos')),
  -- dias antes do evento sugeridos pelo método; pode ser null.
  offset_ideal_dias int,
  -- posição na cadeia de importância; MAIOR = mais importante. Separado do
  -- offset (ver cabeçalho).
  prioridade  int not null default 0,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.metodo_guia (
  id          uuid primary key default gen_random_uuid(),
  decisao_id  uuid not null references public.metodo_decisao (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  texto       text not null,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_metodo_objetivo_empresa
  on public.metodo_objetivo (empresa_id, tipo_evento, ordem);
create index if not exists idx_metodo_decisao_objetivo
  on public.metodo_decisao (objetivo_id, ordem);
create index if not exists idx_metodo_guia_decisao
  on public.metodo_guia (decisao_id, ordem);

-- ============================================================
-- 2) INSTÂNCIA (a árvore do evento real)
-- ============================================================

create table if not exists public.evento_objetivo (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid,
  objetivo_template_id uuid references public.metodo_objetivo (id) on delete set null,
  nome        text not null,
  descricao   text,
  ordem       int not null default 0,
  -- desligar um assunto inteiro (ex.: "Cerimônia religiosa" num civil).
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- instanciação idempotente: um objetivo do template entra uma vez.
  unique (event_id, objetivo_template_id)
);

create table if not exists public.evento_decisao (
  id          uuid primary key default gen_random_uuid(),
  evento_objetivo_id uuid not null references public.evento_objetivo (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid,
  decisao_template_id uuid references public.metodo_decisao (id) on delete set null,
  titulo      text not null,
  descricao   text,
  responsavel text not null default 'ambos'
              check (responsavel in ('noivos', 'cerimonialista', 'ambos')),
  offset_ideal_dias int,
  prioridade  int not null default 0,
  ordem       int not null default 0,
  -- "não se aplica" é ESTADO, não delete: todo casamento nasce com o método
  -- completo e a cerimonialista desliga o que não usa.
  estado      text not null default 'pendente'
              check (estado in ('pendente', 'decidida', 'nao_se_aplica')),
  decidida_em timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (evento_objetivo_id, decisao_template_id)
);

create table if not exists public.evento_guia (
  id          uuid primary key default gen_random_uuid(),
  evento_decisao_id uuid not null references public.evento_decisao (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid,
  texto       text not null,
  ordem       int not null default 0,
  -- "já considerei este ponto" — o guia ajuda a pensar, então basta um tique.
  marcado     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_evento_objetivo_event
  on public.evento_objetivo (event_id, ordem);
create index if not exists idx_evento_decisao_objetivo
  on public.evento_decisao (evento_objetivo_id, ordem);
create index if not exists idx_evento_decisao_event
  on public.evento_decisao (event_id, estado);
create index if not exists idx_evento_guia_decisao
  on public.evento_guia (evento_decisao_id, ordem);

-- empresa_id nas tabelas de instância vem do evento (fill trigger já existe).
drop trigger if exists trg_fill_empresa on public.evento_objetivo;
create trigger trg_fill_empresa before insert on public.evento_objetivo
  for each row execute function public.fill_empresa_from_event();
drop trigger if exists trg_fill_empresa on public.evento_decisao;
create trigger trg_fill_empresa before insert on public.evento_decisao
  for each row execute function public.fill_empresa_from_event();
drop trigger if exists trg_fill_empresa on public.evento_guia;
create trigger trg_fill_empresa before insert on public.evento_guia
  for each row execute function public.fill_empresa_from_event();

-- ============================================================
-- 3) RLS
-- ============================================================
-- Template: leitura para a empresa toda, escrita só da proprietária (é
-- config do Playbook, mesmo padrão de empresa_pacotes). O seed roda por
-- função SECURITY DEFINER, então não esbarra nisto.

alter table public.metodo_objetivo enable row level security;
alter table public.metodo_decisao  enable row level security;
alter table public.metodo_guia      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['metodo_objetivo', 'metodo_decisao', 'metodo_guia'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format($f$
      create policy %I_select on public.%I for select
      using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
    $f$, t, t);

    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all
      using (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
      )
      with check (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
      )
    $f$, t, t);
  end loop;
end $$;

-- Instância: por evento, mesmo padrão das outras tabelas de evento.
alter table public.evento_objetivo enable row level security;
alter table public.evento_decisao  enable row level security;
alter table public.evento_guia      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['evento_objetivo', 'evento_decisao', 'evento_guia'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select using (public.pode_ver_evento(event_id))', t, t);

    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('create policy %I_insert on public.%I for insert with check (public.pode_editar_evento(event_id))', t, t);

    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('create policy %I_update on public.%I for update using (public.pode_editar_evento(event_id)) with check (public.pode_editar_evento(event_id))', t, t);

    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_delete on public.%I for delete using (public.pode_editar_evento(event_id))', t, t);
  end loop;
end $$;

-- ============================================================
-- 4) SEED — método de casamento (Playbook inicial)
-- ============================================================
-- Do metodo-casamento-classificado.md. É só o ponto de partida: a
-- proprietária edita depois. Idempotente por empresa.
--
-- prioridade = proxy da ordem cronológica (12 meses = mais estruturante =
-- prioridade mais alta). Separada do offset de propósito (ver cabeçalho).

create or replace function public.semear_metodo_casamento(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obj record;
  v_dec record;
begin
  if exists (
    select 1 from public.metodo_objetivo
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    return; -- já semeado
  end if;

  -- Objetivos (assunto, ordem)
  insert into public.metodo_objetivo (empresa_id, tipo_evento, codigo, nome, ordem)
  values
    (p_empresa_id, 'casamento', 'estrutura', 'Estrutura e datas', 1),
    (p_empresa_id, 'casamento', 'cerimonia', 'Cerimônia religiosa', 2),
    (p_empresa_id, 'casamento', 'espaco', 'Espaço da festa', 3),
    (p_empresa_id, 'casamento', 'buffet', 'Buffet e bar', 4),
    (p_empresa_id, 'casamento', 'decoracao', 'Decoração e flores', 5),
    (p_empresa_id, 'casamento', 'foto', 'Foto e vídeo', 6),
    (p_empresa_id, 'casamento', 'musica_festa', 'Música e entretenimento', 7),
    (p_empresa_id, 'casamento', 'noiva', 'Vestido e beleza', 8),
    (p_empresa_id, 'casamento', 'convidados', 'Convidados e papelaria', 9),
    (p_empresa_id, 'casamento', 'lua_mel', 'Núpcias e lua de mel', 10),
    (p_empresa_id, 'casamento', 'final', 'Preparação final', 11),
    (p_empresa_id, 'casamento', 'semana', 'Semana do casamento', 12);

  -- Decisões (objetivo, codigo, titulo, responsavel, offset_dias, prioridade, ordem)
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel, offset_ideal_dias, prioridade, ordem)
  select o.id, p_empresa_id, d.codigo, d.titulo, d.responsavel, d.off, d.prio, d.ord
  from public.metodo_objetivo o
  join (values
    ('estrutura','data','Definir a data do casamento','noivos',360,120,1),
    ('estrutura','formato','Definir o formato do casamento','noivos',360,120,2),
    ('estrutura','convidados_num','Definir o número de convidados','noivos',360,120,3),
    ('estrutura','budget','Levantar o budget do casamento','noivos',360,120,4),
    ('cerimonia','igreja','Escolher a igreja','noivos',360,120,1),
    ('cerimonia','grupo_musica','Escolher e contratar o grupo de música da cerimônia','ambos',210,70,2),
    ('cerimonia','celebrante','Escolher e contratar o celebrante','ambos',270,90,3),
    ('cerimonia','leituras','Escolher leituras e salmos','noivos',180,60,4),
    ('cerimonia','musicas_cerimonia','Definir as músicas da cerimônia','noivos',180,60,5),
    ('espaco','espaco','Escolher e contratar o espaço da festa','ambos',330,110,1),
    ('buffet','buffet','Escolher e contratar o buffet','ambos',330,110,1),
    ('buffet','bar','Escolher e contratar o bar de drinks','ambos',270,90,2),
    ('decoracao','decoracao','Escolher e contratar a decoração (igreja e recepção)','ambos',240,80,1),
    ('foto','fotografo','Escolher e contratar o fotógrafo','ambos',240,80,1),
    ('foto','cinegrafista','Escolher e contratar o cinegrafista','ambos',240,80,2),
    ('musica_festa','banda_dj','Escolher e contratar a banda e/ou DJ','ambos',210,70,1),
    ('musica_festa','entretenimento','Escolher e contratar o entretenimento da festa','ambos',120,40,2),
    ('noiva','vestido','Escolher o vestido','noivos',300,100,1),
    ('noiva','dia_noiva','Escolher e contratar o dia da noiva','ambos',180,60,2),
    ('convidados','lista_nominal','Confirmar a lista nominal de convidados','noivos',240,80,1),
    ('convidados','papelaria','Escolher convites e papelaria','noivos',180,60,2),
    ('convidados','padrinhos','Convidar padrinhos, damas e pajens','noivos',180,60,3),
    ('convidados','trajes_pajens','Alugar as roupas de pajens e damas','noivos',150,50,4),
    ('lua_mel','nupcias','Reservar a hospedagem das núpcias','noivos',120,40,1),
    ('lua_mel','lua_mel','Escolher o destino da lua de mel','noivos',120,40,2),
    ('final','pendencias','Fechar contratações que faltaram','ambos',30,10,1),
    ('final','roteiro','Montar o roteiro e o cronograma do dia','cerimonialista',21,7,2),
    ('semana','equipe_cerimonial','Organizar a equipe de cerimonial da semana','cerimonialista',7,3,1)
  ) as d(obj, codigo, titulo, responsavel, off, prio, ord)
    on o.codigo = d.obj
  where o.empresa_id = p_empresa_id and o.tipo_evento = 'casamento';

  -- Guias (perguntas que ajudam a decidir), por decisão.
  insert into public.metodo_guia (decisao_id, empresa_id, texto, ordem)
  select dec.id, p_empresa_id, g.texto, g.ord
  from public.metodo_decisao dec
  join (values
    ('formato','Cerimônia e recepção no mesmo local?',1),
    ('formato','Ambientes separados para cerimônia e festa?',2),
    ('formato','Qual a duração prevista da recepção?',3),
    ('formato','Terá cortejo/entrada religiosa?',4),
    ('convidados_num','Quantos convidados cabem no orçamento?',1),
    ('convidados_num','O espaço comporta esse número?',2),
    ('budget','Qual o valor total disponível?',1),
    ('budget','Qual a margem de reserva para imprevistos?',2),
    ('budget','Quais são as prioridades de gasto do casal?',3),
    ('igreja','Preferências do casal (paróquia, estilo)?',1),
    ('igreja','Localização e deslocamento até a recepção?',2),
    ('igreja','Quais as regras da igreja?',3),
    ('igreja','Disponibilidade do padre na data?',4),
    ('igreja','A igreja está em obras?',5),
    ('igreja','Taxa e documentação exigidas?',6),
    ('celebrante','Disponibilidade na data?',1),
    ('celebrante','Estilo da celebração combina com o casal?',2),
    ('celebrante','Reunião de alinhamento realizada?',3),
    ('grupo_musica','Coral, instrumental ou os dois?',1),
    ('grupo_musica','Repertório aprovado pelo casal?',2),
    ('grupo_musica','Teste de som no local?',3),
    ('leituras','Quais leituras da cerimônia?',1),
    ('leituras','Quais salmos?',2),
    ('leituras','Quem lê cada trecho?',3),
    ('musicas_cerimonia','Entrada da noiva',1),
    ('musicas_cerimonia','Entrada dos padrinhos',2),
    ('musicas_cerimonia','Momentos da liturgia',3),
    ('musicas_cerimonia','Saída dos noivos',4),
    ('espaco','Visita técnica realizada?',1),
    ('espaco','Data e horário no contrato?',2),
    ('espaco','Horário de entrada dos fornecedores?',3),
    ('espaco','Horário de desmontagem?',4),
    ('espaco','Gerador disponível?',5),
    ('espaco','ECAD por conta de quem?',6),
    ('espaco','Cláusulas de cancelamento?',7),
    ('espaco','Capacidade x nº de convidados?',8),
    ('espaco','Estacionamento e acessibilidade?',9),
    ('espaco','Plano B de chuva?',10),
    ('buffet','Degustação realizada?',1),
    ('buffet','Cardápio fechado?',2),
    ('buffet','Proporção de garçons por convidado?',3),
    ('buffet','Bebidas inclusas?',4),
    ('buffet','Taxa de serviço?',5),
    ('bar','Degustação realizada?',1),
    ('bar','Carta de drinks definida?',2),
    ('bar','Opção sem álcool?',3),
    ('bar','Estrutura e bartenders?',4),
    ('decoracao','Briefing entregue?',1),
    ('decoracao','Moodboard aprovado?',2),
    ('decoracao','Decoração da igreja',3),
    ('decoracao','Decoração da recepção',4),
    ('decoracao','Flores e arranjos',5),
    ('decoracao','Iluminação cênica',6),
    ('fotografo','Estilo do portfólio combina?',1),
    ('fotografo','Prazo e formato de entrega?',2),
    ('fotografo','Making of incluso?',3),
    ('fotografo','Ensaio pré-wedding?',4),
    ('cinegrafista','Estilo do vídeo?',1),
    ('cinegrafista','Same day edit?',2),
    ('cinegrafista','Prazo de entrega?',3),
    ('cinegrafista','Uso de drone?',4),
    ('banda_dj','Banda, DJ ou os dois?',1),
    ('banda_dj','Repertório alinhado?',2),
    ('banda_dj','Estrutura de som e luz?',3),
    ('vestido','Estilo desejado?',1),
    ('vestido','Ateliê ou aluguel?',2),
    ('vestido','Prazo de confecção e provas?',3),
    ('vestido','Sapatos escolhidos?',4),
    ('dia_noiva','Cabelo e maquiagem definidos?',1),
    ('dia_noiva','Teste realizado?',2),
    ('dia_noiva','Equipe e horário no dia?',3),
    ('lista_nominal','Nomes e acompanhantes?',1),
    ('lista_nominal','RSVP em andamento?',2),
    ('lista_nominal','Restrições alimentares?',3),
    ('papelaria','Convite e save the date?',1),
    ('papelaria','Cardápio e plaquinhas?',2),
    ('papelaria','Lembrancinhas?',3),
    ('padrinhos','Lista de padrinhos fechada?',1),
    ('padrinhos','Damas e pajens?',2),
    ('padrinhos','Trajes e orientações?',3),
    ('trajes_pajens','Lojas indicadas?',1),
    ('trajes_pajens','Medidas e provas?',2),
    ('trajes_pajens','Retirada e devolução?',3),
    ('nupcias','Hotel e suíte?',1),
    ('nupcias','Check-in pós-festa?',2),
    ('lua_mel','Destino e período?',1),
    ('lua_mel','Documentação e vistos?',2),
    ('lua_mel','Reservas confirmadas?',3),
    ('pendencias','Algum fornecedor faltando?',1),
    ('pendencias','Todos os pagamentos em dia?',2),
    ('roteiro','Linha do tempo minuto a minuto?',1),
    ('roteiro','Responsáveis por cada etapa?',2),
    ('roteiro','Ordem de entrada definida?',3),
    ('equipe_cerimonial','Escala da equipe do dia?',1),
    ('equipe_cerimonial','Grupos de WhatsApp criados?',2),
    ('equipe_cerimonial','Roteiros impressos?',3),
    ('equipe_cerimonial','Ensaio na igreja agendado?',4)
  ) as g(dec, texto, ord)
    on dec.codigo = g.dec
  where dec.empresa_id = p_empresa_id;
end $$;

-- Semeia as empresas que já existem.
do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_metodo_casamento(e.id);
  end loop;
end $$;

-- E as futuras, no mesmo gatilho de nova empresa (ao lado do seed de
-- conteúdo institucional).
create or replace function public.trg_semear_metodo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_metodo_casamento(new.id);
  return new;
end $$;

drop trigger if exists trg_semear_metodo on public.empresas;
create trigger trg_semear_metodo
  after insert on public.empresas
  for each row execute function public.trg_semear_metodo_empresa();

