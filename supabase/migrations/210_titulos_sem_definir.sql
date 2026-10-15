-- 210: os títulos do método sem "Definir" (15/10/2026)
--
-- O método nasceu com "Definir…", "Contratar…", "Fazer…" abrindo quase
-- todo item — a cara de checklist genérico de SaaS. Decisão do dono: o
-- item diz o NOME DA COISA, como no caderno da cerimonialista ("Buffet",
-- "Cardápio final", "Entrada no cartório"); se já foi feito ou não, quem
-- diz é o estado ao lado. Lista aprovada em .claude/plans/titulos-sem-definir.md
-- (202 títulos mudam; 5 já eram nomes e ficam).
--
-- Só TEXTO muda. Estrutura, estados, prazos, tarefas e campos ficam.
--
-- Como, sem reaplicar semente nenhuma (re-semear apaga o modelo próprio):
--   1. metodo_titulo_revisto guarda (tipo, antigo, novo);
--   2. metodo_decisao (moldes de todas as empresas): troca onde o título
--      é EXATAMENTE o antigo e a linha não é do modelo próprio dela;
--   3. evento_decisao (eventos que já existem): troca onde o título é
--      exatamente o antigo do tipo do evento — título que ela editou não
--      casa e não é tocado. updated_at NÃO muda: não é ação de ninguém, e
--      o painel do dono lê atividade por ele;
--   4. dois gatilhos trocam o antigo pelo novo na gravação, para a
--      semente reaplicada (084, 122, 125, 132, 141, 142, 144, 184…) e os
--      eventos novos já nascerem com o texto novo.
--
-- Nenhum gatilho de evento_decisao reage a título (067 e 070 olham só
-- estado; o histórico da 166 fica em events), então a troca não abre
-- tarefa, aviso nem linha de histórico.
--
-- Convergente: pode rodar de novo por cima.

-- ------------------------------------------------------------
-- 1) A tabela de revisão
-- ------------------------------------------------------------
create table if not exists public.metodo_titulo_revisto (
  tipo_evento text not null,
  antigo      text not null,
  novo        text not null,
  primary key (tipo_evento, antigo)
);

-- ninguém lê pela API: só os gatilhos (security definer) usam
alter table public.metodo_titulo_revisto enable row level security;
revoke all on public.metodo_titulo_revisto from public, anon, authenticated;

