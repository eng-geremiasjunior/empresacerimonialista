-- ============================================================
-- Vela — Migração 090: quem é a cerimonialista, e o que é pergunta
--
-- Duas correções que a cliente VÊ hoje no portal, e nada além disso
-- (o lote é deliberadamente pequeno e isolado: se algo quebrar, é aqui).
--
-- 1) "Sua cerimonialista: Proprietária"
--    membros_equipe.nome de todas as donas reais é o literal 'Proprietária'
--    — o fallback do gatilho de signup, porque as contas nasceram sem
--    metadata 'name'. E nenhuma tela do sistema edita essa coluna.
--
--    FONTE ÚNICA: membros_equipe.nome. Não há sincronização com o
--    display_name do auth — duas fontes espelhadas divergem, e o bug
--    volta. Motivo da escolha: o nome profissional já tem vários
--    consumidores que fazem JOIN (portal, tela de equipe, seletor de
--    responsável), e user_metadata só é legível pela PRÓPRIA sessão, então
--    nunca serviria para mostrar o nome de OUTRA pessoa — que é
--    exatamente o caso do portal. O display_name entra aqui UMA vez, como
--    origem do backfill, e depois é abandonado.
--
--    O contato também estava quebrado: o botão "Falar com" depende do
--    WhatsApp institucional por tipo de evento, vazio na maioria das
--    empresas. Agora a PESSOA tem WhatsApp próprio, e o institucional
--    vira o segundo lugar a olhar.
--
-- 2) Perguntas com linguagem de trabalho
--    "Orçamentos (até 3)", "Tem gerador", "Valor da hora extra" chegaram à
--    noiva. O responsável da DECISÃO está certo (o casal participa de
--    "Buscar referências e orçar espaços"); o grão errado é o CAMPO —
--    dentro do mesmo bloco convivem a pergunta dela e a anotação de visita
--    técnica. Agora cada campo diz se é pergunta da cliente, e com que
--    rótulo na voz dela.
--
-- NOTA DE MÉTODO: a lista de perguntas abaixo foi conferida contra os
-- códigos REAIS do seed (084) — um código inventado seria marcado como
-- zero linhas, sem erro nenhum, e a tela da noiva ficaria vazia em
-- silêncio. O bloco final conta e IMPRIME quantos casaram.
--
-- SEM TABELA TEMPORÁRIA (lição da 1ª tentativa, que falhou com
-- 'relation "_perguntas_curadas" does not exist'): o SQL Editor do
-- Supabase vai ao banco por um pooler em modo transação, então cada
-- statement pode cair numa conexão diferente — e tabela temporária vive
-- na sessão. Pelo mesmo motivo o begin/commit abaixo NÃO garante
-- rollback: statements já aplicados permanecem. Por isso tudo aqui é
-- convergente e pode ser reexecutado quantas vezes for preciso.
--
-- Execute no SQL Editor do Supabase (depois da 089).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) A pessoa: WhatsApp próprio + nome editável pela própria dona
-- ------------------------------------------------------------

alter table public.membros_equipe
  add column if not exists whatsapp text;

comment on column public.membros_equipe.nome is
  'Fonte ÚNICA do nome profissional. É o que a cliente vê no portal. Não espelha o display_name do auth.';
comment on column public.membros_equipe.whatsapp is
  'WhatsApp da PESSOA. O portal prefere este ao institucional da empresa.';

-- Backfill do legado: onde o nome nunca foi preenchido (o literal do
-- gatilho), aproveita o display_name que a pessoa já digitou em
-- Configurações. Uso único — daqui em diante o auth não é mais lido.
update public.membros_equipe m
set nome = coalesce(
      nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      m.nome
    )
from auth.users u
where u.id = m.user_id
  and m.nome in ('Proprietária', 'Proprietaria')
  and coalesce(
        nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
        nullif(trim(u.raw_user_meta_data->>'name'), '')
      ) is not null;

