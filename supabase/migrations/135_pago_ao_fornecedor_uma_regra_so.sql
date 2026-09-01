-- ============================================================
-- Vela — Migração 135: "pago ao fornecedor" vira UMA regra só
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Medido antes desta migração: existiam TRÊS cálculos de "pago ao
-- fornecedor" e eles divergiam entre si.
--
--   1. numeros_do_fechamento (097): conta='fornecedor' AND type='despesa'
--      AND paid  ← o único correto.
--   2. portal_investimento (089): conta='fornecedor' AND paid — SEM o
--      filtro de type. Um REPASSE da cliente ao caixa (receita lançada em
--      conta fornecedor, legítima pela 097) entrava como "Já pago" no
--      portal e aparecia na lista de parcelas do casal com fornecedor
--      vazio. O casal via um número inflado — e é prestação de contas.
--   3. pagamentos_fornecedor_por_mes (089): mesmo buraco (o join com
--      suppliers escondia o caso comum, mas não o define).
--
-- A REGRA CANÔNICA, a partir daqui, em todo lugar:
--
--   pago ao fornecedor = conta='fornecedor' AND type='despesa' AND paid
--
-- O repasse (receita em conta fornecedor) é entrada de dinheiro NO caixa,
-- não saída PARA fornecedor — não é "pago" em lugar nenhum. O lado TS
-- (financeiro/page.tsx) recebe o mesmo filtro no mesmo commit.

-- ------------------------------------------------------------
-- 1) portal_investimento — o que o casal vê
-- ------------------------------------------------------------
create or replace function public.portal_investimento(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not (public.sou_cliente_do_evento(p_event_id)
              or public.pode_ver_evento(p_event_id))
    then null
    else json_build_object(
      'contratado', coalesce((
        select sum(
          case
            when exists (select 1 from public.evento_fornecedor_item i
                          where i.evento_fornecedor_orcamento_id = o.id)
            then (select coalesce(sum(coalesce(i.valor_negociado, 0)), 0)
                    from public.evento_fornecedor_item i
                   where i.evento_fornecedor_orcamento_id = o.id)
            else coalesce(o.valor_alocado, 0)
          end)
        from public.evento_fornecedor_orcamento o
        where o.event_id = p_event_id), 0),
      'pago', coalesce((
        select sum(t.value)
        from public.transactions t
        where t.event_id = p_event_id
          and t.conta = 'fornecedor'
          and t.type = 'despesa'          -- a regra canônica
          and t.paid), 0),
      'parcelas', coalesce((
        select json_agg(json_build_object(
            'fornecedor', s.name,
            'descricao',  t.description,
            'valor',      t.value,
            'due_date',   t.due_date,
            'paid',       t.paid,
            'paid_at',    t.paid_at
          ) order by t.due_date, t.created_at)
        from public.transactions t
        left join public.suppliers s on s.id = t.supplier_id
        where t.event_id = p_event_id
          and t.conta = 'fornecedor'
          and t.type = 'despesa'), '[]'::json)  -- repasse não é parcela
    )
  end;
$$;

revoke all on function public.portal_investimento(uuid) from public, anon;
grant execute on function public.portal_investimento(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2) pagamentos_fornecedor_por_mes — o gráfico
-- ------------------------------------------------------------
create or replace function public.pagamentos_fornecedor_por_mes(p_event_id uuid)
returns table (
  supplier_id   uuid,
  fornecedor    text,
  mes           date,
  total_pago    numeric,
  qtd_parcelas  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.supplier_id,
    s.name as fornecedor,
    date_trunc('month', coalesce(t.paid_at::date, t.due_date))::date as mes,
    sum(t.value) as total_pago,
    count(*) as qtd_parcelas
  from public.transactions t
  join public.suppliers s on s.id = t.supplier_id
  where t.event_id = p_event_id
    and t.conta = 'fornecedor'
    and t.type = 'despesa'                -- a regra canônica
    and t.paid
    and (public.pode_ver_evento(p_event_id)
         or public.sou_cliente_do_evento(p_event_id))
  group by t.supplier_id, s.name, 3
  order by 3, s.name;
$$;

revoke all on function public.pagamentos_fornecedor_por_mes(uuid) from public, anon;
grant execute on function public.pagamentos_fornecedor_por_mes(uuid) to authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'portal_investimento filtra despesa no pago E nas parcelas (2 ocorrencias)' as item,
       (select (length(prosrc) - length(replace(prosrc, 'type = ''despesa''', '')))
               / length('type = ''despesa''') = 2
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'portal_investimento') as ok
union all
select 'pagamentos_por_mes filtra despesa',
       (select prosrc like '%type = ''despesa''%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'pagamentos_fornecedor_por_mes')
union all
select 'as tres funcoes agora concordam na regra (fechamento ja tinha)',
       (select prosrc like '%''despesa''%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'numeros_do_fechamento')
union all
select 'nenhuma das duas ficou executavel por anon',
       not exists (
         select 1 from information_schema.routine_privileges
         where routine_schema = 'public'
           and routine_name in ('portal_investimento', 'pagamentos_fornecedor_por_mes')
           and grantee = 'anon'
       );
