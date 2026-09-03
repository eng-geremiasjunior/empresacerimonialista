-- 146 — As perguntas do portal de volta, e desta vez presas ao chão
--
-- ACHADO EM PRODUÇÃO (03/09/2026, medido antes de escrever esta linha):
-- o casamento tinha 34 perguntas que a noiva responde pelo portal, e as
-- respostas caíam sozinhas no Planejamento. Hoje tem ZERO. Todo
-- casamento criado a partir de 26/08/2026 nasce com o portal mudo —
-- "Perguntas do momento" vazio — e a cerimonialista volta a digitar à
-- mão o que a noiva já teria respondido.
--
-- Como morreu: em 26/08 o método de casamento foi re-semeado, e
-- semear_metodo_casamento é destrutivo por desenho (084 apaga
-- metodo_objetivo do tipo, e o cascade leva decisões e campos junto). Os
-- campos voltaram; o que outras migrações tinham pendurado neles, não —
-- porque morava em UPDATE e DO block de uma vez só, não no seed:
--
--   * a curadoria da 090 ("o que SÓ a noiva sabe": 32 códigos com o
--     texto na voz dela) — pergunta_cliente e label_portal zerados;
--   * a decisão inteira "Cuidados com os noivos no dia" da 092, com
--     alergias e medicamentos, que são os únicos campos com
--     sensibilidade marcada (o gate da IA depende dela).
--
-- Prova: todo metodo_campo de casamento tem created_at = 26/08/2026,
-- pergunta_cliente = false e label_portal nulo, nas DUAS empresas; e
-- nenhuma delas tem a decisão cuidados_noivos.
--
-- Quem escapou: o corporativo (141) e o casal_historia (144), porque lá
-- a marcação foi escrita DENTRO do insert do seed. É esse o padrão
-- certo — e é o que esta migração torna automático para o resto.
--
-- O conserto tem três metades, e as duas primeiras é que impedem a
-- terceira de ser necessária de novo:
--
--   (1) a curadoria vira TABELA, e um gatilho em metodo_campo a aplica
--       no INSERT. Qualquer re-semeadura futura devolve as perguntas
--       sozinha.
--   (2) os cuidados viram FUNÇÃO, e um gatilho em metodo_objetivo a
--       chama quando o objetivo "estrutura" do casamento nasce. Mesma
--       ideia, um andar acima.
--   (3) UPDATE convergente devolve o que já existe: template primeiro,
--       instâncias dos eventos VIVOS depois.
--
-- A doutrina da casa proíbe reescrever semear_metodo_* (o delete em
-- cascata órfãna eventos vivos). Os dois gatilhos respeitam isso e
-- resolvem por fora.
--
-- O que NÃO faz: não inventa pergunta para debutante, formatura ou show.
-- Medido: esses três nunca tiveram pergunta ao cliente, nem antes de
-- 26/08 — é lacuna antiga, não regressão, e curar cada tipo é decisão de
-- produto. Os códigos que eles compartilham com o casamento voltam
-- junto, exatamente como a 090 os deixava. Os cuidados voltam só para o
-- casamento: a 092 rodou quando só existia esse tipo, e "Cuidados com os
-- noivos no dia" não é frase para formatura nem para convenção.

-- ------------------------------------------------------------------
-- 1) A curadoria vira tabela
-- ------------------------------------------------------------------

create table if not exists public.metodo_pergunta_curada (
  codigo       text primary key,
  label_portal text not null,
  created_at   timestamptz not null default now()
);

comment on table public.metodo_pergunta_curada is
  'O que SÓ o cliente sabe: código do campo + a pergunta na voz dele. Lida pelo gatilho de metodo_campo para a marcação sobreviver a re-semeadura do método (146). Critério da 090: gosto, contexto de família, corpo, escolha pessoal — levantamento, inspeção, negociação e dinheiro ficam de fora.';

insert into public.metodo_pergunta_curada (codigo, label_portal)
select * from (values
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
where not exists (
  select 1 from public.metodo_pergunta_curada m where m.codigo = p.codigo
);

-- ------------------------------------------------------------------
-- 2) O gatilho: campo curado nasce pergunta
-- ------------------------------------------------------------------
-- Irmão do trg_campo_herda_pergunta (091), que faz o mesmo um andar
-- abaixo (instância herda do template). Aqui o template herda da
-- curadoria — com as mesmas travas da 090.

