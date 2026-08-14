-- 097 — Financeiro do evento, nível empresa
--
-- A tela que ela mais usa. Hoje resolve o mínimo; esta migração dá o
-- que falta para ela largar o Excel e o WhatsApp.
--
-- Medido antes de escrever (2026-08-14): 42 lançamentos (35 assessoria,
-- 7 fornecedor), 8 em aberto, e só 5 com forma de pagamento preenchida —
-- o campo existe e quase ninguém usa, o que diz que lançar dá trabalho
-- demais hoje. 96 evento_objetivo com valor_previsto. 25 orçamentos.
--
-- Quatro coisas nascem aqui:
--   1. de quem é o dinheiro (repasse × pagamento direto) e o saldo em mãos;
--   2. o comprovante preso ao lançamento;
--   3. o fechamento do evento (previsto × realizado × lucro);
--   4. a conciliação por extrato bancário.
--
-- O que NÃO nasce aqui, de propósito: categoria de verba. Ela já existe —
-- evento_objetivo, do Planejamento, com valor_previsto e os nomes que o
-- design pede ("Foto e vídeo", "Música e atrações"). O financeiro passa a
-- APONTAR para ela em vez de criar um segundo lugar para a mesma verba.

begin;

-- ============================================================
-- 1) DE QUEM É O DINHEIRO
-- ============================================================
-- Em casamento, parte dos fornecedores a cliente paga direto e parte
-- passa pelo caixa da cerimonialista. Sem essa distinção, "a pagar"
-- mistura dinheiro que é dela com dinheiro que ela só administra — e
-- administrar dinheiro de terceiro sem saber quanto tem em mãos é o
-- tipo de erro que custa caro.
--
-- O padrão é 'cliente_direto': assumir que o dinheiro passou pelo caixa
-- dela criaria responsabilidade fiduciária que talvez nunca existiu.
alter table public.transactions
  add column if not exists origem_pagamento text not null default 'cliente_direto'
    check (origem_pagamento in ('cliente_direto', 'caixa'));

comment on column public.transactions.origem_pagamento is
  'cliente_direto = a cliente pagou o fornecedor direto. caixa = saiu do caixa que a cerimonialista administra (e abate o saldo em mãos).';

-- O papel do lançamento no contrato do fornecedor. O design fala em
-- sinal, parcela, saldo e extra — e a fila lê isso para dizer "A cobrar"
-- em vez de "Agendada" quando é extra ainda não combinado.
alter table public.transactions
  add column if not exists tipo_lancamento text not null default 'parcela'
    check (tipo_lancamento in ('sinal', 'parcela', 'saldo', 'extra', 'entrada'));

-- A categoria de verba: aponta para o objetivo do Planejamento. Nulo é
-- aceito — lançamento avulso não deixa de existir por não ter categoria.
alter table public.transactions
  add column if not exists objetivo_id uuid
    references public.evento_objetivo (id) on delete set null;

create index if not exists idx_transactions_objetivo
  on public.transactions (objetivo_id) where objetivo_id is not null;
create index if not exists idx_transactions_conta_venc
  on public.transactions (event_id, conta, due_date);

-- ============================================================
-- 2) O COMPROVANTE
-- ============================================================
-- Guardamos o arquivo E o que foi lido dele. O valor que vale é sempre o
-- que ELA confirmou, nunca o que a leitura sugeriu — por isso os dois
-- ficam separados: valor_confirmado na coluna `value` de sempre, e o
-- lido em jsonb, para auditoria e para melhorar a leitura depois.
alter table public.transactions
  add column if not exists comprovante_path text,
  add column if not exists comprovante_nome text,
  add column if not exists comprovante_dados jsonb,
  add column if not exists comprovante_em timestamptz;

comment on column public.transactions.comprovante_dados is
  'O que a leitura extraiu (valor, data, tipo, txId, CNPJ) + confianca por campo. NUNCA é a fonte do valor pago: esse é o que ela confirmou.';

-- Bucket privado, mesmo molde da 085/092: caminho começa pelo event_id e
-- a permissão sai de função SECURITY DEFINER.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png',
                                 'image/webp', 'image/heic'];

