-- 066 — Blueprint de tarefas por decisão + tasks estendida (etapa 4C, DDL)
--
-- Modelagem: ESTENDER a tabela `tasks` existente em vez de criar uma
-- paralela — tarefa já é um conceito só no sistema, duplicá-lo geraria
-- duas telas de tarefa e dois lugares para esquecer de olhar. Faltavam
-- apenas o responsável (3 valores) e o vínculo com a decisão de origem.
--
-- O BLUEPRINT ("quais tarefas cada decisão gera") vive no template, ao
-- lado de metodo_objetivo/decisao/guia da 4A: metodo_tarefa pendura na
-- decisão do Playbook. A geração ao decidir vem na 067.

-- ------------------------------------------------------------
-- 1) tasks estendida
-- ------------------------------------------------------------
alter table public.tasks
  add column if not exists responsavel text,
  -- decisão que gerou a tarefa (rastreabilidade: a cerimonialista precisa
  -- saber de onde a tarefa veio). null = tarefa manual/legada.
  add column if not exists evento_decisao_id uuid
    references public.evento_decisao (id) on delete set null,
  -- blueprint de origem: idempotência da geração (uma tarefa-modelo entra
  -- uma vez por decisão) e base para remover na reversão.
  add column if not exists metodo_tarefa_id uuid;

alter table public.tasks
  drop constraint if exists tasks_responsavel_check;
alter table public.tasks
  add constraint tasks_responsavel_check
  check (responsavel is null or responsavel in ('noivos', 'cerimonialista', 'ambos'));

-- Idempotência: a mesma tarefa-modelo não duplica na mesma decisão.
create unique index if not exists uq_tasks_decisao_blueprint
  on public.tasks (evento_decisao_id, metodo_tarefa_id)
  where evento_decisao_id is not null and metodo_tarefa_id is not null;

create index if not exists idx_tasks_evento_decisao
  on public.tasks (evento_decisao_id);

