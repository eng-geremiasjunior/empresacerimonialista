-- ============================================================
-- Vela — Migração 125: formatura — método, roteiros e listas
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Formatura não é um casamento com outro nome. A cerimonialista entra
-- tarde, num pacote já vendido pela empresa de formatura — o método é
-- ENXUTO (sem faixas de verba: o dinheiro da turma não é dela; sem
-- arquétipos). Na colação o roteiro se CUMPRE, não se cria: protocolo
-- fixo, e o valor do Vela está nas listas — ordem de entrada, mesa de
-- honra, discursos e chamada nominal com nota de pronúncia.
--
-- Decisões tomadas com o dono:
--   1. Colação e baile JUNTOS = um evento só (uma âncora). SEPARADOS =
--      baile é o evento principal e a colação nasce como evento LIGADO
--      (events.evento_pai_id, novo aqui). Honorário fica no principal.
--   2. As listas usam o CORTEJO existente (092), generalizado: papel
--      deixa de ser CHECK fixo de casamento e vira texto (a lista
--      oferecida é por tipo, no aplicativo), e ganha nota de pronúncia.
--
-- Segurança (regra do dono): lista de formandos é dado de TERCEIROS e
-- pronúncia é anotação interna. O cortejo não tem nenhuma policy anon
-- (medido antes desta migração) e nada aqui cria caminho público novo —
-- a conferência no fim prova as duas coisas.
--
-- Códigos de decisão levam prefixo form_ porque metodo_decisao tem
-- unique (empresa_id, codigo) ATRAVESSANDO tipos (lição da 122).

-- ------------------------------------------------------------
-- 1) VÍNCULO evento ↔ evento (colação ligada ao baile)
-- ------------------------------------------------------------
-- Sem policy nova: o filho é um evento normal e herda a RLS de events.
alter table public.events
  add column if not exists evento_pai_id uuid references public.events (id) on delete set null;

create index if not exists idx_events_evento_pai on public.events (evento_pai_id);

-- Uma colação por baile: o unique fecha a corrida de dois cliques em
-- "criar a colação" chegando juntos (a função ainda confere antes, mas
-- é o índice que garante).
create unique index if not exists uq_events_colacao_unica
  on public.events (evento_pai_id) where evento_pai_id is not null;

