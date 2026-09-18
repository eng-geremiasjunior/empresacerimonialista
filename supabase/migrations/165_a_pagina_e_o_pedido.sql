-- ============================================================
-- 165 — A página da cerimonialista e o pedido de orçamento
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- COMO APLICAR. Cole o arquivo INTEIRO e execute. Tudo, da primeira à
-- última alteração, roda numa transação só: ou entra tudo, ou nada muda.
-- Se aparecer erro, nada ficou pela metade — corrija e cole de novo. No
-- fim vem a conferência: todas as linhas devem voltar `true`.
--
-- REVISADA EM 16/09/2026. A primeira versão desta migração foi aplicada
-- em 15/09 e depois passou por dois revisores céticos (segurança e
-- correção), que acharam dezesseis problemas. Esta versão corrige todos.
-- Reaplicar por cima da primeira é o caminho: nada é apagado, as funções
-- são trocadas, e o que faltava é acrescentado. Não houve exposição no
-- intervalo: sem página publicada, as funções públicas não fazem nada.
--
-- 16/09/2026, à tarde: a leitura pública passa a entregar também o tipo
-- de evento de cada depoimento marcado para a página (o desenho novo da
-- vitrine põe em destaque o depoimento do tipo que a pessoa escolhe no
-- formulário). É conteúdo que ela já publica; nada mais sai. Reaplicar
-- o arquivo inteiro troca só a função.
--
-- 16/09/2026, fim da tarde: a vitrine ganha o pixel da Meta DELA
-- (empresa_pagina.pixel_meta, só números). A leitura pública passa a
-- entregar o número — que de qualquer forma iria para o código da
-- página —, e o navegador só carrega o pixel na vitrine publicada, para
-- quem não é da casa, depois de a pessoa permitir.
--
-- 16/09/2026, noite: a vitrine ganha o segundo modelo (Capítulos). A
-- escolha mora em empresa_pagina.modelo ('classico' ou 'capitulos'); os
-- dados são os mesmos nos dois, só a forma muda. A leitura pública passa
-- a entregar o nome do modelo.
--
-- 18/09/2026: o terceiro modelo (Curadoria), com menu lateral, e o
-- RETRATO dela (empresa_pagina.retrato_url): a foto dela ou da equipe,
-- separada da logo, que dá rosto ao bloco "Quem assina". O retrato só
-- aceita arquivo do balde de fotos, na pasta da própria empresa — nenhum
-- endereço de fora entra na página pública. A leitura pública passa a
-- entregá-lo.
--
-- 18/09/2026, fim da tarde: a PALETA (empresa_pagina.paleta). Poucas
-- cores prontas, a mesma lista nos três modelos (decisão do dono: nada de
-- escolher cor livre). O banco guarda só o nome; as cores moram no
-- código. A leitura pública passa a entregá-la.
--
-- O QUE ESTA MIGRAÇÃO ABRE. Hoje a proposta só nasce se a cerimonialista
-- digitar o contato: quem a procura pelo Instagram cai num WhatsApp que
-- ela responde à mão, e nada disso entra no sistema. Esta é a porta que
-- faltava antes da proposta:
--
--   Página pública → Pedido de orçamento → Proposta → Aceite → Contrato → Evento
--
-- A regra que governa tudo aqui é a mesma do resto do produto: ela não
-- alimenta um CRM, ela vê o que o sistema percebeu. Por isso não existe
-- "lead", não existe etapa para arrastar e não existe campo de status
-- para ela manter. O pedido nasce do formulário e sai da fila quando ela
-- responde com uma proposta ou o encerra (a tela que faz isso vem logo
-- depois desta migração; as colunas já estão aqui).
--
-- QUATRO TABELAS, E A FRONTEIRA ENTRE ELAS É A PESSOA:
--
--   empresa_pagina        — a página dela (1 por empresa). Conteúdo que
--                           ela escreve; nada de cliente, nada de preço.
--   empresa_pagina_slug   — o endereço, com memória. Molde de site_slugs
--                           (128): trocar o endereço NÃO quebra o link
--                           que ela já mandou — o antigo redireciona para
--                           sempre, e nunca é tomado por outra empresa.
--   pedido_orcamento      — o CONTATO IDENTIFICADO: nome, WhatsApp, o
--                           evento que ele quer. Dado pessoal de terceiro.
--                           A cerimonialista é a controladora; o eOrganizei,
--                           o operador. Base legal: art. 7º, V da LGPD
--                           (procedimentos preliminares a um contrato, a
--                           pedido do próprio titular). Prazo: 24 meses
--                           depois de encerrado, escrito na política de
--                           privacidade. A dona pode apagar a qualquer hora.
--   pagina_publica_metrica— o VISITANTE ANÔNIMO, agregado por dia. Conta
--                           visita, clique no WhatsApp, clique no
--                           Instagram e pedido. NÃO guarda IP, cookie,
--                           agente nem identificador de visitante.
--
-- O QUE O SISTEMA PASSA A AFIRMAR — e só isso. Clique no WhatsApp é
-- CLIQUE, não mensagem enviada: ninguém aqui sabe se a conversa começou.
-- Visita é "o navegador carregou e executou", como na 155 — robô de
-- prévia de link não conta. Nenhuma linha desta migração afirma que
-- alguém leu, recebeu ou respondeu alguma coisa.
--
-- NADA VAI PARA A RUA SEM ELA ESCOLHER. Fotos do portfólio e depoimentos
-- já existiam para a proposta, que é uma peça atrás de um link secreto.
-- A página é aberta ao mundo e ao Google: por isso cada foto e cada
-- depoimento ganha a própria marca `na_pagina`, desligada por padrão.
-- Publicar a página não publica nada que ela não tenha marcado.
--
-- DUAS PORTAS PÚBLICAS, COM PERMISSÕES DIFERENTES:
--   pagina_publica / registrar_toque_pagina  → anon executa (leitura da
--     página publicada e um contador que não devolve nada).
--   registrar_pedido_publico                 → SÓ service_role. Quem
--     grava dado pessoal é o servidor, depois dos freios da rota
--     (honeypot, tempo mínimo, teto por IP). O navegador não alcança.
--
-- Nada aqui cria evento, tarefa, fase ou cliente. O único gatilho novo em
-- `orcamentos` só carimba a data de envio: não mexe no aceite, na recusa,
-- na expiração nem na geração do evento (conferido caminho por caminho).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) Duas réguas: o telefone e a campanha
-- ------------------------------------------------------------
-- A pessoa digita "(62) 99999-8888", "+55 62 99999 8888" ou
-- "5562999998888". Guardar o que ela digitou faria a deduplicação (e o
-- encontro com a cliente já cadastrada) depender da máscara. Aqui sai
-- sempre só dígito, sem o código do país: 10 (fixo) ou 11 (celular).
-- O 55 só sai quando sobram 12 ou 13 dígitos: 55 também é DDD (Santa
-- Maria), e "(55) 99999-8888" continua intacto.
create or replace function public.normalizar_whatsapp(p_texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
           when s.digitos is null then null
           when length(s.digitos) in (12, 13) and left(s.digitos, 2) = '55'
             then right(s.digitos, length(s.digitos) - 2)
           else s.digitos
         end
  from (
    select nullif(regexp_replace(coalesce(p_texto, ''), '\D', '', 'g'), '') as digitos
  ) s;
$$;

comment on function public.normalizar_whatsapp(text) is
  'Só dígitos, sem o 55 do país. Régua única para comparar telefone no pedido, na deduplicação e no encontro com a cliente já cadastrada. Executável por qualquer um de propósito: não lê tabela nenhuma e só devolve o que recebeu.';

-- A campanha vem da URL, e a URL é de quem chega: qualquer pessoa com a
-- chave publicável podia escrever texto à vontade num campo que faz
-- parte da CHAVE PRIMÁRIA do contador (uma linha nova a cada valor
-- diferente) e que aparece no painel dela. Aqui ela vira um símbolo
-- curto: minúsculas, dígitos, espaço, ponto, hífen e sublinhado.
create or replace function public.campanha_limpa(p_texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select left(
           trim(regexp_replace(lower(coalesce(p_texto, '')), '[^a-z0-9 ._-]', '', 'g')),
           40);
$$;

comment on function public.campanha_limpa(text) is
  'Normaliza utm vindo da URL: minúsculas e só símbolos seguros, 40 caracteres. Protege a chave do contador e o que aparece no painel. Executável por qualquer um de propósito: não lê tabela nenhuma.';

-- ------------------------------------------------------------
-- 1) A PÁGINA
-- ------------------------------------------------------------
create table if not exists public.empresa_pagina (
  empresa_id      uuid primary key references public.empresas (id) on delete cascade,

  -- ESPELHO do endereço atual. Quem escreve é só a função
  -- definir_slug_pagina; o gatilho abaixo sobrescreve qualquer valor que
  -- chegue por outro caminho (inclusive pela API direto).
  slug            text unique,

  publicada       boolean not null default false,
  publicada_em    timestamptz,

  -- o que ela escreve
  titulo          text,
  posicionamento  text,
  para_quem       text,
  cidade          text,
  tipos_atendidos text[]  not null default '{}',
  servicos        jsonb   not null default '[]'::jsonb
                  check (jsonb_typeof(servicos) = 'array'),
  motivos         text[]  not null default '{}',
  whatsapp        text,
  instagram       text,

  atualizado_por  uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.empresa_pagina is
  'A página pública da cerimonialista. Só conteúdo que ela escolhe publicar: nunca preço, cliente, proposta ou dado da equipe.';
comment on column public.empresa_pagina.slug is
  'Espelho do endereço atual (empresa_pagina_slug). Só definir_slug_pagina muda; o gatilho descarta qualquer outro valor. Trocar não quebra link enviado: o anterior continua redirecionando.';

-- limites de tamanho como CHECK (declarativo e conferível); o resto da
-- validação — tipos, serviços, motivos, telefone, gate de publicação —
-- fica no gatilho, porque depende de conteúdo
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'empresa_pagina_textos_check'
      and conrelid = 'public.empresa_pagina'::regclass
  ) then
    alter table public.empresa_pagina
      add constraint empresa_pagina_textos_check
      check (
        length(coalesce(titulo, '')) <= 80
        and length(coalesce(posicionamento, '')) <= 400
        and length(coalesce(para_quem, '')) <= 160
        and length(coalesce(cidade, '')) <= 80
        and length(coalesce(instagram, '')) <= 40
      );
  end if;
end $$;

-- O pixel da Meta DELA. Só o número: código colado nunca entra (abriria a
-- página para qualquer script de terceiro).
alter table public.empresa_pagina add column if not exists pixel_meta text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'empresa_pagina_pixel_check'
      and conrelid = 'public.empresa_pagina'::regclass
  ) then
    alter table public.empresa_pagina
      add constraint empresa_pagina_pixel_check
      check (pixel_meta is null or pixel_meta ~ '^[0-9]{10,20}$');
  end if;