insert into public.metodo_titulo_revisto (tipo_evento, antigo, novo) values
  ('casamento', 'Alinhar o roteiro da cerimônia com o celebrante', 'Roteiro da cerimônia com o celebrante'),
  ('casamento', 'Buscar referências e orçar buffets', 'Cotações de buffet'),
  ('casamento', 'Buscar referências e orçar celebrantes', 'Cotações de celebrante'),
  ('casamento', 'Buscar referências e orçar espaços', 'Cotações de espaços'),
  ('casamento', 'Comprar as alianças', 'Alianças'),
  ('casamento', 'Comprar os sapatos', 'Sapatos da noiva'),
  ('casamento', 'Confirmar a quantidade final ao buffet', 'Número final para o buffet'),
  ('casamento', 'Conhecer o casal', 'Conversa com o casal'),
  ('casamento', 'Conhecer portfólio e pacotes', 'Portfólios e pacotes de fotografia'),
  ('casamento', 'Conhecer portfólios e orçar decoração', 'Portfólios e cotações de decoração'),
  ('casamento', 'Contratar a decoração', 'Decoração'),
  ('casamento', 'Contratar a papelaria', 'Papelaria'),
  ('casamento', 'Contratar ambulância com médico', 'Ambulância com médico'),
  ('casamento', 'Contratar coral ou músicos da cerimônia', 'Coral ou músicos da cerimônia'),
  ('casamento', 'Contratar infraestrutura extra', 'Infraestrutura extra'),
  ('casamento', 'Contratar o bar de drinks', 'Bar de drinks'),
  ('casamento', 'Contratar o bolo', 'Bolo'),
  ('casamento', 'Contratar o buffet', 'Buffet'),
  ('casamento', 'Contratar o celebrante', 'Celebrante'),
  ('casamento', 'Contratar o cinegrafista', 'Filmagem'),
  ('casamento', 'Contratar o dia da noiva', 'Dia da noiva'),
  ('casamento', 'Contratar o DJ ou a banda', 'DJ ou banda'),
  ('casamento', 'Contratar o espaço', 'Espaço da festa'),
  ('casamento', 'Contratar o fotógrafo', 'Fotografia'),
  ('casamento', 'Contratar os bem-casados', 'Bem-casados'),
  ('casamento', 'Contratar recreação infantil', 'Recreação infantil'),
  ('casamento', 'Contratar sonorização e iluminação de pista', 'Som e luz de pista'),
  ('casamento', 'Contratar transporte de convidados', 'Transporte dos convidados'),
  ('casamento', 'Contratar valet e segurança', 'Valet e segurança'),
  ('casamento', 'Convidar padrinhos, madrinhas, daminhas e pajens', 'Padrinhos, madrinhas, daminhas e pajens'),
  ('casamento', 'Criar o plano B para chuva', 'Plano B para chuva'),
  ('casamento', 'Criar site e hashtag do casamento', 'Site e hashtag do casamento'),
  ('casamento', 'Dar entrada no cartório', 'Entrada no cartório'),
  ('casamento', 'Definir a data do casamento', 'Data do casamento'),
  ('casamento', 'Definir a decoração da cerimônia', 'Decoração da cerimônia'),
  ('casamento', 'Definir a lista de fotos importantes', 'Lista de fotos importantes'),
  ('casamento', 'Definir a locação de mobiliário', 'Locação de mobiliário'),
  ('casamento', 'Definir as bebidas a comprar', 'Bebidas a comprar'),
  ('casamento', 'Definir as lembrancinhas', 'Lembrancinhas'),
  ('casamento', 'Definir as músicas da cerimônia', 'Músicas da cerimônia'),
  ('casamento', 'Definir as prioridades do casal', 'Prioridades do casal'),
  ('casamento', 'Definir banda ou DJ', 'Estilo da música'),
  ('casamento', 'Definir bouquet e flores do cortejo', 'Bouquet e flores do cortejo'),
  ('casamento', 'Definir cor e modelo dos vestidos das madrinhas', 'Vestidos das madrinhas: cor e modelo'),
  ('casamento', 'Definir e alugar roupas de daminhas e pajens', 'Roupas de daminhas e pajens'),
  ('casamento', 'Definir e contratar atrações extras', 'Atrações extras'),
  ('casamento', 'Definir layout, mobiliário e iluminação', 'Layout, mobiliário e iluminação'),
  ('casamento', 'Definir o cardápio final', 'Cardápio final'),
  ('casamento', 'Definir o deslocamento dos noivos', 'Deslocamento dos noivos'),
  ('casamento', 'Definir o destino', 'Destino da lua de mel'),
  ('casamento', 'Definir o formato do casamento', 'Formato do casamento'),
  ('casamento', 'Definir o número estimado de convidados', 'Número de convidados'),
  ('casamento', 'Definir o regime de bens', 'Regime de bens'),
  ('casamento', 'Definir o responsável pelas peças da mesa de doces', 'Responsável pelas peças da mesa de doces'),
  ('casamento', 'Definir o tipo de serviço', 'Tipo de serviço do buffet'),
  ('casamento', 'Definir o traje do noivo', 'Traje do noivo'),
  ('casamento', 'Definir o vestido: comprar, alugar ou sob medida', 'Vestido: comprar, alugar ou sob medida'),
  ('casamento', 'Definir playlist, vetos e primeira dança', 'Playlist, vetos e primeira dança'),
  ('casamento', 'Definir véu, grinalda e acessórios', 'Véu, grinalda e acessórios'),
  ('casamento', 'Degustar e contratar os docinhos', 'Docinhos'),
  ('casamento', 'Determinar assentos e mapa de mesas', 'Mapa de mesas'),
  ('casamento', 'Emitir passagens e reservar hospedagem', 'Passagens e hospedagem da lua de mel'),
  ('casamento', 'Enviar o save the date', 'Save the date'),
  ('casamento', 'Enviar os convites', 'Envio dos convites'),
  ('casamento', 'Escolher a igreja', 'Igreja'),
  ('casamento', 'Escolher leituras e salmos', 'Leituras e salmos'),
  ('casamento', 'Escolher o vestido', 'Vestido da noiva'),
  ('casamento', 'Fazer a confirmação de presença (RSVP)', 'Confirmação de presença'),
  ('casamento', 'Fazer a degustação', 'Degustação do buffet'),
  ('casamento', 'Fazer o briefing de decoração', 'Briefing da decoração'),
  ('casamento', 'Fazer o curso de noivos', 'Curso de noivos'),
  ('casamento', 'Fazer o ensaio na igreja', 'Ensaio na igreja'),
  ('casamento', 'Fazer o ensaio pré-wedding', 'Ensaio pré-wedding'),
  ('casamento', 'Fazer o teste de cabelo e maquiagem', 'Teste de cabelo e maquiagem'),
  ('casamento', 'Finalizar a lista nominal com endereços', 'Lista de convidados com endereços'),
  ('casamento', 'Levantar o budget', 'Verba do casamento'),
  ('casamento', 'Negociar tarifas de hotel para convidados de fora', 'Hotel para convidados de fora'),
  ('casamento', 'Pesquisar identidade visual e convites', 'Referências de identidade visual e convites'),
  ('casamento', 'Pesquisar o estilo de fotógrafos', 'Estilo de fotografia'),
  ('casamento', 'Realizar visita técnica ao espaço', 'Visita técnica ao espaço'),
  ('casamento', 'Reservar a data na igreja', 'Reserva da data na igreja'),
  ('casamento', 'Reservar o hotel da noite de núpcias', 'Hotel da noite de núpcias'),
  ('casamento', 'Verificar a documentação necessária', 'Documentos do casamento civil'),
  ('casamento', 'Verificar passaporte, vistos e vacinas', 'Passaporte, vistos e vacinas'),
  ('casamento', 'Visitar e escolher o espaço', 'Visitas aos espaços'),
  ('corporativo', 'Conferir alvará, AVCB e brigada', 'Alvará, AVCB e brigada'),
  ('corporativo', 'Confirmar o número final ao buffet', 'Número final para o buffet'),
  ('corporativo', 'Contratar a recepção e definir o credenciamento', 'Recepção e credenciamento'),
  ('corporativo', 'Contratar foto e vídeo', 'Foto e vídeo'),
  ('corporativo', 'Contratar o buffet ou coffee', 'Buffet ou coffee'),
  ('corporativo', 'Contratar palco e cenografia', 'Palco e cenografia'),
  ('corporativo', 'Contratar som, projeção e transmissão', 'Som, projeção e transmissão'),
  ('corporativo', 'Contratar troféus e placas', 'Troféus e placas'),
  ('corporativo', 'Definir a verba do evento', 'Verba do evento'),
  ('corporativo', 'Definir autoridades, mesa diretora e hino', 'Autoridades, mesa diretora e hino'),
  ('corporativo', 'Definir categorias, homenageados e quem entrega', 'Categorias, homenageados e quem entrega'),
  ('corporativo', 'Definir crachás, kits e brindes', 'Crachás, kits e brindes'),
  ('corporativo', 'Definir o convite e o prazo de confirmação', 'Convite e prazo de confirmação'),
  ('corporativo', 'Definir o programa e quem fala', 'Programa e quem fala'),
  ('corporativo', 'Definir quem conduz o evento', 'Quem conduz o evento'),
  ('corporativo', 'Definir transporte e hospedagem', 'Transporte e hospedagem'),
  ('corporativo', 'Fazer a visita técnica', 'Visita técnica'),
  ('corporativo', 'Fechar a nominata e a ordem das falas', 'Nominata e ordem das falas'),
  ('corporativo', 'Fechar o briefing do evento', 'Briefing do evento'),
  ('corporativo', 'Fechar o briefing: objetivo, porte e tipo de evento', 'Briefing: objetivo, porte e tipo de evento'),
  ('corporativo', 'Fechar o evento com a empresa', 'Fechamento com a empresa'),
  ('corporativo', 'Fechar o local', 'Local'),
  ('debutante', 'Aprovar a identidade visual do tema', 'Identidade visual do tema'),
  ('debutante', 'Aprovar o projeto final', 'Projeto final da decoração'),
  ('debutante', 'Buscar referências e orçar buffets', 'Cotações de buffet'),
  ('debutante', 'Buscar referências e orçar espaços', 'Cotações de espaços'),
  ('debutante', 'Começar os ensaios', 'Ensaios da valsa'),
  ('debutante', 'Confirmar a quantidade final ao buffet', 'Número final para o buffet'),
  ('debutante', 'Contratar a decoração', 'Decoração'),
  ('debutante', 'Contratar bolo e doces', 'Bolo e doces'),
  ('debutante', 'Contratar cabelo e maquiagem do dia', 'Cabelo e maquiagem do dia'),
  ('debutante', 'Contratar convites e papelaria', 'Convites e papelaria'),
  ('debutante', 'Contratar DJ ou banda', 'DJ ou banda'),
  ('debutante', 'Contratar foto e vídeo', 'Foto e vídeo'),
  ('debutante', 'Contratar iluminação e efeitos de pista', 'Iluminação e efeitos de pista'),
  ('debutante', 'Contratar o book 15 anos', 'Book 15 anos'),
  ('debutante', 'Contratar o buffet', 'Buffet'),
  ('debutante', 'Contratar o espaço', 'Espaço da festa'),
  ('debutante', 'Contratar o professor de dança', 'Professor de dança'),
  ('debutante', 'Contratar segurança e apoio', 'Segurança e apoio'),
  ('debutante', 'Criar o plano B para chuva', 'Plano B para chuva'),
  ('debutante', 'Definir a data da festa', 'Data da festa'),
  ('debutante', 'Definir as atrações da balada', 'Atrações da balada'),
  ('debutante', 'Definir as lembrancinhas', 'Lembrancinhas'),
  ('debutante', 'Definir as prioridades da família', 'Prioridades da família'),
  ('debutante', 'Definir homenagens e discursos', 'Homenagens e discursos'),
  ('debutante', 'Definir o bar de drinks sem álcool', 'Bar de drinks sem álcool'),
  ('debutante', 'Definir o cardápio final', 'Cardápio final'),
  ('debutante', 'Definir o número estimado de convidados', 'Número de convidados'),
  ('debutante', 'Definir o roteiro de entrada', 'Roteiro de entrada'),
  ('debutante', 'Definir o tema da festa', 'Tema da festa'),
  ('debutante', 'Definir o tipo de serviço', 'Tipo de serviço do buffet'),
  ('debutante', 'Definir o transporte da debutante', 'Transporte da debutante'),
  ('debutante', 'Definir os homenageados das 15 velas', 'Homenageados das 15 velas'),
  ('debutante', 'Definir painel e áreas de foto', 'Painel e áreas de foto'),
  ('debutante', 'Definir príncipe e pares da valsa', 'Príncipe e pares da valsa'),
  ('debutante', 'Enviar os convites', 'Envio dos convites'),
  ('debutante', 'Escolher a música da valsa', 'Música da valsa'),
  ('debutante', 'Escolher a música do parabéns', 'Música do parabéns'),
  ('debutante', 'Escolher as fotos do book', 'Fotos do book'),
  ('debutante', 'Escolher o look da balada', 'Look da balada'),
  ('debutante', 'Escolher o vestido da recepção', 'Vestido da recepção'),
  ('debutante', 'Escolher o vestido da valsa', 'Vestido da valsa'),
  ('debutante', 'Fazer a confirmação de presença (RSVP)', 'Confirmação de presença'),
  ('debutante', 'Fazer a degustação', 'Degustação do buffet'),
  ('debutante', 'Fazer as provas finais', 'Provas finais'),
  ('debutante', 'Fazer o teste de beleza', 'Teste de beleza'),
  ('debutante', 'Fechar o roteiro da noite com o espaço', 'Roteiro da noite com o espaço'),
  ('debutante', 'Levantar o budget', 'Verba da festa'),
  ('debutante', 'Montar a lista de convidados', 'Lista de convidados'),
  ('debutante', 'Orçar a decoração', 'Cotações de decoração'),
  ('debutante', 'Orçar bolo e doces', 'Cotações de bolo e doces'),
  ('debutante', 'Orçar DJ ou banda', 'Cotações de DJ ou banda'),
  ('debutante', 'Orçar foto e vídeo', 'Cotações de foto e vídeo'),
  ('debutante', 'Produzir o vídeo de retrospectiva', 'Vídeo de retrospectiva'),
  ('debutante', 'Realizar o ensaio do book', 'Ensaio do book'),
  ('debutante', 'Realizar visita técnica ao espaço', 'Visita técnica ao espaço'),
  ('debutante', 'Traduzir o tema em conceito de decoração', 'Conceito da decoração'),
  ('debutante', 'Visitar e escolher o espaço', 'Visitas aos espaços'),
  ('formatura', 'Alinhar papéis e prazos com a comissão', 'Papéis e prazos da comissão'),
  ('formatura', 'Confirmar canudos e diplomas simbólicos', 'Canudos e diplomas simbólicos'),
  ('formatura', 'Contratar as atrações', 'Contrato das atrações'),
  ('formatura', 'Contratar as becas', 'Becas'),
  ('formatura', 'Contratar foto e vídeo', 'Foto e vídeo'),
  ('formatura', 'Contratar telão e projeção', 'Telão e projeção'),
  ('formatura', 'Definir as atrações do baile', 'Atrações do baile'),
  ('formatura', 'Definir as celebrações da turma', 'Celebrações da turma'),
  ('formatura', 'Definir homenagens e presentes', 'Homenagens e presentes'),
  ('formatura', 'Definir madrinha ou padrinho do anel', 'Madrinha ou padrinho do anel'),
  ('formatura', 'Definir os papéis de honra', 'Papéis de honra'),
  ('formatura', 'Marcar o ensaio da colação', 'Ensaio da colação'),
  ('formatura', 'Montar a retrospectiva da turma', 'Retrospectiva da turma'),
  ('formatura', 'Organizar o dia das fotos do convite', 'Dia das fotos do convite'),
  ('show', 'Agendar a vistoria dos bombeiros (AVCB)', 'Vistoria dos bombeiros (AVCB)'),
  ('show', 'Conferir devoluções e avarias', 'Devoluções e avarias'),
  ('show', 'Contratar a atração principal', 'Atração principal'),
  ('show', 'Contratar ambulância e equipe de APH', 'Ambulância e equipe de APH'),
  ('show', 'Contratar banheiros químicos', 'Banheiros químicos'),
  ('show', 'Contratar o fornecedor de bebidas', 'Fornecedor de bebidas'),
  ('show', 'Contratar o seguro do evento', 'Seguro do evento'),
  ('show', 'Contratar palco, som e luz', 'Palco, som e luz'),
  ('show', 'Contratar segurança e brigadistas', 'Segurança e brigadistas'),
  ('show', 'Dar entrada no alvará do evento', 'Alvará do evento'),
  ('show', 'Definir a equipe e os pontos de bar', 'Equipe e pontos de bar'),
  ('show', 'Definir as atrações de abertura', 'Atrações de abertura'),
  ('show', 'Definir energia e gerador', 'Energia e gerador'),
  ('show', 'Definir fechamento, tendas e barreiras', 'Fechamento, tendas e barreiras'),
  ('show', 'Definir hospedagem e transporte da equipe', 'Hospedagem e transporte da equipe do artista'),
  ('show', 'Definir o fluxo de entrada e a revista', 'Fluxo de entrada e revista'),
  ('show', 'Definir o orçamento do evento', 'Verba do evento'),
  ('show', 'Definir pulseiras, cortesias e credenciamento', 'Pulseiras, cortesias e credenciamento'),
  ('show', 'Definir rádios e canais da equipe', 'Rádios e canais da equipe'),
  ('show', 'Dimensionar o consumo do bar', 'Consumo previsto do bar'),
  ('show', 'Fechar a prestação de contas do evento', 'Prestação de contas'),
  ('show', 'Montar a escala da equipe por posto', 'Escala da equipe por posto'),
  ('show', 'Receber e conferir o rider técnico', 'Rider técnico'),
  ('show', 'Recolher o ECAD', 'ECAD')
