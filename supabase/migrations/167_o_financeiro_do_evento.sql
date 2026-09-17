-- ============================================================
-- 167 — O FINANCEIRO DO EVENTO: VERBA, ASSESSORIA E ENCERRAMENTO
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- A tela do Financeiro do evento foi reorganizada em três contas (Verba
-- do evento · Minha assessoria · Encerramento). Quase tudo que ela mostra
-- já existia no banco: parcelas, contrato por fornecedor, entrada do
-- casal no caixa, conciliação, fechamento e prestação de contas.
--
-- Faltavam cinco coisas, e são elas que este arquivo entrega:
--
--   1. DESPESA AVULSA DA VERBA. O CHECK da 097 exige fornecedor em toda
--      despesa da conta do evento. Mas existe gasto da verba que não é de
--      fornecedor nenhum (taxa de cartório, estacionamento da equipe, o
--      gelo comprado na hora). Hoje ela é obrigada a lançar isso como
--      custo DELA — e aí some da verba e da prestação de contas. Passa a
--      valer: despesa da verba precisa de fornecedor OU de descrição.
--
--   2. A DATA DO CONTRATO DO FORNECEDOR ("assinado em") e a CATEGORIA
--      dele. Hoje a categoria só existe quando o fornecedor veio de uma
--      decisão do Planejamento; quem fecha um fornecedor direto no
--      Financeiro fica sem categoria nenhuma.
--
--   3. A DATA DO CONTRATO DE ASSESSORIA. O valor já mora em
--      events.contract_value; a data de assinatura não morava em lugar
--      nenhum.
--
--   4. O HISTÓRICO DE LANÇAMENTOS: quem registrou, quando e com qual
--      comprovante. É a trilha que protege a assessora numa conversa com
--      o casal, e é de onde sai a coluna "registrado por" da exportação
--      em CSV. Append-only: nem ela nem a equipe editam.
--
--   5. O gatilho que alimenta esse histórico por QUALQUER caminho —
--      a tela, a conciliação do extrato, a pendência da automação ou o
--      próprio SQL Editor. Registrar nunca derruba a operação: erro no
--      gatilho só deixa de registrar.
--
-- Nada aqui apaga dado nem muda número de tela: é tudo aditivo.

begin;

-- ------------------------------------------------------------
-- 1) Despesa avulsa da verba
-- ------------------------------------------------------------
-- A razão do CHECK da 063/097 continua de pé: pagamento sem dizer a quem
-- não dá para prestar contas. O que muda é o que conta como "a quem" —
-- o fornecedor cadastrado OU a descrição do gasto.
alter table public.transactions
  drop constraint if exists transactions_fornecedor_obrigatorio_check;
alter table public.transactions
  add constraint transactions_fornecedor_obrigatorio_check
  check (
    (conta = 'fornecedor' and type = 'despesa'
      and (supplier_id is not null or nullif(btrim(description), '') is not null))
    or (conta = 'fornecedor' and type = 'receita')
    or (conta = 'assessoria' and supplier_id is null)
  );

comment on constraint transactions_fornecedor_obrigatorio_check on public.transactions is
  'Despesa da verba precisa de fornecedor ou de descrição (a avulsa). Receita da verba e o repasse da cliente não têm fornecedor. Assessoria nunca tem.';

-- ------------------------------------------------------------
-- 2) O contrato do fornecedor: data e categoria
-- ------------------------------------------------------------
alter table public.evento_fornecedor_orcamento
  add column if not exists assinado_em date;

alter table public.evento_fornecedor_orcamento
  add column if not exists objetivo_id uuid
    references public.evento_objetivo (id) on delete set null;

create index if not exists idx_efo_objetivo
  on public.evento_fornecedor_orcamento (objetivo_id)
  where objetivo_id is not null;

comment on column public.evento_fornecedor_orcamento.assinado_em is
  'Quando o contrato com este fornecedor foi assinado. Nulo = ela não informou.';