end $$;

comment on column public.empresa_pagina.pixel_meta is
  'ID do pixel da Meta da cerimonialista, só dígitos. A vitrine publicada só o carrega depois que o visitante permite; nunca na prévia, para a casa ou em página com credencial.';

-- O modelo da vitrine: o desenho que a página usa. A lista é recriada a
-- cada aplicação, para um modelo novo entrar sem outro ALTER à mão.
alter table public.empresa_pagina add column if not exists modelo text not null default 'classico';
alter table public.empresa_pagina drop constraint if exists empresa_pagina_modelo_check;
alter table public.empresa_pagina
  add constraint empresa_pagina_modelo_check
  check (modelo in ('classico', 'capitulos', 'curadoria'));

comment on column public.empresa_pagina.modelo is
  'O desenho da vitrine: classico (foto de abertura, depoimento na faixa escura), capitulos (caderno numerado, formulário em ficha) ou curadoria (menu lateral, retrato, portfólio com filtro). Os mesmos campos nos três.';

-- O retrato: foto dela ou da equipe, separada da logo. Só do balde de
-- fotos e só da pasta da própria empresa — a página pública não carrega
-- imagem de endereço de fora (rastreador, conteúdo de terceiro).
alter table public.empresa_pagina add column if not exists retrato_url text;
alter table public.empresa_pagina drop constraint if exists empresa_pagina_retrato_check;
alter table public.empresa_pagina
  add constraint empresa_pagina_retrato_check
  check (
    retrato_url is null
    or (char_length(retrato_url) <= 400
        and retrato_url ~ '^https://[a-z0-9.-]+/storage/v1/object/public/portfolio-fotos/'
        and position(('/portfolio-fotos/' || empresa_id::text || '/') in retrato_url) > 0)
  );

comment on column public.empresa_pagina.retrato_url is
  'O retrato dela ou da equipe (modelo Curadoria). Só arquivo do balde portfolio-fotos, na pasta da empresa.';

-- A paleta: poucas cores prontas, as mesmas nos três modelos. A lista é
-- recriada a cada aplicação, como a do modelo.
alter table public.empresa_pagina add column if not exists paleta text not null default 'original';
alter table public.empresa_pagina drop constraint if exists empresa_pagina_paleta_check;
alter table public.empresa_pagina
  add constraint empresa_pagina_paleta_check
  check (paleta in ('original', 'rose', 'dourado', 'azul', 'grafite'));

comment on column public.empresa_pagina.paleta is
  'A cor de destaque da vitrine: original (a do modelo), rose, dourado, azul ou grafite. As cores moram no código (lib/comercial/paletas.ts).';

alter table public.empresa_pagina enable row level security;

-- A página é da dona. Coordenadora não edita: é a cara da empresa lá
-- fora, no mesmo lugar onde moram o contrato e o Catálogo (045).
drop policy if exists empresa_pagina_proprietaria on public.empresa_pagina;
create policy empresa_pagina_proprietaria
  on public.empresa_pagina
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 2) O ENDEREÇO, COM MEMÓRIA
-- ------------------------------------------------------------
-- Molde de site_slugs (128). O link vai para a bio do Instagram, para o
-- cartão e para o WhatsApp de gente que ela nem conhece ainda: trocar o
-- endereço não pode matar o que já está circulando.
create table if not exists public.empresa_pagina_slug (
  slug       text primary key,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  atual      boolean not null default true,
  created_at timestamptz not null default now()
);

-- um único endereço ATUAL por empresa; os demais redirecionam
create unique index if not exists uq_empresa_pagina_slug_atual
  on public.empresa_pagina_slug (empresa_id) where atual;

alter table public.empresa_pagina_slug enable row level security;

drop policy if exists empresa_pagina_slug_select on public.empresa_pagina_slug;
create policy empresa_pagina_slug_select
  on public.empresa_pagina_slug
  for select using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  );
-- escrita só pelas funções definir_slug_pagina e liberar_slug_pagina

-- ------------------------------------------------------------
-- 3) O PEDIDO DE ORÇAMENTO (contato identificado)
-- ------------------------------------------------------------
create table if not exists public.pedido_orcamento (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,

  -- por onde entrou. 'pagina_publica' é o único que esta migração grava;
  -- os outros ficam reservados para a etapa 2 (pedir contato dentro da
  -- proposta, anotação à mão) sem exigir outro ALTER depois.
  canal          text not null default 'pagina_publica'
                 check (canal in ('pagina_publica', 'proposta', 'manual', 'outro')),
  -- de onde a pessoa chegou à página. Lista fechada: o que não casa vira
  -- 'outro', e sem referência nem utm é 'direto'.
  origem_acesso  text not null default 'direto'
                 check (origem_acesso in ('instagram', 'facebook', 'google',
                                          'whatsapp', 'direto', 'outro')),
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,

  -- quem é e o que quer
  nome           text not null,
  whatsapp       text not null,
  email          text,
  tipo_evento    public.tipo_evento_catalogo not null,
  data_evento    date,          -- null = "ainda não sei"
  cidade         text,
  convidados     int check (convidados is null or convidados between 1 and 5000),
  mensagem       text,
  repeticoes     int not null default 0,

  -- informativo: a cliente já cadastrada com o mesmo número. NÃO cria
  -- cliente e NÃO decide deduplicação — quem fechou um casamento em 2024
  -- pode pedir orçamento de outra festa hoje, e isso é um pedido novo.
  client_id      uuid references public.clients (id) on delete set null,

  status         text not null default 'novo'
                 check (status in ('novo', 'em_proposta', 'encerrado')),
  orcamento_id   uuid references public.orcamentos (id) on delete set null,
  respondido_em  timestamptz,
  encerrado_em   timestamptz,
  motivo_encerramento text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.pedido_orcamento is
  'Quem pediu orçamento pela página pública. Dado pessoal de terceiro, tratado com base no art. 7º, V da LGPD (procedimentos preliminares a contrato, a pedido do titular): a cerimonialista é a controladora, o eOrganizei o operador. Nunca sai por função pública. Retenção: 24 meses depois de encerrado (política de privacidade); a proprietária pode apagar antes.';
comment on column public.pedido_orcamento.repeticoes is
  'Quantas vezes o mesmo contato reenviou o formulário para o MESMO evento (teto de 5). Cada reenvio anexa a mensagem com a data; quando o campo enche, é o texto mais ANTIGO que cai.';
comment on column public.pedido_orcamento.client_id is
  'Cliente já cadastrada com o mesmo WhatsApp, quando existe. É aviso na tela ("cliente já cadastrada"), não vínculo de negócio.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pedido_orcamento_textos_check'
      and conrelid = 'public.pedido_orcamento'::regclass
  ) then
    alter table public.pedido_orcamento
      add constraint pedido_orcamento_textos_check
      check (
        length(nome) between 2 and 80
        and whatsapp ~ '^[0-9]{10,11}$'
        and length(coalesce(email, '')) <= 120
        and length(coalesce(cidade, '')) <= 80
        -- 2000 e não 500: cada reenvio ANEXA a mensagem nova à anterior
        and length(coalesce(mensagem, '')) <= 2000
        and length(coalesce(motivo_encerramento, '')) <= 200
        and length(coalesce(utm_source, '')) <= 80
        and length(coalesce(utm_medium, '')) <= 80
        and length(coalesce(utm_campaign, '')) <= 80
      );
  end if;