-- Comprovante é da EQUIPE: a cliente não vê o extrato de pagamentos aos
-- fornecedores. Por isso não há braço sou_cliente_do_evento aqui — ao
-- contrário do bucket de inspirações, que ela alimenta.
--
-- O cast do nome da pasta para uuid vai numa função com exceção tratada:
-- um caminho torto no bucket derrubaria a policy inteira com erro de
-- conversão, e policy que explode é policy que não protege.
create or replace function public.pode_ver_comprovante(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.pode_ver_evento(p_folder::uuid);
exception when others then
  return false;
end $$;

create or replace function public.pode_subir_comprovante(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.pode_editar_evento(p_folder::uuid);
exception when others then
  return false;
end $$;

revoke all on function public.pode_ver_comprovante(text) from public, anon;
revoke all on function public.pode_subir_comprovante(text) from public, anon;
grant execute on function public.pode_ver_comprovante(text) to authenticated;
grant execute on function public.pode_subir_comprovante(text) to authenticated;

drop policy if exists "comprovantes_select" on storage.objects;
create policy "comprovantes_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes'
         and public.pode_ver_comprovante((storage.foldername(name))[1]));

drop policy if exists "comprovantes_insert" on storage.objects;
create policy "comprovantes_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes'
              and public.pode_subir_comprovante((storage.foldername(name))[1]));

drop policy if exists "comprovantes_update" on storage.objects;
create policy "comprovantes_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'comprovantes'
         and public.pode_subir_comprovante((storage.foldername(name))[1]));

drop policy if exists "comprovantes_delete" on storage.objects;
create policy "comprovantes_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprovantes'
         and public.pode_subir_comprovante((storage.foldername(name))[1]));

-- ============================================================
-- 3) A VERBA DO EVENTO
-- ============================================================
-- Quanto a cliente pôs na mesa para o evento inteiro. É o teto de que o
-- design fala ("Verba total / Pago / A pagar / Livre") e não existia:
-- até agora o sistema só sabia a soma das alocações, que é coisa
-- diferente de teto.
alter table public.events
  add column if not exists verba_total numeric(12, 2);

comment on column public.events.verba_total is
  'Teto combinado com a cliente para o evento. Livre = verba_total - alocado. Nulo = ela ainda não definiu; a tela mostra o alocado sem inventar teto.';

-- ============================================================
-- 4) SALDO EM MÃOS E CHAMADA DE CAPITAL
-- ============================================================
-- Receita na conta 'fornecedor' = a cliente repassou verba para o caixa
-- do evento. Isso já era possível no schema e nunca foi usado; agora tem
-- significado e leitor.
--
-- Saldo em mãos = repassado pela cliente − o que saiu do caixa.
create or replace function public.saldo_do_caixa_evento(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'recebido_da_cliente', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'fornecedor'
        and t.type = 'receita' and t.paid
    ), 0),
    'pago_do_caixa', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'fornecedor'
        and t.type = 'despesa' and t.paid and t.origem_pagamento = 'caixa'
    ), 0),
    -- o que vence e vai sair do caixa dela nos próximos 30 dias
    'compromissado_30d', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'fornecedor'
        and t.type = 'despesa' and not t.paid
        and t.origem_pagamento = 'caixa'
        and t.due_date <= current_date + 30
    ), 0)
  )
  where public.pode_ver_evento(p_event_id);
$$;

revoke all on function public.saldo_do_caixa_evento(uuid) from public, anon;
grant execute on function public.saldo_do_caixa_evento(uuid) to authenticated;

comment on function public.saldo_do_caixa_evento(uuid) is
  'Quanto a cerimonialista tem em mãos da cliente. Se compromissado_30d > saldo, a acao certa nao e "pague o fornecedor" — e "peca X a cliente".';

-- ============================================================
-- 5) FECHAMENTO DO EVENTO
-- ============================================================
create table if not exists public.evento_fechamento (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null unique references public.events (id) on delete cascade,
  empresa_id        uuid references public.empresas (id),
  fechado_em        timestamptz not null default now(),
  fechado_por       uuid references auth.users (id) on delete set null,
  -- fotografia do momento do fechamento: os números de hoje mudam quando
  -- alguém edita um lançamento antigo, e a prestação de contas não pode
  -- mudar depois de entregue
  verba_prevista    numeric(12, 2),
  verba_realizada   numeric(12, 2),
  receita_assessoria numeric(12, 2),
  custos_diretos    numeric(12, 2) default 0,
  sobra_destino     text not null default 'nao_houve'
                    check (sobra_destino in ('devolvida', 'virou_extra', 'nao_houve')),
  observacao        text,
  created_at        timestamptz not null default now()
);

drop trigger if exists trg_fill_empresa on public.evento_fechamento;
create trigger trg_fill_empresa before insert on public.evento_fechamento
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_fechamento enable row level security;