-- ------------------------------------------------------------
-- 2) CORTEJO GENERALIZADO — papel livre + pronúncia
-- ------------------------------------------------------------
-- O CHECK de 092 travava em 5 papéis de casamento. A lista oferecida
-- passa a viver no aplicativo (por tipo de evento); o banco só garante
-- que papel não é vazio nem um texto sem fim.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.evento_cortejo_pessoa'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%papel%'
  loop
    execute format('alter table public.evento_cortejo_pessoa drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.evento_cortejo_pessoa
  add constraint evento_cortejo_pessoa_papel_len
  check (char_length(btrim(papel)) between 1 and 40);

-- Nota de pronúncia ("Kauã — ka-u-Ã"): a comissão preenche no portal,
-- a equipe usa na folha de chamada. NUNCA sai em rota pública.
alter table public.evento_cortejo_pessoa
  add column if not exists pronuncia text;

-- ------------------------------------------------------------
-- 3) MÉTODO DE FORMATURA — semear_metodo_formatura
-- ------------------------------------------------------------
-- Molde da 122, enxuto: 6 objetivos, sem faixas de verba, sem
-- arquétipos. Offsets em dias antes do BAILE (~120 dias: ela entra
-- quando a turma já vendeu o pacote).
create or replace function public.semear_metodo_formatura(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.metodo_objetivo
    where empresa_id = p_empresa_id and tipo_evento = 'formatura';

  -- 3.1) OBJETIVOS (sem faixa % — a verba da turma não é dela)
  insert into public.metodo_objetivo
    (empresa_id, tipo_evento, codigo, nome, descricao, ordem,
     ativo_padrao, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_empresa_id, 'formatura', v.codigo, v.nome, v.descricao, v.ordem,
         true, null::int, null::int, null::int
  from (values
    ('celebracoes', 'Celebrações e formato',
     'Quais celebrações a turma terá e como se organizam — a decisão-raiz.', 1),
    ('becas',       'Becas e canudos',
     'Aluguel ou compra, quantidades e a data de retirada.',                 2),
    ('foto_video',  'Foto e vídeo',
     'A cobertura do dia e o ensaio das fotos do convite.',                  3),
    ('atracoes',    'Atrações do baile',            null,                    4),
    ('telao',       'Telão e retrospectiva',
     'As fotos da turma projetadas na festa.',                               5),
    ('papeis',      'Papéis e homenagens',
     'Paraninfo, patrono, orador, juramentista, homenageados — e a chamada.', 6)
  ) as v(codigo, nome, descricao, ordem);

  -- 3.2) DECISÕES (offset em dias antes do baile)
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select o.id, p_empresa_id, v.codigo, v.titulo, v.resp,
         v.offi, v.offn, v.offx, v.prio, v.ordem
  from (values
    -- celebrações ('noivos' = a comissão de formatura; o rótulo é por tipo)
    ('celebracoes', 'form_celebracoes_definir', 'Definir as celebrações da turma',        'noivos',         120,  90, 150, 100, 1),
    ('celebracoes', 'form_comissao_alinhar',    'Alinhar papéis e prazos com a comissão', 'cerimonialista', 110,  90, 130,  98, 2),
    -- becas e canudos
    ('becas', 'form_becas_contratar',   'Contratar as becas',                      'ambos',  90, 60, 120, 95, 1),
    ('becas', 'form_canudos_confirmar', 'Confirmar canudos e diplomas simbólicos', 'ambos',  60, 45,  90, 80, 2),
    -- foto e vídeo
    ('foto_video', 'form_foto_contratar', 'Contratar foto e vídeo',               'ambos', 100, 80, 130, 92, 1),
    ('foto_video', 'form_fotos_convite',  'Organizar o dia das fotos do convite', 'noivos', 90, 60, 120, 85, 2),
    -- atrações do baile
    ('atracoes', 'form_atracoes_definir',   'Definir as atrações do baile', 'noivos', 90, 60, 120, 84, 1),
    ('atracoes', 'form_atracoes_contratar', 'Contratar as atrações',        'ambos',  75, 50, 100, 83, 2),
    -- telão
    ('telao', 'form_telao_contratar',     'Contratar telão e projeção',      'ambos',  75, 50, 100, 75, 1),
    ('telao', 'form_retrospectiva_turma', 'Montar a retrospectiva da turma', 'noivos', 30, 20,  60, 60, 2),
    -- papéis e homenagens
    ('papeis', 'form_papeis_definir',     'Definir os papéis de honra',            'noivos',         60, 45, 90, 90, 1),
    ('papeis', 'form_homenagens_definir', 'Definir homenagens e presentes',        'noivos',         45, 30, 60, 70, 2),
    ('papeis', 'form_madrinha_anel',      'Definir madrinha ou padrinho do anel',  'noivos',         45, 30, 60, 65, 3),
    ('papeis', 'form_ensaio_colacao',     'Marcar o ensaio da colação',            'cerimonialista', 15,  7, 30, 88, 4)
  ) as v(obj, codigo, titulo, resp, offi, offn, offx, prio, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id
   and o.tipo_evento = 'formatura'
   and o.codigo = v.obj;

  -- 3.3) CAMPOS TIPADOS (o formulário é o roteiro da conversa)
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem,
     ativa_objetivo_codigo, ativa_quando)
  select d.id, p_empresa_id, c.codigo, c.label, c.tipo,
         case when c.opcoes = '' then null else string_to_array(c.opcoes, '|') end,
         nullif(c.unidade, ''), c.ordem, null, null
  from (values
    -- celebrações — a resposta do wizard cai aqui (celebracao_formato)
    ('form_celebracoes_definir', 'celebracao_formato', 'Colação e baile',
     'escolha', 'Juntos (mesmo dia e local)|Separados (a colação em outra data)|Só o baile', '', 1),
    ('form_celebracoes_definir', 'missa_culto',   'Terá missa ou culto?', 'sim_nao', '', '', 2),
    ('form_comissao_alinhar',    'contato_comissao', 'Contato da comissão', 'texto', '', '', 1),
    -- becas
    ('form_becas_contratar',   'modalidade',        'Aluguel ou compra', 'escolha', 'Aluguel|Compra', '', 1),
    ('form_becas_contratar',   'quantidade',        'Quantidade',        'numero',  '', 'becas', 2),
    ('form_becas_contratar',   'retirada',          'Data de retirada',  'data',    '', '', 3),
    ('form_canudos_confirmar', 'quantidade_canudos','Quantidade',        'numero',  '', 'canudos', 1),
    -- foto e vídeo
    ('form_fotos_convite', 'data_fotos', 'Data do ensaio', 'data', '', '', 1),
    -- atrações
    ('form_atracoes_definir', 'atracoes', 'Atrações escolhidas', 'texto', '', '', 1),
    -- telão
    ('form_retrospectiva_turma', 'prazo_fotos', 'Prazo para a turma enviar as fotos', 'data', '', '', 1),
    -- papéis
    ('form_papeis_definir',     'paraninfo',    'Paraninfo',              'texto', '', '', 1),
    ('form_papeis_definir',     'patrono',      'Patrono',                'texto', '', '', 2),
    ('form_papeis_definir',     'orador',       'Orador',                 'texto', '', '', 3),
    ('form_papeis_definir',     'juramentista', 'Juramentista',           'texto', '', '', 4),
    ('form_homenagens_definir', 'docentes_homenageados', 'Docentes homenageados', 'texto', '', '', 1),
    ('form_homenagens_definir', 'presente',     'Como presentear',        'texto', '', '', 2),
    ('form_madrinha_anel',      'nome_madrinha_anel', 'Quem entrega o anel', 'texto', '', '', 1)
  ) as c(dec, codigo, label, tipo, opcoes, unidade, ordem)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = c.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'formatura';

  -- 3.4) TAREFAS — o padrão de contrato + as específicas da chamada
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, t.titulo, 'cerimonialista', d.offset_ideal_dias, t.ord, t.vinc
  from public.metodo_decisao d
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'formatura'
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
    ('form_comissao_alinhar',    'Receber a lista de formandos da comissão',        'cerimonialista', 60, 10),
    ('form_comissao_alinhar',    'Conferir a pronúncia dos nomes com a comissão',   'cerimonialista', 15, 11),
    ('form_retrospectiva_turma', 'Recolher as fotos da turma',                      'noivos',         45, 10),
    ('form_ensaio_colacao',      'Imprimir a ordem de entrada e a chamada',         'cerimonialista',  3, 10),
    ('form_ensaio_colacao',      'Ensaio geral (entrada, juramento, mesa de honra)','cerimonialista',  7, 11)
  ) as v(dec, titulo, resp, off, ord)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = v.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'formatura';