end $$;

create index if not exists idx_pedido_orcamento_fila
  on public.pedido_orcamento (empresa_id, status, created_at desc);
-- serve ao ramo de igualdade da deduplicação (telefone inteiro)
create index if not exists idx_pedido_orcamento_contato
  on public.pedido_orcamento (empresa_id, whatsapp);

alter table public.pedido_orcamento enable row level security;

-- Quem responde, vê. Assistente fica de fora pela mesma régua da 124:
-- contato com cliente é dado comercial, não operacional.
drop policy if exists pedido_orcamento_select on public.pedido_orcamento;
create policy pedido_orcamento_select
  on public.pedido_orcamento
  for select using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );

-- Update para responder e encerrar. Coordenadora e cerimonialista também
-- conseguem corrigir nome e telefone: é dentro da própria empresa, e é o
-- que acontece quando a pessoa digita o número errado.
drop policy if exists pedido_orcamento_update on public.pedido_orcamento;
create policy pedido_orcamento_update
  on public.pedido_orcamento
  for update
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  );

-- Apagar é da dona: é ela a controladora, e é ela quem responde a um
-- pedido de exclusão do titular. Sem INSERT por sessão: quem grava
-- pedido é a porta pública, pelo servidor.
drop policy if exists pedido_orcamento_delete on public.pedido_orcamento;
create policy pedido_orcamento_delete
  on public.pedido_orcamento
  for delete using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 4) O VISITANTE ANÔNIMO, AGREGADO POR DIA
-- ------------------------------------------------------------
-- Uma linha por (empresa, dia, origem, campanha) com quatro contadores.
-- Não existe linha por visita, e é de propósito: para responder "a
-- página traz gente?" basta o total do dia, e uma linha por visita seria
-- um rastro de pessoas que ninguém pediu para guardar.
--
-- Ressalva que precisa ficar escrita: a estrutura não identifica
-- ninguém, mas o USO pode. Se a cerimonialista mandar um link com
-- campanha diferente para cada pessoa ("?utm_campaign=ana-silva"), a
-- linha daquele dia passa a dizer de quem é. A tela não deve sugerir
-- esse uso.
create table if not exists public.pagina_publica_metrica (
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  dia              date not null,
  origem_acesso    text not null default 'direto'
                   check (origem_acesso in ('instagram', 'facebook', 'google',
                                            'whatsapp', 'direto', 'outro')),
  campanha         text not null default '',
  page_view        int not null default 0,
  whatsapp_click   int not null default 0,
  instagram_click  int not null default 0,
  pedido_enviado   int not null default 0,
  primary key (empresa_id, dia, origem_acesso, campanha)
);

comment on table public.pagina_publica_metrica is
  'Contadores por dia da página pública. Nenhuma coluna identifica visitante: sem IP, sem cookie, sem navegador. Clique no WhatsApp é clique, não mensagem enviada. A rota manda a MESMA origem e campanha na visita e no pedido, para as duas contas caírem na mesma linha.';

alter table public.pagina_publica_metrica enable row level security;

drop policy if exists pagina_metrica_select on public.pagina_publica_metrica;
create policy pagina_metrica_select
  on public.pagina_publica_metrica
  for select using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
  );
-- nenhuma policy de escrita: só registrar_toque_pagina e
-- registrar_pedido_publico (security definer) incrementam

-- ------------------------------------------------------------
-- 5) A PROPOSTA GANHA DE ONDE VEIO E QUANDO SAIU
-- ------------------------------------------------------------
alter table public.orcamentos add column if not exists pedido_id uuid
  references public.pedido_orcamento (id) on delete set null;
alter table public.orcamentos add column if not exists canal text not null default 'manual';
-- enviado_em: hoje a data em que a proposta foi ENVIADA se perde (só há
-- data_criacao). É o relógio de "sem resposta há N dias" e o denominador
-- da taxa de aceite por período, na etapa 2. Sem backfill: para as
-- antigas a tela continua usando data_criacao.
alter table public.orcamentos add column if not exists enviado_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orcamentos_canal_check'
      and conrelid = 'public.orcamentos'::regclass
  ) then
    alter table public.orcamentos
      add constraint orcamentos_canal_check
      check (canal in ('manual', 'pagina_publica', 'proposta', 'outro'));
  end if;
end $$;

comment on column public.orcamentos.canal is
  'Por onde a negociação entrou. Herdado do pedido quando a proposta nasce de um; "manual" quando ela mesma abriu a proposta.';
comment on column public.orcamentos.enviado_em is
  'Quando a proposta foi enviada à cliente. Nulo nas anteriores à 165.';

create index if not exists idx_orcamentos_enviado
  on public.orcamentos (empresa_id, status, enviado_em desc);
create index if not exists idx_orcamentos_pedido
  on public.orcamentos (pedido_id) where pedido_id is not null;

-- ------------------------------------------------------------
-- 6) O SINO ACEITA O PEDIDO
-- ------------------------------------------------------------
-- Lista completa da 101 + o novo (mesmo molde: superconjunto, nenhum
-- tipo já gravado sai).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor',
    'orcamento_aprovado', 'orcamento_recusado', 'compromisso',
    'portal', 'orcamento_comentario', 'pedido_orcamento'
  ));

-- ------------------------------------------------------------
-- 7) FOTOS E DEPOIMENTOS: O QUE VAI PARA A RUA É ESCOLHA DELA
-- ------------------------------------------------------------
-- `ativo` nasceu (046, 053) significando "aparece na proposta", que só
-- quem tem o link secreto abre. A página é aberta ao mundo e ao Google,
-- e um depoimento carrega o nome de uma cliente real. Marca própria,
-- desligada: a página só mostra o que ela marcar.
alter table public.portfolio_fotos
  add column if not exists na_pagina boolean not null default false;
alter table public.empresa_depoimentos
  add column if not exists na_pagina boolean not null default false;

comment on column public.portfolio_fotos.na_pagina is
  'A foto aparece na página pública (aberta ao mundo). Independente de ativo, que vale para a proposta.';
comment on column public.empresa_depoimentos.na_pagina is
  'O depoimento aparece na página pública (aberta ao mundo). Independente de ativo, que vale para a proposta.';

-- O balde nasceu (046) sem limite de tamanho nem lista de tipos: o
-- aplicativo comprime antes de subir, mas quem tem a chave publicável
-- pode chamar a API do storage direto. O teto é do balde, não da tela.
-- A lista inclui HEIC, GIF e AVIF porque o aplicativo sobe o arquivo
-- original quando não consegue comprimir — fechar esses tipos quebraria
-- upload de foto de iPhone que funciona hoje.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                                  'image/heic', 'image/heif', 'image/gif',
                                  'image/avif']
 where id = 'portfolio-fotos';

-- ============================================================
-- 8) GATILHOS DE INTEGRIDADE
-- ============================================================
-- Funções de gatilho ficam executáveis por PUBLIC (padrão do Postgres),
-- e não é buraco: a API não chama função que devolve `trigger`.

create or replace function public.trg_empresa_pagina_valida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item  jsonb;
  v_texto text;
  v_conta int;
  v_bruto text;
