-- ============================================================
-- 117 — Fechar ao anônimo as funções que escrevem
--
-- O Postgres concede EXECUTE a PUBLIC por padrão quando uma função é
-- criada, e PUBLIC inclui `anon`. Escrever apenas
--
--     grant execute on function ... to authenticated;
--
-- NÃO tira o acesso de ninguém — só acrescenta. O padrão correto, que já
-- existe em várias funções deste projeto, é revogar antes:
--
--     revoke all on function ... from public, anon;
--     grant execute on function ... to authenticated;
--
-- Em um lote de funções esse `revoke` foi esquecido. Sondado ao vivo com
-- a chave publicável (a que vai embutida no JS do site), o anônimo
-- alcançava, entre outras:
--
--   redistribuir_decisoes_evento  — recalcula os prazos do método
--   gerar_tarefas_da_decisao      — cria tarefas
--   remover_tarefas_da_decisao    — APAGA tarefas
--   registrar_agendamento_evento  — insere em activities E notifications
--   event_label                   — devolve "Casamento — <nome da cliente>"
--
-- E o id do evento não é segredo: ele aparece na barra de endereço do link
-- público do roteiro, que todo fornecedor recebe.
--
-- ESCOPO DELIBERADO: esta migração fecha só o que ESCREVE ou VAZA dado.
-- Ficam de fora, de propósito, os auxiliares de policy — meu_cargo,
-- pode_ver_evento, pode_editar_evento, pode_gerenciar_capa/logo/portfolio/
-- landing_imagens/anexo_planejamento. Eles são avaliados DENTRO de
-- políticas RLS com os privilégios de quem consulta; tirar o EXECUTE do
-- anônimo transformaria "negado" em "erro de permissão" em caminhos que
-- hoje simplesmente devolvem vazio. Para o anônimo essas funções já
-- retornam false ou nada — são ruído, não buraco.
--
-- E o segundo conserto: a guarda da 081 estava INVERTIDA.
--
--     if auth.uid() is not null and not pode_ver_evento(...) then return;
--
-- Para o anônimo, `auth.uid()` é NULL, a condição inteira é falsa e a
-- guarda é PULADA. Ela protegia quem estava logado e liberava quem não
-- estava. O cron continua entrando porque usa service_role.
--
-- Convergente: pode ser reexecutada. Ao final, um SELECT de conferência.
-- Execute no SQL Editor do Supabase (depois da 116).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) As que escrevem no evento
-- ------------------------------------------------------------
-- service_role junto porque gatilho e cron também chamam.

revoke all on function public.instanciar_metodo_evento(uuid) from public, anon;
grant execute on function public.instanciar_metodo_evento(uuid) to authenticated, service_role;

revoke all on function public.aplicar_arquetipos_evento(uuid) from public, anon;
grant execute on function public.aplicar_arquetipos_evento(uuid) to authenticated, service_role;

revoke all on function public.redistribuir_decisoes_evento(uuid) from public, anon;
grant execute on function public.redistribuir_decisoes_evento(uuid) to authenticated, service_role;

revoke all on function public.sincronizar_orcamento_fornecedor(uuid) from public, anon;
grant execute on function public.sincronizar_orcamento_fornecedor(uuid) to authenticated, service_role;

revoke all on function public.gerar_tarefas_da_decisao(uuid) from public, anon;
grant execute on function public.gerar_tarefas_da_decisao(uuid) to authenticated, service_role;

revoke all on function public.remover_tarefas_da_decisao(uuid) from public, anon;
grant execute on function public.remover_tarefas_da_decisao(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- 2) Os semeadores
-- ------------------------------------------------------------

revoke all on function public.semear_conteudo_institucional(uuid) from public, anon;
grant execute on function public.semear_conteudo_institucional(uuid) to authenticated, service_role;

revoke all on function public.semear_metodo_casamento(uuid) from public, anon;
grant execute on function public.semear_metodo_casamento(uuid) to authenticated, service_role;

revoke all on function public.semear_tarefas_metodo_casamento(uuid) from public, anon;
grant execute on function public.semear_tarefas_metodo_casamento(uuid) to authenticated, service_role;

revoke all on function public.semear_tarefas_acao_casamento(uuid) from public, anon;
grant execute on function public.semear_tarefas_acao_casamento(uuid) to authenticated, service_role;

revoke all on function public.semear_checklist_dia_casamento(uuid) from public, anon;
grant execute on function public.semear_checklist_dia_casamento(uuid) to authenticated, service_role;

revoke all on function public.semear_checklist_dia_debutante(uuid) from public, anon;
grant execute on function public.semear_checklist_dia_debutante(uuid) to authenticated, service_role;

revoke all on function public.semear_roteiro_padrao(uuid) from public, anon;
grant execute on function public.semear_roteiro_padrao(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- 3) As que vazam dado de cliente ou de agenda
-- ------------------------------------------------------------

-- devolve "Casamento — <nome da cliente>"
revoke all on function public.event_label(text, uuid) from public, anon;
grant execute on function public.event_label(text, uuid) to authenticated, service_role;

