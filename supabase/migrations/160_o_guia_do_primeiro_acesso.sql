-- ============================================================
-- 160 — O GUIA DO PRIMEIRO ACESSO
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- O sistema abre com dezesseis itens de menu, um painel de gráficos
-- vazios e nenhuma condução. Quem nunca viu não descobre sozinha que uma
-- decisão do Planejamento vira tarefa com responsável e prazo — que é a
-- única coisa que o eOrganizei faz e os outros não.
--
-- O guia conduz a pessoa por CINCO PASSOS sobre um evento REAL da agenda
-- dela. Não é passeio pelos menus: no fim ela não assistiu a nada, ela
-- tem um evento montado.
--
-- O QUE ESTA MIGRAÇÃO GUARDA — E O QUE ELA NÃO GUARDA
--
-- Guarda DUAS DATAS, e só: quando a pessoa pulou, e quando ela terminou.
--
-- NÃO guarda "em que passo ela está". Isso é derivado dos FATOS a cada
-- carregamento:
--
--   passo 1  criou o evento          events do empresa_id
--   passo 2  definiu o contexto      events.escala e events.cenario
--   passo 3  decidiu alguma coisa    evento_decisao.estado = 'decidida'
--   passo 4  viu a tarefa nascer     tasks.evento_decisao_id não nulo
--   passo 5  deu andamento           tasks.status <> 'pendente'
--
-- Um contador (`passo_atual = 3`) mente na primeira vez que a pessoa faz
-- algo por fora do guia, fecha o navegador no meio ou apaga o que criou.
-- Fato não mente: se o evento existe, o passo 1 está vencido, tenha ela
-- passado pelo guia ou não.
--
-- A LIÇÃO DO HOSTGATOR (dono, 12/09/2026): ele é cliente há três anos e o
-- tutorial deles continua lá, sem um jeito de dizer "não quero". Por isso
-- as duas datas são PERMANENTES: pulou, acabou; terminou, acabou. O
-- caminho de volta existe, mas é ela quem vai buscar, em Configurações —
-- o guia nunca reaparece sozinho.

begin;

-- ------------------------------------------------------------
-- 1) As duas datas, por pessoa
-- ------------------------------------------------------------
-- Em `membros_equipe` e não na empresa, pelo mesmo motivo das explicações
-- do menu (159): quem entra na equipe seis meses depois é uma pessoa
-- nova diante do sistema, mesmo numa conta antiga.

alter table public.membros_equipe
  add column if not exists guia_dispensado_em timestamptz,
  add column if not exists guia_concluido_em  timestamptz;

comment on column public.membros_equipe.guia_dispensado_em is
  'Quando a pessoa clicou em "Pular por agora". Permanente: o guia nao '
  'volta sozinho. Ela retoma em Configuracoes se quiser.';
comment on column public.membros_equipe.guia_concluido_em is
  'Quando os cinco passos ficaram vencidos. Carimbado UMA vez: sem isso, '
  'apagar o evento de teste faria o guia ressuscitar.';

-- ------------------------------------------------------------
-- 2) O interruptor
-- ------------------------------------------------------------
-- Três ações e nada mais. `concluir` é chamado pelo próprio sistema
-- quando os cinco fatos ficam verdadeiros; as outras duas são da pessoa.
--
-- SECURITY DEFINER porque a política de `membros_equipe` (021) só deixa a
-- dona da empresa escrever na tabela — sem isto a assistente não
-- conseguiria nem pular o próprio guia. O `where user_id = auth.uid()`
-- mantém o alcance numa pessoa só: a função não aceita alvo por
-- argumento, então não há como mexer no guia de outra.

create or replace function public.definir_guia(p_acao text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tem boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessao expirada. Entre de novo.';
  end if;

  if p_acao not in ('dispensar', 'retomar', 'concluir') then
    raise exception 'Acao invalida: %', p_acao;
  end if;

  select exists (
           select 1 from public.membros_equipe m
            where m.user_id = auth.uid() and m.status = 'ativo'
         )
    into v_tem;

  if not v_tem then
    raise exception 'Perfil nao encontrado.';
  end if;

  update public.membros_equipe m
     set guia_dispensado_em = case
           when p_acao = 'dispensar' then coalesce(m.guia_dispensado_em, now())
           when p_acao = 'retomar'   then null
           else m.guia_dispensado_em
         end,
         guia_concluido_em = case
           -- `coalesce` e nao `now()`: o carimbo e de quando ACABOU, e
           -- chamar de novo nao pode reescrever a data original.
           when p_acao = 'concluir' then coalesce(m.guia_concluido_em, now())
           when p_acao = 'retomar'  then null
           else m.guia_concluido_em
         end
   where m.user_id = auth.uid()
     and m.status = 'ativo';

  return (
    select json_build_object(
             'dispensado_em', m.guia_dispensado_em,
             'concluido_em',  m.guia_concluido_em
           )
      from public.membros_equipe m
     where m.user_id = auth.uid() and m.status = 'ativo'
     order by m.created_at asc
     limit 1
  );
end $$;

revoke all on function public.definir_guia(text) from public, anon;
grant execute on function public.definir_guia(text) to authenticated;

-- ------------------------------------------------------------
-- 3) A leitura: o estado do guia, em uma viagem só
-- ------------------------------------------------------------
-- Devolve as duas datas E os cinco fatos, para o app não precisar fazer
-- cinco consultas em toda navegação. `stable`: não escreve nada.
--
-- O EVENTO DO GUIA é o mais recente da empresa. É o que ela acabou de
-- criar no passo 1 — e se ela já tinha eventos, o guia trabalha sobre o
-- último, que é onde ela está mexendo.
--
-- Por função, e não por `select` na tabela, pelo mesmo motivo da 159: o
-- PostgREST derruba a consulta INTEIRA quando um campo pedido não existe.
-- Se o deploy chegar antes desta migração, o app assume "sem guia" e
-- ninguém vê tela quebrada.