comment on column public.evento_fornecedor_orcamento.objetivo_id is
  'A categoria de verba do contrato. Quando nulo, a tela ainda deduz pela decisão do Planejamento (evento_campo_valor), como antes.';

-- Preenche a categoria do que já existe, pela mesma dedução que a tela
-- fazia: o campo tipo fornecedor da decisão diz de que objetivo aquele
-- fornecedor é. Convergente: só toca em quem está sem categoria.
update public.evento_fornecedor_orcamento o
set objetivo_id = d.evento_objetivo_id
from public.evento_campo_valor cv
join public.evento_decisao d on d.id = cv.evento_decisao_id
where o.objetivo_id is null
  and cv.event_id = o.event_id
  and cv.valor_supplier_id = o.supplier_id
  and d.evento_objetivo_id is not null;

-- ------------------------------------------------------------
-- 3) O contrato de assessoria: data
-- ------------------------------------------------------------
alter table public.events
  add column if not exists contrato_assinado_em date;

comment on column public.events.contrato_assinado_em is
  'Quando o contrato de assessoria foi assinado. O valor continua em contract_value.';

-- Quem veio de proposta aceita já tem a data: é a do aceite.
update public.events e
set contrato_assinado_em = (a.created_at at time zone 'America/Sao_Paulo')::date
from public.orcamentos o
join public.orcamento_aceites a on a.orcamento_id = o.id
where o.evento_gerado_id = e.id
  and e.contrato_assinado_em is null;

-- ------------------------------------------------------------
-- 4) Dinheiro em português, e quem está logado
-- ------------------------------------------------------------
-- to_char com G/D depende do locale do servidor; com ',' e '.' literais
-- o resultado é o mesmo em qualquer máquina. O translate troca os dois.
create or replace function public.dinheiro_br(v numeric)
returns text
language sql
immutable
as $$
  select 'R$ ' || translate(to_char(coalesce(v, 0), 'FM9,999,999,990.00'), ',.', '.,');
$$;

comment on function public.dinheiro_br(numeric) is
  'R$ 1.234,56 — independente do locale do servidor.';

-- Quem fez: o nome de quem estava logado; sem sessão (rotina, chave de
-- serviço, SQL Editor) é o sistema. Mesmo critério da 166.
create or replace function public.autor_da_sessao(p_empresa uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_nome text;
begin
  if v_uid is null then
    return 'Sistema';
  end if;
  select nullif(btrim(m.nome), '') into v_nome
    from public.membros_equipe m
   where m.user_id = v_uid
   order by (m.empresa_id is not distinct from p_empresa) desc, m.created_at asc
   limit 1;
  return coalesce(v_nome, 'Equipe');
end $$;

-- ------------------------------------------------------------
-- 5) O histórico de lançamentos
-- ------------------------------------------------------------
-- Por que tabela nova e não `activities`: a 166 decidiu que o histórico
-- do evento não é tela de dinheiro (valor de contrato e verba aparecem
-- lá SEM o número). Aqui o número é o assunto.
create table if not exists public.evento_financeiro_registro (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  empresa_id uuid,
  em         timestamptz not null default now(),
  autor      text not null default 'Equipe',
  autor_id   uuid references auth.users (id) on delete set null,
  tipo       text not null check (tipo in (
               'entrada', 'parcela', 'despesa', 'lancamento', 'pagamento',
               'recebimento', 'estorno', 'comprovante', 'contrato',
               'contrato_assessoria', 'verba', 'exclusao')),
  texto      text not null,
  detalhe    text,
  -- Sem chave estrangeira de propósito: o registro sobrevive à exclusão
  -- do lançamento (é auditoria), e um ON DELETE SET NULL seria um UPDATE
  -- — que a imutabilidade abaixo recusaria, travando a exclusão.
  transaction_id uuid,
  supplier_id    uuid,
  valor      numeric(12, 2)
);