create or replace function public.trg_campo_curado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  v_resp  text;
begin
  -- marcação explícita do seed (corporativo da 141, casal_historia da
  -- 144, cuidados abaixo) manda: a curadoria só preenche o que veio
  -- em branco
  if coalesce(new.pergunta_cliente, false) then
    return new;
  end if;

  select label_portal into v_label
  from public.metodo_pergunta_curada
  where codigo = new.codigo;

  if v_label is null then
    return new;
  end if;

  -- só pergunta o que pertence a uma decisão do cliente
  select responsavel into v_resp
  from public.metodo_decisao
  where id = new.decisao_id;

  if v_resp is null or v_resp not in ('noivos', 'ambos') then
    return new;
  end if;

  -- travas que valem para sempre: dinheiro, fornecedor e anexo nunca são
  -- pergunta; escala e cenario redistribuem o método inteiro (083);
  -- reserva_pct é a reserva para imprevistos, que o cliente não vê
  if new.tipo in ('moeda', 'fornecedor', 'anexo')
     or new.codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total')
     or new.codigo like 'valor%'
     or new.codigo like 'orcamento%' then
    return new;
  end if;

  new.pergunta_cliente := true;
  new.label_portal     := coalesce(new.label_portal, v_label);
  return new;
end $$;

drop trigger if exists trg_campo_curado on public.metodo_campo;
create trigger trg_campo_curado
  before insert on public.metodo_campo
  for each row execute function public.trg_campo_curado();

-- ------------------------------------------------------------------
-- 3) Os cuidados viram função, e nascem com o objetivo
-- ------------------------------------------------------------------
-- Conteúdo idêntico ao da 092 (título, responsável, offsets, prioridade,
-- ordem, labels e sensibilidade). O que muda é o lugar: função chamada
-- por gatilho, em vez de DO block que já rodou.

create or replace function public.semear_cuidados_do_casal(p_objetivo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_dec     uuid;
begin
  select empresa_id into v_empresa
  from public.metodo_objetivo where id = p_objetivo_id;
  if v_empresa is null then
    return;
  end if;

  -- a guarda é por EMPRESA, não por objetivo: metodo_decisao tem unique
  -- (empresa_id, codigo), então a mesma decisão pendurada noutro objetivo
  -- da mesma empresa faria o insert estourar em vez de ser pulado
  select id into v_dec from public.metodo_decisao
   where empresa_id = v_empresa and codigo = 'cuidados_noivos';

  if v_dec is null then
    insert into public.metodo_decisao
      (objetivo_id, empresa_id, codigo, titulo, responsavel,
       offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
    values (p_objetivo_id, v_empresa, 'cuidados_noivos',
            'Cuidados com os noivos no dia', 'noivos', 30, 15, 60, 40, 90)
    returning id into v_dec;
  end if;

  -- alergia e medicamento são os únicos campos com sensibilidade: o gate
  -- da 091 exclui sensibilidade <> 'normal' de tudo que sai do sistema
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, ordem,
     pergunta_cliente, label_portal, sensibilidade)
  select v_dec, v_empresa, 'alergias',
         'Alergias', 'texto', 1, true,
         'Alguém de vocês tem alergia? (inclusive alimentar)', 'alergia'
  where not exists (
    select 1 from public.metodo_campo where decisao_id = v_dec and codigo = 'alergias');

  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, ordem,
     pergunta_cliente, label_portal, sensibilidade)
  select v_dec, v_empresa, 'medicamentos',
         'Medicamentos de uso contínuo', 'texto', 2, true,
         'Algum medicamento que precisamos ter à mão?', 'medicamento'
  where not exists (
    select 1 from public.metodo_campo where decisao_id = v_dec and codigo = 'medicamentos');
end $$;

revoke all on function public.semear_cuidados_do_casal(uuid) from public, anon;

-- O gatilho: quando o objetivo "estrutura" do casamento nasce — seja de
-- empresa nova, seja de re-semeadura — os cuidados nascem com ele.
create or replace function public.trg_objetivo_cuidados()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo_evento = 'casamento' and new.codigo = 'estrutura' then
    perform public.semear_cuidados_do_casal(new.id);
  end if;
  return null;
end $$;

drop trigger if exists trg_objetivo_cuidados on public.metodo_objetivo;
create trigger trg_objetivo_cuidados
  after insert on public.metodo_objetivo
  for each row execute function public.trg_objetivo_cuidados();

