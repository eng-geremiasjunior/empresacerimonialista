-- ============================================================
-- Vela — Migração 141: o método do evento CORPORATIVO
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O tipo `corporativo` existe no wizard e no banco desde a 012, mas
-- nasce oco: sem semear_metodo_corporativo, instanciar_metodo_evento
-- (132) casa zero templates — Planejamento com 0%, Organização vazia
-- (tarefa só nasce de decisão), checklist do dia vazio, recursos zero,
-- roteiro sem âncora. Esta migração fecha a linha dos tipos (casamento
-- 084, debutante 122, formatura 125, show 132/133).
--
-- É ADITIVA no molde da 133: nenhum delete, tudo guardado por not
-- exists. Enriquecer depois = migração aditiva nova, nunca reescrever
-- a função (o delete cascateia e orfana os eventos vivos).
--
-- O que ela conserta de tabela, além de semear:
--   * events.escala / events.cenario tinham CHECK só com os valores de
--     casamento (083:190-195) e nunca foram ampliados — a debutante
--     (122: compacta, salão, clube…) já esbarrava nele. Os dois CHECKs
--     são recriados como superconjunto (casamento + debutante +
--     corporativo).
--   * portal_falta_decidir (090) não filtrava evento_objetivo.ativo:
--     uma confraternização (protocolo desligado) mostraria à empresa
--     "Definir autoridades". Passa a filtrar — o que também conserta o
--     casamento com cerimônia religiosa desligada.
--
-- Convenções: decisões com prefixo corp_ (metodo_decisao tem unique
-- (empresa_id, codigo) ATRAVESSANDO tipos); os campos especiais
-- chamam-se literalmente escala, cenario, verba_total, reserva_pct
-- (é por esses códigos que a faixa de contexto e a verba existem na
-- tela). Subtipo = eixo cenario (7 arquétipos) ligando objetivos
-- opcionais; porte = eixo escala (3), derivado do nº de participantes.
-- Toda decisão com codigo %contratar% ganha as 4 tarefas de contrato.

-- ------------------------------------------------------------
-- 1) Os CHECKs de events.escala / events.cenario viram superconjunto
-- ------------------------------------------------------------
-- Varredura por definição (o nome do CHECK anônimo pode variar), drop e
-- recriação nomeada — molde da 125 para o bloco do dia.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.events'::regclass
      and con.contype = 'c'
      and (pg_get_constraintdef(con.oid) ilike '%escala%'
           or pg_get_constraintdef(con.oid) ilike '%cenario%')
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;

  alter table public.events
    add constraint events_escala_check check (
      escala is null or escala in (
        'tradicional', 'mini_wedding', 'elopement',          -- casamento (084)
        'compacta',                                          -- debutante (122)
        'ate_100', '100_a_400', 'acima_400'                  -- corporativo
      )
    );

  alter table public.events
    add constraint events_cenario_check check (
      cenario is null or cenario in (
        'igreja', 'salao_urbano', 'praia', 'campo_chacara', 'destination',   -- casamento
        'salao', 'clube', 'chacara_sitio', 'casa_de_festas',                 -- debutante
        'confraternizacao', 'convencao_kickoff', 'lancamento',               -- corporativo
        'congresso_seminario', 'premiacao', 'treinamento', 'inauguracao'
      )
    );
end $$;

