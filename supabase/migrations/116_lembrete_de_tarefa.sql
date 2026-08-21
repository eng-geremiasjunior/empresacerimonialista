-- ============================================================
-- 116 — O lembrete de véspera
--
-- Ate hoje o Vela nunca avisou a cerimonialista de nada. As tarefas
-- nascem com prazo, vencem, atrasam — e a unica forma de descobrir era
-- abrir a tela. O modulo "Notificacoes" do CLAUDE.md era intencao.
--
-- Esta migracao abre caminho para tres coisas, e nenhuma delas inventa
-- estado novo:
--
--  1) tasks.notified ACORDA. A coluna existe desde a primeira migracao,
--     `boolean not null default false`, e nunca teve um unico escritor.
--     O sentido dela sempre foi este: "ja lembrei desta". Passa a ser
--     escrita pela rotina diaria de vespera.
--
--     Ela NAO se confunde com notified_at (004), que e do verificador do
--     navegador — o aviso de 5 minutos, que exige due_time. Sao dois
--     lembretes com reguas diferentes; uma marca cada. Se a vespera
--     gravasse em notified_at, mataria o aviso da hora da mesma tarefa.
--
--  2) O CONSENTIMENTO de WhatsApp por pessoa. A Meta exige opt-in
--     demonstravel para mensagem iniciada pelo negocio; e, antes disso,
--     cerimonialista que nao quer WhatsApp do sistema vai existir. O
--     sino nao pede nada — e dentro do proprio sistema.
--
--  3) A RPC do interruptor. membros_equipe so aceita UPDATE da dona
--     (024), entao a pessoa nao consegue mexer na propria linha sem uma
--     funcao security definer de escopo de uma linha — mesmo desenho do
--     atualizar_meu_perfil (090).
--
-- Convergente: pode ser reexecutada. Ao final, um SELECT de conferencia.
-- Execute no SQL Editor do Supabase (depois da 115).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) A coluna que dormia
-- ------------------------------------------------------------

alter table public.tasks
  add column if not exists notified boolean not null default false;

comment on column public.tasks.notified is
  'Lembrete de VESPERA ja enviado (rotina /api/cron/lembretes-tarefas). '
  'Nao confundir com notified_at (004), que e o aviso de 5 minutos do '
  'navegador e exige due_time. Duas reguas, duas marcas: editar o prazo '
  'zera as duas.';

-- A rotina le pouquissimas linhas por dia (as que vencem amanha e ainda
-- nao foram avisadas). Indice parcial para nao varrer a tabela inteira.
create index if not exists idx_tasks_lembrete_vespera
  on public.tasks (due_date)
  where notified = false and status <> 'concluido';

-- ------------------------------------------------------------
-- 2) O consentimento, por pessoa
-- ------------------------------------------------------------

alter table public.membros_equipe
  add column if not exists avisar_whatsapp boolean not null default false,
  add column if not exists avisar_whatsapp_em timestamptz;

comment on column public.membros_equipe.avisar_whatsapp is
  'A pessoa aceita receber avisos do sistema no WhatsApp dela '
  '(membros_equipe.whatsapp). Padrao false: ninguem entra sem dizer sim.';
comment on column public.membros_equipe.avisar_whatsapp_em is
  'Quando ela disse sim. E a prova de opt-in que a Meta pede para '
  'mensagem iniciada pelo negocio. Zera quando ela desliga.';

-- ------------------------------------------------------------
-- 3) O interruptor
-- ------------------------------------------------------------
-- Escopo de UMA pessoa: as linhas de membro do proprio auth.uid().
-- Consentimento e da pessoa, nao da empresa — se ela for membro de duas,
-- vale nas duas.
--
-- Ligar sem numero cadastrado e recusado: consentimento para um canal
-- que nao existe nao e consentimento, e o cron ficaria tentando entregar
-- num campo vazio para sempre.

create or replace function public.definir_aviso_whatsapp(p_ativo boolean)
returns table(ativo boolean, whatsapp text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ativo    boolean := coalesce(p_ativo, false);
  v_whatsapp text;
begin
  if auth.uid() is null then
    raise exception 'Sessao expirada. Entre de novo.';
  end if;

  select nullif(trim(m.whatsapp), '')
    into v_whatsapp
    from public.membros_equipe m
   where m.user_id = auth.uid()
     and m.status = 'ativo'
   order by m.created_at asc
   limit 1;

  if not found then
    raise exception 'Perfil nao encontrado.';
  end if;

  if v_ativo and v_whatsapp is null then
    raise exception 'Cadastre seu WhatsApp antes de ligar o aviso.';
  end if;

  update public.membros_equipe m
     set avisar_whatsapp    = v_ativo,
         avisar_whatsapp_em = case when v_ativo then now() else null end
   where m.user_id = auth.uid()
     and m.status = 'ativo';

  return query
    select m.avisar_whatsapp, m.whatsapp
      from public.membros_equipe m
     where m.user_id = auth.uid()
       and m.status = 'ativo'
     order by m.created_at asc
     limit 1;
end $$;

revoke all on function public.definir_aviso_whatsapp(boolean) from public, anon;
grant execute on function public.definir_aviso_whatsapp(boolean) to authenticated;

commit;

-- ============================================================
-- CONFERENCIA — cada linha deve devolver ok = true
-- ============================================================
select 'tasks.notified existe' as verificacao,
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'tasks'
            and column_name = 'notified'
       ) as ok
union all
select 'indice de vespera criado',
       exists (
         select 1 from pg_indexes
          where schemaname = 'public' and indexname = 'idx_tasks_lembrete_vespera'
       )
union all
select 'membros_equipe.avisar_whatsapp existe',
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'membros_equipe'
            and column_name = 'avisar_whatsapp'
       )
union all
select 'membros_equipe.avisar_whatsapp_em existe',
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'membros_equipe'
            and column_name = 'avisar_whatsapp_em'
       )
union all
-- afirmacao de ESQUEMA, nao de dados: o bloco todo tem que continuar
-- verde na centesima reexecucao, e "ninguem ligou ainda" deixa de ser
-- verdade no dia em que a primeira pessoa liga
select 'consentimento nasce desligado',
       coalesce(
         (select column_default from information_schema.columns
           where table_schema = 'public' and table_name = 'membros_equipe'
             and column_name = 'avisar_whatsapp'),
         ''
       ) like 'false%'
union all
select 'RPC definir_aviso_whatsapp existe',
       exists (
         select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'definir_aviso_whatsapp'
       )
union all
select 'anon NAO executa a RPC',
       not has_function_privilege('anon', 'public.definir_aviso_whatsapp(boolean)', 'execute')
union all
select 'authenticated executa a RPC',
       has_function_privilege('authenticated', 'public.definir_aviso_whatsapp(boolean)', 'execute');