drop policy if exists fechamento_select on public.evento_fechamento;
create policy fechamento_select on public.evento_fechamento
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists fechamento_write on public.evento_fechamento;
create policy fechamento_write on public.evento_fechamento
  for all using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

-- Os números do fechamento, calculados na hora. A tela mostra isso antes
-- de fechar; ao fechar, o valor é COPIADO para a linha acima.
create or replace function public.numeros_do_fechamento(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'verba_total', (select e.verba_total from public.events e where e.id = p_event_id),
    'alocado', coalesce((
      select sum(o.valor_alocado) from public.evento_fornecedor_orcamento o
      where o.event_id = p_event_id
    ), 0),
    'pago_fornecedores', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'fornecedor'
        and t.type = 'despesa' and t.paid
    ), 0),
    'a_pagar_fornecedores', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'fornecedor'
        and t.type = 'despesa' and not t.paid
    ), 0),
    'receita_assessoria', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'assessoria'
        and t.type = 'receita' and t.paid
    ), 0),
    'a_receber_assessoria', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'assessoria'
        and t.type = 'receita' and not t.paid
    ), 0),
    'custos_diretos', coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = p_event_id and t.conta = 'assessoria'
        and t.type = 'despesa' and t.paid
    ), 0),
    'ja_fechado', exists (
      select 1 from public.evento_fechamento f where f.event_id = p_event_id
    )
  )
  where public.pode_ver_evento(p_event_id);
$$;

revoke all on function public.numeros_do_fechamento(uuid) from public, anon;
grant execute on function public.numeros_do_fechamento(uuid) to authenticated;

-- ============================================================
-- 6) HISTÓRICO DE PREÇO POR FORNECEDOR
-- ============================================================
-- "Quanto esse fornecedor cobrou da última vez?" — a pergunta que hoje
-- ela responde procurando no WhatsApp. Só olha eventos que ela pode ver.
create or replace function public.historico_preco_fornecedor(p_supplier_id uuid)
returns table (
  event_id     uuid,
  evento       text,
  data_evento  date,
  alocado      numeric,
  pago         numeric,
  tipo_evento  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    coalesce(e.name, c.name, 'Evento'),
    e.date,
    o.valor_alocado,
    coalesce((
      select sum(t.value) from public.transactions t
      where t.event_id = e.id and t.supplier_id = p_supplier_id
        and t.type = 'despesa' and t.paid
    ), 0),
    e.type
  from public.evento_fornecedor_orcamento o
  join public.events e on e.id = o.event_id
  left join public.clients c on c.id = e.client_id
  where o.supplier_id = p_supplier_id
    and e.id in (select public.eventos_visiveis())
  order by e.date desc
  limit 12;
$$;

revoke all on function public.historico_preco_fornecedor(uuid) from public, anon;
grant execute on function public.historico_preco_fornecedor(uuid) to authenticated;

-- ============================================================
-- 7) CONCILIAÇÃO POR EXTRATO BANCÁRIO
-- ============================================================
-- Um upload do OFX resolve o mês inteiro. O fitid é o identificador único
-- da transação no padrão OFX: é ele que impede a mesma linha de entrar
-- duas vezes quando ela reimporta o arquivo.
create table if not exists public.extrato_importacao (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid references public.empresas (id) on delete cascade,
  event_id     uuid references public.events (id) on delete set null,
  arquivo_nome text,
  banco        text,
  periodo_de   date,
  periodo_ate  date,
  importado_por uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.extrato_linha (
  id             uuid primary key default gen_random_uuid(),
  importacao_id  uuid not null references public.extrato_importacao (id) on delete cascade,
  empresa_id     uuid references public.empresas (id) on delete cascade,
  -- identificador do banco: a trava contra importar a mesma linha 2x
  fitid          text,
  data           date not null,
  valor          numeric(12, 2) not null,
  descricao      text,
  -- quando conciliada, aponta para o lançamento que ela quitou
  transaction_id uuid references public.transactions (id) on delete set null,
  conciliado_em  timestamptz,
  ignorada       boolean not null default false,
  created_at     timestamptz not null default now()
);

create unique index if not exists uq_extrato_fitid
  on public.extrato_linha (empresa_id, fitid) where fitid is not null;
create index if not exists idx_extrato_linha_imp
  on public.extrato_linha (importacao_id, data);

alter table public.extrato_importacao enable row level security;
alter table public.extrato_linha enable row level security;

drop policy if exists extrato_imp_all on public.extrato_importacao;
create policy extrato_imp_all on public.extrato_importacao
  for all using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists extrato_linha_all on public.extrato_linha;
create policy extrato_linha_all on public.extrato_linha
  for all using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

-- Sugere o casamento: mesma data (±3 dias) e mesmo valor. NÃO concilia
-- sozinha — devolve candidatos para ela confirmar, pela mesma razão do
-- comprovante: nada é marcado como pago sem o toque dela.
create or replace function public.sugerir_conciliacao(p_linha_id uuid)
returns table (
  transaction_id uuid,
  descricao      text,
  valor          numeric,
  vencimento     date,
  fornecedor     text,
  evento         text,
  distancia_dias int
)
language sql
stable
security definer
set search_path = public
as $$
  with linha as (
    select l.* from public.extrato_linha l
    where l.id = p_linha_id
      and l.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  )
  select
    t.id, t.description, t.value, t.due_date,
    s.name, coalesce(e.name, c.name, 'Evento'),
    abs(t.due_date - (select data from linha))::int
  from public.transactions t
  join linha on true
  left join public.suppliers s on s.id = t.supplier_id
  left join public.events e on e.id = t.event_id
  left join public.clients c on c.id = e.client_id
  where not t.paid
    and t.event_id in (select public.eventos_visiveis())
    and abs(t.value - abs(linha.valor)) < 0.01
    and abs(t.due_date - linha.data) <= 3
  order by abs(t.due_date - linha.data)
  limit 5;
$$;

revoke all on function public.sugerir_conciliacao(uuid) from public, anon;
grant execute on function public.sugerir_conciliacao(uuid) to authenticated;

-- ============================================================
-- 8) DEFAULTS À PROVA DE INSERÇÃO EM LOTE
-- ============================================================
-- A lição da 093/096: em insert de várias linhas o PostgREST manda NULL
-- explícito para o que faltou em alguma linha, e NULL explícito não
-- aciona o DEFAULT. Gerar parcelas em série é exatamente esse caso.
create or replace function public.trg_transaction_defaults()
returns trigger language plpgsql as $$
begin
  new.origem_pagamento := coalesce(new.origem_pagamento, 'cliente_direto');
  new.tipo_lancamento  := coalesce(new.tipo_lancamento, 'parcela');
  new.paid             := coalesce(new.paid, false);
  return new;
