-- ============================================================
-- 162 — O aceite como documento
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- O levantamento de 14/09/2026 mostrou o aceite da proposta como um
-- clique sem documento: a cliente desenha a assinatura, o PNG fica no
-- banco e nenhuma tela mostra; `ip_origem` existe desde a 056 e sempre
-- ficou vazia; não há navegador, não há versão do texto aceito, e o sino
-- leva o CPF por extenso para a equipe inteira. Esta migração faz da
-- linha de `orcamento_aceites` uma PROVA, no molde que a 149 já usa para
-- os Termos do próprio eOrganizei.
--
-- O QUE PASSA A VALER
--
--   1. A LINHA É A PROVA, E NÃO MUDA. `orcamento_aceites` ganha CPF (só
--      dígitos), e-mail, telefone, IP, navegador, versão e texto dos
--      termos aceitos, e um SHA-256 do conteúdo. UPDATE é recusado por
--      gatilho (cópia da 149); DELETE fica livre para o cascade de
--      `orcamentos` e de `empresas`. Não existe um único update/delete
--      dessa tabela em src/ nem nas migrações — o gatilho não quebra nada.
--
--   2. O HASH NASCE NO BANCO, na própria RPC, com o sha256(bytea) nativo
--      do Postgres (existe desde o PG 11; sem pgcrypto). Ele cobre o
--      recibo e o created_at, que só existem no instante do insert — por
--      isso tudo é calculado em variáveis e a linha entra de uma vez, já
--      com o hash. O JSON canônico tem ordem fixa de chaves (a lista está
--      no corpo da função) e o created_at entra como texto em UTC, para
--      que a conta possa ser refeita por qualquer auditor sem depender do
--      fuso da sessão. As assinaturas desenhadas entram pelo SHA-256 de
--      cada PNG (não pelo PNG inteiro, que tem até 200 mil caracteres):
--      o ato jurídico que os termos invocam fica dentro do hash, e quem
--      trocar o desenho no banco quebra a conta. O hash do PDF NÃO fica
--      aqui: o PDF nasce depois do insert e a linha é imutável — ele mora
--      em `evento_documento.sha256`.
--
--      A leitura do orçamento é FOR UPDATE: dois cliques simultâneos na
--      mesma proposta (a rota é lenta de propósito — PDF e e-mails) viram
--      um aceite só; o segundo espera a trava e cai no ramo ja_existia.
--      Sem isso seriam duas linhas imutáveis com hashes diferentes, e o
--      gatilho não deixaria desfazer nenhuma.
--
--   3. DUAS ASSINATURAS DA MESMA RPC. `registrar_aceite_proposta` de 18
--      parâmetros é a versão nova, SEM default em parâmetro nenhum, de
--      propósito: com default nos 4 novos (IP, navegador, versão e texto
--      dos termos), qualquer chamada de 10 a 14 argumentos casaria com as
--      duas e o aceite quebraria com "function is not unique"; e o
--      Postgres não deixa parâmetro sem default depois de um com default,
--      então os 14 primeiros também ficam sem. A de 14 parâmetros vira
--      PONTE (mesmos defaults da 101) e chama a de 18 com nulos: cobre a
--      aba que ficou aberta com o código antigo durante o deploy. Uma
--      migração posterior a derruba.
--
--   4. A DE 18 SÓ PELA CHAVE DE SERVIÇO. IP e navegador são a parte da
--      prova que o navegador não pode escrever sobre si mesmo — quem
--      chama é a rota /api/orcamento/[hash]/aceite, no servidor. anon e
--      authenticated perdem EXECUTE nela; a ponte de 14 continua aberta
--      ao público como sempre foi (a ponte roda como security definer, e
--      por isso alcança a de 18 mesmo sem o grant).
--
--   5. O SINO NÃO LEVA DADO PESSOAL. A notificação do aceite passa a dizer
--      só pacote, valor e recibo. CPF, telefone e e-mail ficam na linha
--      imutável e no termo em PDF — LGPD art. 7º, V: guardados para
--      executar o contrato, não espalhados pela equipe.
--
--   6. `evento_documento`: onde ficam o termo de aceite em PDF e o
--      contrato de prestação da cerimonialista, com o hash de cada
--      arquivo. Ancorado no evento OU no orçamento (proposta sem data não
--      gera evento, 112). A âncora é um GATILHO de INSERT, não um CHECK:
--      um CHECK também vale no UPDATE, e é justamente o UPDATE do SET NULL
--      que ele recusaria — derrubando a exclusão do evento (ou da conta)
--      no meio.
--
--      `event_id` é ON DELETE SET NULL: apagar o evento é operação comum
--      (eventos/actions.ts) e não pode levar o termo junto enquanto o
--      orçamento e a linha do aceite continuam vivos — o termo sobrevive
--      pendurado no orçamento. `orcamento_id` é ON DELETE CASCADE: a linha
--      do aceite já morre com o orçamento desde a 056; o documento vai
--      junto. Limite conhecido: um documento pendurado SÓ no evento
--      (hoje nenhum caminho grava assim) fica órfão e invisível quando o
--      evento é apagado; o arquivo no balde nunca é apagado por ninguém,
--      como já acontece com o cascade.
--
--      Quem escreve o termo é a chave de serviço, sem policy. Pela sessão
--      só entra o que ela mesma sobe (contrato_prestacao e outro, origem
--      cerimonialista, sem aceite) e só dentro da pasta da própria empresa
--      — senão a rota /api/documento assinaria qualquer caminho do balde
--      que ela escrevesse aqui, e a página pública de verificação mostraria
--      um termo forjado. A equipe lê pelo mesmo crivo do evento e, sem
--      evento, pelo mesmo crivo do orçamento (orcamentos_select, 041):
--      quem não vê a proposta na lista não abre o termo dela. A cliente
--      do portal lê só o CONTRATO do próprio evento (policy separada,
--      molde da 089) — o termo tem valor e CPF e é só de quem contrata,
--      que recebe por e-mail (decisão do dono, 15/09/2026; aplicada pela
--      163). Nunca a categoria `outro`. Apagar fica com quem
--      responde pela empresa (119) — menos o termo de aceite, que é a
--      prova que o sistema gerou e ninguém da equipe apaga.
--
--   7. `responder_orcamento` deixa de aprovar. Aprovar é assinar, e isso
--      passa pela RPC do aceite. A função passa a servir só ao botão "Não
--      vou fechar agora": recusa com motivo curto, respeita o fuso de
--      Brasília (101) e grava `motivo_recusa`/`recusado_em` no orçamento.
--      A assinatura antiga (text, text) é dropada antes — sem chamador em
--      src/ — e a nova tem o motivo com default, então a chamada de dois
--      argumentos continua válida.
--
--   8. `consultar_aceite_publico(recibo, verificador)`: a página que o QR
--      do termo abre. O verificador são os 12 primeiros hex do hash do
--      conteúdo — sem ele o recibo de 6 hex seria força bruta viável, e a
--      resposta é NULL para qualquer coisa que não case. Devolve empresa,
--      tipo, data, primeiro nome e quantos assinaram. Nunca CPF, valor,
--      assinatura nem e-mail: o que prova é o hash, não o dado.
--
-- Aditiva. Conferência no fim, tudo `true`.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) A linha do aceite ganha o que faltava para ser prova
-- ------------------------------------------------------------
alter table public.orcamento_aceites
  add column if not exists user_agent text;