-- ------------------------------------------------------------
-- 2) O método corporativo — objetivos, decisões, campos, tarefas,
--    arquétipos e deltas (tudo not exists)
-- ------------------------------------------------------------
create or replace function public.semear_metodo_corporativo(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 2.1) OBJETIVOS (= categorias de orçamento; ideal soma 100 nos que
  --      têm faixa; os opcionais nascem desligados — o cenário liga)
  insert into public.metodo_objetivo
    (empresa_id, tipo_evento, codigo, nome, descricao, ordem,
     ativo_padrao, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_empresa_id, 'corporativo', v.codigo, v.nome, v.descricao, v.ordem,
         v.ativo, v.fmin, v.fideal, v.fmax
  from (values
    ('orcamento',     'Orçamento do evento',
     'Quanto se pode gastar e quanto fica de reserva.',                      0, true,  null::int, null::int, null::int),
    ('estrutura',     'Briefing e formato',
     'O que o evento precisa provocar, quem aprova, porte e tipo.',          1, true,  null, null, null),
    ('espaco',        'Local',
     'Local, visita técnica e liberação de montagem.',                       2, true,  15, 18, 25),
    ('alimentacao',   'Alimentação',
     'Coffee, almoço ou coquetel — e o número final.',                       3, true,  20, 26, 35),
    ('av_tecnologia', 'Som, projeção e transmissão',
     'Microfones, telas, streaming e o ensaio técnico.',                     4, true,  12, 18, 25),
    ('cenografia',    'Palco e cenografia',
     'Painel de marca, palco, mobiliário, sinalização.',                     5, true,   6,  9, 14),
    ('conteudo',      'Programa e condução',
     'Blocos, tempos, quem fala e quem conduz.',                             6, true,   4,  8, 15),
    ('comunicacao',   'Convite e comunicação',
     'Convite, canal e prazo de confirmação.',                               7, true,   4,  6,  8),
    ('participantes', 'Participantes, credenciamento e kits',
     'Lista, crachás, kits e a recepção no dia.',                            8, true,   4,  7, 13),
    ('foto_video',    'Foto e vídeo',
     'Cobertura e entregáveis.',                                             9, true,   2,  4,  6),
    ('protocolo',     'Protocolo e autoridades',
     'Mesa diretora, hino, bandeiras e nominata.',                          10, false, null, null, null),
    ('premiacao',     'Homenageados e troféus',
     'Categorias, quem recebe, quem entrega e a ordem.',                    11, false, null, null, null),
    ('logistica',     'Transporte e hospedagem',
     'Participantes de fora: hotel e translado.',                           12, false,  0,  4, 10),
    ('licencas',      'Licenças e segurança',
     'Alvará, AVCB e brigadistas.',                                         13, false, null, null, null),
    ('pos_evento',    'Pós-evento',
     'Fechamento com a empresa e prestação de contas.',                     14, true,  null, null, null)
  ) as v(codigo, nome, descricao, ordem, ativo, fmin, fideal, fmax)
  where not exists (
    select 1 from public.metodo_objetivo o
    where o.empresa_id = p_empresa_id
      and o.tipo_evento = 'corporativo' and o.codigo = v.codigo
  );

  -- 2.2) DECISÕES (offset em dias antes do evento; prioridade 100→20,
  --      monótona com o offset — a compressão da 070 usa patamar como piso)
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select o.id, p_empresa_id, v.codigo, v.titulo, v.resp,
         v.offi, v.offn, v.offx, v.prio, v.ordem
  from (values
    ('orcamento',     'corp_orcamento_definir',            'Definir a verba do evento',                           'ambos',          120,  90, 180, 100, 1),
    ('estrutura',     'corp_briefing',                     'Fechar o briefing: objetivo, porte e tipo de evento', 'ambos',          120,  90, 180,  99, 1),
    ('espaco',        'corp_espaco_contratar',             'Fechar o local',                                      'ambos',           90,  60, 150,  96, 1),
    ('alimentacao',   'corp_alimentacao_contratar',        'Contratar o buffet ou coffee',                        'ambos',           75,  45, 120,  94, 1),
    ('av_tecnologia', 'corp_av_contratar',                 'Contratar som, projeção e transmissão',               'ambos',           75,  45, 120,  93, 1),
    ('licencas',      'corp_licencas_conferir',            'Conferir alvará, AVCB e brigada',                     'cerimonialista',  60,  40,  90,  90, 1),
    ('conteudo',      'corp_programa_definir',             'Definir o programa e quem fala',                      'ambos',           60,  45,  90,  88, 1),
    ('cenografia',    'corp_cenografia_contratar',         'Contratar palco e cenografia',                        'ambos',           60,  40, 100,  86, 1),
    ('logistica',     'corp_logistica_definir',            'Definir transporte e hospedagem',                     'ambos',           60,  40,  90,  84, 1),
    ('comunicacao',   'corp_convite_definir',              'Definir o convite e o prazo de confirmação',          'ambos',           45,  30,  60,  80, 1),
    ('protocolo',     'corp_autoridades_definir',          'Definir autoridades, mesa diretora e hino',           'noivos',          45,  30,  75,  78, 1),
    ('conteudo',      'corp_mc_definir',                   'Definir quem conduz o evento',                        'ambos',           45,  30,  75,  76, 2),
    ('premiacao',     'corp_premiados_definir',            'Definir categorias, homenageados e quem entrega',     'noivos',          45,  30,  75,  74, 1),
    ('foto_video',    'corp_foto_contratar',               'Contratar foto e vídeo',                              'ambos',           45,  30,  90,  72, 1),
    ('participantes', 'corp_materiais_definir',            'Definir crachás, kits e brindes',                     'ambos',           45,  30,  75,  70, 1),
    ('participantes', 'corp_recepcao_contratar',           'Contratar a recepção e definir o credenciamento',     'ambos',           30,  15,  45,  62, 2),
    ('premiacao',     'corp_trofeus_contratar',            'Contratar troféus e placas',                          'ambos',           30,  20,  60,  60, 2),
    ('espaco',        'corp_espaco_vt',                    'Fazer a visita técnica',                              'cerimonialista',  21,  14,  45,  55, 2),
    ('alimentacao',   'corp_alimentacao_confirmar_numero', 'Confirmar o número final ao buffet',                  'cerimonialista',  15,  10,  20,  40, 2),
    ('protocolo',     'corp_nominata',                     'Fechar a nominata e a ordem das falas',               'cerimonialista',   7,   2,  14,  30, 2),
    ('pos_evento',    'corp_pos_fechar',                   'Fechar o evento com a empresa',                       'ambos',            0,   0,   0,  20, 1)
  ) as v(obj, codigo, titulo, resp, offi, offn, offx, prio, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id and o.tipo_evento = 'corporativo'
   and o.codigo = v.obj
  where not exists (
    select 1 from public.metodo_decisao d
    where d.empresa_id = p_empresa_id and d.codigo = v.codigo
  );

  -- 2.3) CAMPOS TIPADOS (o formulário é o roteiro da conversa;
  --      pc = pergunta que a empresa responde no portal, na voz dela)
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem,
     ativa_objetivo_codigo, ativa_quando, pergunta_cliente, label_portal)
  select d.id, p_empresa_id, c.codigo, c.label, c.tipo,
         case when c.opcoes = '' then null else string_to_array(c.opcoes, '|') end,
         nullif(c.unidade, ''), c.ordem, null, null, c.pc, nullif(c.lp, '')
  from (values
    -- orçamento (os códigos verba_total/reserva_pct alimentam a verba e o espelho da 121)
    ('corp_orcamento_definir', 'verba_total',       'Verba total',                    'moeda',   '', '',        1, false, ''),
    ('corp_orcamento_definir', 'reserva_pct',       'Reserva para imprevistos',       'numero',  '', '%',       2, false, ''),
    -- briefing (escala/cenario são os eixos de arquétipo; literais, sem prefixo)
    ('corp_briefing', 'objetivo_evento', 'O que o evento precisa provocar', 'texto',   '', '', 1, true,  'O que este evento precisa provocar, em uma frase?'),
    ('corp_briefing', 'aprovador',       'Quem aprova pela empresa',        'texto',   '', '', 2, true,  'Quem aprova arte, roteiro e contrato pela empresa?'),
    ('corp_briefing', 'formato',         'Formato',                         'escolha', 'presencial|hibrido', '', 3, false, ''),
    ('corp_briefing', 'escala',          'Porte',                           'escolha', 'ate_100|100_a_400|acima_400', '', 4, false, ''),
    ('corp_briefing', 'cenario',         'Tipo de evento',                  'escolha', 'confraternizacao|convencao_kickoff|lancamento|congresso_seminario|premiacao|treinamento|inauguracao', '', 5, false, ''),
    -- local
    ('corp_espaco_contratar', 'fornecedor',       'Local',             'fornecedor', '', '',        1, false, ''),
    ('corp_espaco_contratar', 'valor_contratado', 'Valor contratado',  'moeda',      '', '',        2, false, ''),
    ('corp_espaco_contratar', 'capacidade',       'Capacidade',        'numero',     '', 'pessoas', 3, false, ''),
    ('corp_espaco_contratar', 'contrato',         'Contrato',          'anexo',      '', '',        4, false, ''),
    ('corp_espaco_vt', 'data_visita',        'Data da visita',          'data',    '', '', 1, false, ''),
    ('corp_espaco_vt', 'liberacao_montagem', 'Liberação para montagem', 'hora',    '', '', 2, false, ''),
    ('corp_espaco_vt', 'internet_ok',        'Internet dedicada',       'sim_nao', '', '', 3, false, ''),
    -- alimentação
    ('corp_alimentacao_contratar', 'fornecedor',       'Buffet',                                   'fornecedor', '', '', 1, false, ''),
    ('corp_alimentacao_contratar', 'valor_contratado', 'Valor contratado',                         'moeda',      '', '', 2, false, ''),
    ('corp_alimentacao_contratar', 'preco_por_pessoa', 'Preço por pessoa',                         'moeda',      '', '', 3, false, ''),
    ('corp_alimentacao_contratar', 'refeicoes',        'Serviços (coffee, almoço, coquetel…)',     'texto',      '', '', 4, false, ''),
    ('corp_alimentacao_contratar', 'restricoes',       'Restrições alimentares',                   'texto',      '', '', 5, true,  'Há restrições alimentares a considerar?'),
    ('corp_alimentacao_confirmar_numero', 'participantes_confirmados', 'Participantes confirmados', 'numero', '', 'pessoas', 1, false, ''),
    -- som, projeção e transmissão
    ('corp_av_contratar', 'fornecedor',       'Fornecedor de AV',   'fornecedor', '', '',         1, false, ''),
    ('corp_av_contratar', 'valor_contratado', 'Valor contratado',   'moeda',      '', '',         2, false, ''),
    ('corp_av_contratar', 'microfones',       'Microfones sem fio', 'numero',     '', 'unidades', 3, false, ''),
    ('corp_av_contratar', 'transmissao',      'Transmissão online', 'sim_nao',    '', '',         4, false, ''),
    -- cenografia
    ('corp_cenografia_contratar', 'fornecedor',       'Cenografia',                                'fornecedor', '', '', 1, false, ''),
    ('corp_cenografia_contratar', 'valor_contratado', 'Valor contratado',                          'moeda',      '', '', 2, false, ''),
    ('corp_cenografia_contratar', 'itens',            'O que entra (palco, painel, mobiliário)',   'texto',      '', '', 3, false, ''),
    -- programa e condução
    ('corp_programa_definir', 'programa',     'Blocos e horários',   'texto', '', '', 1, false, ''),
    ('corp_programa_definir', 'palestrantes', 'Quem fala, em ordem', 'texto', '', '', 2, true,  'Quem fala? (nome, cargo, tempo)'),
    ('corp_mc_definir', 'quem_conduz',      'Quem conduz (se for da empresa)',   'texto',      '', '', 1, false, ''),
    ('corp_mc_definir', 'mc',               'Mestre de cerimônias contratado',   'fornecedor', '', '', 2, false, ''),
    ('corp_mc_definir', 'valor_contratado', 'Cachê',                             'moeda',      '', '', 3, false, ''),
    -- protocolo
    ('corp_autoridades_definir', 'autoridades',   'Autoridades e convidados especiais', 'texto',   '', '', 1, true,  'Quais autoridades ou convidados especiais serão recebidos?'),
    ('corp_autoridades_definir', 'mesa_diretora', 'Terá mesa diretora',                 'sim_nao', '', '', 2, false, ''),
    ('corp_autoridades_definir', 'hino',          'Executa o Hino Nacional',            'sim_nao', '', '', 3, false, ''),
    ('corp_nominata', 'nominata',    'Mesa, em ordem de precedência', 'texto', '', '', 1, false, ''),
    ('corp_nominata', 'ordem_falas', 'Quem fala, em ordem',           'texto', '', '', 2, false, ''),
    -- convite
    ('corp_convite_definir', 'canal',          'Canal',               'escolha', 'email|whatsapp|link', '', 1, false, ''),
    ('corp_convite_definir', 'data_envio',     'Envio',               'data',    '', '', 2, false, ''),
    ('corp_convite_definir', 'prazo_resposta', 'Prazo para confirmar','data',    '', '', 3, false, ''),
    -- participantes, credenciamento e kits
    ('corp_materiais_definir', 'itens',            'Crachás, kits e brindes', 'texto',      '', '', 1, true,  'O que cada participante recebe?'),
    ('corp_materiais_definir', 'fornecedor',       'Fornecedor',              'fornecedor', '', '', 2, false, ''),
    ('corp_materiais_definir', 'valor_contratado', 'Valor contratado',        'moeda',      '', '', 3, false, ''),
    ('corp_recepcao_contratar', 'fornecedor',       'Equipe de recepção', 'fornecedor', '', '',        1, false, ''),
    ('corp_recepcao_contratar', 'valor_contratado', 'Valor contratado',   'moeda',      '', '',        2, false, ''),
    ('corp_recepcao_contratar', 'recepcionistas',   'Recepcionistas',     'numero',     '', 'pessoas', 3, false, ''),
    ('corp_recepcao_contratar', 'credencial',       'Credencial',         'escolha',    'lista_impressa|cracha', '', 4, false, ''),
    -- premiação
    ('corp_premiados_definir', 'categorias',   'Categorias e homenageados', 'texto', '', '', 1, true,  'Quais categorias e quem são os homenageados?'),
    ('corp_premiados_definir', 'quem_entrega', 'Quem entrega cada prêmio',  'texto', '', '', 2, false, ''),
    ('corp_trofeus_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '',      1, false, ''),
    ('corp_trofeus_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '',      2, false, ''),
    ('corp_trofeus_contratar', 'quantidade',       'Quantidade',       'numero',     '', 'peças', 3, false, ''),
    -- foto e vídeo
    ('corp_foto_contratar', 'fornecedor',       'Fotógrafo / vídeo', 'fornecedor', '', '', 1, false, ''),
    ('corp_foto_contratar', 'valor_contratado', 'Valor contratado',  'moeda',      '', '', 2, false, ''),
    -- transporte e hospedagem
    ('corp_logistica_definir', 'participantes_de_fora', 'Participantes de fora', 'numero', '', 'pessoas', 1, true,  'Quantos participantes vêm de outra cidade?'),
    ('corp_logistica_definir', 'hospedagem',            'Hospedagem',            'texto',  '', '',        2, false, ''),
    ('corp_logistica_definir', 'transporte',            'Transporte',            'texto',  '', '',        3, false, ''),
    -- licenças
    ('corp_licencas_conferir', 'avcb_ok',     'AVCB do local em dia', 'sim_nao', '', '',        1, false, ''),
    ('corp_licencas_conferir', 'alvara',      'Alvará',               'anexo',   '', '',        2, false, ''),
    ('corp_licencas_conferir', 'brigadistas', 'Brigadistas',          'numero',  '', 'pessoas', 3, false, ''),
    -- pós-evento (a nota é pergunta ao cliente, com janela: só depois da data — portal.ts)
    ('corp_pos_fechar', 'nps',         'Nota da empresa (0 a 10)',     'numero', '', 'de 0 a 10', 1, true,  'De 0 a 10, quanto o evento cumpriu o objetivo?'),
    ('corp_pos_fechar', 'presentes',   'Presentes no dia',             'numero', '', 'pessoas',   2, false, ''),
    ('corp_pos_fechar', 'observacoes', 'Observações do fechamento',    'texto',  '', '',          3, false, '')
  ) as c(dec, codigo, label, tipo, opcoes, unidade, ordem, pc, lp)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = c.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'corporativo'
  where not exists (
    select 1 from public.metodo_campo mc
    where mc.decisao_id = d.id and mc.codigo = c.codigo
  );

  -- 2.4) TAREFAS — o padrão de contrato (join por tipo: só as decisões
  --      corporativas) + as específicas
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, t.titulo, 'cerimonialista', d.offset_ideal_dias, t.ord, t.vinc
  from public.metodo_decisao d
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'corporativo'
  cross join (values
    ('Solicitar e receber o contrato',               1, null::text),
    ('Analisar as cláusulas do contrato',            2, null),
    ('Assinar e arquivar o contrato',                3, null),
    ('Registrar o valor no financeiro (1ª parcela)', 4, 'financeiro')
  ) as t(titulo, ord, vinc)
  where d.empresa_id = p_empresa_id
    and d.codigo like '%contratar%'
    and not exists (
      select 1 from public.metodo_tarefa mt
      where mt.decisao_id = d.id and mt.titulo = t.titulo
    );

  -- offset negativo = depois do evento (due_date = greatest(hoje, data - offset))
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, v.titulo, v.resp, v.off, v.ord, v.vinc
  from (values
    ('corp_briefing',                     'Fazer o briefing com o aprovador (objetivo, público, verba, data)', 'cerimonialista', 115, 10, null::text),
    ('corp_convite_definir',              'Enviar a arte do convite para aprovação',                           'cerimonialista',  40, 10, null),
    ('corp_convite_definir',              'Enviar os convites',                                                'ambos',           30, 11, null),
    ('corp_convite_definir',              'Receber a lista de participantes',                                  'cerimonialista',  30, 12, null),
    ('corp_convite_definir',              'Lembrar quem não respondeu',                                        'cerimonialista',  20, 13, null),
    ('corp_espaco_vt',                    'Enviar ao AV as medidas e os pontos de energia',                    'cerimonialista',  14, 10, null),
    ('corp_mc_definir',                   'Briefing com quem conduz: objetivo, plateia, tempos e pronúncia',   'cerimonialista',  14, 10, null),
    ('corp_alimentacao_confirmar_numero', 'Informar o número final ao buffet e ao espaço',                     'cerimonialista',  12, 10, null),
    ('corp_logistica_definir',            'Confirmar hospedagem e transporte dos participantes de fora',       'cerimonialista',  10, 10, null),
    ('corp_programa_definir',             'Fechar o roteiro minuto a minuto',                                  'cerimonialista',   7, 10, 'execucao'),
    ('corp_programa_definir',             'Receber e validar as apresentações',                                'cerimonialista',   3, 11, null),
    ('corp_autoridades_definir',          'Confirmar a presença das autoridades',                              'cerimonialista',   7, 10, null),
    ('corp_licencas_conferir',            'Conferir brigadistas e saídas com o local',                         'cerimonialista',   7, 10, null),
    ('corp_materiais_definir',            'Receber e conferir crachás, kits e brindes',                        'cerimonialista',   5, 10, null),
    ('corp_premiados_definir',            'Conferir troféus, grafia dos nomes e ordem de entrega',             'cerimonialista',   3, 10, 'execucao'),
    ('corp_av_contratar',                 'Ensaio técnico de som, projeção e transmissão',                     'cerimonialista',   2, 10, 'execucao'),
    ('corp_recepcao_contratar',           'Imprimir a lista de presença e os crachás',                         'cerimonialista',   2, 10, 'execucao'),
    ('corp_recepcao_contratar',           'Briefing com a recepção',                                           'cerimonialista',   1, 11, 'execucao'),
    ('corp_nominata',                     'Repassar a nominata e a pronúncia com quem conduz',                 'cerimonialista',   1, 10, 'execucao'),
    ('corp_pos_fechar',                   'Enviar o agradecimento e pedir a nota de 0 a 10',                   'cerimonialista',  -1, 10, null),
    ('corp_pos_fechar',                   'Fechar a prestação de contas',                                      'cerimonialista',  -7, 11, 'financeiro')
  ) as v(dec, titulo, resp, off, ord, vinc)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = v.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'corporativo'
  where not exists (
    select 1 from public.metodo_tarefa mt
    where mt.decisao_id = d.id and mt.titulo = v.titulo
  );

  -- 2.5) ARQUÉTIPOS — porte (escala) e tipo de evento (cenario).
  --      Os códigos batem com as opções dos campos escala/cenario acima
  --      e com PORTE_POR_PUBLICO em src/lib/capacidades.ts.
  insert into public.metodo_arquetipo (empresa_id, tipo_evento, eixo, codigo, nome, ordem)
  select p_empresa_id, 'corporativo', v.eixo, v.codigo, v.nome, v.ordem
  from (values
    ('escala',  'ate_100',             'Até 100',               1),
    ('escala',  '100_a_400',           '100 a 400',             2),
    ('escala',  'acima_400',           'Acima de 400',          3),
    ('cenario', 'confraternizacao',    'Confraternização',      1),
    ('cenario', 'convencao_kickoff',   'Convenção / kick-off',  2),
    ('cenario', 'lancamento',          'Lançamento',            3),
    ('cenario', 'congresso_seminario', 'Congresso / seminário', 4),
    ('cenario', 'premiacao',           'Premiação',             5),
    ('cenario', 'treinamento',         'Treinamento / workshop',6),
    ('cenario', 'inauguracao',         'Inauguração',           7)
  ) as v(eixo, codigo, nome, ordem)
  where not exists (
    select 1 from public.metodo_arquetipo a
    where a.empresa_id = p_empresa_id and a.tipo_evento = 'corporativo'
      and a.eixo = v.eixo and a.codigo = v.codigo
  );

  -- 2.6) DELTAS — só as 9 operações da 083; ramificação por objetivo
  --      (liga/desliga) e por offset/faixa. 100_a_400 é a base calibrada.
  insert into public.metodo_arquetipo_delta
    (arquetipo_id, empresa_id, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
  select a.id, p_empresa_id, v.alvo_tipo, v.alvo_codigo, v.operacao, v.valor_num, v.ordem
  from (values
    -- porte pequeno: o ciclo inteiro cabe em ~2,5 meses
    ('escala', 'ate_100', 'decisao', 'corp_orcamento_definir',     'set_offset_ideal', 75::numeric,  1),
    ('escala', 'ate_100', 'decisao', 'corp_briefing',              'set_offset_ideal', 75,  2),
    ('escala', 'ate_100', 'decisao', 'corp_espaco_contratar',      'set_offset_ideal', 60,  3),
    ('escala', 'ate_100', 'decisao', 'corp_alimentacao_contratar', 'set_offset_ideal', 45,  4),
    ('escala', 'ate_100', 'decisao', 'corp_av_contratar',          'set_offset_ideal', 45,  5),
    ('escala', 'ate_100', 'decisao', 'corp_cenografia_contratar',  'set_offset_ideal', 40,  6),
    ('escala', 'ate_100', 'decisao', 'corp_programa_definir',      'set_offset_ideal', 40,  7),
    ('escala', 'ate_100', 'decisao', 'corp_convite_definir',       'set_offset_ideal', 30,  8),
    ('escala', 'ate_100', 'decisao', 'corp_foto_contratar',        'set_offset_ideal', 30,  9),
    ('escala', 'ate_100', 'decisao', 'corp_materiais_definir',     'set_offset_ideal', 30, 10),
    -- porte grande: licenças ligam e os fornecedores fecham mais cedo
    ('escala', 'acima_400', 'objetivo', 'licencas',                   'ativar_objetivo',  null, 1),
    ('escala', 'acima_400', 'decisao',  'corp_espaco_contratar',      'set_offset_ideal', 150, 2),
    ('escala', 'acima_400', 'decisao',  'corp_alimentacao_contratar', 'set_offset_ideal', 100, 3),
    ('escala', 'acima_400', 'decisao',  'corp_av_contratar',          'set_offset_ideal', 100, 4),
    ('escala', 'acima_400', 'decisao',  'corp_convite_definir',       'set_offset_ideal',  60, 5),
    ('escala', 'acima_400', 'decisao',  'corp_recepcao_contratar',    'set_offset_ideal',  45, 6),
    -- confraternização: a verba vai para a comida; AV e conteúdo encolhem
    ('cenario', 'confraternizacao', 'objetivo', 'alimentacao',   'set_faixa_pct_min',   30, 1),
    ('cenario', 'confraternizacao', 'objetivo', 'alimentacao',   'set_faixa_pct_ideal', 38, 2),
    ('cenario', 'confraternizacao', 'objetivo', 'alimentacao',   'set_faixa_pct_max',   45, 3),
    ('cenario', 'confraternizacao', 'objetivo', 'av_tecnologia', 'set_faixa_pct_min',    8, 4),
    ('cenario', 'confraternizacao', 'objetivo', 'av_tecnologia', 'set_faixa_pct_ideal', 12, 5),
    ('cenario', 'confraternizacao', 'objetivo', 'av_tecnologia', 'set_faixa_pct_max',   18, 6),
    ('cenario', 'confraternizacao', 'objetivo', 'conteudo',      'set_faixa_pct_min',    2, 7),
    ('cenario', 'confraternizacao', 'objetivo', 'conteudo',      'set_faixa_pct_ideal',  4, 8),
    ('cenario', 'confraternizacao', 'objetivo', 'conteudo',      'set_faixa_pct_max',    8, 9),
    -- convenção / kick-off: gente de fora e mesa de abertura
    ('cenario', 'convencao_kickoff', 'objetivo', 'protocolo', 'ativar_objetivo', null, 1),
    ('cenario', 'convencao_kickoff', 'objetivo', 'logistica', 'ativar_objetivo', null, 2),
    -- lançamento: cenografia de marca pesa mais
    ('cenario', 'lancamento', 'objetivo', 'protocolo',  'ativar_objetivo',     null, 1),
    ('cenario', 'lancamento', 'objetivo', 'cenografia', 'set_faixa_pct_min',    10, 2),
    ('cenario', 'lancamento', 'objetivo', 'cenografia', 'set_faixa_pct_ideal',  15, 3),
    ('cenario', 'lancamento', 'objetivo', 'cenografia', 'set_faixa_pct_max',    20, 4),
    -- congresso / seminário: programa é o coração e fecha cedo
    ('cenario', 'congresso_seminario', 'objetivo', 'protocolo',             'ativar_objetivo',     null, 1),
    ('cenario', 'congresso_seminario', 'objetivo', 'logistica',             'ativar_objetivo',     null, 2),
    ('cenario', 'congresso_seminario', 'objetivo', 'conteudo',              'set_faixa_pct_min',      8, 3),
    ('cenario', 'congresso_seminario', 'objetivo', 'conteudo',              'set_faixa_pct_ideal',   14, 4),
    ('cenario', 'congresso_seminario', 'objetivo', 'conteudo',              'set_faixa_pct_max',     20, 5),
    ('cenario', 'congresso_seminario', 'decisao',  'corp_programa_definir', 'set_offset_ideal',      90, 6),
    ('cenario', 'congresso_seminario', 'decisao',  'corp_convite_definir',  'set_offset_ideal',      60, 7),
    -- premiação
    ('cenario', 'premiacao', 'objetivo', 'premiacao', 'ativar_objetivo', null, 1),
    ('cenario', 'premiacao', 'objetivo', 'protocolo', 'ativar_objetivo', null, 2),
    -- treinamento: sala de aula, sem cenografia
    ('cenario', 'treinamento', 'objetivo', 'cenografia', 'desativar_objetivo', null, 1),
    -- inauguração: corte de fita, autoridades
    ('cenario', 'inauguracao', 'objetivo', 'protocolo', 'ativar_objetivo', null, 1)
  ) as v(eixo, arq, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
  join public.metodo_arquetipo a
    on a.empresa_id = p_empresa_id and a.tipo_evento = 'corporativo'
   and a.eixo = v.eixo and a.codigo = v.arq
  where not exists (
    select 1 from public.metodo_arquetipo_delta x
    where x.arquetipo_id = a.id and x.alvo_tipo = v.alvo_tipo
      and x.alvo_codigo = v.alvo_codigo and x.operacao = v.operacao
  );
end;
$$;

revoke all on function public.semear_metodo_corporativo(uuid) from public, anon;

-- ------------------------------------------------------------
-- 3) ROTEIRO — âncora: a abertura (offset 0). Os extras nascem só
--    quando o wizard marca o token do cenário (premiacao/inauguracao).
-- ------------------------------------------------------------
create or replace function public.semear_roteiro_corporativo(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'corporativo', v.codigo, v.titulo, v.off, v.dur, v.cond, v.ordem
  from (values
    ('montagem_cenografia', 'Montagem de palco e cenografia',            -300, 180,  null::text,   10),
    ('chegada_equipe',      'Chegada da equipe e conferência do espaço', -240, null, null,         20),
    ('montagem_av',         'Montagem e teste de som e projeção',        -180, 120,  null,         30),
    ('passagem_programa',   'Passagem do programa com quem conduz',       -60,  30,  null,         40),
    ('credenciamento',      'Abertura do credenciamento',                 -60,  60,  null,         50),
    ('abertura',            'Abertura',                                     0,  15,  null,         60),
    ('corte_fita',          'Corte de fita e descerramento da placa',      15,  20,  'inauguracao', 65),
    ('bloco_1',             'Primeiro bloco',                              15,  90,  null,         70),
    ('intervalo',           'Intervalo e coffee',                         105,  30,  null,         80),
    ('bloco_2',             'Segundo bloco',                              135,  90,  null,         90),
    ('entrega_premios',     'Entrega dos prêmios',                        225,  45,  'premiacao',   95),
    ('encerramento',        'Encerramento',                               225,  15,  null,        100),
    ('desmontagem',         'Desmontagem e devoluções',                   240, 120,  null,        110)
  ) as v(codigo, titulo, off, dur, cond, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'corporativo' and m.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_roteiro_corporativo(uuid) from public, anon;

-- ------------------------------------------------------------
-- 4) CHECKLIST DO DIA — blocos existentes (montagem / recepcao /
--    desmontagem). O item só nasce se o objetivo estiver ativo no
--    evento (requer_objetivo_codigo): protocolo, premiação, licenças e
--    logística só aparecem quando o cenário ou o porte os liga.
-- ------------------------------------------------------------
create or replace function public.semear_checklist_dia_corporativo(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_checklist_dia
    (empresa_id, tipo_evento, codigo, bloco, titulo, ordem, requer_objetivo_codigo)
  select p_empresa_id, 'corporativo', v.codigo, v.bloco, v.titulo, v.ordem, v.req
  from (values
    -- montagem
    ('reuniao_equipe',        'montagem',    'Reunião com a equipe e postos do dia',                          10, null::text),
    ('som_projecao',          'montagem',    'Som, microfones e projeção testados',                           20, 'av_tecnologia'),
    ('apresentacoes',         'montagem',    'Apresentações e vídeos carregados no computador do evento',     30, 'conteudo'),
    ('palco_cenografia',      'montagem',    'Palco, painel e mobiliário montados',                           40, 'cenografia'),
    ('mesa_credenciamento',   'montagem',    'Mesa de credenciamento com lista e crachás em ordem alfabética', 50, 'participantes'),
    ('kits_separados',        'montagem',    'Kits e brindes separados para entrega',                         60, 'participantes'),
    ('coffee_horario',        'montagem',    'Coffee e refeições no horário combinado com o buffet',          70, 'alimentacao'),
    ('mesa_diretora',         'montagem',    'Mesa diretora e púlpito montados (lugares marcados, água)',     80, 'protocolo'),
    ('bandeiras_hino',        'montagem',    'Bandeiras e hino prontos',                                      90, 'protocolo'),
    ('trofeus_ordem',         'montagem',    'Troféus conferidos e na ordem de entrega',                     100, 'premiacao'),
    ('brigada_saidas',        'montagem',    'Brigadistas em posto e saídas livres',                         110, 'licencas'),
    -- recepção (o evento acontecendo)
    ('credenciamento_fluindo','recepcao',    'Credenciamento fluindo (fila e presença marcada)',              10, 'participantes'),
    ('roteiro_repassado',     'recepcao',    'Roteiro e nominata repassados com quem conduz',                 20, 'conteudo'),
    ('autoridades',           'recepcao',    'Autoridades recebidas e posicionadas',                          30, 'protocolo'),
    ('proximo_palestrante',   'recepcao',    'Próximo palestrante avisado e com microfone',                   40, 'conteudo'),
    ('horarios',              'recepcao',    'Horários do programa acompanhados',                             50, null),
    ('fotos_momentos',        'recepcao',    'Fotógrafo avisado dos momentos-chave',                          60, 'foto_video'),
    ('premiados_avisados',    'recepcao',    'Homenageados avisados da ordem de entrega',                     70, 'premiacao'),
    ('transporte_saida',      'recepcao',    'Transporte de saída confirmado',                                80, 'logistica'),
    -- desmontagem
    ('presenca_contada',      'desmontagem', 'Presença contada e registrada',                                 10, 'participantes'),
    ('itens_devolvidos',      'desmontagem', 'Itens alugados conferidos para devolução',                      20, null),
    ('avarias',               'desmontagem', 'Ocorrências e avarias registradas',                             30, null),
    ('sobra_kits',            'desmontagem', 'Sobra de kits e brindes registrada',                            40, 'participantes')
  ) as v(codigo, bloco, titulo, ordem, req)
  where not exists (
    select 1 from public.metodo_checklist_dia m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'corporativo' and m.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_checklist_dia_corporativo(uuid) from public, anon;

-- ------------------------------------------------------------
-- 5) RECURSOS — contáveis por participante (crachás, kits, coffee) e
--    fixos por objetivo. Função própria: não se reescreve a
--    semear_recursos_metodo da 132 para acrescentar um tipo.
-- ------------------------------------------------------------
create or replace function public.semear_recursos_corporativo(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_recurso
    (objetivo_id, empresa_id, codigo, nome, unidade, regra, indice, compravel, ordem)
  select o.id, p_empresa_id, v.codigo, v.nome, v.unidade, v.regra, v.indice, v.compravel, v.ordem
  from (values
    ('participantes', 'crachas',     'Crachás',                    'unidades', 'por_pessoa',  1.100, true,  10),
    ('participantes', 'kits',        'Kits e brindes',             'unidades', 'por_pessoa',  1.000, true,  20),
    ('alimentacao',   'agua',        'Água',                       'garrafas', 'por_pessoa',  1.000, true,  10),
    ('alimentacao',   'cafe',        'Café',                       'litros',   'por_pessoa',  0.200, true,  20),
    ('alimentacao',   'salgados',    'Salgados e mini sanduíches', 'unidades', 'por_pessoa',  6.000, true,  30),
    ('alimentacao',   'doces',       'Doces e bolo',               'unidades', 'por_pessoa',  3.000, true,  40),
    ('av_tecnologia', 'microfones',  'Microfones',                 'unidades', 'fixo',        3.000, false, 10),
    ('protocolo',     'agua_mesa',   'Água da mesa diretora',      'garrafas', 'fixo',        8.000, true,  10),
    ('protocolo',     'placas_nome', 'Placas de nome da mesa',     'unidades', 'fixo',        8.000, true,  20),
    ('premiacao',     'trofeus',     'Troféus e placas',           'unidades', 'fixo',       10.000, true,  10)
  ) as v(obj, codigo, nome, unidade, regra, indice, compravel, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id
   and o.tipo_evento = 'corporativo'
   and o.codigo = v.obj
  where not exists (
    select 1 from public.metodo_recurso mr
    where mr.objetivo_id = o.id and mr.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_recursos_corporativo(uuid) from public, anon;

-- ------------------------------------------------------------
-- 6) O portal só lista decisão de objetivo ATIVO
-- ------------------------------------------------------------
-- Corpo da 090 + `and eo.ativo`. Sem isto, objetivo desligado pelo
-- cenário (protocolo numa confraternização; cerimônia religiosa num
-- casamento civil) continuava aparecendo em "Próximas decisões".
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
    and eo.ativo
    and (public.sou_cliente_do_evento(p_event_id)
         or public.pode_ver_evento(p_event_id))
  order by ed.prazo_previsto asc nulls last, ed.ordem asc;
$$;

revoke all on function public.portal_falta_decidir(uuid) from public, anon;
grant execute on function public.portal_falta_decidir(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7) Colunas aditivas: a contratante PJ e a presença no dia
-- ------------------------------------------------------------
alter table public.clients
  add column if not exists cnpj         text,
  add column if not exists razao_social text;

comment on column public.clients.cnpj is
  'Contratante pessoa jurídica (evento corporativo). Só dígitos ou formatado — a tela normaliza.';
comment on column public.clients.razao_social is
  'Razão social da contratante; name continua sendo como ela é chamada.';

-- Presença ≠ RSVP: confirmado_em/confirmado_via são a resposta antes do
-- evento; presente_em é o toque no dia. É o que torna "custo por
-- pessoa" e "presentes × confirmados" fatos, não estimativa.
alter table public.evento_convidado
  add column if not exists presente_em timestamptz;

comment on column public.evento_convidado.presente_em is
  'Quando a pessoa foi marcada como presente no dia (null = não marcada).';

-- ------------------------------------------------------------
-- 8) Empresa nova já nasce com tudo; as existentes recebem agora
-- ------------------------------------------------------------
create or replace function public.trg_semear_metodo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_metodo_casamento(new.id);
  perform public.semear_tarefas_metodo_casamento(new.id);
  perform public.semear_tarefas_acao_casamento(new.id);
  perform public.semear_metodo_debutante(new.id);
  perform public.semear_metodo_formatura(new.id);
  perform public.semear_metodo_show(new.id);
  -- depois do show: acrescenta o orçamento sem destruir o que veio antes
  perform public.semear_orcamento_show(new.id);
  perform public.semear_metodo_corporativo(new.id);
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_checklist_dia_formatura(new.id);
  perform public.semear_checklist_dia_show(new.id);
  perform public.semear_checklist_dia_corporativo(new.id);
  perform public.semear_roteiro_padrao(new.id);
  perform public.semear_roteiro_show(new.id);
  perform public.semear_roteiro_corporativo(new.id);
  perform public.semear_recursos_metodo(new.id);
  perform public.semear_recursos_corporativo(new.id);
  return new;
end $$;

do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_metodo_corporativo(e.id);
    perform public.semear_checklist_dia_corporativo(e.id);
    perform public.semear_roteiro_corporativo(e.id);
    perform public.semear_recursos_corporativo(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 9) Os corporativos VIVOS recebem o mapa
-- ------------------------------------------------------------
-- instanciar_metodo_evento sai fora quando o evento já tem objetivo
-- (guard tudo-ou-nada), e no SQL Editor não há sessão de usuária. Por
-- isso o INSERT é direto, guardado por not exists — e, ao contrário da
-- 133, SEM exigir mapa prévio: o corporativo nasce com zero objetivos.
-- Concluídos e cancelados ficam de fora (método num evento que já
-- aconteceu é ruído). O checklist do dia é lazy (nasce ao abrir o
-- Roteiro); roteiro_items dos vivos não são tocados — podem ter sido
-- editados à mão.
insert into public.evento_objetivo
  (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem,
   ativo, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
select e.id, e.empresa_id, o.id, o.nome, o.descricao, o.ordem,
       o.ativo_padrao, o.faixa_pct_min, o.faixa_pct_ideal, o.faixa_pct_max
from public.events e
join public.metodo_objetivo o
  on o.empresa_id = e.empresa_id and o.tipo_evento = 'corporativo'
where e.type = 'corporativo'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_objetivo x
    where x.event_id = e.id and x.objetivo_template_id = o.id
  );

insert into public.evento_decisao
  (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
   titulo, descricao, responsavel, offset_ideal_dias,
   offset_min_dias, offset_max_dias, prioridade, ordem)
select eo.id, eo.event_id, eo.empresa_id, d.id,
       d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias,
       d.offset_min_dias, d.offset_max_dias, d.prioridade, d.ordem
from public.evento_objetivo eo
join public.events e on e.id = eo.event_id
join public.metodo_objetivo o
  on o.id = eo.objetivo_template_id and o.tipo_evento = 'corporativo'
join public.metodo_decisao d on d.objetivo_id = o.id
where e.type = 'corporativo'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_decisao x
    where x.evento_objetivo_id = eo.id and x.decisao_template_id = d.id
  );

insert into public.evento_campo_valor
  (evento_decisao_id, event_id, empresa_id, campo_template_id,
   codigo, label, tipo, opcoes, unidade, ordem,
   pergunta_cliente, label_portal)
select ed.id, ed.event_id, ed.empresa_id, c.id,
       c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem,
       c.pergunta_cliente, c.label_portal
from public.evento_decisao ed
join public.events e on e.id = ed.event_id
join public.metodo_decisao d on d.id = ed.decisao_template_id
join public.metodo_objetivo o
  on o.id = d.objetivo_id and o.tipo_evento = 'corporativo'
join public.metodo_campo c on c.decisao_id = d.id
where e.type = 'corporativo'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_campo_valor x
    where x.evento_decisao_id = ed.id and x.codigo = c.codigo
  );

-- Prazos: é o que instanciar_metodo_evento chama ao criar (rebase + a
-- redistribuição da 070). Sem gate de sessão.
do $$
declare ev record;
begin
  for ev in
    select e.id from public.events e
    where e.type = 'corporativo'
      and e.status in ('orcamento', 'confirmado')
  loop
    perform public.aplicar_arquetipos_evento(ev.id);
  end loop;
end $$;

-- Recursos dos vivos: INSERT direto (instanciar_recursos_evento tem
-- gate pode_editar_evento e seria no-op aqui) — costura da 132, só
-- para o tipo corporativo. Só objetivo ativo, como na função.
insert into public.evento_recurso
  (event_id, empresa_id, evento_objetivo_id, recurso_template_id,
   codigo, nome, unidade, regra, indice, ordem,
   base_quantidade, base_origem, previsto)
select
  e.id, e.empresa_id, eo.id, mr.id,
  mr.codigo, mr.nome, mr.unidade, mr.regra, mr.indice, mr.ordem,
  case mr.regra
    when 'fixo'        then null
    when 'por_pessoa'  then pub.quantidade
    when 'por_unidade' then pub.mesas
  end,
  case mr.regra
    when 'fixo'        then 'fixo'
    when 'por_pessoa'  then pub.origem
    when 'por_unidade' then 'mesas'
  end,
  case mr.regra
    when 'fixo'        then mr.indice
    when 'por_pessoa'  then round(mr.indice * pub.quantidade, 2)
    when 'por_unidade' then round(mr.indice * pub.mesas, 2)
  end
from public.events e
join public.evento_objetivo eo on eo.event_id = e.id and eo.ativo
join public.metodo_objetivo mo
  on mo.id = eo.objetivo_template_id and mo.tipo_evento = 'corporativo'
join public.metodo_recurso mr
  on mr.objetivo_id = mo.id and mr.empresa_id = e.empresa_id
cross join lateral (
  select
    coalesce(nullif(conf.total, 0), coalesce(e.guests, 0)) as quantidade,
    case when coalesce(conf.total, 0) > 0 then 'confirmados' else 'guests' end as origem,
    (select count(*) from public.evento_mesa m where m.event_id = e.id) as mesas
  from (
    select coalesce(sum(1 + c.acompanhantes + c.criancas), 0)::int as total
    from public.evento_convidado c
    where c.event_id = e.id and c.confirmacao = 'confirmado'
  ) conf
) pub
where e.type = 'corporativo'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_recurso x
    where x.event_id = e.id and x.codigo = mr.codigo
  );

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'toda empresa tem os 15 objetivos do corporativo' as item,
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_objetivo o
                where o.empresa_id = em.id and o.tipo_evento = 'corporativo') <> 15
       ) as ok