begin
  new.updated_at := now();

  -- O ENDEREÇO É ESPELHO. Sem isto, a policy da página (que é sobre a
  -- linha inteira) deixava a dona gravar qualquer endereço direto pela
  -- API — contornando a lista de reservados e podendo tomar um endereço
  -- que outra empresa aposentou. Venha o que vier, vale o atual da
  -- tabela de endereços, que só as funções escrevem.
  new.slug := (select s.slug
                 from public.empresa_pagina_slug s
                where s.empresa_id = new.empresa_id and s.atual);

  -- telefone na régua única; 10 (fixo) ou 11 (celular). Se ela digitou
  -- alguma coisa que não virou número ("chama no insta"), avisa em vez
  -- de gravar vazio em silêncio.
  v_bruto := new.whatsapp;
  new.whatsapp := public.normalizar_whatsapp(new.whatsapp);
  if coalesce(trim(v_bruto), '') <> ''
     and (new.whatsapp is null or new.whatsapp !~ '^[0-9]{10,11}$') then
    raise exception 'WhatsApp inválido: informe DDD e número';
  end if;

  -- o perfil, e não a URL inteira nem o arroba
  if new.instagram is not null then
    new.instagram := regexp_replace(trim(new.instagram), '^.*instagram\.com/', '');
    new.instagram := regexp_replace(new.instagram, '^@', '');
    new.instagram := nullif(regexp_replace(new.instagram, '[/?].*$', ''), '');
    if new.instagram is not null and new.instagram !~ '^[A-Za-z0-9._]{1,30}$' then
      raise exception 'Instagram inválido: use só o nome do perfil';
    end if;
  end if;

  -- o pixel: só os dígitos do que ela colou ("ID: 1234..." vira o número)
  if new.pixel_meta is not null then
    new.pixel_meta := nullif(regexp_replace(new.pixel_meta, '[^0-9]', '', 'g'), '');
    if new.pixel_meta is not null and new.pixel_meta !~ '^[0-9]{10,20}$' then
      raise exception 'Pixel inválido: use só o número do pixel da Meta';
    end if;
  end if;

  -- tipos de evento: os mesmos 10 do sistema (domínio da 057/132)
  if array_length(new.tipos_atendidos, 1) is not null then
    if array_length(new.tipos_atendidos, 1) > 10 then
      raise exception 'tipos de evento demais';
    end if;
    foreach v_texto in array new.tipos_atendidos loop
      begin
        perform v_texto::public.tipo_evento_catalogo;
      exception when others then
        raise exception 'tipo de evento inválido: %', v_texto;
      end;
    end loop;
  end if;

  -- serviços: até 6, cada um com nome
  if jsonb_array_length(new.servicos) > 6 then
    raise exception 'até 6 serviços na página';
  end if;
  for v_item in select * from jsonb_array_elements(new.servicos) loop
    if coalesce(trim(v_item->>'nome'), '') = '' then
      raise exception 'todo serviço precisa de um nome';
    end if;
    if length(v_item->>'nome') > 60
       or length(coalesce(v_item->>'descricao', '')) > 160 then
      raise exception 'serviço com texto longo demais';
    end if;
  end loop;

  -- motivos para entrar em contato: até 3
  if array_length(new.motivos, 1) is not null then
    if array_length(new.motivos, 1) > 3 then
      raise exception 'até 3 motivos na página';
    end if;
    foreach v_texto in array new.motivos loop
      if length(v_texto) > 120 then
        raise exception 'motivo longo demais';
      end if;
    end loop;
  end if;

  -- O GATE DA PUBLICAÇÃO. Uma página no ar sem telefone é um anúncio sem
  -- telefone: a pessoa lê e não tem como falar com ela. A tela avisa
  -- antes; aqui é a trava que vale mesmo para quem chamar a API direto.
  if new.publicada then
    if new.slug is null then
      raise exception 'defina o endereço da página antes de publicar';
    end if;
    if new.whatsapp is null then
      raise exception 'informe o WhatsApp antes de publicar';
    end if;
    if coalesce(trim(new.posicionamento), '') = '' then
      raise exception 'escreva a apresentação antes de publicar';
    end if;
    select coalesce(array_length(new.tipos_atendidos, 1), 0) into v_conta;
    if v_conta = 0 then
      raise exception 'escolha ao menos um tipo de evento antes de publicar';
    end if;
    if new.publicada_em is null then
      new.publicada_em := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_empresa_pagina_valida on public.empresa_pagina;
create trigger trg_empresa_pagina_valida
  before insert or update on public.empresa_pagina
  for each row execute function public.trg_empresa_pagina_valida();

create or replace function public.trg_pedido_orcamento_datas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'em_proposta' and old.status is distinct from 'em_proposta'
     and new.respondido_em is null then
    new.respondido_em := now();
  end if;
  if new.status = 'encerrado' and old.status is distinct from 'encerrado'
     and new.encerrado_em is null then
    new.encerrado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedido_orcamento_datas on public.pedido_orcamento;
create trigger trg_pedido_orcamento_datas
  before update on public.pedido_orcamento
  for each row execute function public.trg_pedido_orcamento_datas();

-- A proposta carimba a saída sozinha: a ação de enviar existe em mais de
-- um lugar (tela, faixa do rascunho) e nenhum precisa lembrar disso.
-- Dispara em todo update de orcamentos, mas só AGE quando o status passa
-- a ser 'enviado', e nunca levanta erro: aceite, recusa, expiração,
-- geração do evento e contagem de visita passam intactos.
create or replace function public.trg_orcamento_enviado_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'enviado' and old.status is distinct from 'enviado'
     and new.enviado_em is null then
    new.enviado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orcamento_enviado_em on public.orcamentos;
create trigger trg_orcamento_enviado_em
  before update on public.orcamentos
  for each row execute function public.trg_orcamento_enviado_em();