alter table public.orcamento_aceites
  add column if not exists cpf text;
alter table public.orcamento_aceites
  add column if not exists email text;
alter table public.orcamento_aceites
  add column if not exists telefone text;
alter table public.orcamento_aceites
  add column if not exists termos_versao text;
alter table public.orcamento_aceites
  add column if not exists termos_texto text;
alter table public.orcamento_aceites
  add column if not exists termos_aceitos boolean not null default false;
alter table public.orcamento_aceites
  add column if not exists sha256_conteudo text;
alter table public.orcamento_aceites
  add column if not exists origem_confirmacao text;

-- CHECK fora do ADD COLUMN: inline ele não é convergente (lição da 143/145)
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'orcamento_aceites_origem_confirmacao_check'
       and conrelid = 'public.orcamento_aceites'::regclass
  ) then
    alter table public.orcamento_aceites
      add constraint orcamento_aceites_origem_confirmacao_check
      check (origem_confirmacao is null or origem_confirmacao in ('email', 'whatsapp'));
  end if;
end $$;

comment on column public.orcamento_aceites.ip_origem is
  'Primeiro IP de x-forwarded-for, gravado pela rota de aceite. Marco Civil, art. 15.';
comment on column public.orcamento_aceites.user_agent is
  'Navegador de quem assinou, cortado em 300 caracteres.';
comment on column public.orcamento_aceites.cpf is
  'CPF de quem assinou, só dígitos. Fica aqui e no termo em PDF; mascarado nas telas e ausente do sino.';
comment on column public.orcamento_aceites.email is
  'E-mail informado no aceite. É DAQUI que o termo é (re)enviado — nunca de orcamentos.ficha_email, que é sobrescrita.';
comment on column public.orcamento_aceites.telefone is
  'Telefone informado no aceite, como veio.';
comment on column public.orcamento_aceites.termos_versao is
  'TERMOS_ACEITE_VERSAO (src/lib/aceite-termo.ts) no momento do aceite.';
comment on column public.orcamento_aceites.termos_texto is
  'O texto exato que a pessoa marcou. Guardado por extenso: a versão diz qual, o texto prova o quê.';
comment on column public.orcamento_aceites.termos_aceitos is
  'true quando a versão dos termos chegou junto do aceite. Aceites anteriores à 162 ficam false.';
comment on column public.orcamento_aceites.sha256_conteudo is
  'SHA-256 (hex) do JSON canônico da linha, calculado pela RPC no insert. Os 12 primeiros caracteres são o verificador do QR.';
comment on column public.orcamento_aceites.origem_confirmacao is
  'Reservado: por onde a pessoa confirmou a identidade (email | whatsapp). Hoje sempre nulo.';

-- ------------------------------------------------------------
-- 2) Imutável: UPDATE cai; DELETE passa (cascade de orcamentos/empresas)
-- ------------------------------------------------------------
create or replace function public.trg_orcamento_aceite_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'orcamento_aceites é imutável: aceite novo é linha nova'
    using errcode = 'restrict_violation';
end $$;

drop trigger if exists trg_orcamento_aceites_imutavel on public.orcamento_aceites;
create trigger trg_orcamento_aceites_imutavel
  before update on public.orcamento_aceites
  for each row execute function public.trg_orcamento_aceite_imutavel();

-- ------------------------------------------------------------
-- 3) O orçamento: conferência do aceite e a recusa com motivo
-- ------------------------------------------------------------
alter table public.orcamentos
  add column if not exists aceite_visto_em timestamptz;
alter table public.orcamentos
  add column if not exists motivo_recusa text;
alter table public.orcamentos
  add column if not exists recusado_em timestamptz;

comment on column public.orcamentos.aceite_visto_em is
  'Quando alguém da equipe abriu o orçamento depois do aceite. Nulo = o Copiloto ainda cobra "conferir o termo".';
comment on column public.orcamentos.motivo_recusa is
  'O que a cliente escolheu ao recusar (preço, data, outra empresa, outro), até 300 caracteres.';
comment on column public.orcamentos.recusado_em is
  'Quando a cliente recusou pela própria proposta.';