union all
select 'as 21 decisões corporativas existem e todas têm prefixo corp_',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_decisao d
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.empresa_id = em.id and o.tipo_evento = 'corporativo'
                  and d.codigo like 'corp\_%') <> 21
            or exists (select 1 from public.metodo_decisao d
                       join public.metodo_objetivo o on o.id = d.objetivo_id
                       where o.empresa_id = em.id and o.tipo_evento = 'corporativo'
                         and d.codigo not like 'corp\_%')
       )
union all
select 'os 4 campos especiais existem exatamente uma vez sob o corporativo',
       not exists (
         select 1 from public.empresas em
         cross join (values ('escala'), ('cenario'), ('verba_total'), ('reserva_pct')) as k(codigo)
         where (select count(*) from public.metodo_campo c
                join public.metodo_decisao d on d.id = c.decisao_id
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.empresa_id = em.id and o.tipo_evento = 'corporativo'
                  and c.codigo = k.codigo) <> 1
       )
union all
-- (a 142 dá faixa à premiação: a soma passa a 104 — os dois estados valem)
select 'as categorias de gasto do corporativo somam 100% no ideal (104 depois da 142)',
       not exists (
         select 1 from public.empresas em
         where (select coalesce(sum(o.faixa_pct_ideal), 0)
                from public.metodo_objetivo o
                where o.empresa_id = em.id and o.tipo_evento = 'corporativo') not in (100, 104)
       )
