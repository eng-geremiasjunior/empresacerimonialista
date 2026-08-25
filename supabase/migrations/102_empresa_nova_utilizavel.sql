-- 102 — a empresa nova nasce utilizável
--
-- Três buracos que só aparecem quando alguém DE FORA se cadastra (o
-- cadastro nunca foi exercitado com uma cerimonialista real):
--
--   1. O signup só manda e-mail e senha, então `raw_user_meta_data->>'name'`
--      é sempre NULL e TODA empresa nova nasce chamada "Minha Empresa" —
--      nome que sai na proposta pública, no rodapé e no PDF para o casal.
--      Aqui a função passa a ler a chave 'empresa' (nome do negócio, que o
--      formulário de cadastro passa a pedir) e mantém 'name' para o nome da
--      pessoa no membro da equipe. São coisas diferentes e estavam no mesmo
--      campo.
--
--   2. A empresa nasce SEM pacotes, e sem pacote a proposta pública não
--      mostra a calculadora de investimento — justamente a peça central do
--      template. Ela teria que descobrir sozinha o Catálogo e cadastrar três
--      pacotes antes do primeiro orçamento. O seed resolve com os três níveis
--      do template (editáveis em Catálogo › Casamento).
--
--   3. Os seeds anteriores (045, 057, 058) rodaram como backfill `for e in
--      select id from public.empresas` — pegaram só quem existia naquele dia.
--      Aqui o backfill volta a rodar, mas chamando a MESMA função do gatilho,
--      que é idempotente por construção: quem já tem conteúdo não é tocado.
--
-- Convergente: pode rodar mais de uma vez sem efeito colateral.
-- Execute no SQL Editor.

begin;

-- ------------------------------------------------------------
-- 0) URGENTE: a view `eventos` vazava dados entre empresas
-- ------------------------------------------------------------
-- Uma view `public.eventos` foi criada à mão no SQL Editor (não existe em
-- nenhuma migração) sobre a tabela `events`. View comum roda com os
-- direitos de quem a criou, não de quem consulta — ou seja, ela IGNORA o
-- RLS da tabela por baixo. Medido com a chave anônima (a que vai embutida
-- no JavaScript do site, pública por definição): 56 eventos de 3 empresas
-- diferentes, com data, local, cliente e valor de contrato, SEM login.
--
-- A tabela `events` está correta e continua protegida; nenhum arquivo do
-- app consulta a view (conferido por busca em src/). Então ela é resíduo
-- e some. Se algum relatório externo (Metabase, planilha, consulta salva
-- no painel do Supabase) apontar para `public.eventos`, ele para de
-- funcionar — nesse caso, recriar com `with (security_invoker = on)`.
drop view if exists public.eventos;

-- ------------------------------------------------------------
-- 1) Nome do negócio separado do nome da pessoa
-- ------------------------------------------------------------
-- Cópia integral da 086 (última versão vigente, com as duas travas de
-- portal). Única mudança: a empresa passa a se chamar pelo que veio em
-- 'empresa'; 'name' continua valendo para o nome do membro e como
-- segunda opção para a empresa, para não regredir contas que já usaram
-- essa chave.
create or replace function public.garantir_empresa_propria()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_empresa uuid;
  v_nome    text;
  v_negocio text;
  v_email   text;
  v_portal  boolean;