create or replace function public.meu_guia()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_membro  public.membros_equipe%rowtype;
  v_evento  uuid;
begin
  if auth.uid() is null then return null; end if;

  select * into v_membro
    from public.membros_equipe m
   where m.user_id = auth.uid() and m.status = 'ativo'
   order by m.created_at asc
   limit 1;

  if not found then return null; end if;
  v_empresa := v_membro.empresa_id;

  select e.id into v_evento
    from public.events e
   where e.empresa_id = v_empresa
     and coalesce(e.archived, false) = false
   order by e.created_at desc
   limit 1;

  return json_build_object(
    'dispensado_em', v_membro.guia_dispensado_em,
    'concluido_em',  v_membro.guia_concluido_em,
    'evento_id',     v_evento,
    -- PASSO 1 — existe evento?
    'criou_evento',  v_evento is not null,
    -- PASSO 2 — o contexto que muda as sugestões do método
    'definiu_contexto', coalesce((
      select e.escala is not null and e.cenario is not null
        from public.events e where e.id = v_evento
    ), false),
    -- PASSO 3 — decidiu alguma coisa. QUALQUER decisão serve: se ela
    -- decidir outra que não a que o guia apontou, o passo vence igual.
    'decidiu', coalesce((
      select exists (
        select 1 from public.evento_decisao d
         where d.event_id = v_evento and d.estado = 'decidida'
      )
    ), false),
    -- PASSO 4 — a tarefa NASCEU DE UMA DECISÃO. Tarefa digitada à mão não
    -- serve aqui: o que o passo prova é o vínculo decisão → trabalho.
    'tarefa_nasceu', coalesce((
      select exists (
        select 1 from public.tasks t
         where t.event_id = v_evento and t.evento_decisao_id is not null
      )
    ), false),
    -- PASSO 5 — deu andamento. Responsável e prazo NÃO servem de prova:
    -- a tarefa já nasce com os dois preenchidos (medido: 166 de 166).
    -- O que só a pessoa faz é mover o estado.
    'deu_andamento', coalesce((
      select exists (
        select 1 from public.tasks t
         where t.event_id = v_evento
           and t.status is not null
           and t.status <> 'pendente'
      )
    ), false)
  );
end $$;

revoke all on function public.meu_guia() from public, anon;
grant execute on function public.meu_guia() to authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
-- Sem `WITH` aqui: cada linha é um subselect fechado. (Na 158 eu declarei
-- um `with` no meio de um `union all` e o Postgres recusou o arquivo
-- inteiro — `WITH` abre a instrução, não um ramo dela.)

select 'as duas colunas do guia existem' as item,
       (
         select count(*) = 2
           from information_schema.columns
          where table_schema = 'public'
            and table_name = 'membros_equipe'
            and column_name in ('guia_dispensado_em', 'guia_concluido_em')
       ) as ok

union all
select 'ninguem nasce com o guia pulado ou concluido',
       not exists (
         select 1 from public.membros_equipe
          where guia_dispensado_em is not null
             or guia_concluido_em is not null
       )

union all
select 'as duas funcoes existem',
       (
         select count(distinct p.proname) = 2
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('definir_guia', 'meu_guia')
       )

union all
select 'as duas sao security definer',
       (
         select count(*) = 2
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname in ('definir_guia', 'meu_guia')
            and p.prosecdef
       )

union all
-- anon nao executa nenhuma: guia e de quem esta logada, e `auth.uid()`
-- nulo nao pode virar escrita em ninguem.
select 'anon nao executa',
       not exists (
         select 1
           from information_schema.routine_privileges
          where routine_schema = 'public'
            and routine_name in ('definir_guia', 'meu_guia')
            and grantee = 'anon'
       )

union all
-- Os cinco fatos que o guia lê precisam existir como coluna. Se algum
-- for renomeado um dia, o guia trava num passo para sempre e ninguem
-- descobre — esta linha e o alarme.
select 'as colunas dos cinco fatos existem',
       (
         select count(*) = 5 from (
           select 1 from information_schema.columns
            where table_schema='public' and table_name='events' and column_name='escala'
           union all
           select 1 from information_schema.columns
            where table_schema='public' and table_name='events' and column_name='cenario'
           union all
           select 1 from information_schema.columns
            where table_schema='public' and table_name='evento_decisao' and column_name='estado'
           union all
           select 1 from information_schema.columns
            where table_schema='public' and table_name='tasks' and column_name='evento_decisao_id'
           union all
           select 1 from information_schema.columns
            where table_schema='public' and table_name='tasks' and column_name='status'
         ) c
       );