union all
select 'objetivos sem verba própria ficam com faixa nula',
       not exists (
         select 1 from public.metodo_objetivo o
         where o.tipo_evento = 'corporativo'
           and o.codigo in ('orcamento', 'estrutura', 'protocolo', 'premiacao', 'licencas', 'pos_evento')
           and o.faixa_pct_ideal is not null
       )
union all
select 'toda decisão de contratar tem as 4 tarefas de contrato',
       not exists (
         select 1 from public.metodo_decisao d
         join public.metodo_objetivo o on o.id = d.objetivo_id
         where o.tipo_evento = 'corporativo' and d.codigo like '%contratar%'
           and (select count(*) from public.metodo_tarefa t
                where t.decisao_id = d.id) < 4
       )
union all
select 'cada empresa tem 3 portes + 7 tipos e ao menos 40 deltas',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_arquetipo a
                where a.empresa_id = em.id and a.tipo_evento = 'corporativo') <> 10
            or (select count(*) from public.metodo_arquetipo_delta x
                join public.metodo_arquetipo a on a.id = x.arquetipo_id
                where a.empresa_id = em.id and a.tipo_evento = 'corporativo') < 40
       )
union all
select 'todo delta aponta para objetivo ou decisão que existe no tipo',
       not exists (
         select 1 from public.metodo_arquetipo_delta x
         join public.metodo_arquetipo a on a.id = x.arquetipo_id
         where a.tipo_evento = 'corporativo'
           and not (
             (x.alvo_tipo = 'objetivo' and exists (
                select 1 from public.metodo_objetivo o
                where o.empresa_id = a.empresa_id and o.tipo_evento = 'corporativo'
                  and o.codigo = x.alvo_codigo))
             or
             (x.alvo_tipo = 'decisao' and exists (
                select 1 from public.metodo_decisao d
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.empresa_id = a.empresa_id and o.tipo_evento = 'corporativo'
                  and d.codigo = x.alvo_codigo))
           )
       )