end $$;

drop trigger if exists trg_transaction_defaults on public.transactions;
create trigger trg_transaction_defaults
  before insert or update on public.transactions
  for each row execute function public.trg_transaction_defaults();

create or replace function public.trg_extrato_linha_defaults()
returns trigger language plpgsql as $$
begin
  new.ignorada := coalesce(new.ignorada, false);
  return new;
end $$;

drop trigger if exists trg_extrato_linha_defaults on public.extrato_linha;
create trigger trg_extrato_linha_defaults
  before insert or update on public.extrato_linha
  for each row execute function public.trg_extrato_linha_defaults();

-- ============================================================
-- 9) BACKFILL DO QUE JÁ EXISTE
-- ============================================================
-- 8 lançamentos com category='entrada'/'contrato' são a entrada e as
-- parcelas do contrato de assessoria: marcá-los certo evita a fila
-- dizer "parcela" para o que é entrada.
update public.transactions
   set tipo_lancamento = 'entrada'
 where conta = 'assessoria' and type = 'receita'
   and category = 'entrada' and tipo_lancamento = 'parcela';

-- ============================================================
-- 10) Relatório
-- ============================================================
do $$
declare
  v_caixa int;
  v_obj   int;
begin
  select count(*) into v_caixa from public.transactions where origem_pagamento = 'caixa';
  select count(*) into v_obj from public.evento_objetivo where valor_previsto is not null;
  raise notice '--- 097 ---';
  raise notice 'transactions ganhou: origem_pagamento, tipo_lancamento, objetivo_id, comprovante_*';
  raise notice 'events ganhou verba_total (teto do evento)';
  raise notice 'tabelas novas: evento_fechamento, extrato_importacao, extrato_linha';
  raise notice 'bucket privado comprovantes: criado (10 MB, pdf/jpg/png)';
  raise notice 'funcoes: saldo_do_caixa_evento, numeros_do_fechamento, historico_preco_fornecedor, sugerir_conciliacao';
  raise notice 'lancamentos marcados como saida do caixa: % (o padrao e cliente_direto)', v_caixa;
  raise notice 'categorias de verba reaproveitadas de evento_objetivo: %', v_obj;
end $$;

commit;
