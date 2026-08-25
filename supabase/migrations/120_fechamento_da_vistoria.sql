-- ============================================================
-- Vela — Migração 120: fechamento da vistoria de produção
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Os últimos itens de banco da vistoria, que estavam adiados para não
-- virar uma enxurrada de migrações:
--
--   1) autocadastrar_convidado fecha ao anônimo — a rota /api/rsvp
--      existe exatamente para limitar o ritmo, mas a função aceitava
--      chamada DIRETA pela chave publicável, contornando o limitador.
--   2) event_messages amarra quem assina — o INSERT aceitava qualquer
--      sender_id e sender_type='fornecedor' de quem estivesse logado;
--      mensagem de fornecedor só nasce pela RPC chat_enviar.
--   3) modelos_precificacao e extrato_linha ganham corte de cargo — a
--      tabela de preços podia ser editada e o extrato bancário lido por
--      qualquer vínculo da empresa.
--   4) whatsapp_messages_log ganha empresa_id e índice — telefone e
--      payload cru de todas as empresas num balde só, sem dono.
--   5) Faxina de schema morto: budgets/budget_items, metodo_guia/
--      evento_guia (todas com 0 linhas, medido) e events.fase_atual
--      (nenhum leitor no código).

-- ------------------------------------------------------------
-- 1) O cadastro de convidado só entra pela porta com limitador
-- ------------------------------------------------------------
-- A rota /api/rsvp passa a chamar com service role (código junto desta
-- migração). Quem tentar a RPC direto com a chave publicável recebe
-- "permission denied" — o teto de 1500 por evento continua dentro da
-- função como segunda linha.
revoke all on function public.autocadastrar_convidado(text, text, text, text, int, int, text, text)
  from public, anon, authenticated;
grant execute on function public.autocadastrar_convidado(text, text, text, text, int, int, text, text)
  to service_role;

-- ------------------------------------------------------------
-- 2) Mensagem de cerimonialista é assinada por quem a escreve
-- ------------------------------------------------------------
-- O fornecedor não passa por aqui: chat_enviar é SECURITY DEFINER e não
-- depende de policy. O UPDATE continua por evento — marcar como lida é
-- tocar em mensagem que o FORNECEDOR mandou, então não pode exigir
-- sender_id = auth.uid().
drop policy if exists "event_messages_insert" on public.event_messages;
create policy "event_messages_insert" on public.event_messages
  for insert with check (
    public.pode_ver_evento(event_id)
    and sender_id = auth.uid()
    and sender_type = 'cerimonialista'
  );

-- ------------------------------------------------------------
-- 3) Preço e extrato bancário com dono
-- ------------------------------------------------------------
-- Leitura de modelos continua da equipe (os orçamentos usam); escrita
-- exclui o cargo assistente — hoje ele não é mais oferecido no cadastro,
-- isto fecha a porta para quando a escala existir.
drop policy if exists "modelos_precificacao_empresa" on public.modelos_precificacao;
create policy "modelos_precificacao_select" on public.modelos_precificacao
  for select using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  );
create policy "modelos_precificacao_write" on public.modelos_precificacao
  for all using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora', 'cerimonialista')
  );

-- Extrato bancário: a única tela que o mostra (Financeiro da Empresa) é
-- da proprietária — a RLS passa a dizer o mesmo que o menu.
drop policy if exists extrato_linha_all on public.extrato_linha;
create policy extrato_linha_all on public.extrato_linha
  for all using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 4) O log do WhatsApp ganha dono e descarte
-- ------------------------------------------------------------
-- empresa_id fica nullable: o webhook nem sempre resolve a empresa (um
-- payload irreconhecível não tem dono). O descarte por idade roda no
-- próprio webhook (código junto desta migração): payload cru só serve
-- para depurar por alguns dias.
alter table public.whatsapp_messages_log
  add column if not exists empresa_id uuid references public.empresas (id) on delete set null;
create index if not exists idx_whatsapp_log_empresa
  on public.whatsapp_messages_log (empresa_id, created_at desc);