union all
select 'toda opção dos campos escala/cenario existe como arquétipo (casamento, debutante, corporativo)',
       not exists (
         select 1
         from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         join public.metodo_objetivo o on o.id = d.objetivo_id
         cross join lateral unnest(c.opcoes) as op(token)
         where c.codigo in ('escala', 'cenario')
           and o.tipo_evento in ('casamento', 'debutante', 'corporativo')
           and not exists (
             select 1 from public.metodo_arquetipo a
             where a.empresa_id = o.empresa_id and a.tipo_evento = o.tipo_evento
               and a.eixo = c.codigo and a.codigo = op.token
           )
       )
union all
select 'o CHECK de events.escala aceita o corporativo E a debutante',
       exists (
         select 1 from pg_constraint con
         where con.conrelid = 'public.events'::regclass and con.conname = 'events_escala_check'
           and pg_get_constraintdef(con.oid) like '%acima_400%'
           and pg_get_constraintdef(con.oid) like '%compacta%'
       )
union all
select 'o CHECK de events.cenario aceita o corporativo E a debutante',
       exists (
         select 1 from pg_constraint con
         where con.conrelid = 'public.events'::regclass and con.conname = 'events_cenario_check'
           and pg_get_constraintdef(con.oid) like '%confraternizacao%'
           and pg_get_constraintdef(con.oid) like '%casa_de_festas%'
       )