-- diz se a cerimonialista está ocupada num horário
revoke all on function public.horario_ocupado(uuid, date, time, int) from public, anon;
grant execute on function public.horario_ocupado(uuid, date, time, int) to authenticated, service_role;

-- provisiona empresa; já retorna cedo sem sessão, mas não é para o anônimo
revoke all on function public.garantir_empresa_propria() from public, anon;
grant execute on function public.garantir_empresa_propria() to authenticated;

-- ------------------------------------------------------------
-- 4) A guarda invertida da 081
-- ------------------------------------------------------------
-- Mesmo corpo, três mudanças:
--   · a guarda deixa de liberar quem não tem sessão
--   · p_link só aceita caminho interno — sem isso o atacante escolhia o
--     destino de um item clicável dentro do sino dela (o NotificationBell
--     faz router.push(link))
--   · o cron continua entrando: service_role tem auth.uid() nulo, então a
--     checagem por sessão passa a ser explícita

create or replace function public.registrar_agendamento_evento(
  p_event_id  uuid,
  p_tipo      text,
  p_titulo    text,
  p_mensagem  text,
  p_link      text default null,
  p_notificar boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid;
  v_label text;
  v_link  text;
  v_uid   uuid := auth.uid();
begin
  -- Sessão obrigatória, e ela precisa enxergar o evento. O cron chama com
  -- service_role, que é BYPASSRLS e não passa por aqui — quem chega com
  -- auth.uid() nulo pela API pública é anônimo, e anônimo não registra.
  if v_uid is null or not public.pode_ver_evento(p_event_id) then
    return;
  end if;

  select e.cerimonialista_id, public.event_label(e.type, e.client_id)
    into v_user, v_label
  from public.events e where e.id = p_event_id;

  if v_user is null then
    return;
  end if;

  -- Só caminho interno. '//host' é URL relativa a protocolo e sairia do
  -- site; qualquer coisa que não comece com '/' idem.
  v_link := case
    when p_link is null then null
    when p_link like '/%' and p_link not like '//%' then p_link
    else null
  end;

  insert into public.activities (
    cerimonialista_id, category, type, title, description, event_id, event_name
  )
  values (
    v_user, 'fornecedores', p_tipo, p_titulo, p_mensagem, p_event_id, v_label
  );

  if p_notificar then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (
      v_user, 'compromisso', p_titulo,
      coalesce(v_label, 'Evento') || ' · ' || p_mensagem,
      coalesce(v_link, '/eventos/' || p_event_id || '/organizacao')
    );
  end if;
end $$;

revoke all on function public.registrar_agendamento_evento(uuid, text, text, text, text, boolean)
  from public, anon;
grant execute on function public.registrar_agendamento_evento(uuid, text, text, text, text, boolean)
  to authenticated, service_role;

commit;

-- ============================================================
-- CONFERENCIA — cada linha deve devolver ok = true
-- ============================================================
with alvos(assinatura) as (
  values
    ('public.instanciar_metodo_evento(uuid)'),
    ('public.aplicar_arquetipos_evento(uuid)'),
    ('public.redistribuir_decisoes_evento(uuid)'),
    ('public.sincronizar_orcamento_fornecedor(uuid)'),
    ('public.gerar_tarefas_da_decisao(uuid)'),
    ('public.remover_tarefas_da_decisao(uuid)'),
    ('public.semear_conteudo_institucional(uuid)'),
    ('public.semear_metodo_casamento(uuid)'),
    ('public.semear_tarefas_metodo_casamento(uuid)'),
    ('public.semear_tarefas_acao_casamento(uuid)'),
    ('public.semear_checklist_dia_casamento(uuid)'),
    ('public.semear_checklist_dia_debutante(uuid)'),
    ('public.semear_roteiro_padrao(uuid)'),
    ('public.event_label(text, uuid)'),
    ('public.horario_ocupado(uuid, date, time, int)'),
    ('public.garantir_empresa_propria()'),
    ('public.registrar_agendamento_evento(uuid, text, text, text, text, boolean)')
)
select 'anonimo NAO executa: ' || assinatura as verificacao,
       not has_function_privilege('anon', assinatura, 'execute') as ok
from alvos

union all
select 'logado executa: ' || assinatura,
       has_function_privilege('authenticated', assinatura, 'execute')
from alvos

union all
select 'a guarda da 081 exige sessao',
       (select prosrc like '%v_uid is null or not public.pode_ver_evento%'
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'registrar_agendamento_evento')

union all
select 'p_link so aceita caminho interno',
       (select prosrc like '%not like ''//%%'
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'registrar_agendamento_evento')

union all
-- as superficies publicas NAO podem ter sido fechadas junto
select 'link publico do fornecedor continua aberto',
       has_function_privilege('anon', 'public.roteiro_publico(text)', 'execute')

union all
select 'resposta do fornecedor continua aberta',
       has_function_privilege('anon', 'public.responder_confirmacao(text, text)', 'execute')

union all
select 'chat publico continua aberto',
       has_function_privilege('anon', 'public.chat_mensagens(text)', 'execute')

order by ok, verificacao;
