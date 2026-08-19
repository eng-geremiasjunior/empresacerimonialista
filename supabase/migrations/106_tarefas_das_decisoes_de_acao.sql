-- 106 — Decisões de ação também viram trabalho na Organização
--
-- Sintoma relatado: preencher bastante coisa no Planejamento e a
-- Organização continuar vazia.
--
-- Diagnóstico (medido no banco): a ponte funciona. Decidir "Contratar o
-- buffet" gera as 4 tarefas de contrato, na hora. O que faltava era o
-- outro lado: das 87 decisões do método de casamento, só 24 tinham
-- tarefas no blueprint — todas as de contratação, pela inserção por
-- `codigo like '%contratar%'` da 084. Decidir "Levantar o budget" ou
-- "Realizar visita técnica" não produzia nada porque não havia o que
-- produzir.
--
-- Das 63 sem tarefa, 41 são decisões de DEFINIR: escolher o cardápio,
-- as prioridades do casal, o layout. Nelas decidir É o trabalho, e criar
-- tarefa depois faria a cerimonialista marcar "feito" no que já estava
-- feito. Essas seguem sem tarefa, de propósito.
--
-- As 13 abaixo são de AÇÃO: depois de decididas ainda sobra algo
-- concreto para executar, com data e com fim verificável. Uma tarefa
-- cada — não três. A Organização de um casamento já recebe até 96
-- tarefas das contratações; encher de item cerimonial faria dela uma
-- lista que ninguém lê, o oposto de "mostrar o necessário para a
-- próxima decisão".
--
-- As outras 9 de ação (orçar espaços, visitar e escolher, degustar,
-- pesquisar fotógrafos…) também ficam sem tarefa: o que viria depois
-- delas JÁ é a próxima decisão do método, e duplicar o Planejamento
-- dentro da Organização confunde em vez de ajudar.
--
-- Três tarefas apontam para outro módulo, como o sistema já faz:
-- visita técnica e ensaio na igreja alimentam a Execução; a quantidade
-- final do buffet alimenta o Financeiro.
--
-- Convergente: pode rodar mais de uma vez sem duplicar.
-- Execute no SQL Editor.

begin;

-- ------------------------------------------------------------
-- 1) As tarefas das decisões de ação
-- ------------------------------------------------------------
-- Ligadas por `codigo` (chave estável do seed, igual nas 12 empresas),
-- não por título — título muda, código não. O prazo de cada tarefa é
-- menor que o da decisão: ela acontece DEPOIS de decidir.
create or replace function public.semear_tarefas_acao_casamento(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, v.titulo, v.resp, v.off, v.ord, v.vinc
  from (values
    ('igreja_reservar',         'Guardar o comprovante da reserva da igreja',              'noivos',         285, 10, null::text),
    ('decoracao_briefing',      'Enviar o briefing aprovado ao decorador',                 'cerimonialista', 275, 10, null),
    ('save_the_date',           'Atualizar a lista com quem não recebeu',                  'cerimonialista', 230, 10, null),
    ('curso_noivos',            'Arquivar o certificado do curso de noivos',               'noivos',         110, 10, null),
    ('sapatos',                 'Amaciar os sapatos antes do casamento',                   'noivos',          45, 10, null),
    ('espaco_vt',               'Registrar medidas, tomadas e restrições do espaço',       'cerimonialista',  88, 10, 'execucao'),
    ('pre_wedding',             'Escolher as fotos do ensaio',                             'noivos',          75, 10, null),
    ('hotel_nupcias',           'Guardar a reserva e o horário de check-in',               'noivos',          55, 10, null),
    ('leituras',                'Enviar leituras e salmos ao celebrante',                  'cerimonialista',  40, 10, null),
    ('convites_enviar',         'Conferir se todos os convites chegaram',                  'cerimonialista',  30, 10, null),
    ('teste_beleza',            'Registrar com foto o look aprovado',                      'noivos',          28, 10, null),
    ('buffet_confirmar_numero', 'Registrar a quantidade final no contrato e no financeiro','cerimonialista',  10, 10, 'financeiro'),
    ('ensaio_igreja',           'Repassar a ordem de entrada com a equipe',                'cerimonialista',   5, 10, 'execucao')
  ) as v(dec, titulo, resp, off, ord, vinc)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = v.dec
  -- metodo_tarefa não tem unique (decisao_id, titulo); o guard evita a
  -- duplicata numa segunda execução.
  where not exists (
    select 1 from public.metodo_tarefa mt
    where mt.decisao_id = d.id and mt.titulo = v.titulo
  );
end $$;

-- ------------------------------------------------------------
-- 2) Empresa nova nasce com elas
-- ------------------------------------------------------------
-- Cópia da 066 com uma linha a mais. As duas chamadas antigas ficam
-- exatamente como estavam.
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
  return new;
end $$;

-- ------------------------------------------------------------
-- 3) Empresas que já existem
-- ------------------------------------------------------------
do $$
declare
  e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_tarefas_acao_casamento(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 4) Decisões já decididas geram agora
-- ------------------------------------------------------------
-- O gatilho de geração só dispara na MUDANÇA de estado: o que já estava
-- decidido antes desta migração não produziria nada sozinho. Repetir a
-- geração é seguro — a função tem `on conflict (evento_decisao_id,
-- metodo_tarefa_id) do nothing`, então nada é duplicado, e as tarefas
-- que a cerimonialista já ajustou ou concluiu não são tocadas.
do $$
declare
  d record;
  v_total int := 0;
begin
  for d in
    select ed.id
    from public.evento_decisao ed
    where ed.estado = 'decidida'
      and ed.decisao_template_id is not null
  loop
    perform public.gerar_tarefas_da_decisao(d.id);
    v_total := v_total + 1;
  end loop;
  raise notice 'Backfill: % decisoes ja decididas reprocessadas.', v_total;
end $$;

commit;

do $$
declare
  v_dec int;
  v_com int;
begin
  select count(*) into v_dec from public.metodo_decisao
  where empresa_id = (select id from public.empresas order by created_at limit 1);
  select count(distinct decisao_id) into v_com from public.metodo_tarefa
  where empresa_id = (select id from public.empresas order by created_at limit 1);
  raise notice '106 aplicada. Numa empresa de referencia: % decisoes, % com tarefa (era 24).', v_dec, v_com;
end $$;