union all
select 'todo item do dia pendura em objetivo que existe no tipo',
       not exists (
         select 1 from public.metodo_checklist_dia m
         where m.tipo_evento = 'corporativo'
           and m.requer_objetivo_codigo is not null
           and not exists (
             select 1 from public.metodo_objetivo o
             where o.empresa_id = m.empresa_id and o.tipo_evento = 'corporativo'
               and o.codigo = m.requer_objetivo_codigo
           )
       )
union all
select 'cada empresa tem 13 itens de roteiro (com a âncora), 23 do dia e 10 recursos',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_roteiro_item r
                where r.empresa_id = em.id and r.tipo_evento = 'corporativo') <> 13
            or not exists (select 1 from public.metodo_roteiro_item r
                           where r.empresa_id = em.id and r.tipo_evento = 'corporativo'
                             and r.offset_min = 0)
            or (select count(*) from public.metodo_checklist_dia m
                where m.empresa_id = em.id and m.tipo_evento = 'corporativo') <> 23
            -- (a 142 tira o recurso "microfones": 9 depois dela)
            or (select count(*) from public.metodo_recurso mr
                join public.metodo_objetivo o on o.id = mr.objetivo_id
                where o.empresa_id = em.id and o.tipo_evento = 'corporativo') not in (9, 10)
       )