create index if not exists idx_financeiro_registro_evento
  on public.evento_financeiro_registro (event_id, em desc);
create index if not exists idx_financeiro_registro_transacao
  on public.evento_financeiro_registro (transaction_id)
  where transaction_id is not null;

alter table public.evento_financeiro_registro enable row level security;

-- Só leitura, e só de quem enxerga o evento. Sem policy de insert,
-- update ou delete: quem escreve é o gatilho (security definer), e a
-- exclusão em cascata do evento não passa por RLS.
drop policy if exists financeiro_registro_select on public.evento_financeiro_registro;
create policy financeiro_registro_select on public.evento_financeiro_registro
  for select using (public.pode_ver_evento(event_id));

-- Append-only. Bloqueia só UPDATE: DELETE fica de fora porque o evento
-- apagado leva os registros dele junto, e a cascata precisa passar.
create or replace function public.trg_financeiro_registro_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'o histórico do financeiro não aceita alteração';
end $$;

revoke all on function public.trg_financeiro_registro_imutavel()
  from public, anon, authenticated;

drop trigger if exists trg_financeiro_registro_imutavel
  on public.evento_financeiro_registro;
create trigger trg_financeiro_registro_imutavel
  before update on public.evento_financeiro_registro
  for each row execute function public.trg_financeiro_registro_imutavel();

