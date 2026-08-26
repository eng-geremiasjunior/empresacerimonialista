-- ============================================================
-- Vela — Migração 122: o método de debutante
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O público do Vela é "casamentos e debutantes" — mas o método do
-- Planejamento só existia para casamento: uma debutante nascia com o
-- mapa mental vazio, só objetivos manuais. Este seed é o gêmeo da 084,
-- desenhado para o ciclo de 15 anos (~12 meses):
--
--   15 objetivos com faixa % de verba. As diferenças de DNA para o
--   casamento: o TEMA é a decisão-mãe (tudo deriva dele), a VALSA é um
--   objetivo próprio (professor, pares, ensaios), os VESTIDOS são três
--   (valsa, recepção, balada), o BOOK 15 anos antecede a festa, e o
--   PROTOCOLO (15 velas, entradas, homenagens) é o roteiro emocional.
--
-- Os códigos de decisão levam o prefixo deb_ porque metodo_decisao tem
-- unique (empresa_id, codigo) ATRAVESSANDO tipos de evento — 'data',
-- 'budget' e todos os *_contratar já pertencem ao método de casamento.
--
-- Convenções herdadas da 084: decisão com codigo %contratar% ganha as 4
-- tarefas de contrato automaticamente; responsavel usa o vocabulário do
-- CHECK ('noivos' = a família/debutante — o rótulo na tela é por tipo);
-- campos verba_total/reserva_pct alimentam a verba (e o espelho da 121).