-- A tela de Configurações precisa gravar aqui, e membro não-dono não tem
-- policy de UPDATE na própria linha (024: só a dona gerencia a equipe).
-- SECURITY DEFINER com escopo de UMA linha: a do próprio usuário.
create or replace function public.atualizar_meu_perfil(
  p_nome     text,
  p_whatsapp text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nullif(trim(p_nome), '');
begin
  if auth.uid() is null then
    return;
  end if;
  if v_nome is null then
    raise exception 'Informe seu nome.';
  end if;

  update public.membros_equipe
     set nome     = v_nome,
         whatsapp = nullif(trim(p_whatsapp), '')
   where user_id = auth.uid();
end $$;

revoke all on function public.atualizar_meu_perfil(text, text) from public, anon;
grant execute on function public.atualizar_meu_perfil(text, text) to authenticated;

-- ------------------------------------------------------------
-- 2) O contato que o portal mostra
-- ------------------------------------------------------------
-- Mesma forma da 086, com uma mudança: o WhatsApp da PESSOA responsável
-- vem antes do institucional. Continua sem expor membros_equipe à cliente.
create or replace function public.portal_contato_cerimonialista(p_event_id uuid)
returns table(nome text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $$
  with responsavel as (
    -- a responsável pelo evento; sem ela, a dona da empresa
    select coalesce(
      (select me.id
         from public.membros_equipe me
         join public.events e on e.cerimonialista_responsavel_id = me.id
        where e.id = p_event_id),
      (select me.id
         from public.membros_equipe me
         join public.events e on e.empresa_id = me.empresa_id
        where e.id = p_event_id and me.is_owner
        limit 1)
    ) as membro_id
  )
  select
    (select me.nome from public.membros_equipe me
      where me.id = (select membro_id from responsavel)) as nome,
    coalesce(
      (select nullif(trim(me.whatsapp), '') from public.membros_equipe me
        where me.id = (select membro_id from responsavel)),
      (select eci.whatsapp_contato
         from public.empresa_conteudo_institucional eci
         join public.events e on e.empresa_id = eci.empresa_id
        where e.id = p_event_id
          and eci.tipo_evento::text = e.type
        limit 1)
    ) as whatsapp
  where public.sou_cliente_do_evento(p_event_id)
     or public.pode_ver_evento(p_event_id);
$$;

revoke all on function public.portal_contato_cerimonialista(uuid) from public, anon;
grant execute on function public.portal_contato_cerimonialista(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) Pergunta é atributo do CAMPO, com rótulo na voz da cliente
-- ------------------------------------------------------------

alter table public.metodo_campo
  add column if not exists pergunta_cliente boolean not null default false,
  add column if not exists label_portal     text;

alter table public.evento_campo_valor
  add column if not exists pergunta_cliente boolean not null default false,
  add column if not exists label_portal     text;

comment on column public.metodo_campo.pergunta_cliente is
  'true = o portal PERGUNTA este campo à cliente. false = anotação de trabalho da cerimonialista (ela pode ver no portal, mas não é pergunta).';
comment on column public.metodo_campo.label_portal is
  'O mesmo campo dito na voz da cliente. Nulo = usa o label interno.';

-- ------------------------------------------------------------
-- 4) Curadoria: o que SÓ a noiva sabe
-- ------------------------------------------------------------
-- Critério: gosto, contexto da família, corpo, escolha pessoal. Fica de
-- fora todo levantamento, inspeção técnica, negociação e dinheiro — isso
-- é trabalho da cerimonialista, e ela continua vendo tudo no Planejamento.
--
-- Todos os códigos abaixo foram conferidos contra o seed real.

-- A lista vive DENTRO do update, uma vez só. As instâncias herdam do
-- template depois (por template_id, e por código para as órfãs), então a
-- lista nunca precisa ser repetida — e não há tabela temporária.
update public.metodo_campo c
set pergunta_cliente = true,
    label_portal     = p.label_portal