end;
$$;

revoke all on function public.semear_metodo_formatura(uuid) from public, anon;

-- ------------------------------------------------------------
-- 4) ROTEIRO SEMEADO — dois conjuntos, duas âncoras
-- ------------------------------------------------------------
-- colacao_* mede a partir da ABERTURA DA SESSÃO SOLENE (offset 0);
-- baile_* mede a partir da ABERTURA OFICIAL DO BAILE (offset 0).
-- Separados: cada evento recebe o seu conjunto, com a própria âncora.
-- Juntos: o aplicativo encadeia os dois (baile deslocado para depois da
-- colação). A composição da mesa de honra vem DEPOIS da entrada dos
-- formandos — todos acomodados primeiro (protocolo).
-- Corpo da 112 mantido verbatim (casamento e debutante) + formatura.
create or replace function public.semear_roteiro_padrao(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Casamento — âncora: a cerimônia (offset 0)
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'casamento', v.codigo, v.titulo, v.off, v.dur, v.cond, v.ordem
  from (values
    ('equipe_decoracao', 'Chegada da equipe/decoração',   -360, 240, null::text, 10),
    ('cerimonialista',   'Chegada do cerimonialista',     -300, null, null,      20),
    ('buffet',           'Chegada do buffet',             -240,  90, null,       30),
    ('cerimonia',        'Cerimônia',                        0,  60, null,       40),
    ('fotos',            'Fotos',                           60,  45, null,       50),
    ('entrada_noivos',   'Recepção/Entrada dos noivos',    105,  15, null,       60),
    ('jantar',           'Jantar',                         120,  90, null,       70),
    ('pista',            'Abertura da pista',              210, null, 'hasDanceFloor', 80),
    ('bolo',             'Corte do bolo',                  270, null, null,      90)
  ) as v(codigo, titulo, off, dur, cond, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'casamento' and m.codigo = v.codigo
  );

  -- Debutante — âncora: a entrada da aniversariante (offset 0)
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'debutante', v.codigo, v.titulo, v.off, v.dur, v.cond, v.ordem
  from (values
    ('equipe_decoracao', 'Chegada da equipe/decoração',   -360, 240, null::text, 10),
    ('buffet',           'Chegada do buffet',             -240,  90, null,       20),
    ('entrada',          'Entrada da aniversariante',        0,  15, null,       30),
    ('valsa',            'Valsa',                           15,  20, null,       40),
    ('troca_vestido',    'Troca de vestido',               120,  30, null,       50),
    ('velas',            'As 15 velas',                    150,  30, null,       60),
    ('homenagem_pais',   'Homenagem aos pais',             180,  20, null,       70),
    ('pista',            'Abertura da pista',              200, null, null,      80),
    ('cabine_fotos',     'Cabine de fotos',                200, null, 'cabineFotos', 90)
  ) as v(codigo, titulo, off, dur, cond, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'debutante' and m.codigo = v.codigo
  );

  -- Formatura — colação (âncora: abertura da sessão solene)
  -- condicao 'colacaoJunto': o caminho do wizard filtra por PREFIXO e
  -- ignora isto; quem respeita a condicao é criar_evento_do_orcamento
  -- (112), que sem ela copiaria as DUAS âncoras misturadas no evento
  -- nascido de orçamento aprovado. Orçamento não pergunta juntos ou
  -- separados — o evento nasce só com o baile e a colação entra depois,
  -- pelo hub ou pelo Planejamento.
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'formatura', v.codigo, v.titulo, v.off, v.dur, 'colacaoJunto', v.ordem
  from (values
    ('colacao_chegada_formandos', 'Chegada e organização dos formandos', -60, 40,  10),
    ('colacao_entrada_formandos', 'Entrada dos formandos',               -20, 15,  20),
    ('colacao_mesa_honra',        'Composição da mesa de honra',          -5,  5,  30),
    ('colacao_abertura',          'Abertura da sessão solene',             0,  5,  40),
    ('colacao_juramento',         'Juramento',                             5, 10,  50),
    ('colacao_discursos',         'Discursos (orador, paraninfo, patrono)', 15, 30, 60),
    ('colacao_outorga',           'Outorga de grau e chamada nominal',    45, 60,  70),
    ('colacao_encerramento',      'Encerramento e saída oficial',        105, 10,  80)
  ) as v(codigo, titulo, off, dur, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'formatura' and m.codigo = v.codigo
  );

  -- Formatura — baile (âncora: abertura oficial do baile)
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'formatura', v.codigo, v.titulo, v.off, v.dur, null, v.ordem
  from (values
    ('baile_equipe',     'Chegada da equipe/decoração', -360, 240, 110),
    ('baile_buffet',     'Chegada do buffet',           -240,  90, 120),
    ('baile_recepcao',   'Recepção e coquetel',          -60,  60, 130),
    ('baile_mesas',      'Direcionamento às mesas',      -10,  10, 140),
    ('baile_abertura',   'Abertura oficial do baile',      0,  10, 150),
    ('baile_homenagens', 'Homenagens',                    10,  30, 160),
    ('baile_valsa',      'Valsa dos formandos',           40,  20, 170),
    ('baile_pista',      'Abertura da pista',             60, null::int, 180)
  ) as v(codigo, titulo, off, dur, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'formatura' and m.codigo = v.codigo
  );
end;
$$;

-- Quem já rodou a versão anterior desta migração tem as linhas de
-- colação com condicao null — corrige no lugar (o guard not-exists do
-- seed não reencosta em linha existente).
update public.metodo_roteiro_item
set condicao = 'colacaoJunto'
where tipo_evento = 'formatura'
  and codigo like 'colacao\_%'
  and condicao is null;

-- ------------------------------------------------------------
-- 5) CHECKLIST DO DIA — bloco novo 'colacao' + seed de formatura
-- ------------------------------------------------------------
-- Os dois CHECKs de bloco (111) ganham 'colacao'. Derruba qualquer
-- CHECK existente sobre a coluna e recria com nome fixo — convergente
-- mesmo se o nome automático variar. A lista nova é superconjunto da
-- antiga, então as linhas existentes continuam válidas.
do $$
declare t text; c record;
begin
  foreach t in array array['metodo_checklist_dia', 'evento_checklist_dia'] loop
    for c in
      select con.conname
      from pg_constraint con
      where con.conrelid = ('public.' || t)::regclass
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%bloco%'
    loop
      execute format('alter table public.%I drop constraint %I', t, c.conname);
    end loop;
    execute format(
      'alter table public.%I add constraint %I check '
      || '(bloco in (''montagem'', ''colacao'', ''cerimonia'', ''recepcao'', ''desmontagem''))',
      t, t || '_bloco_check');
  end loop;