begin
  if v_uid is null then
    return;
  end if;

  -- Já pertence a alguma equipe (qualquer status)? Então não provisiona.
  if exists (select 1 from public.membros_equipe where user_id = v_uid) then
    return;
  end if;

  -- Trava 1: marca posta pelo servidor na criação do acesso (app_metadata,
  -- que a própria usuária não consegue editar).
  select coalesce((raw_app_meta_data->>'portal')::boolean, false)
    into v_portal
  from auth.users where id = v_uid;

  if coalesce(v_portal, false) then
    return;
  end if;

  -- Trava 2: ter vínculo de portal basta, mesmo sem a marca.
  if exists (select 1 from public.evento_acesso where user_id = v_uid) then
    return;
  end if;

  select raw_user_meta_data->>'name', raw_user_meta_data->>'empresa', email
    into v_nome, v_negocio, v_email
  from auth.users where id = v_uid;

  insert into public.empresas (nome, owner_user_id)
  values (
    coalesce(
      nullif(trim(v_negocio), ''),
      nullif(trim(v_nome), ''),
      'Minha Empresa'
    ),
    v_uid
  )
  on conflict (owner_user_id) do nothing;

  select id into v_empresa
  from public.empresas where owner_user_id = v_uid;

  if v_empresa is null then
    return;
  end if;

  insert into public.membros_equipe
    (empresa_id, user_id, nome, email, cargo, status, is_owner)
  values (
    v_empresa, v_uid,
    coalesce(nullif(trim(v_nome), ''), v_email, 'Proprietária'),
    v_email, 'proprietaria', 'ativo', true
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.garantir_empresa_propria() to authenticated;

-- ------------------------------------------------------------
-- 2) O seed de empresa nova passa a incluir pacotes e extras
-- ------------------------------------------------------------
-- Cópia integral da 057 (institucional + etapas + FAQ, com o `on conflict
-- (empresa_id, tipo_evento)` que aquela migração documenta como frágil —
-- mexer nele quebra o cadastro inteiro) e, no fim, os pacotes e extras.
--
-- Preços são ponto de partida, não promessa: ela ajusta em Catálogo ›
-- Casamento antes do primeiro envio. Nas features não entra nenhuma
-- afirmação sobre histórico ("X casamentos", "Y% de economia") — só o que
-- o pacote entrega, que é o que ela edita para descrever o próprio serviço.
create or replace function public.semear_conteudo_institucional(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.empresa_conteudo_institucional
    (empresa_id, tipo_evento, stat_anos_experiencia, stat_eventos_realizados,
     responsabilidades_dia_evento, pos_evento_cards)
  values (
    p_empresa_id, 'casamento', 1, 0,
    array[
      'Coordenação da cerimônia e recepção',
      'Recepção e acomodação dos convidados',
      'Cronograma e tempo de cada etapa',
      'Acompanhamento de fornecedores',
      'Supervisão de montagem e decoração',
      'Gestão de imprevistos com tranquilidade'
    ],
    '[
      {"titulo":"Relatório completo","descricao":"Registro de tudo o que foi entregue e alinhado."},
      {"titulo":"Fechamento financeiro","descricao":"Prestação de contas dos fornecedores contratados."},
      {"titulo":"Suporte contínuo","descricao":"Canal aberto para dúvidas após o grande dia."}
    ]'::jsonb
  )
  on conflict (empresa_id, tipo_evento) do nothing;

  if not exists (
    select 1 from public.empresa_processo_etapas
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    insert into public.empresa_processo_etapas
      (empresa_id, tipo_evento, ordem, titulo, descricao)
    select p_empresa_id, 'casamento', v.ordem, v.titulo, v.descricao
    from (values
      (1, 'Briefing',      'Reunião inicial para entendermos seus sonhos e expectativas.'),
      (2, 'Planejamento',  'Criamos o budget, cronograma e checklist personalizado.'),
      (3, 'Contratações',  'Indicação, negociação e acompanhamento dos fornecedores.'),
      (4, 'Organização',   'Visitas técnicas, degustações, contratos e alinhamentos.'),
      (5, 'Evento',        'Coordenação completa do dia para vocês só aproveitarem.'),
      (6, 'Pós-evento',    'Relatório final com detalhes e informações importantes.')
    ) as v(ordem, titulo, descricao);
  end if;

  if not exists (
    select 1 from public.empresa_faq
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    insert into public.empresa_faq (empresa_id, tipo_evento, ordem, pergunta, resposta)
    select p_empresa_id, 'casamento', v.ordem, v.pergunta, v.resposta
    from (values
      (1, 'Como funciona o pagamento?',
          'A entrada garante a reserva da data; o restante pode ser parcelado sem juros até 5 dias antes do evento.'),
      (2, 'Vocês acompanham reuniões com fornecedores?',
          'Sim, acompanhamos negociações, visitas técnicas e degustações junto com vocês.'),
      (3, 'Quantas pessoas da equipe ficam no dia do evento?',
          'A equipe é dimensionada conforme o porte do evento e definida no fechamento do contrato.')
    ) as v(ordem, pergunta, resposta);
  end if;

  -- Pacotes: sem eles a proposta pública não tem calculadora.
  if not exists (
    select 1 from public.empresa_pacotes
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    insert into public.empresa_pacotes
      (empresa_id, tipo_evento, ordem, nome, subtitulo, preco, recomendado, ativo, inclui)
    values
      -- Ponto de partida NEUTRO, para a calculadora da proposta existir
      -- desde o primeiro minuto. Preço 0 de propósito: a proposta mostra
      -- "A combinar" (precoDePacote em src/lib/proposta.ts) até ela
      -- precificar no Catálogo. A versão anterior trazia o
      -- posicionamento de outra agência, com termo em inglês e valor que
      -- ninguém escolheu — e a noiva lia aquilo como se fosse dela.
      (p_empresa_id, 'casamento', 1, 'Assessoria do dia',
       'Acompanhamento na reta final', 0, false, true,
       array[
         'Alinhamento nas semanas que antecedem',
         'Checklist do dia',
         'Coordenação dos fornecedores no evento',
         'Acompanhamento durante a festa'
       ]),
      (p_empresa_id, 'casamento', 2, 'Assessoria completa',
       'Do planejamento ao dia', 0, true, true,
       array[
         'Planejamento desde a contratação',
         'Curadoria e negociação com fornecedores',
         'Reuniões de acompanhamento',
         'Cronograma do dia e ensaio',
         'Coordenação durante a festa'
       ]),
      (p_empresa_id, 'casamento', 3, 'Assessoria completa +',
       'Com equipe ampliada', 0, false, true,
       array[
         'Tudo da assessoria completa',
         'Equipe ampliada no dia',
         'Gestão de convidados e hospedagem',
         'Acompanhamento estendido'
       ]);
  end if;

  -- Extras: opcionais que a calculadora soma ao pacote.
  if not exists (
    select 1 from public.empresa_extras
    where empresa_id = p_empresa_id and tipo_evento = 'casamento'
  ) then
    insert into public.empresa_extras
      (empresa_id, tipo_evento, ordem, nome, descricao, preco, ativo)
    values
      -- também sem preço: quem define é ela
      (p_empresa_id, 'casamento', 1, 'Cerimônia ao ar livre',
       'Estrutura e plano B de chuva', 0, true),
      (p_empresa_id, 'casamento', 2, 'Assessoria de lua de mel',
       'Roteiro e reservas', 0, true);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 3) Backfill: quem já existe também ganha o que faltava
-- ------------------------------------------------------------
-- Chama a própria função do gatilho, que é idempotente: empresa com
-- pacotes cadastrados não é tocada, e quem já tem institucional/etapas/FAQ
-- passa reto pelos guards. Não renomeia ninguém — "Minha Empresa" é dado
-- da usuária e agora tem tela para corrigir.
do $$
declare
  e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_conteudo_institucional(e.id);
  end loop;
end $$;

commit;

do $$
declare
  v_sem_pacote int;
begin
  select count(*) into v_sem_pacote
  from public.empresas emp
  where not exists (
    select 1 from public.empresa_pacotes p
    where p.empresa_id = emp.id and p.tipo_evento = 'casamento'
  );
  raise notice '102 aplicada. Empresas ainda sem pacote de casamento: % (deve ser 0).', v_sem_pacote;
end $$;