create or replace function public.semear_metodo_debutante(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.metodo_objetivo
    where empresa_id = p_empresa_id and tipo_evento = 'debutante';
  delete from public.metodo_arquetipo
    where empresa_id = p_empresa_id and tipo_evento = 'debutante';

  -- ------------------------------------------------------------
  -- 1) OBJETIVOS (= categorias de orçamento; faixa % de referência)
  -- ------------------------------------------------------------
  insert into public.metodo_objetivo
    (empresa_id, tipo_evento, codigo, nome, descricao, ordem,
     ativo_padrao, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_empresa_id, 'debutante', v.codigo, v.nome, v.descricao, v.ordem,
         v.ativo, v.fmin, v.fideal, v.fmax
  from (values
    ('estrutura',  'Estrutura e datas',
     'Data, tema, convidados, verba e prioridades — as decisões-raiz.',
     1,  true,  null::int, null::int, null::int),
    ('espaco',     'Espaço e recepção',              null, 2,  true,  10, 15, 20),
    ('buffet',     'Buffet e bebidas',               null, 3,  true,  20, 28, 40),
    ('decoracao',  'Decoração e cenografia',
     'O tema traduzido em cenário — painel, pista, mesas.',
     4,  true,  10, 14, 18),
    ('foto',       'Foto e vídeo',                   null, 5,  true,  8,  10, 14),
    ('musica',     'Música e balada',
     'DJ, atrações e a pista — o coração de uma festa de 15.',
     6,  true,  8,  12, 16),
    ('valsa',      'Valsa e coreografia',            null, 7,  true,  1,  2,  4),
    ('vestidos',   'Vestidos da debutante',
     'As trocas da noite: valsa, recepção e balada.',
     8,  true,  5,  7,  10),
    ('beleza',     'Beleza e making of',             null, 9,  true,  2,  3,  5),
    ('book',       'Book 15 anos',
     'O ensaio antes da festa — abre o vídeo, o painel e a papelaria.',
     10, true,  1,  2,  4),
    ('protocolo',  'Cerimonial e protocolo',
     'Velas, entradas e homenagens — o roteiro emocional da noite.',
     11, true,  null, null, null),
    ('convidados', 'Convidados e RSVP',              null, 12, true,  null, null, null),
    ('doces',      'Doces, bolo e lembrancinhas',    null, 13, true,  3,  5,  7),
    ('papelaria',  'Papelaria e convites',           null, 14, true,  2,  3,  5),
    ('infra',      'Infraestrutura e logística',     null, 15, true,  2,  4,  6)
  ) as v(codigo, nome, descricao, ordem, ativo, fmin, fideal, fmax);

  -- ------------------------------------------------------------
  -- 2) DECISÕES (offset em dias antes da festa; prioridade separada)
  -- ------------------------------------------------------------
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select o.id, p_empresa_id, v.codigo, v.titulo, v.resp,
         v.offi, v.offn, v.offx, v.prio, v.ordem
  from (values
    -- estrutura
    ('estrutura', 'deb_data',              'Definir a data da festa',                 'noivos', 365, 300, 400, 100, 1),
    ('estrutura', 'deb_tema',              'Definir o tema da festa',                 'noivos', 350, 300, 365, 99,  2),
    ('estrutura', 'deb_convidados_numero', 'Definir o número estimado de convidados', 'noivos', 350, 300, 365, 98,  3),
    ('estrutura', 'deb_budget',            'Levantar o budget',                       'ambos',  350, 300, 365, 97,  4),
    ('estrutura', 'deb_prioridades',       'Definir as prioridades da família',       'noivos', 345, 300, 365, 96,  5),
    -- espaço (orçar → visitar → contratar)
    ('espaco', 'deb_espaco_orcar',     'Buscar referências e orçar espaços', 'ambos',          330, 280, 360, 92, 1),
    ('espaco', 'deb_espaco_visitar',   'Visitar e escolher o espaço',        'ambos',          320, 270, 350, 91, 2),
    ('espaco', 'deb_espaco_contratar', 'Contratar o espaço',                 'ambos',          310, 260, 350, 90, 3),
    ('espaco', 'deb_espaco_vt',        'Realizar visita técnica ao espaço',  'cerimonialista',  60,  45,  90, 40, 4),
    -- buffet
    ('buffet', 'deb_buffet_tipo_servico',     'Definir o tipo de serviço',               'ambos',          300, 260, 330, 89, 1),
    ('buffet', 'deb_buffet_orcar',            'Buscar referências e orçar buffets',      'ambos',          290, 250, 320, 88, 2),
    ('buffet', 'deb_buffet_degustar',         'Fazer a degustação',                      'noivos',         280, 240, 310, 87, 3),
    ('buffet', 'deb_buffet_contratar',        'Contratar o buffet',                      'ambos',          270, 230, 300, 86, 4),
    ('buffet', 'deb_drinks_jovem_definir',    'Definir o bar de drinks sem álcool',      'ambos',          150,  90, 200, 45, 5),
    ('buffet', 'deb_buffet_cardapio',         'Definir o cardápio final',                'ambos',           90,  60, 120, 44, 6),
    ('buffet', 'deb_buffet_confirmar_numero', 'Confirmar a quantidade final ao buffet',  'cerimonialista',  12,  10,  15, 20, 7),
    -- decoração (nasce do tema)
    ('decoracao', 'deb_decor_conceito',  'Traduzir o tema em conceito de decoração', 'ambos', 240, 200, 280, 84, 1),
    ('decoracao', 'deb_decor_orcar',     'Orçar a decoração',                        'ambos', 230, 190, 270, 83, 2),
    ('decoracao', 'deb_decor_contratar', 'Contratar a decoração',                    'ambos', 210, 170, 250, 82, 3),
    ('decoracao', 'deb_decor_aprovar',   'Aprovar o projeto final',                  'ambos',  60,  45,  90, 35, 4),
    ('decoracao', 'deb_painel_foto',     'Definir painel e áreas de foto',           'ambos',  90,  60, 120, 33, 5),
    -- foto e vídeo
    ('foto', 'deb_foto_orcar',      'Orçar foto e vídeo',                 'ambos',  260, 220, 300, 81, 1),
    ('foto', 'deb_foto_contratar',  'Contratar foto e vídeo',             'ambos',  240, 200, 280, 80, 2),
    ('foto', 'deb_retrospectiva',   'Produzir o vídeo de retrospectiva',  'noivos',  60,  30,  90, 34, 3),
    -- música e balada
    ('musica', 'deb_dj_orcar',             'Orçar DJ ou banda',                        'ambos',  240, 200, 280, 78, 1),
    ('musica', 'deb_dj_contratar',         'Contratar DJ ou banda',                    'ambos',  220, 180, 260, 77, 2),
    ('musica', 'deb_atracoes_definir',     'Definir as atrações da balada',            'ambos',  150,  90, 200, 50, 3),
    ('musica', 'deb_iluminacao_contratar', 'Contratar iluminação e efeitos de pista',  'ambos',  150,  90, 200, 49, 4),
    ('musica', 'deb_parabens_musica',      'Escolher a música do parabéns',            'noivos',  45,  30,  60, 22, 5),
    -- valsa e coreografia
    ('valsa', 'deb_valsa_contratar', 'Contratar o professor de dança',   'ambos',  200, 150, 240, 60, 1),
    ('valsa', 'deb_valsa_pares',     'Definir príncipe e pares da valsa','noivos', 170, 120, 200, 58, 2),
    ('valsa', 'deb_valsa_musica',    'Escolher a música da valsa',       'noivos', 150,  90, 180, 55, 3),
    ('valsa', 'deb_valsa_ensaios',   'Começar os ensaios',               'noivos', 120,  90, 150, 52, 4),
    -- vestidos (as trocas da noite)
    ('vestidos', 'deb_vestido_valsa',    'Escolher o vestido da valsa',    'noivos', 180, 120, 220, 70, 1),
    ('vestidos', 'deb_vestido_recepcao', 'Escolher o vestido da recepção', 'noivos', 150,  90, 200, 68, 2),
    ('vestidos', 'deb_vestido_balada',   'Escolher o look da balada',      'noivos', 120,  60, 160, 66, 3),
    ('vestidos', 'deb_provas_finais',    'Fazer as provas finais',         'noivos',  21,  14,  30, 25, 4),
    -- beleza
    ('beleza', 'deb_beleza_contratar', 'Contratar cabelo e maquiagem do dia', 'ambos',  120, 90, 160, 56, 1),
    ('beleza', 'deb_beleza_teste',     'Fazer o teste de beleza',             'noivos',  45, 30,  60, 30, 2),
    -- book 15 anos
    ('book', 'deb_book_contratar', 'Contratar o book 15 anos',    'ambos',  180, 120, 220, 62, 1),
    ('book', 'deb_book_realizar',  'Realizar o ensaio do book',   'noivos', 120,  90, 150, 54, 2),
    ('book', 'deb_book_escolher',  'Escolher as fotos do book',   'noivos',  90,  60, 120, 42, 3),
    -- cerimonial e protocolo
    ('protocolo', 'deb_velas_lista',       'Definir os homenageados das 15 velas',   'noivos',          60, 45,  90, 46, 1),
    ('protocolo', 'deb_entrada_roteiro',   'Definir o roteiro de entrada',           'ambos',           45, 30,  60, 38, 2),
    ('protocolo', 'deb_homenagens',        'Definir homenagens e discursos',         'noivos',          40, 30,  60, 36, 3),
    ('protocolo', 'deb_roteiro_fechar',    'Fechar o roteiro da noite com o espaço', 'cerimonialista',  15, 10,  21, 24, 4),
    -- convidados
    ('convidados', 'deb_lista_convidados', 'Montar a lista de convidados',            'noivos',         200, 150, 240, 74, 1),
    ('convidados', 'deb_convites_enviar',  'Enviar os convites',                      'ambos',           60,  45,  75, 48, 2),
    ('convidados', 'deb_rsvp',             'Fazer a confirmação de presença (RSVP)',  'cerimonialista',  21,  14,  30, 19, 3),
    -- doces
    ('doces', 'deb_bolo_orcar',     'Orçar bolo e doces',        'ambos',  120, 90, 150, 47, 1),
    ('doces', 'deb_bolo_contratar', 'Contratar bolo e doces',    'ambos',   90, 60, 120, 43, 2),
    ('doces', 'deb_lembrancinhas',  'Definir as lembrancinhas',  'noivos',  45, 30,  60, 26, 3),
    -- papelaria
    ('papelaria', 'deb_identidade_tema',      'Aprovar a identidade visual do tema', 'ambos', 150, 120, 180, 57, 1),
    ('papelaria', 'deb_papelaria_contratar',  'Contratar convites e papelaria',      'ambos', 120,  90, 150, 53, 2),
    -- infraestrutura
    ('infra', 'deb_seguranca_contratar',   'Contratar segurança e apoio',       'cerimonialista', 90, 60, 120, 41, 1),
    ('infra', 'deb_transporte_debutante',  'Definir o transporte da debutante', 'noivos',         30, 21,  45, 23, 2),
    ('infra', 'deb_plano_b_chuva',         'Criar o plano B para chuva',        'cerimonialista', 90, 60, 150, 39, 3)
  ) as v(obj, codigo, titulo, resp, offi, offn, offx, prio, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id and o.tipo_evento = 'debutante'
   and o.codigo = v.obj;

  -- ------------------------------------------------------------
  -- 3) CAMPOS TIPADOS (o formulário é o roteiro da conversa)
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
    ('deb_tema',   'tema',        'Tema da festa',   'texto',   '', '', 1, '', ''),
    ('deb_tema',   'paleta_tema', 'Cores do tema',   'texto',   '', '', 2, '', ''),
    ('deb_tema',   'escala',      'Escala',          'escolha', 'tradicional|compacta', '', 3, '', ''),
    ('deb_tema',   'cenario',     'Cenário',         'escolha', 'salao|clube|chacara_sitio|casa_de_festas', '', 4, '', ''),
    ('deb_convidados_numero', 'numero_convidados', 'Convidados estimados', 'numero', '', '', 1, '', ''),
    ('deb_budget', 'verba_total', 'Verba total',              'moeda',  '', '',  1, '', ''),
    ('deb_budget', 'reserva_pct', 'Reserva para imprevistos', 'numero', '', '%', 2, '', ''),
    ('deb_prioridades', 'prioridades', 'As 3 prioridades da família', 'texto', '', '', 1, '', ''),
    -- espaço
    ('deb_espaco_orcar',     'referencias_espaco', 'Referências de espaços', 'texto', '', '', 1, '', ''),
    ('deb_espaco_contratar', 'fornecedor',         'Fornecedor',        'fornecedor', '', '', 1, '', ''),
    ('deb_espaco_contratar', 'valor_contratado',   'Valor contratado',  'moeda',      '', '', 2, '', ''),
    ('deb_espaco_contratar', 'contrato',           'Contrato',          'anexo',      '', '', 3, '', ''),
    ('deb_espaco_vt', 'data_visita',  'Data da visita técnica', 'data',  '', '', 1, '', ''),
    -- buffet
    ('deb_buffet_tipo_servico', 'tipo_servico', 'Tipo de serviço', 'escolha', 'a_francesa|buffet|coquetel|finger_food|ilhas', '', 1, '', ''),
    ('deb_buffet_degustar',  'data_degustacao',  'Data da degustação', 'data', '', '', 1, '', ''),
    ('deb_buffet_contratar', 'fornecedor',       'Fornecedor',        'fornecedor', '', '', 1, '', ''),
    ('deb_buffet_contratar', 'valor_contratado', 'Valor contratado',  'moeda',      '', '', 2, '', ''),
    ('deb_buffet_contratar', 'preco_por_pessoa', 'Preço por pessoa',  'moeda',      '', '', 3, '', ''),
    ('deb_drinks_jovem_definir', 'drinks_menu', 'Drinks escolhidos', 'texto', '', '', 1, '', ''),
    ('deb_buffet_cardapio', 'cardapio', 'Cardápio final', 'anexo', '', '', 1, '', ''),
    -- decoração
    ('deb_decor_conceito',  'conceito',         'Conceito aprovado',  'texto',      '', '', 1, '', ''),
    ('deb_decor_contratar', 'fornecedor',       'Fornecedor',         'fornecedor', '', '', 1, '', ''),
    ('deb_decor_contratar', 'valor_contratado', 'Valor contratado',   'moeda',      '', '', 2, '', ''),
    ('deb_decor_aprovar',   'projeto',          'Projeto aprovado',   'anexo',      '', '', 1, '', ''),
    -- foto
    ('deb_foto_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('deb_foto_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_retrospectiva',  'fotos_video',      'Fotos e vídeos escolhidos', 'texto', '', '', 1, '', ''),
    -- música
    ('deb_dj_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('deb_dj_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_atracoes_definir', 'atracoes', 'Atrações fechadas', 'texto', '', '', 1, '', ''),
    ('deb_iluminacao_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('deb_iluminacao_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_parabens_musica', 'musica', 'Música do parabéns', 'texto', '', '', 1, '', ''),
    -- valsa
    ('deb_valsa_contratar', 'fornecedor',       'Professor',        'fornecedor', '', '', 1, '', ''),
    ('deb_valsa_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_valsa_pares',  'pares',  'Príncipe e pares', 'texto', '', '', 1, '', ''),
    ('deb_valsa_musica', 'musica', 'Música da valsa',  'texto', '', '', 1, '', ''),
    -- vestidos
    ('deb_vestido_valsa',    'onde',  'Ateliê / loja', 'texto', '', '', 1, '', ''),
    ('deb_vestido_valsa',    'valor', 'Valor',         'moeda', '', '', 2, '', ''),
    ('deb_vestido_recepcao', 'valor', 'Valor',         'moeda', '', '', 1, '', ''),
    ('deb_vestido_balada',   'valor', 'Valor',         'moeda', '', '', 1, '', ''),
    -- beleza
    ('deb_beleza_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('deb_beleza_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_beleza_teste',     'data_teste',       'Data do teste',    'data',       '', '', 1, '', ''),
    -- book
    ('deb_book_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('deb_book_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_book_realizar',  'data_book',        'Data do ensaio',   'data',       '', '', 1, '', ''),
    -- protocolo
    ('deb_velas_lista',     'lista_velas', 'Os 15 homenageados',        'texto', '', '', 1, '', ''),
    ('deb_entrada_roteiro', 'roteiro',     'Como será a entrada',       'texto', '', '', 1, '', ''),
    ('deb_homenagens',      'homenagens',  'Homenagens e quem discursa','texto', '', '', 1, '', ''),
    -- convidados
    ('deb_lista_convidados', 'onde_esta', 'Onde está a lista', 'texto', '', '', 1, '', ''),
    -- doces
    ('deb_bolo_contratar', 'fornecedor',       'Fornecedor',       'fornecedor', '', '', 1, '', ''),
    ('deb_bolo_contratar', 'valor_contratado', 'Valor contratado', 'moeda',      '', '', 2, '', ''),
    ('deb_lembrancinhas',  'lembrancinha',     'Lembrancinha escolhida', 'texto', '', '', 1, '', ''),
    -- papelaria
    ('deb_identidade_tema',     'identidade',       'Identidade aprovada', 'anexo',      '', '', 1, '', ''),
    ('deb_papelaria_contratar', 'fornecedor',       'Fornecedor',          'fornecedor', '', '', 1, '', ''),
    ('deb_papelaria_contratar', 'valor_contratado', 'Valor contratado',    'moeda',      '', '', 2, '', ''),
    -- infra
    ('deb_seguranca_contratar',  'fornecedor',   'Fornecedor',              'fornecedor', '', '', 1, '', ''),
    ('deb_transporte_debutante', 'transporte',   'Como ela chega',          'texto',      '', '', 1, '', ''),
    ('deb_plano_b_chuva',        'plano_b',      'O plano B',               'texto',      '', '', 1, '', '')
  ) as c(dec, codigo, label, tipo, opcoes, unidade, ordem, ativa_obj, ativa_qd)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = c.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'debutante';

  -- ------------------------------------------------------------
  -- 4) TAREFAS — o padrão de contrato + as específicas de 15 anos
  -- ------------------------------------------------------------
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, t.titulo, 'cerimonialista', d.offset_ideal_dias, t.ord, t.vinc
  from public.metodo_decisao d
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'debutante'
  cross join (values
    ('Solicitar e receber o contrato',               1, null),
    ('Analisar as cláusulas do contrato',            2, null),
    ('Assinar e arquivar o contrato',                3, null),
    ('Registrar o valor no financeiro (1ª parcela)', 4, 'financeiro')
  ) as t(titulo, ord, vinc)
  where d.empresa_id = p_empresa_id
    and d.codigo like '%contratar%';

  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem)
  select d.id, p_empresa_id, v.titulo, v.resp, v.off, v.ord
  from (values
    ('deb_vestido_valsa', '1ª prova do vestido da valsa',                'noivos',          90, 10),
    ('deb_vestido_valsa', 'Prova final do vestido (levar o sapato)',     'noivos',          14, 11),
    ('deb_valsa_ensaios', 'Ensaio geral da valsa',                       'noivos',           7, 10),
    ('deb_velas_lista',   'Conferir presença dos homenageados no dia',   'cerimonialista',   7, 10),
    ('deb_rsvp',          'Informar o número confirmado a buffet, espaço e decoração', 'cerimonialista', 12, 10)
  ) as v(dec, titulo, resp, off, ord)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = v.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'debutante';

  -- ------------------------------------------------------------
  -- 5) ARQUÉTIPOS — escala comprime prazos; cenário é registro
  -- ------------------------------------------------------------
  insert into public.metodo_arquetipo (empresa_id, tipo_evento, eixo, codigo, nome, ordem)
  values
    (p_empresa_id, 'debutante', 'escala',  'tradicional',    'Tradicional',     1),
    (p_empresa_id, 'debutante', 'escala',  'compacta',       'Festa compacta',  2),
    (p_empresa_id, 'debutante', 'cenario', 'salao',          'Salão de festas', 1),
    (p_empresa_id, 'debutante', 'cenario', 'clube',          'Clube',           2),
    (p_empresa_id, 'debutante', 'cenario', 'chacara_sitio',  'Chácara / sítio', 3),
    (p_empresa_id, 'debutante', 'cenario', 'casa_de_festas', 'Casa de festas',  4);

  -- compacta: a festa fechada em ~5 meses — prazos comprimidos
  insert into public.metodo_arquetipo_delta
    (arquetipo_id, empresa_id, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
  select a.id, p_empresa_id, v.alvo_tipo, v.alvo_codigo, v.operacao, v.valor_num, v.ordem
  from (values
    ('compacta', 'decisao', 'deb_espaco_orcar',        'set_offset_ideal', 150::numeric, 1),
    ('compacta', 'decisao', 'deb_espaco_visitar',      'set_offset_ideal', 140, 2),
    ('compacta', 'decisao', 'deb_espaco_contratar',    'set_offset_ideal', 130, 3),
    ('compacta', 'decisao', 'deb_buffet_orcar',        'set_offset_ideal', 125, 4),
    ('compacta', 'decisao', 'deb_buffet_contratar',    'set_offset_ideal', 110, 5),
    ('compacta', 'decisao', 'deb_dj_contratar',        'set_offset_ideal', 100, 6),
    ('compacta', 'decisao', 'deb_foto_contratar',      'set_offset_ideal', 100, 7),
    ('compacta', 'decisao', 'deb_decor_contratar',     'set_offset_ideal',  90, 8),
    ('compacta', 'decisao', 'deb_vestido_valsa',       'set_offset_ideal',  90, 9),
    ('compacta', 'decisao', 'deb_valsa_contratar',     'set_offset_ideal',  90, 10),
    ('compacta', 'decisao', 'deb_book_contratar',      'set_offset_ideal',  80, 11),
    ('compacta', 'decisao', 'deb_papelaria_contratar', 'set_offset_ideal',  60, 12),
    ('compacta', 'decisao', 'deb_convites_enviar',     'set_offset_ideal',  30, 13)
  ) as v(arq, alvo_tipo, alvo_codigo, operacao, valor_num, ordem)
  join public.metodo_arquetipo a
    on a.empresa_id = p_empresa_id and a.tipo_evento = 'debutante'
   and a.eixo = 'escala' and a.codigo = v.arq;
end $$;

-- ------------------------------------------------------------
-- 6) Semeia todas as empresas existentes
-- ------------------------------------------------------------
do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_metodo_debutante(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 7) Instancia as debutantes VIVAS que estavam com o mapa vazio
-- ------------------------------------------------------------
-- Concluídas ficam de fora: método num evento que já aconteceu é ruído.
-- O guard do instanciar ("já tem objetivo? não mexe") protege quem criou
-- objetivos manuais — esses eventos ficam como estão.
do $$
declare ev record;
begin
  for ev in
    select e.id from public.events e
    where e.type = 'debutante'
      and e.status in ('orcamento', 'confirmado')
      and not exists (select 1 from public.evento_objetivo eo where eo.event_id = e.id)
  loop
    perform public.instanciar_metodo_evento(ev.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'todas as empresas têm o método de debutante (15 objetivos)' as item,
       not exists (
         select 1 from public.empresas e
         where (select count(*) from public.metodo_objetivo o
                where o.empresa_id = e.id and o.tipo_evento = 'debutante') <> 15
       ) as ok
union all
select 'decisões do método: 57 por empresa',
       not exists (
         select 1 from public.empresas e
         where (select count(*) from public.metodo_decisao d
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.empresa_id = e.id and o.tipo_evento = 'debutante') <> 57
       )
union all
select 'toda decisão de contratar tem as 4 tarefas de contrato',
       not exists (
         select 1 from public.metodo_decisao d
         join public.metodo_objetivo o on o.id = d.objetivo_id
         where o.tipo_evento = 'debutante' and d.codigo like '%contratar%'
           and (select count(*) from public.metodo_tarefa t
                where t.decisao_id = d.id) < 4
       )
union all
select 'a verba da debutante liga no espelho da 121 (campo verba_total)',
       exists (
         select 1 from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         join public.metodo_objetivo o on o.id = d.objetivo_id
         where o.tipo_evento = 'debutante' and c.codigo = 'verba_total'
       )
union all
select 'debutantes vivas ganharam o mapa',
       not exists (
         select 1 from public.events e
         where e.type = 'debutante' and e.status in ('orcamento', 'confirmado')
           and not exists (select 1 from public.evento_objetivo eo where eo.event_id = e.id)
       );