on conflict (tipo_evento, antigo) do update set novo = excluded.novo;

-- ------------------------------------------------------------
-- 2) Os moldes do método
-- ------------------------------------------------------------
update public.metodo_decisao md
   set titulo = r.novo
  from public.metodo_objetivo mo, public.metodo_titulo_revisto r
 where mo.id = md.objetivo_id
   and r.tipo_evento = mo.tipo_evento::text
   and r.antigo = md.titulo
   and not md.proprio;

-- ------------------------------------------------------------
-- 3) Os eventos que já existem
-- ------------------------------------------------------------
update public.evento_decisao ed
   set titulo = r.novo
  from public.events e, public.metodo_titulo_revisto r
 where e.id = ed.event_id
   and r.tipo_evento = e.type::text
   and r.antigo = ed.titulo;

-- ------------------------------------------------------------
-- 4) Os gatilhos: semente reaplicada e evento novo já saem com o novo
-- ------------------------------------------------------------
create or replace function public.trg_titulo_revisto_metodo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novo text;
begin
  if new.proprio then
    return new;
  end if;
  select r.novo into v_novo
    from public.metodo_objetivo mo
    join public.metodo_titulo_revisto r
      on r.tipo_evento = mo.tipo_evento::text and r.antigo = new.titulo
   where mo.id = new.objetivo_id;
  if v_novo is not null then
    new.titulo := v_novo;
  end if;
  return new;