union all
select 'empresa nova nasce com o corporativo (trigger)',
       (select prosrc like '%semear_metodo_corporativo%'
           and prosrc like '%semear_checklist_dia_corporativo%'
           and prosrc like '%semear_roteiro_corporativo%'
           and prosrc like '%semear_recursos_corporativo%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'trg_semear_metodo_empresa')
union all
select 'o portal só lista decisão de objetivo ativo',
       (select prosrc like '%eo.ativo%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'portal_falta_decidir')
union all
select 'as funções novas existem UMA vez (sem overload)',
       not exists (
         select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('semear_metodo_corporativo', 'semear_roteiro_corporativo',
                             'semear_checklist_dia_corporativo', 'semear_recursos_corporativo')
         group by p.proname having count(*) <> 1
       )
union all
select 'todo corporativo vivo tem o campo de verba',
       not exists (
         select 1 from public.events e
         where e.type = 'corporativo' and e.status in ('orcamento', 'confirmado')
           and not exists (
             select 1 from public.evento_campo_valor v
             where v.event_id = e.id and v.codigo = 'verba_total'
           )
       )
union all
select 'nenhum mapa corporativo ficou órfão do template',
       not exists (
         select 1 from public.evento_objetivo eo
         join public.events e on e.id = eo.event_id
         where e.type = 'corporativo' and eo.objetivo_template_id is null
       )
union all
select 'os métodos dos outros tipos não mudaram de tamanho (17 casamento, 15 debutante)',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_objetivo o
                where o.empresa_id = em.id and o.tipo_evento = 'casamento') <> 17
            or (select count(*) from public.metodo_objetivo o
                where o.empresa_id = em.id and o.tipo_evento = 'debutante') <> 15
       )
union all
select 'as colunas novas existem (clients.cnpj, clients.razao_social, evento_convidado.presente_em)',
       (select count(*) from information_schema.columns
        where table_schema = 'public'
          and ((table_name = 'clients' and column_name in ('cnpj', 'razao_social'))
               or (table_name = 'evento_convidado' and column_name = 'presente_em'))) = 3;