-- ------------------------------------------------------------
-- 4) Os documentos do evento (termo em PDF, contrato dela)
-- ------------------------------------------------------------
create table if not exists public.evento_documento (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  event_id            uuid references public.events (id) on delete set null,
  orcamento_id        uuid references public.orcamentos (id) on delete cascade,
  orcamento_aceite_id uuid references public.orcamento_aceites (id) on delete set null,
  categoria           text not null,
  storage_path        text not null,
  nome                text not null,
  sha256              text,
  bytes               int,
  origem              text not null default 'sistema',
  enviado_em          timestamptz,
  created_at          timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'evento_documento_categoria_check'
       and conrelid = 'public.evento_documento'::regclass
  ) then
    alter table public.evento_documento
      add constraint evento_documento_categoria_check
      check (categoria in ('termo_aceite', 'contrato_prestacao', 'outro'));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'evento_documento_origem_check'
       and conrelid = 'public.evento_documento'::regclass
  ) then
    alter table public.evento_documento
      add constraint evento_documento_origem_check
      check (origem in ('sistema', 'cerimonialista'));
  end if;

  -- o evento apagado não leva o termo: se a tabela nasceu de uma rodada
  -- anterior com CASCADE, o FK é refeito como SET NULL
  if exists (
    select 1 from pg_constraint
     where conname = 'evento_documento_event_id_fkey'
       and conrelid = 'public.evento_documento'::regclass
       and confdeltype <> 'n'
  ) then
    alter table public.evento_documento
      drop constraint evento_documento_event_id_fkey;
    alter table public.evento_documento
      add constraint evento_documento_event_id_fkey
      foreign key (event_id) references public.events (id) on delete set null;
  end if;
end $$;

-- Todo documento pendura de um evento ou de um orçamento. É gatilho de
-- INSERT, e não CHECK: um CHECK também é avaliado no UPDATE, e é isso que
-- faria o SET NULL do evento apagado recusar a linha e derrubar a
-- exclusão do evento (ou da conta inteira) no meio.
alter table public.evento_documento
  drop constraint if exists evento_documento_ancora_check;

create or replace function public.trg_evento_documento_ancora()
returns trigger
language plpgsql
as $$
begin
  if new.event_id is null and new.orcamento_id is null then
    raise exception 'evento_documento precisa de event_id ou orcamento_id'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_evento_documento_ancora on public.evento_documento;
create trigger trg_evento_documento_ancora
  before insert on public.evento_documento
  for each row execute function public.trg_evento_documento_ancora();

create index if not exists idx_evento_documento_empresa_evento
  on public.evento_documento (empresa_id, event_id);
create index if not exists idx_evento_documento_aceite
  on public.evento_documento (orcamento_aceite_id);
-- a tela do orçamento filtra por orcamento_id (orcamentos/[id]/page.tsx)
create index if not exists idx_evento_documento_orcamento
  on public.evento_documento (orcamento_id);

comment on table public.evento_documento is
  'Documentos da cliente por evento/orçamento: termo de aceite em PDF (gerado pelo sistema) e contrato de prestação (o PDF da cerimonialista). O arquivo mora no balde contratos; aqui ficam o caminho e o SHA-256.';
comment on column public.evento_documento.categoria is
  'termo_aceite | contrato_prestacao | outro.';
comment on column public.evento_documento.storage_path is
  'Caminho no balde contratos: empresa/evento-ou-orçamento/documentos/id/nome.';
comment on column public.evento_documento.sha256 is
  'SHA-256 (hex) do arquivo gravado. É o hash que a página de verificação mostra como sha256_pdf.';
comment on column public.evento_documento.origem is
  'sistema = gerado pela rota de aceite; cerimonialista = arquivo que ela subiu.';
comment on column public.evento_documento.enviado_em is
  'Quando o documento saiu por e-mail para a cliente. Nulo = a rotina de aceites pendentes ainda tenta.';

alter table public.evento_documento enable row level security;

-- Leitura pela equipe: com evento, pelo mesmo crivo do evento; sem evento,
-- pelo mesmo crivo do orçamento. A subconsulta em orcamentos passa pela
-- RLS de quem lê (orcamentos_select, 041): cerimonialista e assistente só
-- veem a proposta que criaram ou pela qual respondem — e o termo dela tem
-- CPF, assinatura e valor dentro. Sem isso, a proposta sem data (a que
-- fica sem evento) abriria para a empresa inteira.
drop policy if exists "evento_documento_le" on public.evento_documento;
create policy "evento_documento_le"
  on public.evento_documento for select
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and case
          when event_id is not null then public.pode_ver_evento(event_id)
          else orcamento_id in (select o.id from public.orcamentos o)
        end
  );

-- A cliente do portal lê só o contrato de prestação do próprio evento.
-- O termo de aceite NÃO: ele tem o valor aceito, o CPF, o e-mail e o
-- telefone de quem assinou, e o portal é aberto a quem ela convida (mãe,
-- pai, outro). Dado de pagamento e dado pessoal são só de quem contrata,
-- que recebe o termo por e-mail. Nunca a categoria outro. Policy separada
-- da equipe, no molde da 089: as permissivas somam por OR e o InitPlan é
-- avaliado uma vez por consulta.
drop policy if exists "evento_documento_portal_le" on public.evento_documento;
create policy "evento_documento_portal_le"
  on public.evento_documento for select
  using (
    categoria = 'contrato_prestacao'
    and event_id in (select public.eventos_da_cliente())
  );

-- Pela sessão só entra o que ela mesma sobe. O termo de aceite é do
-- sistema (nasce na rota, pela chave de serviço): se a sessão pudesse
-- gravar um termo_aceite apontando para um aceite, a página pública de
-- verificação passaria a mostrar o hash forjado. E o caminho tem de ficar
-- na pasta da própria empresa: a rota /api/documento assina com a chave
-- de serviço o que estiver aqui, seja de quem for.
drop policy if exists "evento_documento_anexa" on public.evento_documento;
create policy "evento_documento_anexa"
  on public.evento_documento for insert
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (event_id is null or public.pode_editar_evento(event_id))
    and (orcamento_id is null or orcamento_id in (select o.id from public.orcamentos o))
    and categoria in ('contrato_prestacao', 'outro')
    and origem = 'cerimonialista'
    and orcamento_aceite_id is null
    and storage_path like ((select mc.empresa_id::text from public.meu_cargo() mc) || '/%')
  );

-- Apagar documento não tem volta: fica com quem responde pela empresa
-- (119). O termo de aceite ninguém da equipe apaga — é a prova que o
-- sistema gerou, e quem tem interesse em sumir com ela é justamente quem
-- responde pela empresa.
drop policy if exists "evento_documento_apaga" on public.evento_documento;
create policy "evento_documento_apaga"
  on public.evento_documento for delete
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
    and categoria <> 'termo_aceite'
  );