-- as empresas que já existem não passam pelo gatilho
do $$
declare o record;
begin
  for o in
    select id from public.metodo_objetivo
    where tipo_evento = 'casamento' and codigo = 'estrutura'
  loop
    perform public.semear_cuidados_do_casal(o.id);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- 4) O que já existe volta agora — template
-- ------------------------------------------------------------------

update public.metodo_campo c
   set pergunta_cliente = true,
       label_portal     = coalesce(c.label_portal, p.label_portal)
  from public.metodo_pergunta_curada p,
       public.metodo_decisao d
 where c.codigo = p.codigo
   and d.id = c.decisao_id
   and d.responsavel in ('noivos', 'ambos')
   and c.tipo not in ('moeda', 'fornecedor', 'anexo')
   and c.codigo not in ('escala', 'cenario', 'reserva_pct', 'verba_total')
   and c.codigo not like 'valor%'
   and c.codigo not like 'orcamento%'
   and not c.pergunta_cliente;

-- ------------------------------------------------------------------
-- 5) E nas instâncias dos eventos VIVOS
-- ------------------------------------------------------------------
-- Evento encerrado não volta a perguntar nada à noiva.

-- 5a) instâncias com template (todo evento criado depois da re-semeadura)
update public.evento_campo_valor v
   set pergunta_cliente = true,
       label_portal     = coalesce(v.label_portal, c.label_portal)
  from public.metodo_campo c,
       public.events e
 where c.id = v.campo_template_id
   and e.id = v.event_id
   and c.pergunta_cliente
   and not v.pergunta_cliente
   and e.status not in ('cancelado', 'concluido')
   and coalesce(e.archived, false) = false;

-- 5b) instâncias órfãs (o cascade da re-semeadura soltou o vínculo),
--     pelo código, com as mesmas travas
update public.evento_campo_valor v
   set pergunta_cliente = true,
       label_portal     = coalesce(v.label_portal, p.label_portal)
  from public.metodo_pergunta_curada p,
       public.evento_decisao d,
       public.events e
 where v.campo_template_id is null
   and v.codigo = p.codigo
   and d.id = v.evento_decisao_id
   and d.responsavel in ('noivos', 'ambos')
   and e.id = v.event_id
   and e.status not in ('cancelado', 'concluido')
   and coalesce(e.archived, false) = false
   and v.tipo not in ('moeda', 'fornecedor', 'anexo')
   and v.codigo not in ('escala', 'cenario', 'reserva_pct', 'verba_total')
   and not v.pergunta_cliente;

-- 5c) a trava final também na instância (uma órfã pode ter tipo próprio)
update public.evento_campo_valor
   set pergunta_cliente = false,
       label_portal     = null
 where pergunta_cliente
   and (tipo in ('moeda', 'fornecedor', 'anexo')
        or codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total'));

-- 5d) NÃO religamos vínculo de template aqui, e a razão está medida:
-- sobraram 7 decisões e 19 campos de eventos vivos sem template. Parte é
-- legítima (decisão e campo que a própria cerimonialista criou); e cinco
-- delas são entulho de uma reestruturação antiga — decisões presas a um
-- objetivo "Cerimônia religiosa" que o método não tem mais, com o MESMO
-- título de decisões vivas do objetivo "Celebrante". Religar por título
-- juntaria as duas e criaria a duplicata que hoje só parece existir.
-- Fica anotado como limpeza à parte, com o dono decidindo item a item.

-- 5e) a decisão de cuidados nos casamentos vivos (molde 144)
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
  on o.id = eo.objetivo_template_id
 and o.tipo_evento = 'casamento' and o.codigo = 'estrutura'
join public.metodo_decisao d
  on d.objetivo_id = o.id and d.codigo = 'cuidados_noivos'
where e.type = 'casamento'
  and e.status in ('orcamento', 'confirmado')
  -- pelo título TAMBÉM: se o religamento acima não alcançar algum caso,
  -- o evento não pode terminar com duas decisões de mesmo nome
  and not exists (
    select 1 from public.evento_decisao x
    where x.event_id = eo.event_id
      and (x.decisao_template_id = d.id or x.titulo = d.titulo)
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
join public.metodo_decisao d
  on d.id = ed.decisao_template_id and d.codigo = 'cuidados_noivos'
join public.metodo_campo c on c.decisao_id = d.id
where e.type = 'casamento'
  and e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_campo_valor x
    where x.evento_decisao_id = ed.id and x.codigo = c.codigo
  );