-- ------------------------------------------------------------
-- 2) Blueprint no template (por empresa, via decisão)
-- ------------------------------------------------------------
create table if not exists public.metodo_tarefa (
  id          uuid primary key default gen_random_uuid(),
  decisao_id  uuid not null references public.metodo_decisao (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  titulo      text not null,
  responsavel text not null default 'cerimonialista'
              check (responsavel in ('noivos', 'cerimonialista', 'ambos')),
  -- dias antes do evento para o vencimento; herda o da decisão no seed.
  -- Separado da prioridade, como na 4A (a 4D comprime por prazo).
  offset_ideal_dias int,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_metodo_tarefa_decisao
  on public.metodo_tarefa (decisao_id, ordem);

alter table public.metodo_tarefa enable row level security;

drop policy if exists metodo_tarefa_select on public.metodo_tarefa;
create policy metodo_tarefa_select on public.metodo_tarefa for select
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists metodo_tarefa_write on public.metodo_tarefa;
create policy metodo_tarefa_write on public.metodo_tarefa for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 3) Seed do blueprint de casamento
-- ------------------------------------------------------------
-- As colunas TAREFA do metodo-casamento-classificado.md, penduradas nas
-- decisões que a 4A criou (por codigo). offset herda o da decisão (a 4C
-- não comprime; isso é a 4D). Idempotente por empresa.
create or replace function public.semear_tarefas_metodo_casamento(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.metodo_tarefa mt
    join public.metodo_decisao d on d.id = mt.decisao_id
    where mt.empresa_id = p_empresa_id and d.empresa_id = p_empresa_id
  ) then
    return; -- já semeado
  end if;

  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem)
  select dec.id, p_empresa_id, b.titulo, b.responsavel, dec.offset_ideal_dias, b.ord
  from public.metodo_decisao dec
  join (values
    ('igreja','Verificar disponibilidade de data na igreja','cerimonialista',1),
    ('igreja','Fazer reserva da data na igreja','cerimonialista',2),
    ('igreja','Pagar a taxa da igreja','noivos',3),
    ('celebrante','Realizar reunião com o celebrante','ambos',1),
    ('celebrante','Enviar contrato do celebrante','cerimonialista',2),
    ('grupo_musica','Enviar contrato do grupo de música','cerimonialista',1),
    ('grupo_musica','Pagar 1ª parcela do grupo de música','cerimonialista',2),
    ('espaco','Realizar visita técnica ao espaço','ambos',1),
    ('espaco','Assinar contrato do espaço','ambos',2),
    ('espaco','Anexar contrato do espaço (PDF)','cerimonialista',3),
    ('espaco','Pagar 1ª parcela do espaço','cerimonialista',4),
    ('buffet','Agendar degustação do buffet','ambos',1),
    ('buffet','Enviar contrato do buffet','cerimonialista',2),
    ('buffet','Pagar 1ª parcela do buffet','cerimonialista',3),
    ('bar','Agendar degustação do bar de drinks','ambos',1),
    ('bar','Enviar contrato do bar de drinks','cerimonialista',2),
    ('bar','Pagar 1ª parcela do bar','cerimonialista',3),
    ('decoracao','Enviar briefing de decoração','ambos',1),
    ('decoracao','Enviar contrato da decoração','cerimonialista',2),
    ('decoracao','Pagar 1ª parcela da decoração','cerimonialista',3),
    ('fotografo','Enviar contrato do fotógrafo','cerimonialista',1),
    ('fotografo','Pagar 1ª parcela do fotógrafo','cerimonialista',2),
    ('cinegrafista','Enviar contrato do cinegrafista','cerimonialista',1),
    ('cinegrafista','Pagar 1ª parcela do cinegrafista','cerimonialista',2),
    ('banda_dj','Enviar contrato da banda/DJ','cerimonialista',1),
    ('banda_dj','Pagar 1ª parcela da banda/DJ','cerimonialista',2),
    ('entretenimento','Enviar contrato do entretenimento','cerimonialista',1),
    ('entretenimento','Pagar 1ª parcela do entretenimento','cerimonialista',2),
    ('vestido','Agendar as provas do vestido','noivos',1),
    ('dia_noiva','Fazer teste de cabelo e maquiagem','noivos',1),
    ('dia_noiva','Enviar contrato do dia da noiva','cerimonialista',2),
    ('lista_nominal','Consolidar a lista nominal de convidados','noivos',1),
    ('lista_nominal','Confirmar quantidade para buffet e bar','cerimonialista',2),
    ('papelaria','Contratar papelaria e convites','noivos',1),
    ('papelaria','Aprovar a arte dos convites','noivos',2),
    ('padrinhos','Convidar padrinhos, damas e pajens','noivos',1),
    ('trajes_pajens','Alugar as roupas de pajens e damas','noivos',1),
    ('trajes_pajens','Agendar as provas dos trajes','noivos',2),
    ('nupcias','Reservar o hotel das núpcias','noivos',1),
    ('lua_mel','Reservar a lua de mel','noivos',1),
    ('lua_mel','Verificar a documentação da viagem','noivos',2),
    ('pendencias','Certificar pagamentos aos fornecedores','cerimonialista',1),
    ('pendencias','Contratar fornecedores que faltaram','ambos',2),
    ('pendencias','Alinhar informações com a igreja','cerimonialista',3),
    ('roteiro','Montar o roteiro e o cronograma do dia','cerimonialista',1),
    ('roteiro','Realizar a visita técnica final','cerimonialista',2),
    ('roteiro','Arquivar o OK dos fornecedores','cerimonialista',3),
    ('equipe_cerimonial','Criar o grupo da equipe de cerimonial','cerimonialista',1),
    ('equipe_cerimonial','Enviar o roteiro para a equipe','cerimonialista',2),
    ('equipe_cerimonial','Imprimir os roteiros','cerimonialista',3),
    ('equipe_cerimonial','Agendar o ensaio na igreja','ambos',4)
  ) as b(dec_codigo, titulo, responsavel, ord)
    on dec.codigo = b.dec_codigo
  where dec.empresa_id = p_empresa_id;
end $$;

-- Empresas existentes.
do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_tarefas_metodo_casamento(e.id);
  end loop;
end $$;

-- Novas empresas: acopla ao gatilho do método (o blueprint depende das
-- decisões, que o semear_metodo_casamento já criou antes).
create or replace function public.trg_semear_metodo_empresa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_metodo_casamento(new.id);
  perform public.semear_tarefas_metodo_casamento(new.id);
  return new;
end $$;
