-- 084 — Seed do método unificado de casamento (5B)
--
-- Substitui o seed da 064 (só Gio Meirelles) pela consolidação de 4 fontes
-- (Gio, Danilo Siqueira, Fernanda Floret, Albuquerque e Cia), já no modelo
-- novo: decisão produz CAMPOS TIPADOS (o guia virou os campos), objetivo é
-- categoria de orçamento (faixas %), prazo é faixa (min/ideal/max) e
-- arquétipos aplicam delta (ESCALA × CENÁRIO).
--
-- 16 objetivos-com-decisões (blocos 1–16 do método). NÃO entram:
--   #17 Reserva de imprevistos — é fatia da verba (campo reserva_pct do
--       budget), não objetivo. #18 Semana/Dia D e #19 Pós-casamento — são
--       tarefa/timeline (Organização/Execução), ficam para a próxima etapa.
--   Cuidados pessoais — ramo opcional (5D).
--
-- Padrão canônico de fornecedor: orçar → [degustar|conhecer|entrevistar|
-- experimentar|visitar] → contratar. E TODA decisão de contratar gera as
-- mesmas 4 tarefas — uma única inserção por LIKE '%contratar%' garante a
-- consistência sem escrever 28 blocos.
--
-- Re-seed versionado: apaga o método de casamento da empresa e re-semeia
-- (pré-lançamento, dado de teste). Instâncias antigas ficam órfãs de
-- template (FK on delete set null) e são re-instanciadas por script.
-- metodo_guia antigo morre no cascade — a fonte do mapeamento guia→campo é
-- o próprio doc do método (e a 064 no git); evento_guia (instância) fica.