from (values
  -- o formato do dia
  ('prioridades',           'O que não pode faltar no dia de vocês?'),
  ('tipo_cerimonia',        'A cerimônia será religiosa, civil ou simbólica?'),
  ('mesmo_local',           'Cerimônia e festa no mesmo lugar?'),
  ('tera_cortejo',          'Vai ter cortejo de entrada?'),
  ('duracao_recepcao',      'Quantas horas de festa vocês querem?'),
  ('convidados_estimado',   'Quantas pessoas vocês imaginam convidar?'),
  ('formato_civil',         'O civil será no cartório ou no dia do casamento?'),
  ('regime',                'Qual regime de bens vocês escolheram?'),
  -- a cerimônia
  ('igreja_nome',           'Em qual igreja vocês querem casar?'),
  ('leituras',              'Que leituras e salmos vocês querem na cerimônia?'),
  ('lista_musicas',         'Músicas da entrada, das alianças e da saída'),
  -- o que vocês vão vestir
  ('modalidade_vestido',    'O vestido será comprado, alugado ou sob medida?'),
  ('atelie',                'Já tem um ateliê ou loja em mente?'),
  ('itens_acessorios',      'Véu, grinalda e acessórios: como você imagina?'),
  ('modalidade_traje',      'O traje do noivo será comprado ou alugado?'),
  ('paleta_madrinhas',      'Cor e modelo dos vestidos das madrinhas'),
  -- o clima da festa
  ('paleta_cores',          'Quais cores vocês querem ver no dia?'),
  ('estilo_desejado',       'Que clima vocês querem na decoração?'),
  ('modelo_bouquet',        'Como você imagina o seu bouquet?'),
  ('banda_ou_dj',           'Vocês preferem banda ou DJ?'),
  ('playlist',              'O que vocês querem ouvir na festa?'),
  ('lista_veto',            'Tem música que vocês não querem de jeito nenhum?'),
  ('musica_primeira_danca', 'Qual será a música da primeira dança?'),
  ('atracoes',              'Que atrações vocês querem na festa?'),
  -- comida, bebida e lembrança
  ('lista_bebidas',         'Que bebidas vocês querem servir?'),
  ('topo_bolo',             'Como vocês imaginam o topo do bolo?'),
  ('tipo_lembrancinha',     'Que lembrancinha vocês querem dar?'),
  -- fotos e o depois
  ('referencias_foto',      'Que estilo de foto vocês gostam?'),
  ('lista_fotos',           'Quais fotos não podem faltar?'),
  ('carro',                 'Como vocês querem chegar?'),
  ('destino',               'Para onde vocês vão depois do casamento?'),
  ('hashtag',               'Qual hashtag vocês querem usar?')
) as p(codigo, label_portal)
where c.codigo = p.codigo;

-- Só faz sentido perguntar o que pertence a uma decisão do casal: se um
-- código curado cair numa decisão da cerimonialista, ele não vira
-- pergunta (a policy do portal nem devolveria a linha).
update public.metodo_campo c
set pergunta_cliente = false,
    label_portal     = null
from public.metodo_decisao d
where d.id = c.decisao_id
  and c.pergunta_cliente
  and d.responsavel not in ('noivos', 'ambos');

-- Travas que valem para SEMPRE, mesmo que alguém edite o Playbook depois:
--   dinheiro, fornecedor e anexo nunca são pergunta;
--   'escala' e 'cenario' escrevem em events e redistribuem o método
--   inteiro (083) — não são pergunta de portal em hipótese alguma;
--   'reserva_pct' é a reserva para imprevistos, que a cliente não vê.
update public.metodo_campo
set pergunta_cliente = false,
    label_portal     = null
where tipo in ('moeda', 'fornecedor', 'anexo')
   or codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total')
   or codigo like 'valor%'
   or codigo like 'orcamento%';

-- Backfill das instâncias já criadas, pelo template de origem.
update public.evento_campo_valor v
set pergunta_cliente = c.pergunta_cliente,
    label_portal     = c.label_portal
from public.metodo_campo c
where c.id = v.campo_template_id;

-- Instâncias órfãs (sem vínculo de template) casam pelo CÓDIGO com o que
-- o template já marcou — a lista não se repete aqui. distinct on porque
-- o mesmo código existe uma vez por empresa.
update public.evento_campo_valor v
set pergunta_cliente = true,
    label_portal     = t.label_portal
from (
  select distinct on (codigo) codigo, label_portal
  from public.metodo_campo
  where pergunta_cliente
  order by codigo, label_portal
) t, public.evento_decisao d
where v.campo_template_id is null
  and v.codigo = t.codigo
  and d.id = v.evento_decisao_id
  and d.responsavel in ('noivos', 'ambos')
  and v.tipo not in ('moeda', 'fornecedor', 'anexo')
  and v.codigo not in ('escala', 'cenario', 'reserva_pct', 'verba_total');

-- As mesmas travas valem para a instância (o backfill acima veio do
-- template, mas uma instância órfã pode ter tipo diferente).
update public.evento_campo_valor
set pergunta_cliente = false,
    label_portal     = null