-- ============================================================
-- 9) O ENDEREÇO: DEFINIR, TROCAR E LIBERAR
-- ============================================================
-- Erro volta como json (a tela mostra a frase) em tudo que é decisão de
-- conteúdo. A única exceção é a corrida entre duas trocas ao mesmo
-- tempo, que precisa de `raise` para desfazer o rebaixamento do endereço
-- atual — a tela trata esse caso como "tente de novo".
create or replace function public.definir_slug_pagina(p_slug text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_slug    text := lower(trim(coalesce(p_slug, '')));
  v_empresa uuid;
  v_cargo   text;
  v_atual   text;
begin
  select mc.empresa_id, mc.cargo into v_empresa, v_cargo
  from public.meu_cargo() mc;

  if v_empresa is null or v_cargo <> 'proprietaria' then
    return json_build_object('error', 'só a proprietária define o endereço da página');
  end if;

  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or length(v_slug) < 3 or length(v_slug) > 40 then
    return json_build_object(
      'error', 'endereço inválido: use letras minúsculas, números e hífens (3 a 40)'
    );
  end if;

  -- Reservados: defesa em profundidade, não roteamento — quem separa a
  -- página das rotas do sistema é o prefixo /cerimonialista/. A lista
  -- existe igual em src/lib/comercial/pagina-publica.ts; se a página um
  -- dia for para a raiz do site, as duas precisam ser revistas contra
  -- src/app/ inteiro.
  if v_slug in ('admin', 'api', 'login', 'portal', 'confirmar', 'confirmacao',
                'guia', 'orcamento', 'orcamentos', 'fornecedor', 'fornecedores',
                'agendar', 'eventos', 'ajuda', 'privacidade', 'auth', 'imprimir',
                'convite', 'site', 'www', 'c', 'app', 'nova-senha', 'clientes',
                'cerimonialista', 'cerimonialistas', 'assessoria', 'eorganizei',
                'planos', 'precos', 'suporte', 'contato', 'blog', 'termos',
                'equipe', 'aceite', 'recepcao', 'entrada', 'comecar',
                'criar-conta', 'assinatura', 'financeiro', 'catalogo',
                'agenda', 'calendario', 'configuracoes', 'contratos',
                'solicitacoes', 'tarefas', 'pagina', 'pedido', 'pedidos') then
    return json_build_object('error', 'este endereço é reservado');
  end if;

  select s.slug into v_atual
  from public.empresa_pagina_slug s
  where s.empresa_id = v_empresa and s.atual;

  if v_atual = v_slug then
    return json_build_object('ok', true, 'slug', v_slug);
  end if;

  -- tomado por outra empresa — inclusive um endereço que ela aposentou,
  -- que continua redirecionando e por isso nunca fica livre
  if exists (
    select 1 from public.empresa_pagina_slug s
    where s.slug = v_slug and s.empresa_id <> v_empresa
  ) then
    return json_build_object('error', 'este endereço já está em uso');
  end if;

  -- Teto de cinco endereços por empresa. Como nenhum endereço aposentado
  -- volta a ficar livre, sem teto uma conta só podia reservar milhares de
  -- nomes para sempre. Voltar a um endereço que já foi dela não conta.
  if not exists (
       select 1 from public.empresa_pagina_slug s
       where s.slug = v_slug and s.empresa_id = v_empresa
     )
     and (select count(*) from public.empresa_pagina_slug s
          where s.empresa_id = v_empresa) >= 5 then
    return json_build_object(
      'error', 'você já usou cinco endereços; para trocar de novo, fale com o suporte'
    );
  end if;

  -- A ORDEM IMPORTA (lição da 128): rebaixar o atual ANTES de inserir o
  -- novo, senão o índice parcial de "um atual por empresa" estoura na
  -- segunda troca.
  update public.empresa_pagina_slug
     set atual = false
   where empresa_id = v_empresa and atual;

  insert into public.empresa_pagina_slug (slug, empresa_id, atual)
  values (v_slug, v_empresa, false)
  on conflict (slug) do nothing;

  -- se alguém tomou o endereço no meio do caminho, o raise desfaz o
  -- rebaixamento acima junto com o resto
  if not exists (
    select 1 from public.empresa_pagina_slug s
    where s.slug = v_slug and s.empresa_id = v_empresa
  ) then
    raise exception 'este endereço acabou de ser usado; tente outro';
  end if;

  update public.empresa_pagina_slug
     set atual = true
   where slug = v_slug and empresa_id = v_empresa;

  -- o gatilho da página copia o endereço atual para o espelho
  insert into public.empresa_pagina (empresa_id)
  values (v_empresa)
  on conflict (empresa_id) do update set updated_at = now();

  return json_build_object('ok', true, 'slug', v_slug, 'anterior', v_atual);
end;
$$;

revoke all on function public.definir_slug_pagina(text) from public, anon;
grant execute on function public.definir_slug_pagina(text) to authenticated;

comment on function public.definir_slug_pagina(text) is
  'Define ou troca o endereço da página (teto de 5 por empresa). O anterior nunca é apagado: continua redirecionando e nunca fica livre para outra empresa.';

-- A porta de serviço para o suporte: libera um endereço APOSENTADO
-- (nunca o atual de ninguém). Só o servidor chama.
create or replace function public.liberar_slug_pagina(p_slug text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  delete from public.empresa_pagina_slug s
   where s.slug = lower(trim(coalesce(p_slug, '')))
     and not s.atual;
  return json_build_object('ok', found);
end;
$$;

revoke all on function public.liberar_slug_pagina(text) from public, anon, authenticated;
grant execute on function public.liberar_slug_pagina(text) to service_role;

comment on function public.liberar_slug_pagina(text) is
  'Suporte: libera um endereço aposentado para voltar a ser usado. Nunca mexe no endereço atual de uma empresa. Só service_role.';

-- ============================================================
-- 10) A LEITURA PÚBLICA DA PÁGINA
-- ============================================================
-- Lista fechada de campos, montada à mão. Nada de cliente, nada de
-- proposta, nada de preço, nada de dado da equipe: o que sai daqui é
-- público para o mundo inteiro, sem credencial nenhuma na URL.
-- `p_ref` aceita o endereço atual e os aposentados — a página devolve
-- qual é o atual e a rota redireciona. Endereço inexistente e página não
-- publicada dão a mesma resposta (null): não serve para descobrir quais
-- empresas existem.
create or replace function public.pagina_publica(p_ref text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ref     text := lower(trim(coalesce(p_ref, '')));
  v_empresa uuid;
  v_atual   text;
  v_pag     public.empresa_pagina%rowtype;
  v_nome    text;
  v_logo    text;
begin
  select s.empresa_id into v_empresa
  from public.empresa_pagina_slug s
  where s.slug = v_ref;

  if v_empresa is null then
    return null;
  end if;

  select * into v_pag from public.empresa_pagina p where p.empresa_id = v_empresa;
  if not found or not v_pag.publicada then
    return null;
  end if;

  select s.slug into v_atual
  from public.empresa_pagina_slug s
  where s.empresa_id = v_empresa and s.atual;

  select e.nome, e.logo_url into v_nome, v_logo
  from public.empresas e where e.id = v_empresa;

  return json_build_object(
    'slug_atual', v_atual,
    'por_slug_antigo', v_atual is distinct from v_ref,
    'nome_empresa', v_nome,
    'logo_url', v_logo,
    'titulo', v_pag.titulo,
    'posicionamento', v_pag.posicionamento,
    'para_quem', v_pag.para_quem,
    'cidade', v_pag.cidade,
    'tipos_atendidos', to_json(v_pag.tipos_atendidos),
    'servicos', v_pag.servicos,
    'motivos', to_json(v_pag.motivos),
    'whatsapp', v_pag.whatsapp,
    'instagram', v_pag.instagram,
    -- o pixel dela: o navegador só o carrega depois de a pessoa permitir
    'pixel_meta', v_pag.pixel_meta,
    -- o desenho que ela escolheu (só a forma; os dados são os mesmos)
    'modelo', v_pag.modelo,
    -- o retrato dela, que ela mesma pôs na página
    'retrato_url', v_pag.retrato_url,
    -- a paleta: só o nome; as cores moram no código
    'paleta', v_pag.paleta,
    'fotos', coalesce((
      select json_agg(f)
      from (
        select pf.url, pf.legenda, pf.tipo_evento
        from public.portfolio_fotos pf
        where pf.empresa_id = v_empresa and pf.ativo and pf.na_pagina
        order by pf.tipo_evento, pf.ordem, pf.created_at
        limit 24
      ) f
    ), '[]'::json),
    'depoimentos', coalesce((
      select json_agg(d)
      from (
        -- o tipo deixa o depoimento em destaque acompanhar o tipo de
        -- evento que a pessoa escolhe no formulário da vitrine
        select dp.texto, dp.autor, dp.contexto, dp.tipo_evento
        from public.empresa_depoimentos dp
        where dp.empresa_id = v_empresa and dp.ativo and dp.na_pagina
        order by dp.ordem, dp.created_at
        limit 12
      ) d
    ), '[]'::json)
  );
end;
$$;

revoke all on function public.pagina_publica(text) from public;
grant execute on function public.pagina_publica(text) to anon, authenticated;

comment on function public.pagina_publica(text) is
  'A página publicada, por endereço atual ou aposentado. Null quando não existe ou não está publicada. Lista fechada de campos; fotos e depoimentos só os marcados para a página.';

-- ============================================================
-- 11) O CONTADOR DA PÁGINA
-- ============================================================
-- Incrementa e não devolve nada: não há o que ler nem o que vazar por
-- aqui, e ele não distingue endereço inexistente de página não publicada.
-- O que um robô consegue é inflar um número do dia dela — por isso a
-- tela nunca diz "N pessoas visitaram", e por isso a campanha passa pela
-- régua e tem teto de valores distintos por dia.
create or replace function public.registrar_toque_pagina(
  p_ref      text,
  p_tipo     text,
  p_origem   text default 'direto',
  p_campanha text default ''
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_empresa  uuid;
  v_origem   text;
  v_campanha text;
  v_dia      date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_tipo not in ('page_view', 'whatsapp_click', 'instagram_click') then
    return;
  end if;

  select s.empresa_id into v_empresa
  from public.empresa_pagina_slug s
  join public.empresa_pagina p on p.empresa_id = s.empresa_id and p.publicada
  where s.slug = lower(trim(coalesce(p_ref, '')));

  if v_empresa is null then
    return;
  end if;

  v_origem := lower(coalesce(p_origem, 'direto'));
  if v_origem not in ('instagram', 'facebook', 'google', 'whatsapp', 'direto') then
    v_origem := 'outro';
  end if;
  v_campanha := public.campanha_limpa(p_campanha);

  -- Teto de campanhas distintas por dia. Sem ele, um laço com valores
  -- aleatórios cria uma linha nova a cada chamada e faz a tabela crescer
  -- sem fim.
  if v_campanha <> ''
     and not exists (select 1 from public.pagina_publica_metrica m
                      where m.empresa_id = v_empresa and m.dia = v_dia
                        and m.campanha = v_campanha)
     and (select count(*) from public.pagina_publica_metrica m
          where m.empresa_id = v_empresa and m.dia = v_dia) >= 20 then
    v_campanha := 'outra';
  end if;

  insert into public.pagina_publica_metrica as m
    (empresa_id, dia, origem_acesso, campanha,
     page_view, whatsapp_click, instagram_click, pedido_enviado)
  values (
    v_empresa, v_dia, v_origem, v_campanha,
    case when p_tipo = 'page_view' then 1 else 0 end,
    case when p_tipo = 'whatsapp_click' then 1 else 0 end,
    case when p_tipo = 'instagram_click' then 1 else 0 end,
    0
  )
  on conflict (empresa_id, dia, origem_acesso, campanha) do update
    set page_view       = m.page_view + excluded.page_view,
        whatsapp_click  = m.whatsapp_click + excluded.whatsapp_click,
        instagram_click = m.instagram_click + excluded.instagram_click;
end;
$$;

revoke all on function public.registrar_toque_pagina(text, text, text, text) from public;
grant execute on function public.registrar_toque_pagina(text, text, text, text)
  to anon, authenticated;

comment on function public.registrar_toque_pagina(text, text, text, text) is
  'Soma 1 ao contador do dia (visita, clique no WhatsApp, clique no Instagram). Não lê nem devolve nada, e não guarda nada sobre quem tocou. Clique não é mensagem enviada.';

-- ============================================================
-- 12) O PEDIDO, PELA PORTA DE SERVIÇO
-- ============================================================
-- SÓ service_role executa. O navegador manda o formulário para a rota do
-- aplicativo, que aplica os freios (honeypot, tempo mínimo, teto por IP)
-- e só então chama isto. A rota NÃO devolve ao navegador se o pedido foi
-- anexado ou criado: quem envia vê sempre a mesma confirmação.
--
-- A DEDUPLICAÇÃO (regra do dono, 15/09/2026). O mesmo contato pode ter
-- mais de uma oportunidade legítima: casamento em 2027 e quinze anos da
-- filha em 2028 são DOIS pedidos. Só é o mesmo pedido quando telefone,
-- tipo de evento e data batem — e "data bate" inclui o caso de uma das
-- duas ainda não existir ("ainda não sei" que depois vira uma data).
--
-- O CONTATO É O TELEFONE INTEIRO, NUNCA O E-MAIL (revisão de 16/09). O
-- e-mail casando sozinho deixava um estranho — que soubesse o e-mail de
-- alguém e o endereço da página, os dois públicos — escrever no pedido
-- dessa pessoa e descobrir que ela está negociando com aquela
-- cerimonialista. E comparar só os 8 últimos dígitos ignorava o DDD:
-- (62) 99999-8888 e (11) 99999-8888 viravam uma pessoa só.
create or replace function public.registrar_pedido_publico(
  p_ref          text,
  p_nome         text,
  p_whatsapp     text,
  p_email        text,
  p_tipo         text,
  p_data         date,
  p_cidade       text,
  p_convidados   int,
  p_mensagem     text,
  p_origem       text default 'direto',
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_empresa   uuid;
  v_nome_emp  text;
  v_dono      uuid;
  v_pag       public.empresa_pagina%rowtype;
  v_whats     text;
  v_nome      text;
  v_mail      text;
  v_msg       text;
  v_tipo      public.tipo_evento_catalogo;
  v_origem    text;
  v_campanha  text;
  v_dia       date := (now() at time zone 'America/Sao_Paulo')::date;
  v_hoje      int;
  v_existente public.pedido_orcamento%rowtype;
  v_client    uuid;
  v_id        uuid;
  v_carimbo   text;
  v_resumo    text;
begin
  -- 1. a página precisa existir e estar publicada
  select s.empresa_id into v_empresa
  from public.empresa_pagina_slug s
  where s.slug = lower(trim(coalesce(p_ref, '')));
  if v_empresa is null then
    return json_build_object('error', 'página não encontrada');
  end if;

  select * into v_pag from public.empresa_pagina p where p.empresa_id = v_empresa;
  if not found or not v_pag.publicada then
    return json_build_object('error', 'página não encontrada');
  end if;

  -- 2. o que a pessoa escreveu, na régua da casa
  v_nome  := left(trim(coalesce(p_nome, '')), 80);
  v_whats := public.normalizar_whatsapp(p_whatsapp);
  v_mail  := nullif(lower(left(trim(coalesce(p_email, '')), 120)), '');
  v_msg   := nullif(left(trim(coalesce(p_mensagem, '')), 500), '');

  if length(v_nome) < 2 then
    return json_build_object('error', 'informe seu nome');
  end if;
  if v_whats is null or v_whats !~ '^[0-9]{10,11}$' then
    return json_build_object('error', 'informe um WhatsApp com DDD');
  end if;
  if p_tipo is null or p_tipo = '' then
    return json_build_object('error', 'escolha o tipo do evento');
  end if;
  -- tipo fora dos 10 do sistema: erro do formulário, não erro de banco na
  -- cara de quem está pedindo orçamento
  begin
    v_tipo := p_tipo::public.tipo_evento_catalogo;
  exception when others then
    return json_build_object('error', 'escolha um tipo de evento válido');
  end;
  if p_data is not null and p_data < v_dia then
    return json_build_object('error', 'a data do evento já passou');
  end if;
  if p_convidados is not null and (p_convidados < 1 or p_convidados > 5000) then
    return json_build_object('error', 'número de convidados inválido');
  end if;

  -- Um contato por vez, por empresa. `for update` só trava linha que já
  -- existe; na primeira vez não há linha, e dois envios simultâneos do
  -- mesmo telefone criariam dois pedidos. A chave usa o DDD e os 8
  -- últimos dígitos, para o número com e sem o nono dígito cair na mesma.
  perform pg_advisory_xact_lock(
    hashtext(v_empresa::text || ':' || left(v_whats, 2) || right(v_whats, 8))
  );

  -- 3. teto diário por empresa: um formulário aberto ao mundo não pode
  --    virar uma noite de mil linhas na caixa de entrada dela
  select count(*) into v_hoje
  from public.pedido_orcamento po
  where po.empresa_id = v_empresa
    and (po.created_at at time zone 'America/Sao_Paulo')::date = v_dia;
  if v_hoje >= 50 then
    return json_build_object('error', 'muitos pedidos hoje; fale pelo WhatsApp');
  end if;

  v_origem := lower(coalesce(p_origem, 'direto'));
  if v_origem not in ('instagram', 'facebook', 'google', 'whatsapp', 'direto') then
    v_origem := 'outro';
  end if;
  v_campanha := public.campanha_limpa(p_utm_campaign);

  -- 4. o pedido já aberto do MESMO evento, do MESMO telefone
  select * into v_existente
  from public.pedido_orcamento po
  where po.empresa_id = v_empresa
    and po.status in ('novo', 'em_proposta')
    and po.tipo_evento = v_tipo
    and (
      po.whatsapp = v_whats
      -- tolerância só para o nono dígito, e com o MESMO DDD
      or (length(po.whatsapp) <> length(v_whats)
          and left(po.whatsapp, 2) = left(v_whats, 2)
          and right(po.whatsapp, 8) = right(v_whats, 8))
    )
    and (
      po.data_evento is null
      or p_data is null
      or abs(po.data_evento - p_data) <= 60
    )
  order by po.created_at desc
  limit 1
  for update;

  -- O teto de 50 conta LINHAS CRIADAS; anexar não cria linha nenhuma e
  -- por isso escapava dele. Cinco reenvios do mesmo pedido já é muito
  -- mais do que qualquer pessoa real manda.
  if v_existente.id is not null and v_existente.repeticoes >= 5 then
    return json_build_object('error', 'já recebemos seu pedido; fale pelo WhatsApp');
  end if;

  -- 5. a cliente já cadastrada com o mesmo número (aviso na tela, nada mais)
  select c.id into v_client
  from public.clients c
  where c.empresa_id = v_empresa
    and (
      public.normalizar_whatsapp(c.whatsapp) = v_whats
      or public.normalizar_whatsapp(c.phone) = v_whats
    )
  order by c.created_at
  limit 1;

  select e.nome, e.owner_user_id into v_nome_emp, v_dono
  from public.empresas e where e.id = v_empresa;

  -- a linha do sino: tipo, data e cidade — o que ela precisa para
  -- decidir se responde agora
  v_resumo :=
    case v_tipo::text
      when 'casamento'     then 'Casamento'
      when 'debutante'     then 'Debutante'
      when 'formatura'     then 'Formatura'
      when 'aniversario'   then 'Aniversário'
      when 'corporativo'   then 'Corporativo'
      when 'cha_revelacao' then 'Chá revelação'
      when 'batizado'      then 'Batizado'
      when 'bodas'         then 'Bodas'
      when 'show'          then 'Show'
      else 'Evento'
    end
    || coalesce(' · ' || to_char(p_data, 'DD/MM/YYYY'), ' · data a definir')
    || coalesce(' · ' || nullif(left(trim(coalesce(p_cidade, '')), 80), ''), '');

  if v_existente.id is not null then
    -- ANEXA: o reenvio não apaga o que já estava. A mensagem nova entra
    -- com data e só os campos vazios são preenchidos. right() e não
    -- left(): quando o campo enche, quem cai é o texto MAIS ANTIGO — a
    -- mensagem nova é justamente "mudei a data".
    v_carimbo := to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
    update public.pedido_orcamento po
       set mensagem = right(
             coalesce(po.mensagem || E'\n\n', '') ||
             case when v_msg is null then '[' || v_carimbo || '] reenviou o pedido'
                  else '[' || v_carimbo || '] ' || v_msg end,
             2000),
           repeticoes  = po.repeticoes + 1,
           email       = coalesce(po.email, v_mail),
           cidade      = coalesce(po.cidade, nullif(left(trim(coalesce(p_cidade, '')), 80), '')),
           convidados  = coalesce(po.convidados, p_convidados),
           data_evento = coalesce(po.data_evento, p_data),
           client_id   = coalesce(po.client_id, v_client)
     where po.id = v_existente.id
    returning po.id into v_id;

    -- o contador do dia conta o ENVIO, não o pedido: foi um formulário
    insert into public.pagina_publica_metrica as m
      (empresa_id, dia, origem_acesso, campanha, pedido_enviado)
    values (v_empresa, v_dia, v_origem, v_campanha, 1)
    on conflict (empresa_id, dia, origem_acesso, campanha) do update
      set pedido_enviado = m.pedido_enviado + 1;

    -- o reenvio também chega ao sino: é a mesma pessoa voltando, e pode
    -- ser justamente para dizer que a data mudou
    if v_dono is not null then
      insert into public.notifications
        (cerimonialista_id, empresa_id, type, title, message, link)
      values (
        v_dono, v_empresa, 'pedido_orcamento',
        v_existente.nome || ' escreveu de novo sobre o mesmo evento',
        v_resumo,
        '/orcamentos/pedidos'
      );
    end if;

    return json_build_object(
      'ok', true, 'anexado', true, 'pedido_id', v_id,
      'nome_empresa', v_nome_emp, 'whatsapp_empresa', v_pag.whatsapp
    );
  end if;

  insert into public.pedido_orcamento (
    empresa_id, canal, origem_acesso, utm_source, utm_medium, utm_campaign,
    nome, whatsapp, email, tipo_evento, data_evento, cidade, convidados,
    mensagem, client_id
  ) values (
    v_empresa, 'pagina_publica', v_origem,
    nullif(public.campanha_limpa(p_utm_source), ''),
    nullif(public.campanha_limpa(p_utm_medium), ''),
    nullif(v_campanha, ''),
    v_nome, v_whats, v_mail, v_tipo, p_data,
    nullif(left(trim(coalesce(p_cidade, '')), 80), ''), p_convidados,
    v_msg, v_client
  )
  returning id into v_id;

  insert into public.pagina_publica_metrica as m
    (empresa_id, dia, origem_acesso, campanha, pedido_enviado)
  values (v_empresa, v_dia, v_origem, v_campanha, 1)
  on conflict (empresa_id, dia, origem_acesso, campanha) do update
    set pedido_enviado = m.pedido_enviado + 1;

  -- o sino é dela: a linha fica na conta da dona da empresa
  if v_dono is not null then
    insert into public.notifications
      (cerimonialista_id, empresa_id, type, title, message, link)
    values (
      v_dono, v_empresa, 'pedido_orcamento',
      v_nome || ' pediu um orçamento pela sua página',
      v_resumo,
      '/orcamentos/pedidos'
    );
  end if;

  return json_build_object(
    'ok', true, 'anexado', false, 'pedido_id', v_id,
    'nome_empresa', v_nome_emp, 'whatsapp_empresa', v_pag.whatsapp
  );
end;
$$;

revoke all on function public.registrar_pedido_publico(
  text, text, text, text, text, date, text, int, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.registrar_pedido_publico(
  text, text, text, text, text, date, text, int, text, text, text, text, text)
  to service_role;

comment on function public.registrar_pedido_publico(
  text, text, text, text, text, date, text, int, text, text, text, text, text) is
  'Grava o pedido vindo do formulário da página. Só o servidor chama (service_role), depois dos freios da rota. Deduplica por telefone inteiro + tipo + data (nunca pelo e-mail); reenvio anexa, com teto de 5, e também avisa no sino.';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'as quatro tabelas existem' as item,
       (select to_regclass('public.empresa_pagina') is not null
           and to_regclass('public.empresa_pagina_slug') is not null
           and to_regclass('public.pedido_orcamento') is not null
           and to_regclass('public.pagina_publica_metrica') is not null) as ok

union all
select 'as colunas da página e do pedido existem (não é tabela de rascunho antigo)',
       (select count(*) = 8 from information_schema.columns
         where table_schema = 'public' and table_name = 'pedido_orcamento'
           and column_name in ('canal', 'origem_acesso', 'repeticoes', 'client_id',
                               'orcamento_id', 'respondido_em', 'encerrado_em',
                               'motivo_encerramento'))
       and
       (select count(*) = 5 from information_schema.columns
         where table_schema = 'public' and table_name = 'empresa_pagina'
           and column_name in ('para_quem', 'tipos_atendidos', 'servicos',
                               'motivos', 'publicada_em'))

union all
select 'RLS ligada nas quatro',
       (select bool_and(relrowsecurity) from pg_class
        where oid in ('public.empresa_pagina'::regclass,
                      'public.empresa_pagina_slug'::regclass,
                      'public.pedido_orcamento'::regclass,
                      'public.pagina_publica_metrica'::regclass))

union all
select 'toda policy das quatro tabelas depende de meu_cargo (o anônimo não passa)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public'
           and tablename in ('empresa_pagina', 'empresa_pagina_slug',
                             'pedido_orcamento', 'pagina_publica_metrica')
           and coalesce(qual, '') not ilike '%meu_cargo%'
       )

union all
select 'pedido: ninguém insere pela sessão, e só a proprietária apaga',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'pedido_orcamento'
           and cmd in ('INSERT', 'ALL')
       )
       and (select count(*) = 1 from pg_policies
            where schemaname = 'public' and tablename = 'pedido_orcamento'
              and cmd = 'DELETE' and qual ilike '%proprietaria%'
              and qual not ilike '%coordenadora%')

union all
select 'métrica: nenhuma policy de escrita',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'pagina_publica_metrica'
           and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       )