-- prazo para a decisão nova, como qualquer outra
do $$
declare ev record;
begin
  for ev in
    select distinct ed.event_id as id
    from public.evento_decisao ed
    join public.metodo_decisao d
      on d.id = ed.decisao_template_id and d.codigo = 'cuidados_noivos'
    where ed.prazo_previsto is null and ed.estado = 'pendente'
  loop
    perform public.redistribuir_decisoes_evento(ev.id);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- 6) Conferência — tudo true
-- ------------------------------------------------------------------

select 'a curadoria tem os 32 códigos' as item,
       (select count(*) = 32 from public.metodo_pergunta_curada) as ok
union all
select 'o gatilho da curadoria está no lugar',
       exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
               where c.relname = 'metodo_campo' and t.tgname = 'trg_campo_curado')
union all
select 'o gatilho dos cuidados está no lugar',
       exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
               where c.relname = 'metodo_objetivo' and t.tgname = 'trg_objetivo_cuidados')
union all
select 'nenhum campo curado e elegível ficou sem virar pergunta',
       not exists (
         select 1
         from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         join public.metodo_pergunta_curada p on p.codigo = c.codigo
         where d.responsavel in ('noivos', 'ambos')
           and c.tipo not in ('moeda', 'fornecedor', 'anexo')
           and c.codigo not in ('escala', 'cenario', 'reserva_pct', 'verba_total')
           and not c.pergunta_cliente
       )
union all
select 'toda empresa tem os cuidados do casal, com os dois campos sensíveis',
       not exists (
         select 1 from public.empresas em
         where not exists (
           select 1
           from public.metodo_decisao d
           join public.metodo_objetivo o on o.id = d.objetivo_id
           where o.empresa_id = em.id and o.tipo_evento = 'casamento'
             and d.codigo = 'cuidados_noivos'
             and (select count(*) from public.metodo_campo c
                  where c.decisao_id = d.id
                    and c.codigo in ('alergias', 'medicamentos')
                    and c.sensibilidade <> 'normal') = 2
         )
       )
union all
select 'nenhuma pergunta ficou sem o texto na voz do cliente',
       not exists (
         select 1 from public.metodo_campo
         where pergunta_cliente and coalesce(label_portal, '') = ''
       )
union all
select 'nenhuma pergunta caiu em decisão que não é do cliente',
       not exists (
         select 1 from public.metodo_campo c
         join public.metodo_decisao d on d.id = c.decisao_id
         where c.pergunta_cliente and d.responsavel not in ('noivos', 'ambos')
       )
union all
select 'dinheiro, fornecedor e anexo continuam fora do portal (template)',
       not exists (
         select 1 from public.metodo_campo
         where pergunta_cliente
           and (tipo in ('moeda', 'fornecedor', 'anexo')
                or codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total'))
       )
union all
select 'o mesmo vale para as instâncias',
       not exists (
         select 1 from public.evento_campo_valor
         where pergunta_cliente
           and (tipo in ('moeda', 'fornecedor', 'anexo')
                or codigo in ('escala', 'cenario', 'reserva_pct', 'verba_total'))
       )
union all
select 'nenhum evento vivo ficou com duas decisões de mesmo nome',
       not exists (
         select 1 from public.evento_decisao ed
         join public.events e on e.id = ed.event_id
         where e.status in ('orcamento', 'confirmado')
         group by ed.event_id, ed.titulo
         having count(*) > 1
       )
union all
-- decisão criada pela própria cerimonialista nasce sem template e assim
-- deve ficar: a conferência só cobra o que TEM para onde apontar
select 'nenhuma decisão religável ficou órfã',
       not exists (
         select 1
         from public.evento_decisao ed
         join public.events e on e.id = ed.event_id
         join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
         join public.metodo_decisao d
           on d.objetivo_id = eo.objetivo_template_id and d.titulo = ed.titulo
         where ed.decisao_template_id is null
           and e.status in ('orcamento', 'confirmado')
           and coalesce(e.archived, false) = false
       )
union all
select 'todo casamento vivo com mapa voltou a ter perguntas',
       not exists (
         select 1 from public.events e
         where e.type = 'casamento'
           and e.status in ('orcamento', 'confirmado')
           and coalesce(e.archived, false) = false
           and exists (select 1 from public.evento_objetivo eo where eo.event_id = e.id)
           and (select count(*) from public.evento_campo_valor v
                where v.event_id = e.id and v.pergunta_cliente) < 20
       );