end;
$$;

create or replace function public.trg_titulo_revisto_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novo text;
begin
  select r.novo into v_novo
    from public.events e
    join public.metodo_titulo_revisto r
      on r.tipo_evento = e.type::text and r.antigo = new.titulo
   where e.id = new.event_id;
  if v_novo is not null then
    new.titulo := v_novo;
  end if;
  return new;
end;
$$;

revoke all on function public.trg_titulo_revisto_metodo() from public, anon, authenticated;
revoke all on function public.trg_titulo_revisto_evento() from public, anon, authenticated;

drop trigger if exists trg_titulo_revisto on public.metodo_decisao;
create trigger trg_titulo_revisto
  before insert or update of titulo on public.metodo_decisao
  for each row execute function public.trg_titulo_revisto_metodo();

drop trigger if exists trg_titulo_revisto on public.evento_decisao;
create trigger trg_titulo_revisto
  before insert on public.evento_decisao
  for each row execute function public.trg_titulo_revisto_evento();

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'revisão tem os 202 títulos' as verificacao,
       (select count(*) from public.metodo_titulo_revisto) = 202 as aplicou
union all
select 'nenhum molde do método com título antigo',
       not exists (
         select 1 from public.metodo_decisao md
           join public.metodo_objetivo mo on mo.id = md.objetivo_id
           join public.metodo_titulo_revisto r
             on r.tipo_evento = mo.tipo_evento::text and r.antigo = md.titulo
          where not md.proprio)
union all
select 'nenhuma decisão de evento com título antigo',
       not exists (
         select 1 from public.evento_decisao ed
           join public.events e on e.id = ed.event_id
           join public.metodo_titulo_revisto r
             on r.tipo_evento = e.type::text and r.antigo = ed.titulo)
union all
select 'nenhum molde do método começa com Definir',
       not exists (select 1 from public.metodo_decisao
                    where not proprio and titulo ~ '^(Definir|Determinar)\y')
union all
select 'gatilho nos moldes',
       exists (select 1 from pg_trigger
                where tgname = 'trg_titulo_revisto'
                  and tgrelid = 'public.metodo_decisao'::regclass)
union all
select 'gatilho nas decisões dos eventos',
       exists (select 1 from pg_trigger
                where tgname = 'trg_titulo_revisto'
                  and tgrelid = 'public.evento_decisao'::regclass)
union all
select 'revisão fechada para a API',
       not has_table_privilege('anon', 'public.metodo_titulo_revisto', 'select')
   and not has_table_privilege('authenticated', 'public.metodo_titulo_revisto', 'select');