end $$;

-- Itens do dia de formatura. Blocos usados: montagem, colacao,
-- recepcao (= o baile) e desmontagem. requer_objetivo_codigo casa com
-- os objetivos do método semeado acima (seed lazy da 111 filtra por
-- objetivo ativo no evento).
create or replace function public.semear_checklist_dia_formatura(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_checklist_dia
    (empresa_id, tipo_evento, codigo, bloco, titulo, ordem, requer_objetivo_codigo)
  select p_empresa_id, 'formatura', v.codigo, v.bloco, v.titulo, v.ordem, v.req
  from (values
    -- montagem
    ('reuniao_equipe',        'montagem',    'Reunião com a equipe do dia (postos e horários)', 10, null::text),
    ('orientar_fornecedores', 'montagem',    'Orientar fornecedores na montagem',               20, null),
    ('som_luz_festa',         'montagem',    'Som e iluminação testados',                       30, null),
    ('telao_testado',         'montagem',    'Telão e retrospectiva testados',                  40, 'telao'),
    ('mesa_diplomas',         'montagem',    'Canudos e diplomas conferidos e ordenados na mesa', 50, 'becas'),
    -- colação
    ('becas_conferidas',      'colacao',     'Becas conferidas e separadas por formando',       10, 'becas'),
    ('ordem_entrada',         'colacao',     'Ordem de entrada e chamada nominal impressas',    20, null),
    ('som_chamada',           'colacao',     'Som da chamada e microfones testados',            30, null),
    ('mesa_honra_pronta',     'colacao',     'Mesa de honra montada (lugares marcados)',        40, null),
    ('agua_mesa_honra',       'colacao',     'Água para a mesa de honra',                       50, null),
    ('juramento_impresso',    'colacao',     'Texto do juramento impresso no púlpito',          60, null),
    ('alinhar_mc',            'colacao',     'Roteiro repassado com o mestre de cerimônias',    70, null),
    ('receber_autoridades',   'colacao',     'Receber e posicionar autoridades e docentes',     80, null),
    -- recepção (o baile)
    ('recepcao_formandos',    'recepcao',    'Recepção dos formandos e famílias organizada',    10, null),
    ('valsa_alinhada',        'recepcao',    'Horário e música da valsa alinhados com o DJ',    20, null),
    ('atracoes_conferidas',   'recepcao',    'Atrações confirmadas (horário e estrutura)',      30, 'atracoes'),
    ('retrospectiva_rodando', 'recepcao',    'Retrospectiva pronta para rodar',                 40, 'telao'),
    -- desmontagem
    ('becas_devolvidas',      'desmontagem', 'Becas recolhidas para devolução',                 10, 'becas'),
    ('itens_alugados',        'desmontagem', 'Itens alugados conferidos para devolução',        20, null),
    ('avarias_espaco',        'desmontagem', 'Ocorrências e avarias registradas com o espaço',  30, null),
    ('saida_fornecedores',    'desmontagem', 'Saída dos fornecedores acompanhada',              40, null)
  ) as v(codigo, bloco, titulo, ordem, req)
  where not exists (
    select 1 from public.metodo_checklist_dia m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'formatura'
      and m.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_checklist_dia_formatura(uuid) from public, anon;

-- O seed lazy (111) aprende o vínculo: o evento LIGADO (colação) não
-- recebe o bloco do baile; o principal cuja colação é evento próprio —
-- ou turma "só o baile" — não recebe o bloco da colação; e o gate de
-- objetivo olha o método do PRINCIPAL (o filho não instancia método).
-- Para casamento e debutante nada muda: sem vínculo e sem bloco colacao,
-- as condições novas são sempre verdadeiras.
create or replace function public.semear_checklist_dia(p_event_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.pode_ver_evento(p_event_id) then
    return;
  end if;

  insert into public.evento_checklist_dia
    (event_id, template_id, bloco, titulo, ordem)
  select p_event_id, t.id, t.bloco, t.titulo, t.ordem
  from public.metodo_checklist_dia t
  join public.events e on e.id = p_event_id
  where t.empresa_id = e.empresa_id
    and t.tipo_evento::text = e.type
    -- filho (colação em evento próprio): só o dia da colação
    and (e.evento_pai_id is null or t.bloco in ('montagem', 'colacao', 'desmontagem'))
    -- principal: o bloco colacao só quando a colação acontece NELE
    and (
      t.bloco <> 'colacao'
      or e.evento_pai_id is not null
      or (
        not exists (select 1 from public.events f where f.evento_pai_id = e.id)
        and coalesce((
          select v.valor_opcao from public.evento_campo_valor v
          where v.event_id = e.id and v.codigo = 'celebracao_formato'
          order by v.created_at desc limit 1
        ), '') not in ('Separados (a colação em outra data)', 'Só o baile')
      )
    )
    and (
      t.requer_objetivo_codigo is null
      or exists (
        select 1
        from public.evento_objetivo eo
        join public.metodo_objetivo mo on mo.id = eo.objetivo_template_id
        where eo.event_id = coalesce(e.evento_pai_id, e.id)
          and mo.codigo = t.requer_objetivo_codigo
          and eo.ativo
      )
    )
    and not exists (
      select 1 from public.evento_checklist_dia x
      where x.event_id = p_event_id and x.template_id = t.id
    );
end;
$$;

revoke all on function public.semear_checklist_dia(uuid) from public, anon;
grant execute on function public.semear_checklist_dia(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6) CRIAR A COLAÇÃO LIGADA — criar_evento_colacao
-- ------------------------------------------------------------
-- Quando colação e baile são SEPARADOS, o hub do baile oferece "criar a
-- colação": um evento normal (âncora, roteiro e checklist próprios),
-- ligado ao principal por evento_pai_id. Sem instanciar o método — as
-- decisões e tarefas vivem no principal; o filho é execução.
-- Idempotente: se a colação já existe, devolve a existente.
create or replace function public.criar_evento_colacao(
  p_pai_id    uuid,
  p_date      date,
  p_time      time default null,
  p_location  text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pai    public.events%rowtype;
  v_novo   uuid;
begin
  select * into v_pai from public.events where id = p_pai_id;
  if not found or not public.pode_editar_evento(p_pai_id) then
    raise exception 'sem permissão para este evento';
  end if;
  if v_pai.type <> 'formatura' then
    raise exception 'a colação só se liga a uma formatura';
  end if;
  if v_pai.evento_pai_id is not null then
    raise exception 'este evento já é uma colação ligada';
  end if;
  if p_date is null then
    raise exception 'informe a data da colação';
  end if;

  select id into v_novo
  from public.events
  where evento_pai_id = p_pai_id
  limit 1;
  if v_novo is not null then
    return v_novo;
  end if;

  begin
    insert into public.events
      (cerimonialista_id, cerimonialista_responsavel_id, empresa_id, client_id,
       type, name, date, time, location, city, status, evento_pai_id)
    values
      (v_pai.cerimonialista_id,
       -- a responsável do baile responde pela colação também — sem isto,
       -- um membro escalado que cria a colação não a enxerga depois
       v_pai.cerimonialista_responsavel_id,
       v_pai.empresa_id, v_pai.client_id, 'formatura',
       'Colação de grau' || case when v_pai.name is not null then ' — ' || v_pai.name else '' end,
       p_date, p_time, p_location,
       v_pai.city,
       case when v_pai.status in ('orcamento', 'confirmado') then v_pai.status else 'confirmado' end,
       p_pai_id)
    returning id into v_novo;
  exception when unique_violation then
    -- dois cliques em corrida: o índice único segura o segundo — devolve
    -- a colação que o primeiro criou
    select id into v_novo from public.events where evento_pai_id = p_pai_id limit 1;
    return v_novo;
  end;

  -- O gatilho de criação instanciou o método no filho — desfaz: as
  -- decisões e tarefas da turma vivem no PRINCIPAL (o filho é execução;
  -- o gate do checklist lê coalesce(evento_pai_id, id) por isso).
  -- O delete cascata para evento_decisao e evento_campo_valor.
  delete from public.evento_objetivo where event_id = v_novo;

  -- Se o checklist do pai já tinha sido semeado com o bloco da colação
  -- (ela abriu antes de decidir "separados"), os itens de template ainda
  -- não conferidos mudam de casa junto com a colação.
  delete from public.evento_checklist_dia
  where event_id = p_pai_id
    and bloco = 'colacao'
    and template_id is not null
    and conferido_em is null;

  -- Roteiro: só o protocolo da colação, na âncora do próprio evento.
  insert into public.roteiro_items
    (event_id, empresa_id, title, "order", time,
     offset_min, duracao_minutos, origem_horario)
  select
    v_novo, v_pai.empresa_id, mr.titulo, mr.ordem,
    case when p_time is null then null
         else (p_time + make_interval(mins => mr.offset_min))::time end,
    mr.offset_min, mr.duracao_min, 'calculado'
  from public.metodo_roteiro_item mr
  where mr.empresa_id = v_pai.empresa_id
    and mr.tipo_evento = 'formatura'
    and mr.codigo like 'colacao\_%'
  order by mr.ordem;

  return v_novo;
end;
$$;

revoke all on function public.criar_evento_colacao(uuid, date, time, text) from public, anon;
grant execute on function public.criar_evento_colacao(uuid, date, time, text) to authenticated;

-- ------------------------------------------------------------
-- 7) EMPRESA NOVA + RE-SEED + FORMATURAS VIVAS
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
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_checklist_dia_formatura(new.id);
  perform public.semear_roteiro_padrao(new.id);
  return new;
end $$;

do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_metodo_formatura(e.id);
    perform public.semear_checklist_dia_formatura(e.id);
    perform public.semear_roteiro_padrao(e.id);
  end loop;
end $$;

-- Formaturas vivas com o mapa vazio ganham o método agora. O guard do
-- instanciar ("já tem objetivo? não mexe") protege objetivos manuais.
do $$
declare ev record;
begin
  for ev in
    select e.id from public.events e
    where e.type = 'formatura'
      and e.status in ('orcamento', 'confirmado')
      and not exists (select 1 from public.evento_objetivo eo where eo.event_id = e.id)
  loop
    perform public.instanciar_metodo_evento(ev.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'events.evento_pai_id existe' as item,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'events'
                 and column_name = 'evento_pai_id') as ok
union all
select 'papel do cortejo aberto (sem lista fixa, com limite de tamanho)',
       not exists (
         select 1 from pg_constraint
         where conrelid = 'public.evento_cortejo_pessoa'::regclass
           and contype = 'c'
           and pg_get_constraintdef(oid) ilike '%padrinho%'
       )
       and exists (
         select 1 from pg_constraint
         where conrelid = 'public.evento_cortejo_pessoa'::regclass
           and conname = 'evento_cortejo_pessoa_papel_len'
       )
union all
select 'pronuncia existe no cortejo',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'evento_cortejo_pessoa'
                 and column_name = 'pronuncia')
union all
select 'cortejo continua sem policy anon (lista de formandos é de terceiros)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'evento_cortejo_pessoa'
           and 'anon' = any(roles)
       )
union all
select 'todas as empresas têm o método de formatura (6 objetivos)',
       not exists (
         select 1 from public.empresas e
         where (select count(*) from public.metodo_objetivo o
                where o.empresa_id = e.id and o.tipo_evento = 'formatura') <> 6
       )
union all
select 'decisões do método: 14 por empresa',
       not exists (
         select 1 from public.empresas e
         where (select count(*) from public.metodo_decisao d
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.empresa_id = e.id and o.tipo_evento = 'formatura') <> 14
       )
union all
select 'toda decisão de contratar tem as 4 tarefas de contrato',
       not exists (
         select 1 from public.metodo_decisao d
         join public.metodo_objetivo o on o.id = d.objetivo_id
         where o.tipo_evento = 'formatura' and d.codigo like '%contratar%'
           and (select count(*) from public.metodo_tarefa t
                where t.decisao_id = d.id) < 4
       )
union all
select 'roteiro semeado: 8 de colação + 8 de baile por empresa',
       not exists (
         select 1 from public.empresas e
         where (select count(*) from public.metodo_roteiro_item m
                where m.empresa_id = e.id and m.tipo_evento = 'formatura'
                  and m.codigo like 'colacao\_%') <> 8
            or (select count(*) from public.metodo_roteiro_item m
                where m.empresa_id = e.id and m.tipo_evento = 'formatura'
                  and m.codigo like 'baile\_%') <> 8
       )
union all
select 'bloco colacao aceito nos dois CHECKs do checklist',
       (select count(*) = 2 from pg_constraint
        where conname in ('metodo_checklist_dia_bloco_check',
                          'evento_checklist_dia_bloco_check')
          and pg_get_constraintdef(oid) ilike '%colacao%')
union all
select 'checklist do dia de formatura: 21 itens por empresa',
       not exists (
         select 1 from public.empresas e
         where (select count(*) from public.metodo_checklist_dia m
                where m.empresa_id = e.id and m.tipo_evento = 'formatura') <> 21
       )
union all
select 'seed lazy do checklist conhece o vínculo (evento_pai_id)',
       (pg_get_functiondef('public.semear_checklist_dia(uuid)'::regprocedure)
         like '%evento_pai_id%')
union all
select 'formaturas vivas ganharam o mapa',
       not exists (
         select 1 from public.events e
         where e.type = 'formatura' and e.status in ('orcamento', 'confirmado')
           and not exists (select 1 from public.evento_objetivo eo where eo.event_id = e.id)
       )
union all
select 'criar_evento_colacao existe e anon não executa',
       exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'criar_evento_colacao')
       and not has_function_privilege('anon',
             'public.criar_evento_colacao(uuid, date, time, text)', 'execute')
union all
select 'uma colação por baile (índice único parcial)',
       exists (select 1 from pg_indexes
               where schemaname = 'public' and tablename = 'events'
                 and indexname = 'uq_events_colacao_unica')
union all
select 'itens de colação do roteiro têm condicao (orçamento não mistura âncoras)',
       not exists (
         select 1 from public.metodo_roteiro_item
         where tipo_evento = 'formatura'
           and codigo like 'colacao\_%'
           and condicao is distinct from 'colacaoJunto'
       )
union all
select 'a colação ligada nasce sem método próprio (função desfaz o gatilho)',
       (pg_get_functiondef('public.criar_evento_colacao(uuid, date, time, text)'::regprocedure)
         like '%delete from public.evento_objetivo%');