union all
select 'métrica não tem coluna que identifique visitante',
       not exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'pagina_publica_metrica'
           and column_name in ('ip', 'ip_address', 'user_agent', 'visitante_id',
                               'cookie', 'sessao', 'fbp', 'fbc')
       )

union all
select 'um único endereço atual por empresa',
       exists (select 1 from pg_indexes
               where schemaname = 'public'
                 and indexname = 'uq_empresa_pagina_slug_atual')

union all
select 'a proposta ganhou pedido_id, canal e enviado_em',
       (select count(*) = 3 from information_schema.columns
        where table_schema = 'public' and table_name = 'orcamentos'
          and column_name in ('pedido_id', 'canal', 'enviado_em'))

union all
select 'canal aceita os quatro valores, e a proposta antiga é manual',
       (select pg_get_constraintdef(c.oid) like '%pagina_publica%'
           and pg_get_constraintdef(c.oid) like '%proposta%'
          from pg_constraint c
         where c.conname = 'orcamentos_canal_check'
           and c.conrelid = 'public.orcamentos'::regclass)
       and not exists (select 1 from public.orcamentos where canal is null)

union all
select 'o sino aceita pedido_orcamento sem perder nenhum tipo antigo',
       (select pg_get_constraintdef(c.oid) ilike '%pedido_orcamento%'
           and pg_get_constraintdef(c.oid) ilike '%orcamento_comentario%'
           and pg_get_constraintdef(c.oid) ilike '%tarefa_proxima%'
           and pg_get_constraintdef(c.oid) ilike '%compromisso%'
          from pg_constraint c
         where c.conrelid = 'public.notifications'::regclass
           and c.conname = 'notifications_type_check')