-- ------------------------------------------------------------
-- 5) O aceite, agora com IP, navegador, termos e hash — 18 parâmetros
-- ------------------------------------------------------------
-- Corpo da 101 (245-405); mudou o que está marcado. NENHUM parâmetro
-- tem default: os 4 últimos não podem ter (cabeçalho, item 3) e o
-- Postgres exige que, depois de um parâmetro com default, todos os
-- seguintes também tenham — logo os 14 primeiros também ficam sem. A
-- rota manda os 18 sempre (nulo onde não houver).
create or replace function public.registrar_aceite_proposta(
  p_hash             text,
  p_pacote_id        uuid,
  p_convidados       int,
  p_extras_ids       uuid[],
  p_forma_pagamento  text,
  p_parcelas         int,
  p_nome_noiva       text,
  p_nome_noivo       text,
  p_assinatura_noiva text,
  p_assinatura_noivo text,
  p_observacoes      text,
  p_cpf              text,
  p_email            text,
  p_telefone         text,
  p_ip               text,
  p_user_agent       text,
  p_termos_versao    text,
  p_termos_texto     text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc     public.orcamentos%rowtype;
  v_cfg     public.empresa_conteudo_institucional%rowtype;
  v_pac     public.empresa_pacotes%rowtype;
  v_extras  jsonb := '[]'::jsonb;
  v_val_extras numeric := 0;
  v_convidados int;
  v_conv_inclusos int;
  v_val_por_conv numeric;
  v_val_conv numeric := 0;
  v_subtotal numeric;
  v_desc_pct numeric := 0;
  v_desconto numeric := 0;
  v_total    numeric;
  v_entrada  numeric;
  v_parcela  numeric;
  v_codigo   text;
  v_dono     uuid;
  v_existente public.orcamento_aceites%rowtype;
  -- o que a linha imutável ganhou na 162
  v_nome1        text;
  v_nome2        text;
  v_obs          text;
  v_cpf          text;
  v_email        text;
  v_telefone     text;
  v_ip           text;
  v_ua           text;
  v_termos_versao text;
  v_termos_texto  text;
  v_created_at   timestamptz;
  v_sha256       text;
  v_aceite_id    uuid;
begin
  -- FOR UPDATE: a trava do orçamento serializa aceites simultâneos. Sem
  -- ela, dois cliques na mesma proposta viram duas linhas imutáveis com
  -- hashes diferentes — e o gatilho não deixa desfazer nenhuma. Em READ
  -- COMMITTED a segunda chamada espera a primeira e, com snapshot novo, a
  -- leitura de orcamento_aceites logo abaixo já enxerga o aceite dela.
  select * into v_orc from public.orcamentos where hash_publico = p_hash for update;
  if not found then
    return json_build_object('error', 'proposta não encontrada');
  end if;

  -- já aceita: devolve o mesmo recibo, agora com tudo o que a tela de
  -- recibo mostra (entrada, parcela, id e hash)
  select * into v_existente from public.orcamento_aceites
  where orcamento_id = v_orc.id order by created_at desc limit 1;
  if found then
    return json_build_object(
      'success', true, 'recibo', v_existente.recibo_codigo,
      'aceite_id', v_existente.id,
      'valor_total', v_existente.valor_total,
      'valor_entrada', v_existente.valor_entrada,
      'valor_parcela', v_existente.valor_parcela,
      'sha256_conteudo', v_existente.sha256_conteudo,
      'ja_existia', true
    );
  end if;

  if v_orc.status not in ('enviado') then
    return json_build_object('error', 'esta proposta não está disponível para aceite');
  end if;
  if v_orc.data_validade < (now() at time zone 'America/Sao_Paulo')::date then
    update public.orcamentos set status = 'expirado', updated_at = now() where id = v_orc.id;
    return json_build_object('error', 'esta proposta expirou');
  end if;
  if coalesce(trim(p_nome_noiva), '') = '' then
    return json_build_object('error', 'informe o nome de quem está aceitando');
  end if;
  if length(coalesce(p_assinatura_noiva, '')) > 200000
     or length(coalesce(p_assinatura_noivo, '')) > 200000 then
    return json_build_object('error', 'assinatura inválida');
  end if;

  select * into v_cfg from public.empresa_conteudo_institucional
  where empresa_id = v_orc.empresa_id
    and tipo_evento = v_orc.tipo_evento;

  select * into v_pac from public.empresa_pacotes
  where id = p_pacote_id and empresa_id = v_orc.empresa_id
    and tipo_evento = v_orc.tipo_evento and ativo;
  if not found then
    return json_build_object('error', 'pacote inválido');
  end if;

  v_conv_inclusos := coalesce(v_cfg.convidados_inclusos, 150);
  v_val_por_conv  := coalesce(v_cfg.valor_por_convidado_extra, 0);
  v_convidados := greatest(
    coalesce(v_cfg.convidados_min, 50),
    least(coalesce(v_cfg.convidados_max, 300), coalesce(p_convidados, v_cfg.convidados_inclusos))
  );
  v_val_conv := greatest(0, v_convidados - v_conv_inclusos) * v_val_por_conv;

  select coalesce(jsonb_agg(jsonb_build_object('nome', x.nome, 'preco', x.preco)), '[]'::jsonb),
         coalesce(sum(x.preco), 0)
    into v_extras, v_val_extras
  from public.empresa_extras x
  where x.empresa_id = v_orc.empresa_id and x.tipo_evento = v_orc.tipo_evento and x.ativo
    and x.id = any(coalesce(p_extras_ids, '{}'::uuid[]));

  v_subtotal := v_pac.preco + v_val_conv + v_val_extras;

  if p_forma_pagamento = 'vista' then
    v_desc_pct := coalesce(v_cfg.condicao_desconto_a_vista_percentual, 0);
    v_desconto := v_subtotal * v_desc_pct / 100.0;
  end if;

  v_total   := v_subtotal - v_desconto;
  v_entrada := v_total * coalesce(v_cfg.condicao_entrada_percentual, 30) / 100.0;
  if p_forma_pagamento <> 'vista' and coalesce(p_parcelas, 0) > 0 then
    v_parcela := (v_total - v_entrada) / p_parcelas;
  end if;

  select upper(regexp_replace(substring(e.nome from 1 for 2), '[^a-zA-Z]', 'X', 'g'))
    into v_codigo from public.empresas e where e.id = v_orc.empresa_id;
  v_codigo := coalesce(v_codigo, 'VL') || '-' ||
              upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  -- tudo o que entra na linha, em variáveis: o hash cobre exatamente o
  -- que é gravado, e a linha entra de uma vez (o gatilho barra update)
  v_nome1    := trim(p_nome_noiva);
  v_nome2    := nullif(trim(coalesce(p_nome_noivo, '')), '');
  v_obs      := nullif(trim(coalesce(p_observacoes, '')), '');
  v_cpf      := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_email    := nullif(trim(coalesce(p_email, '')), '');
  v_telefone := nullif(trim(coalesce(p_telefone, '')), '');
  v_ip       := nullif(left(trim(coalesce(p_ip, '')), 64), '');
  v_ua       := nullif(left(trim(coalesce(p_user_agent, '')), 300), '');
  v_termos_versao := nullif(trim(coalesce(p_termos_versao, '')), '');
  v_termos_texto  := nullif(trim(coalesce(p_termos_texto, '')), '');
  v_created_at := now();

  -- JSON canônico: ordem fixa de chaves; created_at em UTC por extenso.
  -- É esta string, e só ela, que o hash cobre. As assinaturas entram
  -- pelo SHA-256 de cada PNG (a coluna guarda o PNG inteiro; o auditor
  -- refaz a conta a partir dele).
  v_sha256 := encode(sha256(convert_to(json_build_object(
    'recibo',                    v_codigo,
    'orcamento_id',              v_orc.id,
    'pacote_nome',               v_pac.nome,
    'pacote_preco',              v_pac.preco,
    'convidados',                v_convidados,
    'convidados_inclusos',       v_conv_inclusos,
    'valor_por_convidado_extra', v_val_por_conv,
    'valor_convidados_extra',    v_val_conv,
    'extras',                    v_extras,
    'valor_extras',              v_val_extras,
    'forma_pagamento',           p_forma_pagamento,
    'parcelas',                  p_parcelas,
    'desconto_percentual',       v_desc_pct,
    'valor_desconto',            v_desconto,
    'valor_total',               v_total,
    'valor_entrada',             v_entrada,
    'valor_parcela',             v_parcela,
    'nome_noiva',                v_nome1,
    'nome_noivo',                v_nome2,
    'assinatura_noiva_sha256',   case when p_assinatura_noiva is null then null
                                   else encode(sha256(convert_to(p_assinatura_noiva, 'UTF8')), 'hex') end,
    'assinatura_noivo_sha256',   case when p_assinatura_noivo is null then null
                                   else encode(sha256(convert_to(p_assinatura_noivo, 'UTF8')), 'hex') end,
    'observacoes',               v_obs,
    'cpf',                       v_cpf,
    'email',                     v_email,
    'telefone',                  v_telefone,
    'termos_versao',             v_termos_versao,
    'termos_texto',              v_termos_texto,
    'ip_origem',                 v_ip,
    'user_agent',                v_ua,
    'created_at',                to_char(v_created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  )::text, 'UTF8')), 'hex');

  insert into public.orcamento_aceites (
    orcamento_id, recibo_codigo, pacote_nome, pacote_preco, convidados,
    convidados_inclusos, valor_por_convidado_extra, valor_convidados_extra,
    extras, valor_extras, forma_pagamento, parcelas, desconto_percentual,
    valor_desconto, valor_total, valor_entrada, valor_parcela,
    nome_noiva, nome_noivo, assinatura_noiva, assinatura_noivo, observacoes,
    ip_origem, user_agent, cpf, email, telefone,
    termos_versao, termos_texto, termos_aceitos, sha256_conteudo, created_at
  ) values (
    v_orc.id, v_codigo, v_pac.nome, v_pac.preco, v_convidados,
    v_conv_inclusos, v_val_por_conv, v_val_conv,
    v_extras, v_val_extras, p_forma_pagamento, p_parcelas, v_desc_pct,
    v_desconto, v_total, v_entrada, v_parcela,
    v_nome1, v_nome2, p_assinatura_noiva, p_assinatura_noivo, v_obs,
    v_ip, v_ua, v_cpf, v_email, v_telefone,
    v_termos_versao, v_termos_texto, (v_termos_versao is not null), v_sha256, v_created_at
  )
  returning id into v_aceite_id;

  update public.orcamentos
  set status = 'aprovado', respondido_em = now(),
      valor_total = v_total, updated_at = now(),
      ficha_nome     = coalesce(v_nome1, ficha_nome),
      ficha_cpf      = coalesce(v_cpf, ficha_cpf),
      ficha_email    = coalesce(v_email, ficha_email),
      ficha_telefone = coalesce(v_telefone, ficha_telefone),
      ficha_whatsapp = coalesce(v_telefone, ficha_whatsapp),
      ficha_preenchida_em = case
        when coalesce(v_cpf, v_email, v_telefone) is not null
        then now() else ficha_preenchida_em end
  where id = v_orc.id;

  select coalesce(
    (select m.user_id from public.membros_equipe m where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_dono;

  -- só pacote, valor e recibo: nada de dado pessoal no sino (cabeçalho, 5)
  if v_dono is not null then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (v_dono, 'orcamento_aprovado',
      v_nome1 || ' aceitou a proposta',
      v_pac.nome || ' — R$ ' || to_char(v_total, 'FM999G999G990D00') || ' · recibo ' || v_codigo,
      '/orcamentos/' || v_orc.id);
  end if;

  return json_build_object(
    'success', true, 'recibo', v_codigo, 'aceite_id', v_aceite_id,
    'valor_total', v_total, 'valor_entrada', v_entrada, 'valor_parcela', v_parcela,
    'sha256_conteudo', v_sha256, 'ja_existia', false
  );
end;
$$;

-- Só a chave de serviço (a rota) chama a versão que grava IP e navegador.
revoke all on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text, text, text, text,
  text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text, text, text, text,
  text, text, text, text) to service_role;

-- ------------------------------------------------------------
-- 6) A ponte de 14 parâmetros (abas abertas com o código antigo)
-- ------------------------------------------------------------
-- Mesma assinatura e mesmos defaults da 101; só o corpo muda. Chamada
-- positional com 18 argumentos: só a de 18 casa. `null::text` e não
-- `null` solto, senão o Postgres não decide o tipo.
create or replace function public.registrar_aceite_proposta(
  p_hash            text,
  p_pacote_id       uuid,
  p_convidados      int,
  p_extras_ids      uuid[],
  p_forma_pagamento text,
  p_parcelas        int,
  p_nome_noiva      text,
  p_nome_noivo      text,
  p_assinatura_noiva text,
  p_assinatura_noivo text,
  p_observacoes     text default null,
  p_cpf             text default null,
  p_email           text default null,
  p_telefone        text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.registrar_aceite_proposta(
    p_hash, p_pacote_id, p_convidados, p_extras_ids, p_forma_pagamento, p_parcelas,
    p_nome_noiva, p_nome_noivo, p_assinatura_noiva, p_assinatura_noivo,
    p_observacoes, p_cpf, p_email, p_telefone,
    null::text, null::text, null::text, null::text);
end;
$$;

revoke all on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text, text, text, text) from public;
grant execute on function public.registrar_aceite_proposta(
  text, uuid, int, uuid[], text, int, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 7) Recusar, com motivo — aprovar não passa mais por aqui
-- ------------------------------------------------------------
drop function if exists public.responder_orcamento(text, text);

create or replace function public.responder_orcamento(
  p_hash   text,
  p_status text,
  p_motivo text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc    public.orcamentos%rowtype;
  v_dono   uuid;
  v_motivo text;
begin
  -- aprovar é assinar: passa pela RPC do aceite, nunca por aqui
  if p_status is distinct from 'recusado' then
    return json_build_object('error', 'por aqui a proposta só pode ser recusada');
  end if;

  -- FOR UPDATE: uma recusa que cruza com um aceite espera a trava e vê o
  -- status já mudado — em vez de recusar uma proposta que acabou de ser
  -- assinada.
  select * into v_orc from public.orcamentos where hash_publico = p_hash for update;
  if not found then
    return json_build_object('error', 'proposta não encontrada');
  end if;

  if v_orc.status <> 'enviado' then
    return json_build_object(
      'error', 'esta proposta já foi respondida ou não está disponível para resposta'
    );
  end if;

  if v_orc.data_validade < (now() at time zone 'America/Sao_Paulo')::date then
    update public.orcamentos set status = 'expirado', updated_at = now()
    where id = v_orc.id;
    return json_build_object('error', 'esta proposta expirou');
  end if;

  v_motivo := nullif(left(trim(coalesce(p_motivo, '')), 300), '');

  update public.orcamentos
  set status = 'recusado', respondido_em = now(), recusado_em = now(),
      motivo_recusa = v_motivo, updated_at = now()
  where id = v_orc.id;

  -- a responsável, se houver; senão a dona da empresa
  select coalesce(
    (select m.user_id from public.membros_equipe m
      where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_dono;

  if v_dono is not null then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (
      v_dono,
      'orcamento_recusado',
      v_orc.contato_nome || ' recusou a proposta',
      coalesce('Motivo: ' || v_motivo, 'Sem motivo informado'),
      '/orcamentos/' || v_orc.id
    );
  end if;

  return json_build_object('success', true, 'status', 'recusado');
end;
$$;

revoke all on function public.responder_orcamento(text, text, text) from public;
grant execute on function public.responder_orcamento(text, text, text) to anon, authenticated;

comment on function public.responder_orcamento(text, text, text) is
  'Recusa a proposta pelo hash, com motivo curto. Só recusa: aprovar é assinar, e isso passa por registrar_aceite_proposta.';

-- ------------------------------------------------------------
-- 8) A página de verificação do termo (o QR do PDF)
-- ------------------------------------------------------------
-- Sem `select *` e sem tocar em CPF, valor, assinatura ou e-mail: o
-- que sai daqui é público. NULL para qualquer coisa que não case.
create or replace function public.consultar_aceite_publico(
  p_recibo      text,
  p_verificador text
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'valido',          true,
    'empresa',         e.nome,
    'tipo_evento',     o.tipo_evento,
    'aceito_em',       a.created_at,
    'primeiro_nome',   split_part(trim(a.nome_noiva), ' ', 1),
    'assinantes',      case when a.nome_noivo is null then 1 else 2 end,
    'sha256_conteudo', a.sha256_conteudo,
    'sha256_pdf', (
      select d.sha256
        from public.evento_documento d
       where d.orcamento_aceite_id = a.id
         and d.categoria = 'termo_aceite'
       order by d.created_at desc
       limit 1
    )
  )
  from public.orcamento_aceites a
  join public.orcamentos o on o.id = a.orcamento_id
  join public.empresas   e on e.id = o.empresa_id
  where a.recibo_codigo = upper(trim(coalesce(p_recibo, '')))
    and a.sha256_conteudo is not null
    and length(trim(coalesce(p_verificador, ''))) = 12
    and left(a.sha256_conteudo, 12) = lower(trim(p_verificador));
$$;

revoke all on function public.consultar_aceite_publico(text, text) from public;
grant execute on function public.consultar_aceite_publico(text, text) to anon, authenticated;

comment on function public.consultar_aceite_publico(text, text) is
  'Verificação pública do termo de aceite: recibo + 12 primeiros hex do hash. NULL quando não casa. Nunca devolve CPF, valor, assinatura nem e-mail.';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
-- Sem `WITH`: cada linha é um subselect fechado (lição da 158).
-- Asserções sobre o catálogo, não sobre dados (lição da 155).

select 'orcamento_aceites: as 9 colunas novas existem' as item,
       (select count(*) = 9 from information_schema.columns
         where table_schema = 'public' and table_name = 'orcamento_aceites'
           and column_name in ('user_agent', 'cpf', 'email', 'telefone', 'termos_versao',
                               'termos_texto', 'termos_aceitos', 'sha256_conteudo',
                               'origem_confirmacao')) as ok

union all
select 'orcamento_aceites: termos_aceitos nasce false e nunca nula',
       (select is_nullable = 'NO' and column_default ilike 'false%'
          from information_schema.columns
         where table_schema = 'public' and table_name = 'orcamento_aceites'
           and column_name = 'termos_aceitos')

union all
select 'orcamento_aceites: CHECK de origem_confirmacao existe',
       exists (select 1 from pg_constraint
                where conname = 'orcamento_aceites_origem_confirmacao_check'
                  and conrelid = 'public.orcamento_aceites'::regclass)

union all
select 'orcamento_aceites: UPDATE é recusado por gatilho',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.orcamento_aceites'::regclass
                  and tgname = 'trg_orcamento_aceites_imutavel'
                  and not tgisinternal)

union all
select 'orcamento_aceites: DELETE continua livre para o cascade',
       not exists (select 1 from pg_trigger
                    where tgrelid = 'public.orcamento_aceites'::regclass
                      and not tgisinternal
                      and (tgtype::int & 8) = 8)   -- bit 8 = dispara em DELETE

union all
select 'orcamentos: aceite_visto_em, motivo_recusa e recusado_em existem',
       (select count(*) = 3 from information_schema.columns
         where table_schema = 'public' and table_name = 'orcamentos'
           and column_name in ('aceite_visto_em', 'motivo_recusa', 'recusado_em'))

union all
select 'registrar_aceite_proposta: existem exatamente duas',
       (select count(*) = 2 from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace)

union all
select 'registrar_aceite_proposta: uma com 14 e uma com 18 parâmetros',
       (select count(*) = 1 from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 14)
       and
       (select count(*) = 1 from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: nenhum parâmetro tem default (sem ambiguidade com a ponte)',
       (select pg_get_function_arguments(oid) not ilike '%default%'
           and pg_get_function_arguments(oid) ilike '%p_termos_texto text'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a ponte de 14: mantém os defaults da 101 (chamada antiga de 10 a 14 argumentos continua válida)',
       (select pg_get_function_arguments(oid) ilike '%p_observacoes text default%'
           and pg_get_function_arguments(oid) ilike '%p_telefone text default%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 14)

union all
select 'a de 18: calcula o hash com o sha256 nativo e grava na linha',
       (select prosrc ilike '%encode(sha256(convert_to(%'
           and prosrc ilike '%sha256_conteudo%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: o hash cobre as assinaturas e as observações',
       (select prosrc ilike '%''assinatura_noiva_sha256''%'
           and prosrc ilike '%''assinatura_noivo_sha256''%'
           and prosrc ilike '%''observacoes'',%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: trava o orçamento (FOR UPDATE) — dois cliques, um aceite',
       (select prosrc ilike '%where hash_publico = p_hash for update%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: grava IP, navegador, CPF só dígitos e termos',
       (select prosrc ilike '%ip_origem, user_agent, cpf, email, telefone,%'
           and prosrc ilike '%termos_versao, termos_texto, termos_aceitos, sha256_conteudo, created_at%'
           and prosrc ilike '%regexp_replace(coalesce(p_cpf, ''''), ''[^0-9]'', '''', ''g'')%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: o sino não leva CPF, telefone nem e-mail',
       (select position('cpf' in lower(substr(prosrc, position('insert into public.notifications' in prosrc)))) = 0
           and position('telefone' in lower(substr(prosrc, position('insert into public.notifications' in prosrc)))) = 0
           and position('email' in lower(substr(prosrc, position('insert into public.notifications' in prosrc)))) = 0
           and position('insert into public.notifications' in prosrc) > 0
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: o ramo ja_existia devolve entrada, parcela, id e hash',
       (select prosrc ilike '%''valor_entrada'', v_existente.valor_entrada%'
           and prosrc ilike '%''valor_parcela'', v_existente.valor_parcela%'
           and prosrc ilike '%''aceite_id'', v_existente.id%'
           and prosrc ilike '%''sha256_conteudo'', v_existente.sha256_conteudo%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: é security definer',
       (select prosecdef from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 18)

union all
select 'a de 18: a chave de serviço executa',
       (select has_function_privilege('service_role',
          'public.registrar_aceite_proposta(text,uuid,integer,uuid[],text,integer,text,text,text,text,text,text,text,text,text,text,text,text)',
          'EXECUTE'))

union all
select 'a de 18: anon e authenticated NÃO executam (IP e navegador só pela rota)',
       (select not has_function_privilege('anon',
          'public.registrar_aceite_proposta(text,uuid,integer,uuid[],text,integer,text,text,text,text,text,text,text,text,text,text,text,text)',
          'EXECUTE'))
       and
       (select not has_function_privilege('authenticated',
          'public.registrar_aceite_proposta(text,uuid,integer,uuid[],text,integer,text,text,text,text,text,text,text,text,text,text,text,text)',
          'EXECUTE'))

union all
select 'a ponte de 14: anon executa (abas antigas continuam aceitando)',
       (select has_function_privilege('anon',
          'public.registrar_aceite_proposta(text,uuid,integer,uuid[],text,integer,text,text,text,text,text,text,text,text)',
          'EXECUTE'))

union all
select 'a ponte de 14: chama a de 18 com os quatro nulos tipados',
       (select prosrc ilike '%null::text, null::text, null::text, null::text%'
          from pg_proc
         where proname = 'registrar_aceite_proposta'
           and pronamespace = 'public'::regnamespace and pronargs = 14)

union all
select 'responder_orcamento(text, text) não existe mais',
       (select to_regprocedure('public.responder_orcamento(text,text)') is null)

union all
select 'responder_orcamento(text, text, text) existe e anon executa',
       (select to_regprocedure('public.responder_orcamento(text,text,text)') is not null)
       and
       (select has_function_privilege('anon', 'public.responder_orcamento(text,text,text)', 'EXECUTE'))

union all
select 'responder_orcamento: só recusa, com fuso de Brasília, motivo e trava do orçamento',
       (select prosrc ilike '%is distinct from ''recusado''%'
           and prosrc ilike '%America/Sao_Paulo%'
           and prosrc ilike '%motivo_recusa = v_motivo%'
           and prosrc ilike '%recusado_em = now()%'
           and prosrc ilike '%where hash_publico = p_hash for update%'
          from pg_proc
         where proname = 'responder_orcamento'
           and pronamespace = 'public'::regnamespace and pronargs = 3)

union all
select 'notifications aceita orcamento_recusado e orcamento_aprovado',
       (select pg_get_constraintdef(c.oid) ilike '%orcamento_recusado%'
           and pg_get_constraintdef(c.oid) ilike '%orcamento_aprovado%'
          from pg_constraint c
         where c.conrelid = 'public.notifications'::regclass
           and c.conname = 'notifications_type_check')

union all
select 'consultar_aceite_publico existe e anon executa',
       (select to_regprocedure('public.consultar_aceite_publico(text,text)') is not null)
       and
       (select has_function_privilege('anon', 'public.consultar_aceite_publico(text,text)', 'EXECUTE'))

union all
select 'consultar_aceite_publico: exige o verificador de 12 hex',
       (select prosrc ilike '%left(a.sha256_conteudo, 12) = lower(trim(p_verificador))%'
          from pg_proc
         where proname = 'consultar_aceite_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'consultar_aceite_publico: nunca CPF, valor, assinatura nem e-mail',
       (select prosrc not ilike '%cpf%'
           and prosrc not ilike '%valor%'
           and prosrc not ilike '%assinatura%'
           and prosrc not ilike '%mail%'
           and prosrc not ilike '%select *%'
          from pg_proc
         where proname = 'consultar_aceite_publico'
           and pronamespace = 'public'::regnamespace)

union all
select 'evento_documento existe',
       (select to_regclass('public.evento_documento') is not null)

union all
select 'evento_documento: RLS ligada',
       (select relrowsecurity from pg_class
         where oid = 'public.evento_documento'::regclass)

union all
select 'evento_documento: as quatro policies (equipe lê, portal lê, anexar, apagar)',
       (select count(*) = 4 from pg_policies
         where schemaname = 'public' and tablename = 'evento_documento'
           and policyname in ('evento_documento_le', 'evento_documento_portal_le',
                              'evento_documento_anexa', 'evento_documento_apaga'))

-- pg_get_expr reescreve a policy: LIKE vira ~~, IN vira = ANY(ARRAY[...]);
-- os padrões abaixo casam o texto reescrito, não o que está escrito acima.
union all
select 'evento_documento: a equipe sem evento lê pelo crivo de orcamentos_select',
       (select qual ilike '%pode_ver_evento%'
           and qual ilike '%orcamentos o%'
          from pg_policies
         where schemaname = 'public' and tablename = 'evento_documento'
           and policyname = 'evento_documento_le')

union all
select 'evento_documento: o portal lê só o contrato do próprio evento — nunca o termo, nunca outro',
       (select qual ilike '%eventos_da_cliente%'
           and qual not ilike '%termo_aceite%'
           and qual ilike '%contrato_prestacao%'
           and qual not ilike '%''outro''%'
          from pg_policies
         where schemaname = 'public' and tablename = 'evento_documento'
           and policyname = 'evento_documento_portal_le')

union all
select 'evento_documento: a sessão não anexa termo_aceite nem aponta para fora da própria empresa',
       (select qual is null
           and with_check ilike '%contrato_prestacao%'
           and with_check not ilike '%termo_aceite%'
           and with_check ilike '%origem = ''cerimonialista''%'
           and with_check ilike '%orcamento_aceite_id IS NULL%'
           and with_check ilike '%storage_path ~~%'
          from pg_policies
         where schemaname = 'public' and tablename = 'evento_documento'
           and policyname = 'evento_documento_anexa')

union all
select 'evento_documento: ninguém da equipe apaga o termo de aceite',
       (select qual ilike '%categoria <> ''termo_aceite''%'
          from pg_policies
         where schemaname = 'public' and tablename = 'evento_documento'
           and policyname = 'evento_documento_apaga')

union all
select 'evento_documento: nenhuma policy de UPDATE (o documento não se edita, só se anexa ou se apaga)',
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'evento_documento'
                      and cmd in ('UPDATE', 'ALL'))

union all
select 'evento_documento: CHECKs de categoria e origem existem (a âncora não é CHECK)',
       (select count(*) = 2 from pg_constraint
         where conrelid = 'public.evento_documento'::regclass
           and contype = 'c'
           and conname in ('evento_documento_categoria_check',
                           'evento_documento_origem_check'))
       and not exists (select 1 from pg_constraint
                        where conrelid = 'public.evento_documento'::regclass
                          and conname = 'evento_documento_ancora_check')

union all
select 'evento_documento: a âncora é gatilho de INSERT',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.evento_documento'::regclass
                  and tgname = 'trg_evento_documento_ancora'
                  and not tgisinternal)

union all
select 'evento_documento: o evento apagado não leva o termo (event_id SET NULL)',
       (select confdeltype = 'n' from pg_constraint
         where conrelid = 'public.evento_documento'::regclass
           and contype = 'f'
           and confrelid = 'public.events'::regclass)

union all
select 'evento_documento: categoria aceita termo_aceite e contrato_prestacao',
       (select pg_get_constraintdef(c.oid) ilike '%termo_aceite%'
           and pg_get_constraintdef(c.oid) ilike '%contrato_prestacao%'
          from pg_constraint c
         where c.conrelid = 'public.evento_documento'::regclass
           and c.conname = 'evento_documento_categoria_check')

union all
select 'evento_documento: origem nasce sistema',
       (select is_nullable = 'NO' and column_default ilike '''sistema''%'
          from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_documento'
           and column_name = 'origem')

union all
select 'evento_documento: os três índices existem',
       (select count(*) = 3 from pg_indexes
         where schemaname = 'public' and tablename = 'evento_documento'
           and indexname in ('idx_evento_documento_empresa_evento',
                             'idx_evento_documento_aceite',
                             'idx_evento_documento_orcamento'))

union all
select 'evento_documento: morre com o orçamento (cascade), como a linha do aceite',
       exists (select 1 from pg_constraint
                where conrelid = 'public.evento_documento'::regclass
                  and contype = 'f'
                  and confrelid = 'public.orcamentos'::regclass
                  and confdeltype = 'c');