-- A porta única de escrita.
create or replace function public.registrar_financeiro(
  p_event_id       uuid,
  p_tipo           text,
  p_texto          text,
  p_detalhe        text default null,
  p_transaction_id uuid default null,
  p_supplier_id    uuid default null,
  p_valor          numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
begin
  if p_event_id is null then
    return;
  end if;
  select e.empresa_id into v_empresa from public.events e where e.id = p_event_id;

  insert into public.evento_financeiro_registro
    (event_id, empresa_id, autor, autor_id, tipo, texto, detalhe,
     transaction_id, supplier_id, valor)
  values
    (p_event_id, v_empresa, public.autor_da_sessao(v_empresa), auth.uid(),
     p_tipo, p_texto, p_detalhe, p_transaction_id, p_supplier_id, p_valor);
exception when others then
  -- registrar nunca derruba a operação: o pagamento vale mais que a linha
  -- do histórico
  return;
end $$;

revoke all on function public.registrar_financeiro(uuid, text, text, text, uuid, uuid, numeric)
  from public, anon;
grant execute on function public.registrar_financeiro(uuid, text, text, text, uuid, uuid, numeric)
  to authenticated, service_role;

-- ------------------------------------------------------------
-- 6) Os gatilhos: todo caminho que grava dinheiro deixa rastro
-- ------------------------------------------------------------
create or replace function public.trg_registro_de_transacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r        record;
  v_forn   text;
  v_desc   text;
  v_tipo   text;
  v_texto  text;
  v_detalhe text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;

  select s.name into v_forn from public.suppliers s where s.id = r.supplier_id;
  v_desc := coalesce(nullif(btrim(r.description), ''), 'Lançamento');

  if tg_op = 'INSERT' then
    if r.conta = 'fornecedor' and r.type = 'receita' then
      v_tipo := 'entrada';
      v_texto := 'Entrada do casal · ' || public.dinheiro_br(r.value);
    elsif r.conta = 'fornecedor' and r.supplier_id is not null then
      v_tipo := 'parcela';
      v_texto := coalesce(v_forn, 'Fornecedor') || ' · ' || v_desc
                 || ' · ' || public.dinheiro_br(r.value);
    elsif r.conta = 'fornecedor' then
      v_tipo := 'despesa';
      v_texto := 'Despesa avulsa · ' || v_desc || ' · ' || public.dinheiro_br(r.value);
    elsif r.type = 'receita' then
      v_tipo := 'lancamento';
      v_texto := 'Assessoria · ' || v_desc || ' · ' || public.dinheiro_br(r.value);
    else
      v_tipo := 'despesa';
      v_texto := 'Custo da assessoria · ' || v_desc || ' · ' || public.dinheiro_br(r.value);
    end if;
    v_detalhe := case
      when r.paid then 'lançado já pago'
      else 'vence ' || to_char(r.due_date, 'DD/MM/YYYY')
    end;
    perform public.registrar_financeiro(
      r.event_id, v_tipo, v_texto, v_detalhe, r.id, r.supplier_id, r.value);
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.registrar_financeiro(
      r.event_id, 'exclusao',
      'Excluído · ' || v_desc || ' · ' || public.dinheiro_br(r.value),
      null, null, r.supplier_id, r.value);
    return null;
  end if;

  -- UPDATE: uma linha por mudança que interessa
  if new.paid and not old.paid then
    v_tipo := case when new.type = 'receita' then 'recebimento' else 'pagamento' end;
    v_texto := case when new.type = 'receita' then 'Recebimento · ' else 'Pagamento · ' end
               || coalesce(v_forn || ' · ', '') || v_desc
               || ' · ' || public.dinheiro_br(new.value);
    v_detalhe := coalesce(
      'comprovante ' || nullif(btrim(new.comprovante_nome), ''),
      'sem comprovante anexado');
    perform public.registrar_financeiro(
      new.event_id, v_tipo, v_texto, v_detalhe, new.id, new.supplier_id, new.value);

  elsif old.paid and not new.paid then
    perform public.registrar_financeiro(
      new.event_id, 'estorno',
      'Pagamento desfeito · ' || v_desc || ' · ' || public.dinheiro_br(new.value),
      null, new.id, new.supplier_id, new.value);

  elsif new.comprovante_path is distinct from old.comprovante_path
        and new.comprovante_path is not null then
    perform public.registrar_financeiro(
      new.event_id, 'comprovante',
      'Comprovante anexado · ' || coalesce(v_forn || ' · ', '') || v_desc,
      coalesce(nullif(btrim(new.comprovante_nome), ''), 'arquivo anexado'),
      new.id, new.supplier_id, new.value);

  elsif new.value is distinct from old.value then
    perform public.registrar_financeiro(
      new.event_id, 'lancamento',
      'Valor corrigido · ' || v_desc,
      public.dinheiro_br(old.value) || ' → ' || public.dinheiro_br(new.value),
      new.id, new.supplier_id, new.value);

  elsif new.due_date is distinct from old.due_date then
    perform public.registrar_financeiro(
      new.event_id, 'lancamento',
      'Vencimento alterado · ' || v_desc,
      to_char(old.due_date, 'DD/MM/YYYY') || ' → ' || to_char(new.due_date, 'DD/MM/YYYY'),
      new.id, new.supplier_id, new.value);
  end if;

  return null;
exception when others then
  return null;
end $$;

drop trigger if exists trg_registro_de_transacao on public.transactions;
create trigger trg_registro_de_transacao
  after insert or update or delete on public.transactions
  for each row execute function public.trg_registro_de_transacao();

-- O contrato do fornecedor
create or replace function public.trg_registro_de_contrato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_forn text;
begin
  select s.name into v_forn from public.suppliers s
   where s.id = coalesce(new.supplier_id, old.supplier_id);

  if tg_op = 'INSERT' then
    perform public.registrar_financeiro(
      new.event_id, 'contrato',
      'Contrato · ' || coalesce(v_forn, 'Fornecedor')
        || ' · ' || public.dinheiro_br(new.valor_alocado),
      case when new.assinado_em is null then 'sem data de assinatura'
           else 'assinado em ' || to_char(new.assinado_em, 'DD/MM/YYYY') end,
      null, new.supplier_id, new.valor_alocado);
  elsif new.valor_alocado is distinct from old.valor_alocado then
    perform public.registrar_financeiro(
      new.event_id, 'contrato',
      'Contrato ajustado · ' || coalesce(v_forn, 'Fornecedor'),
      public.dinheiro_br(old.valor_alocado) || ' → ' || public.dinheiro_br(new.valor_alocado),
      null, new.supplier_id, new.valor_alocado);
  end if;

  return null;