create or replace function public.semear_metodo_casamento(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.metodo_objetivo
    where empresa_id = p_empresa_id and tipo_evento = 'casamento';
  delete from public.metodo_arquetipo
    where empresa_id = p_empresa_id and tipo_evento = 'casamento';

  -- ------------------------------------------------------------
  -- 1) OBJETIVOS (= categorias de orçamento; faixa % de referência)
  -- ------------------------------------------------------------
  insert into public.metodo_objetivo
    (empresa_id, tipo_evento, codigo, nome, descricao, ordem,
     ativo_padrao, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_empresa_id, 'casamento', v.codigo, v.nome, v.descricao, v.ordem,
         v.ativo, v.fmin, v.fideal, v.fmax
  from (values
    ('estrutura',  'Estrutura e datas',
     'Data, formato, convidados, verba e prioridades — as decisões-raiz.',
     1,  true,  null::int, null::int, null::int),
    ('espaco',     'Espaço e recepção',              null, 2,  true,  10, 18, 25),
    ('buffet',     'Buffet e bebidas',               null, 3,  true,  20, 30, 50),
    ('cerimonia',  'Cerimônia religiosa',
     'Nasce desligada — liga pelo cenário igreja ou pelo tipo de cerimônia.',
     4,  false, 2,  3,  5),
    ('decoracao',  'Decoração e flores',             null, 5,  true,  8,  12, 15),
    ('foto',       'Foto e vídeo',                   null, 6,  true,  10, 12, 15),
    ('musica',     'Música e atrações',              null, 7,  true,  5,  10, 15),
    ('noiva',      'Trajes e beleza — noiva',        null, 8,  true,  7,  8,  10),
    ('noivo',      'Trajes — noivo, padrinhos e daminhas', null, 9, true, 3, 4, 5),
    ('papelaria',  'Papelaria e convites',           null, 10, true,  3,  4,  5),
    ('doces',      'Doces, bolo e lembrancinhas',    null, 11, true,  2,  3,  5),
    ('convidados', 'Convidados e RSVP',              null, 12, true,  null, null, null),
    ('infra',      'Infraestrutura e logística',     null, 13, true,  3,  5,  8),
    ('civil',      'Documentação civil',             null, 14, true,  1,  1,  2),
    ('lua_mel',    'Lua de mel',
     'Fora da verba do evento — rastrear separado.', 15, true, null, null, null),
    ('satelites',  'Eventos satélite',
     'Noivado, chás, despedida, jantar com padrinhos. Fora da verba principal.',
     16, true,  null, null, null)
  ) as v(codigo, nome, descricao, ordem, ativo, fmin, fideal, fmax);

  -- ------------------------------------------------------------
  -- 2) DECISÕES (offset como faixa; prioridade = estruturação, separada
  --    do offset de propósito — a 4D comprime pela prioridade)
  -- ------------------------------------------------------------
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select o.id, p_empresa_id, v.codigo, v.titulo, v.resp,
         v.offi, v.offn, v.offx, v.prio, v.ordem
  from (values
    -- estrutura
    ('estrutura', 'data',              'Definir a data do casamento',            'noivos', 365, 330, 365, 100, 1),
    ('estrutura', 'formato',           'Definir o formato do casamento',         'noivos', 360, 330, 365, 99,  2),
    ('estrutura', 'convidados_numero', 'Definir o número estimado de convidados','noivos', 355, 300, 365, 98,  3),
    ('estrutura', 'budget',            'Levantar o budget',                      'ambos',  355, 300, 365, 97,  4),
    ('estrutura', 'prioridades',       'Definir as prioridades do casal',        'noivos', 350, 300, 365, 96,  5),
    -- espaço (orçar → visitar → contratar)
    ('espaco', 'espaco_orcar',     'Buscar referências e orçar espaços',  'ambos',         330, 300, 365, 92, 1),
    ('espaco', 'espaco_visitar',   'Visitar e escolher o espaço',         'ambos',         320, 290, 350, 91, 2),
    ('espaco', 'espaco_contratar', 'Contratar o espaço',                  'ambos',         310, 280, 360, 90, 3),
    ('espaco', 'espaco_vt',        'Realizar visita técnica ao espaço',   'cerimonialista', 90,  60, 120, 40, 4),
    -- buffet (orçar → degustar → contratar)
    ('buffet', 'buffet_tipo_servico',     'Definir o tipo de serviço',              'ambos',         320, 280, 340, 89, 1),
    ('buffet', 'buffet_orcar',            'Buscar referências e orçar buffets',     'ambos',         315, 300, 335, 88, 2),
    ('buffet', 'buffet_degustar',         'Fazer a degustação',                     'noivos',        310, 280, 330, 87, 3),
    ('buffet', 'buffet_contratar',        'Contratar o buffet',                     'ambos',         305, 300, 335, 86, 4),
    ('buffet', 'drinks_contratar',        'Contratar o bar de drinks',              'ambos',         240, 180, 270, 70, 5),
    ('buffet', 'buffet_cardapio',         'Definir o cardápio final',               'ambos',         120,  90, 150, 45, 6),
    ('buffet', 'bebidas_lista',           'Definir as bebidas a comprar',           'ambos',          90,  60, 120, 35, 7),
    ('buffet', 'buffet_confirmar_numero', 'Confirmar a quantidade final ao buffet', 'cerimonialista', 12,  10,  15, 20, 8),
    -- cerimônia religiosa (nasce desligada)
    ('cerimonia', 'igreja_escolher',      'Escolher a igreja',                        'noivos', 300, 270, 365, 85, 1),
    ('cerimonia', 'igreja_reservar',      'Reservar a data na igreja',                'ambos',  290, 260, 350, 84, 2),
    ('cerimonia', 'celebrante_contratar', 'Contratar o celebrante',                   'ambos',  270, 180, 270, 80, 3),
    ('cerimonia', 'coral_contratar',      'Contratar coral ou músicos da cerimônia',  'ambos',  180, 120, 240, 60, 4),
    ('cerimonia', 'curso_noivos',         'Fazer o curso de noivos',                  'noivos', 120,  60, 180, 42, 5),
    ('cerimonia', 'cerimonia_musicas',    'Definir as músicas da cerimônia',          'noivos',  60,  45,  90, 30, 6),
    ('cerimonia', 'leituras',             'Escolher leituras e salmos',               'noivos',  45,  30,  60, 25, 7),
    ('cerimonia', 'ensaio_igreja',        'Fazer o ensaio na igreja',                 'ambos',    7,   7,  14, 12, 8),
    -- decoração (briefing → orçar/portfólio → contratar)
    ('decoracao', 'decoracao_briefing',  'Fazer o briefing de decoração',            'ambos',  280, 240, 300, 83, 1),
    ('decoracao', 'decoracao_orcar',     'Conhecer portfólios e orçar decoração',    'ambos',  270, 240, 300, 82, 2),
    ('decoracao', 'decoracao_contratar', 'Contratar a decoração',                    'ambos',  260, 240, 300, 81, 3),
    ('decoracao', 'decoracao_layout',    'Definir layout, mobiliário e iluminação',  'ambos',   90,  60, 120, 38, 4),
    ('decoracao', 'decoracao_cerimonia', 'Definir a decoração da cerimônia',         'ambos',   75,  60,  90, 32, 5),
    ('decoracao', 'bouquet',             'Definir bouquet e flores do cortejo',      'noivos',  60,  45,  90, 28, 6),
    -- foto e vídeo (pesquisar → portfólio → contratar; exclusivo, fecha cedo)
    ('foto', 'foto_pesquisar', 'Pesquisar o estilo de fotógrafos',    'noivos', 310, 270, 365, 87, 1),
    ('foto', 'foto_portfolio', 'Conhecer portfólio e pacotes',        'ambos',  300, 240, 350, 86, 2),
    ('foto', 'foto_contratar', 'Contratar o fotógrafo',               'ambos',  290, 180, 365, 85, 3),
    ('foto', 'video_contratar','Contratar o cinegrafista',            'ambos',  280, 180, 330, 78, 4),
    ('foto', 'pre_wedding',    'Fazer o ensaio pré-wedding',          'noivos',  90,  60, 120, 36, 5),
    ('foto', 'lista_fotos',    'Definir a lista de fotos importantes','noivos',  30,  21,  45, 18, 6),
    -- música e atrações
    ('musica', 'musica_definir',     'Definir banda ou DJ',                          'noivos', 280, 180, 330, 80, 1),
    ('musica', 'dj_contratar',       'Contratar o DJ ou a banda',                    'ambos',  270, 180, 330, 79, 2),
    ('musica', 'som_luz_contratar',  'Contratar sonorização e iluminação de pista',  'ambos',  240, 180, 270, 68, 3),
    ('musica', 'atracoes_extras',    'Definir e contratar atrações extras',          'ambos',  150,  90, 210, 50, 4),
    ('musica', 'playlist',           'Definir playlist, vetos e primeira dança',     'noivos',  30,  21,  45, 16, 5),
    -- noiva (experimentar)
    ('noiva', 'vestido_modalidade',   'Definir o vestido: comprar, alugar ou sob medida', 'noivos', 300, 240, 330, 84, 1),
    ('noiva', 'vestido_escolher',     'Escolher o vestido',                               'noivos', 270, 240, 300, 83, 2),
    ('noiva', 'dia_noiva_contratar',  'Contratar o dia da noiva',                         'noivos', 150,  90, 180, 55, 3),
    ('noiva', 'sapatos',              'Comprar os sapatos',                               'noivos', 120,  90, 150, 44, 4),
    ('noiva', 'acessorios',           'Definir véu, grinalda e acessórios',               'noivos',  90,  60, 120, 37, 5),
    ('noiva', 'teste_beleza',         'Fazer o teste de cabelo e maquiagem',              'noivos',  30,  21,  45, 17, 6),
    -- noivo, padrinhos e daminhas
    ('noivo', 'convidar_padrinhos', 'Convidar padrinhos, madrinhas, daminhas e pajens', 'noivos', 240, 180, 300, 66, 1),
    ('noivo', 'traje_noivo',        'Definir o traje do noivo',                         'noivos', 150,  90, 180, 52, 2),
    ('noivo', 'madrinhas',          'Definir cor e modelo dos vestidos das madrinhas',  'noivos', 150, 120, 180, 51, 3),
    ('noivo', 'daminhas',           'Definir e alugar roupas de daminhas e pajens',     'noivos', 120,  90, 150, 43, 4),
    ('noivo', 'aliancas',           'Comprar as alianças',                              'noivos',  90,  60, 120, 39, 5),
    -- papelaria
    ('papelaria', 'save_the_date',       'Enviar o save the date',                 'ambos',  240, 210, 270, 65, 1),
    ('papelaria', 'papelaria_pesquisar', 'Pesquisar identidade visual e convites', 'ambos',  220, 180, 240, 64, 2),
    ('papelaria', 'papelaria_contratar', 'Contratar a papelaria',                  'ambos',  200, 180, 240, 63, 3),
    ('papelaria', 'site_casamento',      'Criar site e hashtag do casamento',      'noivos', 240, 180, 270, 62, 4),
    ('papelaria', 'convites_enviar',     'Enviar os convites',                     'ambos',   40,  30,  45, 21, 5),
    -- doces, bolo e lembrancinhas (degustar)
    ('doces', 'bolo_contratar',         'Contratar o bolo',                                   'ambos',         150, 90, 180, 54, 1),
    ('doces', 'docinhos_contratar',     'Degustar e contratar os docinhos',                   'ambos',         150, 90, 180, 53, 2),
    ('doces', 'bem_casados_contratar',  'Contratar os bem-casados',                           'ambos',         120, 90, 150, 41, 3),
    ('doces', 'lembrancinhas',          'Definir as lembrancinhas',                           'ambos',          90, 60, 120, 34, 4),
    ('doces', 'mesa_doces_responsavel', 'Definir o responsável pelas peças da mesa de doces', 'cerimonialista', 60, 45,  90, 26, 5),
    -- convidados e RSVP
    ('convidados', 'lista_nominal',    'Finalizar a lista nominal com endereços',            'noivos',         240, 210, 270, 67, 1),
    ('convidados', 'hotel_convidados', 'Negociar tarifas de hotel para convidados de fora',  'cerimonialista', 180, 120, 240, 56, 2),
    ('convidados', 'rsvp',             'Fazer a confirmação de presença (RSVP)',             'cerimonialista',  30,  21,  45, 19, 3),
    ('convidados', 'mapa_mesas',       'Determinar assentos e mapa de mesas',                'ambos',           30,  21,  40, 18, 4),
    -- infraestrutura e logística
    ('infra', 'plano_b_chuva',         'Criar o plano B para chuva',          'cerimonialista', 200, 120, 240, 59, 1),
    ('infra', 'infra_extra_contratar', 'Contratar infraestrutura extra',      'cerimonialista', 180,  60, 240, 58, 2),
    ('infra', 'transporte_contratar',  'Contratar transporte de convidados',  'cerimonialista', 120,  90, 180, 40, 3),
    ('infra', 'valet_contratar',       'Contratar valet e segurança',         'cerimonialista', 120,  90, 150, 42, 4),
    ('infra', 'mobiliario_locacao',    'Definir a locação de mobiliário',     'cerimonialista',  90,  60, 120, 30, 5),
    ('infra', 'ambulancia_contratar',  'Contratar ambulância com médico',     'cerimonialista',  90,  60, 120, 33, 6),
    ('infra', 'recreacao_contratar',   'Contratar recreação infantil',        'cerimonialista',  90,  60, 120, 31, 7),
    ('infra', 'carro_noivos',          'Definir o deslocamento dos noivos',   'ambos',           60,  45,  90, 27, 8),
    -- documentação civil
    ('civil', 'regime_bens', 'Definir o regime de bens',            'noivos', 150, 90, 270, 49, 1),
    ('civil', 'docs_civil',  'Verificar a documentação necessária', 'noivos', 120, 90, 180, 46, 2),
    ('civil', 'cartorio',    'Dar entrada no cartório',             'noivos',  90, 60, 120, 47, 3),
    -- lua de mel
    ('lua_mel', 'lua_mel_destino',  'Definir o destino',                       'noivos', 180, 90, 240, 48, 1),
    ('lua_mel', 'lua_mel_reservas', 'Emitir passagens e reservar hospedagem',  'noivos', 120, 60, 180, 35, 2),
    ('lua_mel', 'lua_mel_docs',     'Verificar passaporte, vistos e vacinas',  'noivos',  90, 60, 150, 29, 3),
    ('lua_mel', 'hotel_nupcias',    'Reservar o hotel da noite de núpcias',    'noivos',  60, 30,  90, 24, 4),
    -- eventos satélite
    ('satelites', 'noivado',          'Festa de noivado',            'noivos', 330, 270, 365, 23, 1),
    ('satelites', 'cha',              'Chá de cozinha / chá bar',    'noivos',  90,  60, 120, 22, 2),
    ('satelites', 'despedida',        'Despedida de solteiro(a)',    'noivos',  60,  30,  90, 15, 3),
    ('satelites', 'jantar_padrinhos', 'Jantar com os padrinhos',     'noivos',  14,  10,  21, 11, 4)
  ) as v(obj, codigo, titulo, resp, offi, offn, offx, prio, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id
   and o.tipo_evento = 'casamento'
   and o.codigo = v.obj;

  -- ------------------------------------------------------------
  -- 3) CAMPOS TIPADOS (o guia virou isto: cada pergunta com o tipo certo;
  --    os campos vazios SÃO o roteiro de conversa com os noivos)
  -- ------------------------------------------------------------
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem,
     ativa_objetivo_codigo, ativa_quando)
  select d.id, p_empresa_id, c.codigo, c.label, c.tipo,
         case when c.opcoes = '' then null else string_to_array(c.opcoes, '|') end,
         nullif(c.unidade, ''), c.ordem,
         nullif(c.ativa_obj, ''), nullif(c.ativa_qd, '')
  from (values
    -- estrutura ('data' não tem campo: a data vive em events.date)
    ('formato', 'escala',          'Escala',                                'escolha', 'tradicional|mini_wedding|elopement', '', 1, '', ''),
    ('formato', 'cenario',         'Cenário',                               'escolha', 'igreja|salao_urbano|praia|campo_chacara|destination', '', 2, '', ''),
    ('formato', 'tipo_cerimonia',  'Tipo de cerimônia',                     'escolha', 'civil|religiosa|simbolica|so_festa', '', 3, 'cerimonia', 'religiosa'),
    ('formato', 'mesmo_local',     'Cerimônia e recepção no mesmo local',   'sim_nao', '', '', 4, '', ''),
    ('formato', 'duracao_recepcao','Duração da recepção',                   'numero',  '', 'horas', 5, '', ''),
    ('formato', 'tera_cortejo',    'Terá cortejo',                          'sim_nao', '', '', 6, '', ''),
    ('convidados_numero', 'convidados_estimado', 'Número estimado de convidados', 'numero', '', 'pessoas', 1, '', ''),
    ('budget', 'verba_total', 'Verba total',               'moeda',  '', '',  1, '', ''),
    ('budget', 'reserva_pct', 'Reserva para imprevistos',  'numero', '', '%', 2, '', ''),
    ('prioridades', 'prioridades', 'O que não pode faltar (em ordem)', 'texto', '', '', 1, '', ''),
    -- espaço
    ('espaco_orcar', 'referencias_espaco', 'Referências de espaços',  'texto', '', '', 1, '', ''),
    ('espaco_orcar', 'orcamentos_espaco',  'Orçamentos (até 3)',      'texto', '', '', 2, '', ''),
    ('espaco_visitar', 'espaco_nome',            'Espaço escolhido',                        'texto',   '', '', 1, '', ''),
    ('espaco_visitar', 'capacidade_comporta',    'A capacidade comporta os convidados',     'sim_nao', '', '', 2, '', ''),
    ('espaco_visitar', 'tem_gerador',            'Tem gerador',                             'sim_nao', '', '', 3, 'infra', 'nao'),
    ('espaco_visitar', 'tem_sala_vip',           'Tem sala vip',                            'sim_nao', '', '', 4, '', ''),
    ('espaco_visitar', 'valor_hora_extra',       'Valor da hora extra',                     'moeda',   '', '', 5, '', ''),
    ('espaco_visitar', 'liberacao_fornecedores', 'Horário de liberação para fornecedores',  'texto',   '', '', 6, '', ''),
    ('espaco_visitar', 'tempo_desmontagem',      'Tempo de desmontagem',                    'texto',   '', '', 7, '', ''),
    ('espaco_visitar', 'taxa_ecad',              'Tem taxa ECAD',                           'sim_nao', '', '', 8, '', ''),
    ('espaco_visitar', 'clausulas_cancelamento', 'Cláusulas de cancelamento',               'texto',   '', '', 9, '', ''),
    ('espaco_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('espaco_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('espaco_contratar', 'contrato',         'Contrato',         'anexo',      '', '', 3, '', ''),
    ('espaco_vt', 'data_visita',  'Data da visita técnica', 'data',  '', '', 1, '', ''),
    ('espaco_vt', 'relatorio_vt', 'Relatório da visita',    'anexo', '', '', 2, '', ''),
    -- buffet
    ('buffet_tipo_servico', 'tipo_servico', 'Tipo de serviço', 'escolha', 'a_francesa|buffet|coquetel|finger_food|ilhas', '', 1, '', ''),
    ('buffet_orcar', 'referencias_buffet', 'Referências de buffets', 'texto', '', '', 1, '', ''),
    ('buffet_orcar', 'orcamentos_buffet',  'Orçamentos (até 3)',     'texto', '', '', 2, '', ''),
    ('buffet_degustar', 'data_degustacao', 'Data da degustação', 'data', '', '', 1, '', ''),
    ('buffet_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('buffet_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('buffet_contratar', 'preco_por_pessoa', 'Preço por pessoa', 'moeda',      '', '', 3, '', ''),
    ('drinks_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('drinks_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('buffet_cardapio', 'cardapio', 'Cardápio final', 'anexo', '', '', 1, '', ''),
    ('bebidas_lista', 'lista_bebidas', 'Bebidas a comprar (uísque, vodka, espumante...)', 'texto', '', '', 1, '', ''),
    ('buffet_confirmar_numero', 'convidados_confirmado', 'Convidados confirmados', 'numero', '', 'pessoas', 1, '', ''),
    -- cerimônia religiosa
    ('igreja_escolher', 'igreja_nome',           'Igreja',                                'texto',   '', '', 1, '', ''),
    ('igreja_escolher', 'taxa_igreja',           'Taxa da igreja',                        'moeda',   '', '', 2, '', ''),
    ('igreja_escolher', 'regras_igreja',         'Regras (horário, decoração, música)',   'texto',   '', '', 3, '', ''),
    ('igreja_escolher', 'igreja_em_obras',       'A igreja está em obras',                'sim_nao', '', '', 4, '', ''),
    ('igreja_escolher', 'documentacao_exigida',  'Documentação exigida',                  'texto',   '', '', 5, '', ''),
    ('igreja_reservar', 'data_reserva', 'Data reservada', 'data', '', '', 1, '', ''),
    ('celebrante_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('celebrante_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('coral_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('coral_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('cerimonia_musicas', 'lista_musicas', 'Músicas (entrada, cortejo, alianças, saída)', 'texto', '', '', 1, '', ''),
    ('leituras', 'leituras', 'Leituras e salmos', 'texto', '', '', 1, '', ''),
    ('curso_noivos', 'data_curso', 'Data do curso', 'data', '', '', 1, '', ''),
    ('ensaio_igreja', 'data_ensaio', 'Data do ensaio', 'data', '', '', 1, '', ''),
    -- decoração
    ('decoracao_briefing', 'estilo_desejado',       'Estilo desejado',  'texto', '', '', 1, '', ''),
    ('decoracao_briefing', 'paleta_cores',          'Paleta de cores',  'texto', '', '', 2, '', ''),
    ('decoracao_briefing', 'referencias_decoracao', 'Referências',      'anexo', '', '', 3, '', ''),
    ('decoracao_orcar', 'orcamentos_decoracao', 'Orçamentos (até 3)', 'texto', '', '', 1, '', ''),
    ('decoracao_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('decoracao_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('decoracao_layout', 'layout', 'Layout aprovado', 'anexo', '', '', 1, '', ''),
    ('decoracao_cerimonia', 'escopo_cerimonia', 'Escopo da decoração da cerimônia', 'texto', '', '', 1, '', ''),
    ('bouquet', 'modelo_bouquet', 'Bouquet da noiva',                    'texto', '', '', 1, '', ''),
    ('bouquet', 'flores_cortejo', 'Lapelas e bouquets das daminhas',     'texto', '', '', 2, '', ''),
    -- foto e vídeo
    ('foto_pesquisar', 'referencias_foto', 'Referências de estilo', 'texto', '', '', 1, '', ''),
    ('foto_portfolio', 'horas_cobertura',    'Horas de cobertura',  'numero',  '', 'horas', 1, '', ''),
    ('foto_portfolio', 'fotos_entregues',    'Fotos entregues',     'numero',  '', '',      2, '', ''),
    ('foto_portfolio', 'prazo_entrega',      'Prazo de entrega',    'texto',   '', '',      3, '', ''),
    ('foto_portfolio', 'album_incluso',      'Álbum incluso',       'sim_nao', '', '',      4, '', ''),
    ('foto_portfolio', 'segundo_fotografo',  'Tem 2º fotógrafo',    'sim_nao', '', '',      5, '', ''),
    ('foto_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('foto_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('video_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('video_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('video_contratar', 'tera_drone',       'Terá drone',       'sim_nao',    '', '', 3, '', ''),
    ('pre_wedding', 'data_pre_wedding', 'Data do ensaio', 'data', '', '', 1, '', ''),
    ('lista_fotos', 'lista_fotos',        'Fotos que não podem faltar', 'texto', '', '', 1, '', ''),
    ('lista_fotos', 'local_fotos_posadas','Local das fotos posadas',    'texto', '', '', 2, '', ''),
    -- música e atrações
    ('musica_definir', 'banda_ou_dj', 'Banda ou DJ', 'escolha', 'banda|dj|ambos', '', 1, '', ''),
    ('dj_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('dj_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('som_luz_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('som_luz_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('atracoes_extras', 'atracoes',       'Atrações (cabine, live, samba, recreação...)', 'texto', '', '', 1, '', ''),
    ('atracoes_extras', 'valor_atracoes', 'Valor',                                        'moeda', '', '', 2, '', ''),
    ('playlist', 'playlist',              'Playlist',                  'texto', '', '', 1, '', ''),
    ('playlist', 'lista_veto',            'O que NÃO tocar',           'texto', '', '', 2, '', ''),
    ('playlist', 'musica_primeira_danca', 'Música da primeira dança',  'texto', '', '', 3, '', ''),
    -- noiva
    ('vestido_modalidade', 'modalidade_vestido', 'Comprar, alugar ou sob medida', 'escolha', 'comprar|alugar|sob_medida', '', 1, '', ''),
    ('vestido_escolher', 'atelie',        'Ateliê ou loja', 'texto', '', '', 1, '', ''),
    ('vestido_escolher', 'valor_vestido', 'Valor',          'moeda', '', '', 2, '', ''),
    ('dia_noiva_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('dia_noiva_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('sapatos', 'valor_sapatos', 'Valor', 'moeda', '', '', 1, '', ''),
    ('acessorios', 'itens_acessorios', 'Véu, grinalda e acessórios', 'texto', '', '', 1, '', ''),
    ('acessorios', 'valor_acessorios', 'Valor',                      'moeda', '', '', 2, '', ''),
    ('teste_beleza', 'data_teste_beleza', 'Data do teste', 'data', '', '', 1, '', ''),
    -- noivo, padrinhos e daminhas
    ('convidar_padrinhos', 'lista_padrinhos', 'Padrinhos, madrinhas, daminhas e pajens', 'texto', '', '', 1, '', ''),
    ('traje_noivo', 'modalidade_traje', 'Comprar ou alugar', 'escolha', 'comprar|alugar', '', 1, '', ''),
    ('traje_noivo', 'valor_traje',      'Valor',             'moeda',   '',               '', 2, '', ''),
    ('madrinhas', 'paleta_madrinhas', 'Cor e modelo', 'texto', '', '', 1, '', ''),
    ('daminhas', 'qtd_daminhas',   'Quantidade', 'numero', '', '', 1, '', ''),
    ('daminhas', 'valor_daminhas', 'Valor',      'moeda',  '', '', 2, '', ''),
    ('aliancas', 'valor_aliancas', 'Valor', 'moeda', '', '', 1, '', ''),
    -- papelaria
    ('save_the_date', 'data_envio_std', 'Data de envio', 'data', '', '', 1, '', ''),
    ('papelaria_pesquisar', 'referencias_papelaria', 'Referências', 'texto', '', '', 1, '', ''),
    ('papelaria_contratar', 'fornecedor',       'Fornecedor',                                'fornecedor', '', '', 1, '', ''),
    ('papelaria_contratar', 'valor_contratado', 'Valor contratado',                          'moeda',      '', '', 2, '', ''),
    ('papelaria_contratar', 'itens_papelaria',  'Itens (convite, menu, plaquinhas...)',      'texto',      '', '', 3, '', ''),
    ('site_casamento', 'url_site', 'Site',    'texto', '', '', 1, '', ''),
    ('site_casamento', 'hashtag',  'Hashtag', 'texto', '', '', 2, '', ''),
    ('convites_enviar', 'data_envio_convites', 'Data de envio (fora do país primeiro)', 'data', '', '', 1, '', ''),
    -- doces
    ('bolo_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('bolo_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('bolo_contratar', 'topo_bolo',        'Topo de bolo',     'texto',      '', '', 3, '', ''),
    ('docinhos_contratar', 'fornecedor',            'Fornecedor',          'fornecedor', '', '', 1, '', ''),
    ('docinhos_contratar', 'valor_contratado',      'Valor contratado',    'moeda',      '', '', 2, '', ''),
    ('docinhos_contratar', 'data_degustacao_doces', 'Data da degustação',  'data',       '', '', 3, '', ''),
    ('bem_casados_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('bem_casados_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('lembrancinhas', 'tipo_lembrancinha',  'Tipo',       'texto',  '', '', 1, '', ''),
    ('lembrancinhas', 'qtd_lembrancinhas',  'Quantidade', 'numero', '', '', 2, '', ''),
    ('lembrancinhas', 'valor_lembrancinhas','Valor',      'moeda',  '', '', 3, '', ''),
    ('mesa_doces_responsavel', 'responsavel_pecas', 'Doceira ou decoradora', 'escolha', 'doceira|decoradora', '', 1, '', ''),
    -- convidados
    ('lista_nominal', 'lista_pronta', 'Lista nominal fechada', 'sim_nao', '', '', 1, '', ''),
    ('hotel_convidados', 'hotel_indicado', 'Hotel',            'texto', '', '', 1, '', ''),
    ('hotel_convidados', 'tarifa_hotel',   'Tarifa negociada', 'moeda', '', '', 2, '', ''),
    ('rsvp', 'convidados_confirmados', 'Confirmados', 'numero', '', 'pessoas', 1, '', ''),
    ('mapa_mesas', 'mapa_mesas', 'Mapa de mesas', 'anexo', '', '', 1, '', ''),
    -- infraestrutura
    ('plano_b_chuva', 'plano_b', 'Plano B', 'texto', '', '', 1, '', ''),
    ('infra_extra_contratar', 'fornecedor',       'Fornecedor',                                    'fornecedor', '', '', 1, '', ''),
    ('infra_extra_contratar', 'valor_contratado', 'Valor contratado',                              'moeda',      '', '', 2, '', ''),
    ('infra_extra_contratar', 'itens_infra',      'Itens (gerador, banheiros, cobertura, toldos)', 'texto',      '', '', 3, '', ''),
    ('transporte_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('transporte_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('valet_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('valet_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('mobiliario_locacao', 'itens_mobiliario', 'Itens', 'texto', '', '', 1, '', ''),
    ('mobiliario_locacao', 'valor_mobiliario', 'Valor', 'moeda', '', '', 2, '', ''),
    ('ambulancia_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('ambulancia_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('recreacao_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('recreacao_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('carro_noivos', 'carro',     'Carro',     'texto', '', '', 1, '', ''),
    ('carro_noivos', 'motorista', 'Motorista', 'texto', '', '', 2, '', ''),
    -- documentação civil
    ('regime_bens', 'regime', 'Regime', 'escolha', 'comunhao_parcial|comunhao_universal|separacao_total', '', 1, '', ''),
    ('docs_civil', 'checklist_docs', 'Documentos necessários', 'texto', '', '', 1, '', ''),
    ('cartorio', 'data_entrada_cartorio', 'Data de entrada',              'data',    '', '', 1, '', ''),
    ('cartorio', 'formato_civil',         'Civil no cartório ou no dia',  'escolha', 'cartorio|mesmo_dia', '', 2, '', ''),
    -- lua de mel
    ('lua_mel_destino', 'destino', 'Destino', 'texto', '', '', 1, '', ''),
    ('lua_mel_reservas', 'valor_lua_mel', 'Valor (fora da verba do evento)', 'moeda', '', '', 1, '', ''),
    ('lua_mel_docs', 'checklist_viagem', 'Passaporte, vistos e vacinas', 'texto', '', '', 1, '', ''),
    ('hotel_nupcias', 'hotel_nupcias',       'Hotel', 'texto', '', '', 1, '', ''),
    ('hotel_nupcias', 'valor_hotel_nupcias', 'Valor', 'moeda', '', '', 2, '', ''),
    -- eventos satélite
    ('noivado',          'data_noivado',          'Data', 'data', '', '', 1, '', ''),
    ('cha',              'data_cha',              'Data', 'data', '', '', 1, '', ''),
    ('despedida',        'data_despedida',        'Data', 'data', '', '', 1, '', ''),
    ('jantar_padrinhos', 'data_jantar_padrinhos', 'Data', 'data', '', '', 1, '', '')
  ) as c(dec, codigo, label, tipo, opcoes, unidade, ordem, ativa_obj, ativa_qd)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = c.dec;

  -- ------------------------------------------------------------
  -- 4) ARQUÉTIPOS (delta sobre o base; escolhas compõem)
  -- ------------------------------------------------------------
  insert into public.metodo_arquetipo (empresa_id, tipo_evento, eixo, codigo, nome, ordem)
  values
    (p_empresa_id, 'casamento', 'escala',  'tradicional',   'Tradicional',    1),
    (p_empresa_id, 'casamento', 'escala',  'mini_wedding',  'Mini wedding',   2),
    (p_empresa_id, 'casamento', 'escala',  'elopement',     'Elopement',      3),
    (p_empresa_id, 'casamento', 'cenario', 'igreja',        'Igreja',         1),
    (p_empresa_id, 'casamento', 'cenario', 'salao_urbano',  'Salão urbano',   2),
    (p_empresa_id, 'casamento', 'cenario', 'praia',         'Praia',          3),
    (p_empresa_id, 'casamento', 'cenario', 'campo_chacara', 'Campo / chácara',4),
    (p_empresa_id, 'casamento', 'cenario', 'destination',   'Destination',    5);

  -- tradicional = o base calibrado (sem delta).
  insert into public.metodo_arquetipo_delta
    (arquetipo_id, empresa_id, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
  select a.id, p_empresa_id, v.alvo_tipo, v.alvo_codigo, v.operacao, v.valor_num, v.ordem
  from (values
    -- mini_wedding: cabe em ~4 meses — offsets comprimidos, satélites fora
    ('mini_wedding', 'objetivo', 'satelites',        'desativar_objetivo', null::numeric, 1),
    ('mini_wedding', 'decisao',  'espaco_orcar',      'set_offset_ideal', 130, 2),
    ('mini_wedding', 'decisao',  'espaco_visitar',    'set_offset_ideal', 125, 3),
    ('mini_wedding', 'decisao',  'espaco_contratar',  'set_offset_ideal', 120, 4),
    ('mini_wedding', 'decisao',  'buffet_orcar',      'set_offset_ideal', 120, 5),
    ('mini_wedding', 'decisao',  'buffet_degustar',   'set_offset_ideal', 115, 6),
    ('mini_wedding', 'decisao',  'buffet_contratar',  'set_offset_ideal', 110, 7),
    ('mini_wedding', 'decisao',  'foto_contratar',    'set_offset_ideal', 110, 8),
    ('mini_wedding', 'decisao',  'video_contratar',   'set_offset_ideal', 100, 9),
    ('mini_wedding', 'decisao',  'decoracao_contratar','set_offset_ideal',100, 10),
    ('mini_wedding', 'decisao',  'dj_contratar',      'set_offset_ideal', 100, 11),
    ('mini_wedding', 'decisao',  'vestido_escolher',  'set_offset_ideal',  90, 12),
    ('mini_wedding', 'decisao',  'papelaria_contratar','set_offset_ideal', 80, 13),
    ('mini_wedding', 'decisao',  'convites_enviar',   'set_offset_ideal',  30, 14),
    -- elopement: só o essencial — celebrante, foto, os dois
    ('elopement', 'objetivo', 'satelites',  'desativar_objetivo', null, 1),
    ('elopement', 'objetivo', 'musica',     'desativar_objetivo', null, 2),
    ('elopement', 'objetivo', 'doces',      'desativar_objetivo', null, 3),
    ('elopement', 'objetivo', 'papelaria',  'desativar_objetivo', null, 4),
    ('elopement', 'objetivo', 'infra',      'desativar_objetivo', null, 5),
    ('elopement', 'objetivo', 'convidados', 'desativar_objetivo', null, 6),
    ('elopement', 'decisao',  'espaco_contratar', 'set_offset_ideal', 60, 7),
    ('elopement', 'decisao',  'foto_contratar',   'set_offset_ideal', 60, 8),
    ('elopement', 'decisao',  'vestido_escolher', 'set_offset_ideal', 60, 9),
    -- igreja: liga a cerimônia religiosa
    ('igreja', 'objetivo', 'cerimonia', 'ativar_objetivo', null, 1),
    -- salão urbano: infraestrutura mínima
    ('salao_urbano', 'objetivo', 'infra', 'set_faixa_pct_min',   2, 1),
    ('salao_urbano', 'objetivo', 'infra', 'set_faixa_pct_ideal', 3, 2),
    ('salao_urbano', 'objetivo', 'infra', 'set_faixa_pct_max',   4, 3),
    -- praia: infra pesada; plano B ANTES de fechar o espaço (afeta contrato)
    ('praia', 'objetivo', 'infra', 'set_faixa_pct_min',   10, 1),
    ('praia', 'objetivo', 'infra', 'set_faixa_pct_ideal', 12, 2),
    ('praia', 'objetivo', 'infra', 'set_faixa_pct_max',   15, 3),
    ('praia', 'decisao', 'plano_b_chuva', 'set_prioridade',   93, 4),
    ('praia', 'decisao', 'plano_b_chuva', 'set_offset_ideal', 315, 5),
    -- campo/chácara: mesma lógica da praia (gerador, banheiros, plano B)
    ('campo_chacara', 'objetivo', 'infra', 'set_faixa_pct_min',   10, 1),
    ('campo_chacara', 'objetivo', 'infra', 'set_faixa_pct_ideal', 12, 2),
    ('campo_chacara', 'objetivo', 'infra', 'set_faixa_pct_max',   15, 3),
    ('campo_chacara', 'decisao', 'plano_b_chuva', 'set_prioridade',   93, 4),
    ('campo_chacara', 'decisao', 'plano_b_chuva', 'set_offset_ideal', 315, 5),
    -- destination: convidado compra passagem — save the date 12m, convites
    -- cedo, hotel dos convidados vira estruturante
    ('destination', 'decisao', 'save_the_date',    'set_offset_ideal', 360, 1),
    ('destination', 'decisao', 'save_the_date',    'set_prioridade',    89, 2),
    ('destination', 'decisao', 'convites_enviar',  'set_offset_ideal',  90, 3),
    ('destination', 'decisao', 'hotel_convidados', 'set_offset_ideal', 300, 4),
    ('destination', 'decisao', 'hotel_convidados', 'set_prioridade',    88, 5)
  ) as v(arq, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
  join public.metodo_arquetipo a
    on a.empresa_id = p_empresa_id
   and a.tipo_evento = 'casamento'
   and a.codigo = v.arq;
end $$;

-- ------------------------------------------------------------
-- 5) TAREFAS (blueprint 4C)
-- ------------------------------------------------------------
create or replace function public.semear_tarefas_metodo_casamento(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (o re-seed da 084 já apagou as antigas via cascade de metodo_decisao)

  -- Padrão canônico: TODA decisão de contratar gera as mesmas 4 tarefas.
  -- Uma inserção só — consistência garantida para os ~28 fornecedores.
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, t.titulo, 'cerimonialista', d.offset_ideal_dias, t.ord, t.vinc
  from public.metodo_decisao d
  cross join (values
    ('Solicitar e receber o contrato',              1, null),
    ('Analisar as cláusulas do contrato',           2, null),
    ('Assinar e arquivar o contrato',               3, null),
    ('Registrar o valor no financeiro (1ª parcela)',4, 'financeiro')
  ) as t(titulo, ord, vinc)
  where d.empresa_id = p_empresa_id
    and d.codigo like '%contratar%';

  -- Tarefas específicas de decisões que não são "contratar".
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem)
  select d.id, p_empresa_id, v.titulo, v.resp, v.off, v.ord
  from (values
    ('vestido_escolher', '1ª prova do vestido',                              'noivos', 180, 10),
    ('vestido_escolher', '2ª prova do vestido',                              'noivos',  90, 11),
    ('vestido_escolher', '3ª prova do vestido',                              'noivos',  30, 12),
    ('vestido_escolher', 'Prova final do vestido (levar o sapato)',          'noivos',  14, 13),
    ('traje_noivo',      'Prova e retirada do traje do noivo',               'noivos',  14, 10),
    ('aliancas',         'Gravar a data e polir as alianças',                'noivos',  30, 10),
    ('rsvp',             'Informar o número confirmado a buffet, espaço e decoração', 'cerimonialista', 12, 10)
  ) as v(dec, titulo, resp, off, ord)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = v.dec;
end $$;

-- ------------------------------------------------------------
-- 6) Re-seed de todas as empresas existentes
-- ------------------------------------------------------------
-- Eventos já criados NÃO são re-instanciados aqui (a instância é snapshot);
-- para os de teste, o script de verificação limpa e re-instancia.
do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_metodo_casamento(e.id);
    perform public.semear_tarefas_metodo_casamento(e.id);
  end loop;
end $$;