-- ------------------------------------------------------------
-- 5) Schema morto sai
-- ------------------------------------------------------------
-- budgets/budget_items são do modelo de dados original do CLAUDE.md e
-- nunca ganharam tela (o módulo virou "orcamentos"); metodo_guia/
-- evento_guia idem (o Guia de Estilo nasceu em outras tabelas na 096).
-- Todas com 0 linhas, medido em 25/08/2026. events.fase_atual (062) tem
-- backfill antigo mas nenhum leitor no código — a fase é derivada.
--
-- ANTES dos drops: instanciar_metodo_evento (065) roda por GATILHO em
-- todo INSERT de events e o último bloco dela insere em evento_guia
-- lendo metodo_guia. Dropar as tabelas sem redefinir a função quebraria
-- a criação de qualquer evento. A redefinição abaixo é a 065 idêntica,
-- menos o bloco dos guias — evento_objetivo e evento_decisao continuam
-- vivos (o Planejamento os usa).
create or replace function public.instanciar_metodo_evento(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  -- text, não o domínio: castar events.type para tipo_evento_catalogo
  -- lançaria erro e abortaria a criação do evento se algum type estivesse
  -- fora dos 9 valores. Comparando como texto, um tipo desconhecido apenas
  -- não casa nenhum template (no-op), nunca quebra o insert.
  v_tipo    text;
begin
  select empresa_id, type into v_empresa, v_tipo
  from public.events where id = p_event_id;

  if v_empresa is null or v_tipo is null then
    return;
  end if;

  -- já instanciado?
  if exists (select 1 from public.evento_objetivo where event_id = p_event_id) then
    return;
  end if;

  -- Objetivos
  insert into public.evento_objetivo
    (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem)
  select p_event_id, v_empresa, o.id, o.nome, o.descricao, o.ordem
  from public.metodo_objetivo o
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  -- Decisões, ligadas ao objetivo instanciado correspondente
  insert into public.evento_decisao
    (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
     titulo, descricao, responsavel, offset_ideal_dias, prioridade, ordem)
  select eo.id, p_event_id, v_empresa, d.id,
         d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias, d.prioridade, d.ordem
  from public.metodo_decisao d
  join public.metodo_objetivo o on o.id = d.objetivo_id
  join public.evento_objetivo eo
    on eo.event_id = p_event_id and eo.objetivo_template_id = o.id
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  -- (o bloco dos guias saiu junto com metodo_guia/evento_guia — 120)
end $$;

drop table if exists public.budget_items cascade;
drop table if exists public.budgets cascade;
drop table if exists public.evento_guia cascade;
drop table if exists public.metodo_guia cascade;
alter table public.events drop column if exists fase_atual;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- As duas primeiras conferem a 114 reaplicada (rode a 114 ANTES desta).
-- ------------------------------------------------------------
select 'confirmação sincroniza roteiro_links (114)' as item,
       (pg_get_functiondef('public.responder_solicitacao(text, uuid, jsonb)'::regprocedure)
         like '%update public.roteiro_links%') as ok
union all
select 'abertura tem intervalo de 5 min (114)',
       (pg_get_functiondef('public.consultar_pendencias_fornecedor(text)'::regprocedure)
         like '%interval ''5 minutes''%')
union all
select 'autocadastrar fechado ao anônimo',
       not has_function_privilege('anon',
         'public.autocadastrar_convidado(text, text, text, text, int, int, text, text)', 'execute')
union all
select 'autocadastrar aberto ao service_role',
       has_function_privilege('service_role',
         'public.autocadastrar_convidado(text, text, text, text, int, int, text, text)', 'execute')
union all
select 'mensagem exige assinatura de quem escreve',
       (with_check like '%sender_id%')
  from pg_policies
 where schemaname = 'public' and tablename = 'event_messages'
   and policyname = 'event_messages_insert'
union all
select 'preço com corte de cargo',
       (qual like '%cargo%')
  from pg_policies
 where schemaname = 'public' and tablename = 'modelos_precificacao'
   and policyname = 'modelos_precificacao_write'
union all
select 'extrato só da proprietária',
       (qual like '%proprietaria%')
  from pg_policies
 where schemaname = 'public' and tablename = 'extrato_linha'
   and policyname = 'extrato_linha_all'
union all
select 'log do whatsapp tem empresa_id',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'whatsapp_messages_log'
                 and column_name = 'empresa_id')
union all
select 'budgets saiu',
       not exists (select 1 from information_schema.tables
                   where table_schema = 'public' and table_name = 'budgets')
union all
select 'fase_atual saiu',
       not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'events'
                     and column_name = 'fase_atual')
union all
select 'criar evento continua funcionando (gatilho sem guias)',
       (pg_get_functiondef('public.instanciar_metodo_evento(uuid)'::regprocedure)
         not like '%evento_guia%');