exception when others then
  return null;
end $$;

drop trigger if exists trg_registro_de_contrato on public.evento_fornecedor_orcamento;
create trigger trg_registro_de_contrato
  after insert or update on public.evento_fornecedor_orcamento
  for each row execute function public.trg_registro_de_contrato();

-- A verba total e o contrato de assessoria
create or replace function public.trg_registro_do_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verba_total is distinct from old.verba_total then
    perform public.registrar_financeiro(
      new.id, 'verba', 'Verba total do evento',
      case when old.verba_total is null
           then 'definida em ' || public.dinheiro_br(new.verba_total)
           when new.verba_total is null
           then 'apagada'
           else public.dinheiro_br(old.verba_total) || ' → ' || public.dinheiro_br(new.verba_total)
      end,
      null, null, new.verba_total);
  end if;

  if new.contract_value is distinct from old.contract_value then
    perform public.registrar_financeiro(
      new.id, 'contrato_assessoria', 'Contrato de assessoria',
      case when old.contract_value is null
           then 'definido em ' || public.dinheiro_br(new.contract_value)
           else public.dinheiro_br(old.contract_value) || ' → ' || public.dinheiro_br(new.contract_value)
      end,
      null, null, new.contract_value);
  end if;

  return null;
exception when others then
  return null;
end $$;

drop trigger if exists trg_registro_do_evento on public.events;
create trigger trg_registro_do_evento
  after update of verba_total, contract_value on public.events
  for each row execute function public.trg_registro_do_evento();

commit;

-- ============================================================
-- CONFERÊNCIA — tudo abaixo deve sair `true`
-- ============================================================
select 'despesa avulsa da verba passa a caber no CHECK' as item,
       pg_get_constraintdef(c.oid) ilike '%description%' as ok
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
 where n.nspname = 'public' and t.relname = 'transactions'
   and c.conname = 'transactions_fornecedor_obrigatorio_check'

union all
select 'o contrato do fornecedor tem data e categoria',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public'
           and table_name = 'evento_fornecedor_orcamento'
           and column_name in ('assinado_em', 'objetivo_id'))

union all
select 'o contrato de assessoria tem data',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'events'
                  and column_name = 'contrato_assinado_em')

union all
select 'dinheiro_br escreve em português',
       public.dinheiro_br(1234.5) = 'R$ 1.234,50'

union all
select 'o histórico do financeiro existe',
       exists (select 1 from information_schema.tables
                where table_schema = 'public'
                  and table_name = 'evento_financeiro_registro')

union all
select 'o histórico só tem policy de leitura',
       (select count(*) = 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'evento_financeiro_registro'
           and cmd = 'SELECT')
   and (select count(*) = 0 from pg_policies
         where schemaname = 'public'
           and tablename = 'evento_financeiro_registro'
           and cmd <> 'SELECT')

union all
select 'o histórico não aceita alteração',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.evento_financeiro_registro'::regclass
                  and tgname = 'trg_financeiro_registro_imutavel'
                  and not tgisinternal)

union all
select 'anon não escreve no histórico',
       not has_function_privilege('anon',
         'public.registrar_financeiro(uuid, text, text, text, uuid, uuid, numeric)', 'execute')

union all
select 'todo lançamento deixa rastro',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.transactions'::regclass
                  and tgname = 'trg_registro_de_transacao'
                  and not tgisinternal)

union all
select 'todo contrato de fornecedor deixa rastro',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.evento_fornecedor_orcamento'::regclass
                  and tgname = 'trg_registro_de_contrato'
                  and not tgisinternal)

union all
select 'verba e contrato de assessoria deixam rastro',
       exists (select 1 from pg_trigger
                where tgrelid = 'public.events'::regclass
                  and tgname = 'trg_registro_do_evento'
                  and not tgisinternal);