where pergunta_cliente
  and (tipo in ('moeda', 'fornecedor', 'anexo')
       or codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total'));

-- ------------------------------------------------------------
-- 4b) O que falta decidir, com o NOME do assunto
-- ------------------------------------------------------------
-- A tela nova mostra "Fotografia — Pesquisar o estilo de fotógrafos".
-- O nome vem de evento_objetivo, que continua FECHADO para a cliente
-- (valor_previsto e reserva são leitura da cerimonialista). Mesmo padrão
-- da RPC de contratados: sai o nome, nunca a tabela.
create or replace function public.portal_falta_decidir(p_event_id uuid)
returns table (
  id             uuid,
  titulo         text,
  prazo_previsto date,
  objetivo_nome  text
)
language sql
stable
security definer
set search_path = public
as $$
  select ed.id, ed.titulo, ed.prazo_previsto, eo.nome as objetivo_nome
  from public.evento_decisao ed
  join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
  where ed.event_id = p_event_id
    and ed.estado = 'pendente'
    and ed.responsavel in ('noivos', 'ambos')
    and (public.sou_cliente_do_evento(p_event_id)
         or public.pode_ver_evento(p_event_id))
  order by ed.prazo_previsto asc nulls last, ed.ordem asc;
$$;

revoke all on function public.portal_falta_decidir(uuid) from public, anon;
grant execute on function public.portal_falta_decidir(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) Campo novo nasce sabendo se é pergunta
-- ------------------------------------------------------------
-- Por GATILHO, não reescrevendo instanciar_metodo_evento(): aquela função
-- cria a árvore inteira de todo evento novo, e trocá-la por uma cópia
-- para acrescentar duas colunas é risco desproporcional. O gatilho é
-- pequeno, aditivo, e cobre TODOS os caminhos de criação de campo —
-- inclusive o campo próprio que a cerimonialista cria no drawer.
create or replace function public.trg_campo_herda_pergunta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- quem já veio decidido (a própria migração, um insert explícito) passa
  if new.pergunta_cliente then
    return new;
  end if;

  if new.campo_template_id is not null then
    select c.pergunta_cliente, c.label_portal
      into new.pergunta_cliente, new.label_portal
    from public.metodo_campo c
    where c.id = new.campo_template_id;
  end if;

  -- campo próprio (sem template) nunca nasce como pergunta: quem decide
  -- que uma pergunta nova vai ao portal é a cerimonialista, na tela.
  new.pergunta_cliente := coalesce(new.pergunta_cliente, false);
  return new;
end $$;

drop trigger if exists trg_campo_herda_pergunta on public.evento_campo_valor;
create trigger trg_campo_herda_pergunta
  before insert on public.evento_campo_valor
  for each row execute function public.trg_campo_herda_pergunta();

-- ------------------------------------------------------------
-- 6) Relatório: o que esta migração de fato marcou
-- ------------------------------------------------------------
-- Sem isto, um código que não existisse mais no seed passaria batido e a
-- tela da noiva ficaria vazia sem ninguém perceber.
do $$
declare
  v_codigos   int;
  v_template  int;
  v_instancia int;
  v_donas     int;
  v_proibidos int;
begin
  select count(distinct codigo) into v_codigos
    from public.metodo_campo where pergunta_cliente;
  select count(*) into v_template
    from public.metodo_campo where pergunta_cliente;
  select count(*) into v_instancia
    from public.evento_campo_valor where pergunta_cliente;
  select count(*) into v_donas from public.membros_equipe
   where is_owner and nome in ('Proprietária', 'Proprietaria');
  select count(*) into v_proibidos from public.metodo_campo
   where pergunta_cliente
     and (tipo in ('moeda','fornecedor','anexo')
          or codigo in ('escala','cenario','reserva_pct','verba_total'));

  raise notice '--- 090 ---';
  raise notice 'perguntas: % codigos distintos | % linhas no template | % instancias',
    v_codigos, v_template, v_instancia;
  raise notice 'campos proibidos marcados (tem de ser 0): %', v_proibidos;
  raise notice 'donas ainda sem nome de gente (preencher em Configuracoes): %', v_donas;

  if v_codigos < 30 then
    raise notice 'ATENCAO: esperados 32 codigos; algum sumiu do seed.';
  end if;
end $$;

commit;