union all
select 'o balde do portfólio tem teto e aceita as fotos que o sistema já recebe',
       (select file_size_limit = 5242880
           and 'image/jpeg' = any(allowed_mime_types)
           and 'image/heic' = any(allowed_mime_types)
           and 'image/gif' = any(allowed_mime_types)
          from storage.buckets where id = 'portfolio-fotos')

union all
select 'fotos e depoimentos só vão para a página quando ela escolher',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and column_name = 'na_pagina'
           and table_name in ('portfolio_fotos', 'empresa_depoimentos')
           and column_default = 'false')
       and (select prosrc ilike '%pf.na_pagina%' and prosrc ilike '%dp.na_pagina%'
              from pg_proc where proname = 'pagina_publica'
               and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'o depoimento da página leva o tipo do evento (o destaque acompanha o formulário)',
       (select prosrc ilike '%dp.tipo_evento%'
          from pg_proc where proname = 'pagina_publica'
           and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'o pixel da vitrine é só um número (nada de código colado)',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'empresa_pagina'
                 and column_name = 'pixel_meta')
       and exists (select 1 from pg_constraint
                   where conname = 'empresa_pagina_pixel_check'
                     and conrelid = 'public.empresa_pagina'::regclass)
       and (select prosrc ilike '%new.pixel_meta%' from pg_proc
            where proname = 'trg_empresa_pagina_valida'
              and pronamespace = 'public'::regnamespace and pronargs = 0)

union all
select 'a leitura pública entrega o número do pixel',
       (select prosrc ilike '%v_pag.pixel_meta%'
          from pg_proc where proname = 'pagina_publica'
           and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'o modelo da vitrine existe, com a lista fechada, e sai na leitura pública',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'empresa_pagina'
                 and column_name = 'modelo')
       and exists (select 1 from pg_constraint
                   where conname = 'empresa_pagina_modelo_check'
                     and conrelid = 'public.empresa_pagina'::regclass)
       and (select prosrc ilike '%v_pag.modelo%'
              from pg_proc where proname = 'pagina_publica'
               and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'o terceiro modelo (curadoria) é aceito',
       (select pg_get_constraintdef(oid) ilike '%curadoria%'
          from pg_constraint
         where conname = 'empresa_pagina_modelo_check'
           and conrelid = 'public.empresa_pagina'::regclass)

union all
select 'o retrato existe, só do balde da empresa, e sai na leitura pública',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'empresa_pagina'
                 and column_name = 'retrato_url')
       and exists (select 1 from pg_constraint
                   where conname = 'empresa_pagina_retrato_check'
                     and conrelid = 'public.empresa_pagina'::regclass)
       and (select prosrc ilike '%v_pag.retrato_url%'
              from pg_proc where proname = 'pagina_publica'
               and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'a paleta existe, com a lista fechada, e sai na leitura pública',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'empresa_pagina'
                 and column_name = 'paleta')
       and (select pg_get_constraintdef(oid) ilike '%grafite%'
              from pg_constraint
             where conname = 'empresa_pagina_paleta_check'
               and conrelid = 'public.empresa_pagina'::regclass)
       and (select prosrc ilike '%v_pag.paleta%'
              from pg_proc where proname = 'pagina_publica'
               and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'as cinco funções da página existem, uma vez cada',
       (select count(*) = 5 from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('pagina_publica', 'definir_slug_pagina',
                          'registrar_toque_pagina', 'registrar_pedido_publico',
                          'liberar_slug_pagina'))

union all
select 'quem abre a página lê e conta o toque (anônimo executa as duas)',
       has_function_privilege('anon', 'public.pagina_publica(text)', 'EXECUTE')
       and has_function_privilege('anon',
             'public.registrar_toque_pagina(text,text,text,text)', 'EXECUTE')

union all
select 'gravar pedido é só do servidor: nem anônimo nem sessão alcançam',
       not has_function_privilege('anon',
             'public.registrar_pedido_publico(text,text,text,text,text,date,text,int,text,text,text,text,text)',
             'EXECUTE')
       and not has_function_privilege('authenticated',
             'public.registrar_pedido_publico(text,text,text,text,text,date,text,int,text,text,text,text,text)',
             'EXECUTE')
       and has_function_privilege('service_role',
             'public.registrar_pedido_publico(text,text,text,text,text,date,text,int,text,text,text,text,text)',
             'EXECUTE')

union all
select 'liberar endereço é só do servidor',
       not has_function_privilege('anon', 'public.liberar_slug_pagina(text)', 'EXECUTE')
       and not has_function_privilege('authenticated', 'public.liberar_slug_pagina(text)', 'EXECUTE')
       and has_function_privilege('service_role', 'public.liberar_slug_pagina(text)', 'EXECUTE')

union all
select 'só a proprietária define o endereço, e o anônimo não define',
       (select prosrc ilike '%proprietaria%' from pg_proc
        where proname = 'definir_slug_pagina'
          and pronamespace = 'public'::regnamespace and pronargs = 1)
       and not has_function_privilege('anon', 'public.definir_slug_pagina(text)', 'EXECUTE')

union all
select 'o endereço da página só muda pela função (o gatilho sobrescreve o resto)',
       (select prosrc ilike '%new.slug := (select s.slug%' from pg_proc
        where proname = 'trg_empresa_pagina_valida'
          and pronamespace = 'public'::regnamespace and pronargs = 0)

union all
select 'no máximo cinco endereços por empresa',
       (select prosrc ilike '%v_empresa) >= 5%' from pg_proc
        where proname = 'definir_slug_pagina'
          and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'a página pública não devolve nada interno',
       (select prosrc not ilike '%email%'
           and prosrc not ilike '%preco%'
           and prosrc not ilike '%valor%'
           and prosrc not ilike '%cpf%'
           and prosrc not ilike '%clients%'
           and prosrc not ilike '%orcamento%'
           and prosrc not ilike '%select * from%'
          from pg_proc where proname = 'pagina_publica'
            and pronamespace = 'public'::regnamespace and pronargs = 1)

union all
select 'a página só abre publicada',
       (select prosrc ilike '%publicada%' from pg_proc
        where proname = 'pagina_publica'
          and pronamespace = 'public'::regnamespace and pronargs = 1)
       and (select prosrc ilike '%publicada%' from pg_proc
            where proname = 'registrar_toque_pagina'
              and pronamespace = 'public'::regnamespace and pronargs = 4)

union all
select 'o pedido casa pelo telefone inteiro com o mesmo DDD, nunca pelo e-mail',
       (select prosrc ilike '%po.whatsapp = v_whats%'
           and prosrc ilike '%left(po.whatsapp, 2) = left(v_whats, 2)%'
           and prosrc not ilike '%lower(po.email)%'
           and prosrc ilike '%po.tipo_evento = v_tipo%'
           and prosrc ilike '%abs(po.data_evento - p_data) <= 60%'
          from pg_proc where proname = 'registrar_pedido_publico'
            and pronamespace = 'public'::regnamespace and pronargs = 13)

union all
select 'dois envios simultâneos do mesmo contato não viram dois pedidos',
       (select prosrc ilike '%pg_advisory_xact_lock%' from pg_proc
        where proname = 'registrar_pedido_publico'
          and pronamespace = 'public'::regnamespace and pronargs = 13)

union all
select 'o reenvio anexa, tem teto de cinco, e a mensagem nova nunca é a que cai',
       (select prosrc ilike '%repeticoes  = po.repeticoes + 1%'
           and prosrc ilike '%repeticoes >= 5%'
           and prosrc ilike '%set mensagem = right(%'
           and prosrc ilike '%coalesce(po.email, v_mail)%'
          from pg_proc where proname = 'registrar_pedido_publico'
            and pronamespace = 'public'::regnamespace and pronargs = 13)

union all
select 'o reenvio também avisa no sino',
       (select prosrc ilike '%escreveu de novo%' from pg_proc
        where proname = 'registrar_pedido_publico'
          and pronamespace = 'public'::regnamespace and pronargs = 13)

union all
select 'o pedido nunca cria cliente, evento nem tarefa',
       (select prosrc not ilike '%insert into public.clients%'
           and prosrc not ilike '%insert into public.events%'
           and prosrc not ilike '%insert into public.tasks%'
          from pg_proc where proname = 'registrar_pedido_publico'
            and pronamespace = 'public'::regnamespace and pronargs = 13)

union all
select 'a campanha vinda da URL passa pela régua nos dois contadores',
       (select prosrc ilike '%campanha_limpa%' and prosrc ilike '%v_dia) >= 20%'
          from pg_proc where proname = 'registrar_toque_pagina'
            and pronamespace = 'public'::regnamespace and pronargs = 4)
       and (select prosrc ilike '%campanha_limpa%'
              from pg_proc where proname = 'registrar_pedido_publico'
               and pronamespace = 'public'::regnamespace and pronargs = 13)

union all
select 'o contador não guarda nada sobre quem tocou',
       (select prosrc !~* '(^|[^a-z_])(ip|inet|user_agent|cookie|headers)($|[^a-z_])'
          from pg_proc where proname = 'registrar_toque_pagina'
            and pronamespace = 'public'::regnamespace and pronargs = 4)

union all
select 'o gatilho novo em orcamentos só carimba o envio, nunca o aceite',
       exists (select 1 from pg_trigger t
               where t.tgrelid = 'public.orcamentos'::regclass
                 and not t.tgisinternal
                 and t.tgname = 'trg_orcamento_enviado_em')
       and (select prosrc ilike '%new.status = ''enviado''%'
               and prosrc not ilike '%aprovado%'
               and prosrc not ilike '%recusado%'
              from pg_proc where proname = 'trg_orcamento_enviado_em'
               and pronamespace = 'public'::regnamespace and pronargs = 0)

union all
select 'a página não publica sem endereço, telefone, apresentação e tipo',
       (select prosrc ilike '%antes de publicar%' from pg_proc
        where proname = 'trg_empresa_pagina_valida'
          and pronamespace = 'public'::regnamespace and pronargs = 0)

union all
select 'o telefone e a campanha têm régua única',
       (select count(*) = 2 from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('normalizar_whatsapp', 'campanha_limpa')
          and pronargs = 1);
