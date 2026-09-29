-- ============================================================
-- 184 — O ESTOQUE DA EMPRESA: do registro da compra à baixa do item
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- Termina com a conferência (tudo true).
--
-- Decisão do dono em 28/09/2026, ao ver o Estoque da Wedy: a regra da
-- 132 ("o recurso nasce e morre dentro de um evento") caiu. A empresa
-- tem ACERVO (cadeira, taça, toalha — volta do evento) e CONSUMÍVEL
-- (água, vela — não volta), e cada evento RESERVA do que existe.
--
-- O desenho:
--   * estoque_categoria — reutilizável ou consumível; a ORDEM das
--     categorias é a ordem da lista de separação (a ordem em que a
--     equipe anda pelo depósito).
--   * estoque_item — o que existe. Sem coluna de saldo: saldo é a soma
--     dos movimentos, como consumido = entrada − sobra na 132 (derivado,
--     nunca replicado).
--   * estoque_compra — a nota (XML, PDF, foto, planilha ou à mão). A
--     linha da compra É o movimento de entrada. `lancamento_id` nulo =
--     "a lançar" no Financeiro da empresa: a compra sugere, ela confirma.
--   * estoque_movimento — entrada, baixa, perda, ajuste. O único jeito
--     de mexer no saldo.
--   * estoque_reserva — o que vai para cada evento. Reserva NÃO mexe no
--     saldo: desconta do disponível. Reutilizável disputa só com evento
--     do MESMO DIA (regra da Wedy); consumível disputa com toda reserva
--     aberta. Fechar a reserva (depois da festa) é o que baixa.
--   * evento_recurso ganha origem_suprimento (compra | estoque |
--     fornecedor) e compravel: cadeira do depósito não é gasto do
--     evento, e garçom não se compra.
--
-- Escrita pela sessão, com RLS por cargo (molde de suppliers, 024) —
-- nenhuma policy de portal: a família nunca vê estoque, compra ou nota.

-- ------------------------------------------------------------
-- 0) empresa da sessão (as tabelas daqui não têm cerimonialista_id)
-- ------------------------------------------------------------
create or replace function public.fill_empresa_from_sessao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null then
    select mc.empresa_id into new.empresa_id from public.meu_cargo() mc;
  end if;
  return new;
end $$;

-- ------------------------------------------------------------
-- 1) AS TABELAS
-- ------------------------------------------------------------
create table if not exists public.estoque_categoria (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  nome         text not null check (char_length(nome) between 1 and 60),
  -- volta para o estoque depois do evento (cadeira, louça, toalha);
  -- false = consumível (água, vela, descartável)
  reutilizavel boolean not null default true,
  ordem        int not null default 0,
  created_at   timestamptz not null default now(),
  unique (empresa_id, nome)
);

create table if not exists public.estoque_item (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  categoria_id   uuid references public.estoque_categoria (id) on delete set null,
  -- chave estável (a mesma normalização de criarRecurso): é por ela que
  -- "Cadeira Tiffany" da planilha casa com o item que já existe, e que
  -- o item do método ("cadeiras") acha o acervo
  codigo         text not null check (char_length(codigo) between 1 and 40),
  nome           text not null check (char_length(nome) between 1 and 80),
  unidade        text not null default 'unidades' check (char_length(unidade) between 1 and 20),
  -- nulo = 20% do que já entrou (padrão do mercado)
  minimo         numeric(12, 2) check (minimo is null or minimo >= 0),
  custo_unitario numeric(12, 2) check (custo_unitario is null or custo_unitario >= 0),
  validade       date,
  observacao     text check (observacao is null or char_length(observacao) <= 300),
  ativo          boolean not null default true,
  criado_por     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create index if not exists idx_estoque_item_empresa
  on public.estoque_item (empresa_id, ativo);

create table if not exists public.estoque_compra (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas (id) on delete cascade,
  data            date not null,
  fornecedor_nome text check (fornecedor_nome is null or char_length(fornecedor_nome) <= 120),
  supplier_id     uuid references public.suppliers (id) on delete set null,
  numero_nota     text check (numero_nota is null or char_length(numero_nota) <= 30),
  -- a chave de acesso da NF-e/NFC-e: 44 dígitos; é o que barra a nota repetida
  chave_nfe       text check (chave_nfe is null or chave_nfe ~ '^[0-9]{44}$'),
  total           numeric(12, 2) not null default 0 check (total >= 0),
  origem          text not null default 'manual'
                  check (origem in ('xml', 'pdf', 'foto', 'planilha', 'manual')),
  -- bucket comprovantes: <empresa_id>/estoque/<compra_id>.<ext>
  documento_path  text,
  -- o lançamento no Financeiro da empresa; nulo = a lançar
  lancamento_id   uuid references public.business_transactions (id) on delete set null,
  -- ela já lançou por fora: some da fila sem lançamento
  lancada_fora    boolean not null default false,
  criado_por      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create unique index if not exists uq_estoque_compra_chave
  on public.estoque_compra (empresa_id, chave_nfe)
  where chave_nfe is not null;

create index if not exists idx_estoque_compra_empresa
  on public.estoque_compra (empresa_id, data desc);

create table if not exists public.estoque_reserva (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid references public.empresas (id) on delete cascade,
  event_id          uuid not null references public.events (id) on delete cascade,
  item_id           uuid not null references public.estoque_item (id) on delete cascade,
  quantidade        numeric(12, 3) not null check (quantidade > 0),
  -- saiu do depósito para a festa
  separado_em       timestamptz,
  -- a festa passou e ela fechou a conta: o que voltou, o que foi
  -- consumido, o que se perdeu
  fechado_em        timestamptz,
  devolvido         numeric(12, 3) check (devolvido is null or devolvido >= 0),
  consumido         numeric(12, 3) check (consumido is null or consumido >= 0),
  perdido           numeric(12, 3) check (perdido is null or perdido >= 0),
  -- a linha da Operação que esta reserva supre
  evento_recurso_id uuid references public.evento_recurso (id) on delete set null,
  criado_por        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (event_id, item_id)
);

create unique index if not exists uq_estoque_reserva_recurso
  on public.estoque_reserva (evento_recurso_id)
  where evento_recurso_id is not null;

create index if not exists idx_estoque_reserva_item
  on public.estoque_reserva (item_id, fechado_em);

create table if not exists public.estoque_movimento (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  item_id        uuid not null references public.estoque_item (id) on delete cascade,
  tipo           text not null check (tipo in ('entrada', 'baixa', 'perda', 'ajuste')),
  -- entrada, baixa e perda são sempre positivas; só o ajuste tem sinal
  quantidade     numeric(12, 3) not null
                 check ((tipo = 'ajuste' and quantidade <> 0) or (tipo <> 'ajuste' and quantidade > 0)),
  custo_unitario numeric(12, 2) check (custo_unitario is null or custo_unitario >= 0),
  compra_id      uuid references public.estoque_compra (id) on delete set null,
  event_id       uuid references public.events (id) on delete set null,
  reserva_id     uuid references public.estoque_reserva (id) on delete set null,
  motivo         text check (motivo is null or char_length(motivo) <= 200),
  criado_por     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_estoque_movimento_item
  on public.estoque_movimento (item_id, created_at desc);
create index if not exists idx_estoque_movimento_compra
  on public.estoque_movimento (compra_id);

-- gatilhos: empresa da sessão (ou do evento) e updated_at
drop trigger if exists trg_fill_empresa on public.estoque_categoria;
create trigger trg_fill_empresa before insert on public.estoque_categoria
  for each row execute function public.fill_empresa_from_sessao();
drop trigger if exists trg_fill_empresa on public.estoque_item;
create trigger trg_fill_empresa before insert on public.estoque_item
  for each row execute function public.fill_empresa_from_sessao();
drop trigger if exists trg_fill_empresa on public.estoque_compra;
create trigger trg_fill_empresa before insert on public.estoque_compra
  for each row execute function public.fill_empresa_from_sessao();
drop trigger if exists trg_fill_empresa on public.estoque_movimento;
create trigger trg_fill_empresa before insert on public.estoque_movimento
  for each row execute function public.fill_empresa_from_sessao();
drop trigger if exists trg_fill_empresa on public.estoque_reserva;
create trigger trg_fill_empresa before insert on public.estoque_reserva
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_touch on public.estoque_item;
create trigger trg_touch before update on public.estoque_item
  for each row execute function public.set_updated_at();
drop trigger if exists trg_touch on public.estoque_reserva;
create trigger trg_touch before update on public.estoque_reserva
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2) A OPERAÇÃO DO EVENTO: de onde vem cada item
-- ------------------------------------------------------------
alter table public.evento_recurso
  add column if not exists origem_suprimento text not null default 'compra',
  add column if not exists compravel boolean not null default true;

alter table public.evento_recurso drop constraint if exists evento_recurso_origem_check;
alter table public.evento_recurso add constraint evento_recurso_origem_check
  check (origem_suprimento in ('compra', 'estoque', 'fornecedor'));

-- a instância passa a carregar o compravel do template (garçom não se
-- compra: não entra na fila de compra nem no financeiro)
update public.evento_recurso er
   set compravel = mr.compravel
  from public.metodo_recurso mr
 where mr.id = er.recurso_template_id
   and er.compravel is distinct from mr.compravel;

create or replace function public.instanciar_recursos_evento(p_event_id uuid)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_tipo    text;
  v_n       int := 0;
begin
  if not public.pode_editar_evento(p_event_id) then
    return 0;
  end if;

  select empresa_id, type into v_empresa, v_tipo
  from public.events where id = p_event_id;

  if v_empresa is null or v_tipo is null then
    return 0;
  end if;

  insert into public.evento_recurso
    (event_id, empresa_id, evento_objetivo_id, recurso_template_id,
     codigo, nome, unidade, regra, indice, ordem, compravel)
  select p_event_id, v_empresa, eo.id, mr.id,
         mr.codigo, mr.nome, mr.unidade, mr.regra, mr.indice, mr.ordem, mr.compravel
  from public.metodo_recurso mr
  join public.metodo_objetivo mo on mo.id = mr.objetivo_id
  join public.evento_objetivo eo
    on eo.event_id = p_event_id and eo.objetivo_template_id = mo.id
  where mr.empresa_id = v_empresa
    and mo.tipo_evento::text = v_tipo
    and eo.ativo
    and not exists (
      select 1 from public.evento_recurso x
      where x.event_id = p_event_id and x.codigo = mr.codigo
    );

  get diagnostics v_n = row_count;

  perform public.dimensionar_recursos_evento(p_event_id, false);
  return v_n;
end $$;

revoke all on function public.instanciar_recursos_evento(uuid) from public, anon;
grant execute on function public.instanciar_recursos_evento(uuid) to authenticated;
grant execute on function public.instanciar_recursos_evento(uuid) to service_role;

-- Comprar abre a pendência do lançamento (132 §8) — mas só o que é
-- COMPRA: o que vem do estoque ou do fornecedor não é gasto do evento,
-- e o que não se compra não tem o que lançar.
create or replace function public.trg_recurso_pendencia_financeira()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.origem_suprimento is distinct from 'compra' or not new.compravel then
    return new;
  end if;

  if new.comprado is null or new.custo_unitario is null
     or new.comprado <= 0 or new.custo_unitario <= 0 then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.comprado is not distinct from new.comprado
       and old.custo_unitario is not distinct from new.custo_unitario then
      return new;
    end if;
  end if;

  insert into public.financeiro_pendencia
    (event_id, titulo, tipo, evento_recurso_id, quantidade,
     valor_sugerido, supplier_id)
  values (
    new.event_id,
    new.nome || ' - ' || trim(to_char(new.comprado, 'FM999999990.99'))
      || ' ' || new.unidade,
    'pagamento', new.id, new.comprado,
    round(new.comprado * new.custo_unitario, 2), new.supplier_id
  )
  on conflict (evento_recurso_id) where evento_recurso_id is not null
  do update set
    titulo         = excluded.titulo,
    quantidade     = excluded.quantidade,
    valor_sugerido = excluded.valor_sugerido,
    supplier_id    = excluded.supplier_id
  where public.financeiro_pendencia.status = 'aberta';

  return new;
end $$;

drop trigger if exists trg_recurso_pendencia on public.evento_recurso;
create trigger trg_recurso_pendencia
  after insert or update of comprado, custo_unitario on public.evento_recurso
  for each row execute function public.trg_recurso_pendencia_financeira();

-- ------------------------------------------------------------
-- 3) RLS — o molde de suppliers (024): a empresa lê; proprietária,
--    coordenadora e cerimonialista escrevem; só proprietária e
--    coordenadora apagam. Assistente lê. Ninguém de fora.
-- ------------------------------------------------------------
alter table public.estoque_categoria enable row level security;
alter table public.estoque_item      enable row level security;
alter table public.estoque_compra    enable row level security;
alter table public.estoque_movimento enable row level security;
alter table public.estoque_reserva   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['estoque_categoria', 'estoque_item', 'estoque_compra', 'estoque_movimento'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format($p$
      create policy %I on public.%I for select using (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
      )$p$, t || '_select', t);
    execute format($p$
      create policy %I on public.%I for insert with check (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc)
            in ('proprietaria', 'coordenadora', 'cerimonialista')
      )$p$, t || '_insert', t);
    execute format($p$
      create policy %I on public.%I for update using (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc)
            in ('proprietaria', 'coordenadora', 'cerimonialista')
      ) with check (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
      )$p$, t || '_update', t);
    execute format($p$
      create policy %I on public.%I for delete using (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
      )$p$, t || '_delete', t);
  end loop;
end $$;

-- a reserva é do evento: quem vê o evento lê, quem edita o evento escreve
drop policy if exists estoque_reserva_select on public.estoque_reserva;
create policy estoque_reserva_select on public.estoque_reserva
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists estoque_reserva_insert on public.estoque_reserva;
create policy estoque_reserva_insert on public.estoque_reserva
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists estoque_reserva_update on public.estoque_reserva;
create policy estoque_reserva_update on public.estoque_reserva
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists estoque_reserva_delete on public.estoque_reserva;
create policy estoque_reserva_delete on public.estoque_reserva
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 4) AS FUNÇÕES
-- ------------------------------------------------------------
-- 4a) As categorias de partida, na primeira abertura. Só para a
--     empresa da sessão; ela renomeia ou apaga depois.
create or replace function public.estoque_semear_categorias()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
begin
  select mc.empresa_id into v_empresa from public.meu_cargo() mc;
  if v_empresa is null then
    return;
  end if;
  if exists (select 1 from public.estoque_categoria c where c.empresa_id = v_empresa) then
    return;
  end if;
  insert into public.estoque_categoria (empresa_id, nome, reutilizavel, ordem)
  values
    (v_empresa, 'Mesas',            true,  10),
    (v_empresa, 'Cadeiras',         true,  20),
    (v_empresa, 'Louça e taças',    true,  30),
    (v_empresa, 'Toalhas e tecidos',true,  40),
    (v_empresa, 'Decoração',        true,  50),
    (v_empresa, 'Bebidas',          false, 60),
    (v_empresa, 'Descartáveis',     false, 70)
  on conflict (empresa_id, nome) do nothing;
end $$;

revoke all on function public.estoque_semear_categorias() from public, anon;
grant execute on function public.estoque_semear_categorias() to authenticated;

-- 4b) O disponível de um item numa data.
--     saldo − o que está fora do depósito (separado e não devolvido)
--           − as reservas abertas que CONCORREM: para o reutilizável,
--             só as de eventos na mesma data; para o consumível, todas.
create or replace function public.estoque_disponivel(p_item uuid, p_data date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with item as (
    select i.id, coalesce(c.reutilizavel, true) as reutilizavel
    from public.estoque_item i
    left join public.estoque_categoria c on c.id = i.categoria_id
    where i.id = p_item
      and i.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  ),
  saldo as (
    select coalesce(sum(case m.tipo when 'entrada' then m.quantidade
                                    when 'ajuste'  then m.quantidade
                                    else -m.quantidade end), 0) as v
    from public.estoque_movimento m where m.item_id = p_item
  ),
  fora as (
    select coalesce(sum(r.quantidade), 0) as v
    from public.estoque_reserva r
    where r.item_id = p_item and r.separado_em is not null and r.fechado_em is null
  ),
  concorrem as (
    select coalesce(sum(r.quantidade), 0) as v
    from public.estoque_reserva r
    join public.events e on e.id = r.event_id
    cross join item
    where r.item_id = p_item
      and r.fechado_em is null
      and r.separado_em is null
      and e.status in ('orcamento', 'confirmado')
      and (not item.reutilizavel or e.date = p_data)
  )
  select case when exists (select 1 from item)
              then (select v from saldo) - (select v from fora) - (select v from concorrem)
              else null end;
$$;

revoke all on function public.estoque_disponivel(uuid, date) from public, anon;
grant execute on function public.estoque_disponivel(uuid, date) to authenticated;

-- 4c) Os saldos da tela inteira, numa consulta só.
create or replace function public.estoque_saldos()
returns table (
  item_id           uuid,
  saldo             numeric,
  entradas          numeric,
  reservado         numeric,
  fora              numeric,
  disponivel_hoje   numeric,
  minimo_efetivo    numeric,
  abaixo_do_minimo  boolean,
  ultimo_custo      numeric,
  reservas_abertas  int
)
language sql
stable
security definer
set search_path = public
as $$
  with mov as (
    select m.item_id,
           coalesce(sum(case m.tipo when 'entrada' then m.quantidade
                                    when 'ajuste'  then m.quantidade
                                    else -m.quantidade end), 0) as saldo,
           coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else 0 end), 0) as entradas
    from public.estoque_movimento m
    where m.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    group by m.item_id
  ),
  res as (
    select r.item_id,
           coalesce(sum(r.quantidade), 0) as reservado,
           coalesce(sum(case when r.separado_em is not null then r.quantidade else 0 end), 0) as fora,
           count(*)::int as abertas
    from public.estoque_reserva r
    join public.events e on e.id = r.event_id
    where r.fechado_em is null
      and e.status in ('orcamento', 'confirmado')
      and r.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    group by r.item_id
  ),
  custo as (
    select distinct on (m.item_id) m.item_id, m.custo_unitario
    from public.estoque_movimento m
    where m.tipo = 'entrada' and m.custo_unitario is not null
      and m.empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    order by m.item_id, m.created_at desc
  )
  select i.id,
         coalesce(mov.saldo, 0),
         coalesce(mov.entradas, 0),
         coalesce(res.reservado, 0),
         coalesce(res.fora, 0),
         public.estoque_disponivel(i.id, (now() at time zone 'America/Sao_Paulo')::date),
         coalesce(i.minimo, round(coalesce(mov.entradas, 0) * 0.2, 2)),
         coalesce(mov.entradas, 0) > 0
           and coalesce(mov.saldo, 0) <= coalesce(i.minimo, round(coalesce(mov.entradas, 0) * 0.2, 2)),
         coalesce(i.custo_unitario, custo.custo_unitario),
         coalesce(res.abertas, 0)
  from public.estoque_item i
  left join mov   on mov.item_id = i.id
  left join res   on res.item_id = i.id
  left join custo on custo.item_id = i.id
  where i.empresa_id = (select mc.empresa_id from public.meu_cargo() mc);
$$;

revoke all on function public.estoque_saldos() from public, anon;
grant execute on function public.estoque_saldos() to authenticated;

-- 4d) Os conflitos de um evento: itens em que o que este evento pede,
--     somado ao que concorre na data, passa do que existe.
create or replace function public.estoque_conflitos(p_event_id uuid)
returns table (
  item_id   uuid,
  item_nome text,
  pedido    numeric,
  saldo     numeric,
  falta     numeric,
  com_quem  text
)
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select e.id, e.date, e.empresa_id from public.events e
    where e.id = p_event_id and public.pode_ver_evento(e.id)
  ),
  minhas as (
    select r.item_id, r.quantidade, i.nome,
           coalesce(c.reutilizavel, true) as reutilizavel
    from public.estoque_reserva r
    join public.estoque_item i on i.id = r.item_id
    left join public.estoque_categoria c on c.id = i.categoria_id
    cross join ev
    where r.event_id = ev.id and r.fechado_em is null
  ),
  saldo as (
    select m.item_id,
           coalesce(sum(case m.tipo when 'entrada' then m.quantidade
                                    when 'ajuste'  then m.quantidade
                                    else -m.quantidade end), 0) as v
    from public.estoque_movimento m
    where m.item_id in (select item_id from minhas)
    group by m.item_id
  ),
  outras as (
    select r.item_id,
           coalesce(sum(r.quantidade), 0) as v,
           string_agg(distinct coalesce(e.name, cl.name, 'outro evento'), ', ') as quem
    from public.estoque_reserva r
    join public.events e on e.id = r.event_id
    left join public.clients cl on cl.id = e.client_id
    join minhas mi on mi.item_id = r.item_id
    cross join ev
    where r.event_id <> ev.id
      and r.fechado_em is null
      and e.status in ('orcamento', 'confirmado')
      and (r.separado_em is not null or not mi.reutilizavel or e.date = ev.date)
    group by r.item_id
  )
  select mi.item_id, mi.nome, mi.quantidade,
         coalesce(s.v, 0),
         (mi.quantidade + coalesce(o.v, 0)) - coalesce(s.v, 0),
         o.quem
  from minhas mi
  left join saldo s on s.item_id = mi.item_id
  left join outras o on o.item_id = mi.item_id
  where (mi.quantidade + coalesce(o.v, 0)) > coalesce(s.v, 0);
$$;

revoke all on function public.estoque_conflitos(uuid) from public, anon;
grant execute on function public.estoque_conflitos(uuid) to authenticated;

-- 4e) Fechar a reserva depois da festa: é o que baixa.
--     Consumível: baixa = consumido (padrão: a quantidade toda; a sobra
--     volta). Reutilizável: perda = perdido (padrão 0; o resto volta
--     sozinho, porque reserva fechada deixa de descontar). Idempotente.
create or replace function public.estoque_fechar_reserva(
  p_reserva   uuid,
  p_devolvido numeric default null,
  p_consumido numeric default null,
  p_perdido   numeric default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  r          public.estoque_reserva%rowtype;
  v_reut     boolean;
  v_consumo  numeric;
  v_perda    numeric;
begin
  select * into r from public.estoque_reserva where id = p_reserva;
  if not found or r.fechado_em is not null then
    return;
  end if;
  if not public.pode_editar_evento(r.event_id) then
    raise exception 'sem permissão para fechar esta reserva';
  end if;

  select coalesce(c.reutilizavel, true) into v_reut
  from public.estoque_item i
  left join public.estoque_categoria c on c.id = i.categoria_id
  where i.id = r.item_id;

  if v_reut then
    v_perda := least(greatest(coalesce(p_perdido, 0), 0), r.quantidade);
    if v_perda > 0 then
      insert into public.estoque_movimento
        (empresa_id, item_id, tipo, quantidade, event_id, reserva_id, motivo, criado_por)
      values (r.empresa_id, r.item_id, 'perda', v_perda, r.event_id, r.id,
              'não voltou do evento', auth.uid());
    end if;
    update public.estoque_reserva
       set fechado_em = now(),
           devolvido  = coalesce(p_devolvido, r.quantidade - v_perda),
           perdido    = v_perda,
           consumido  = null
     where id = r.id;
  else
    v_consumo := least(greatest(coalesce(p_consumido, r.quantidade), 0), r.quantidade);
    if v_consumo > 0 then
      insert into public.estoque_movimento
        (empresa_id, item_id, tipo, quantidade, event_id, reserva_id, motivo, criado_por)
      values (r.empresa_id, r.item_id, 'baixa', v_consumo, r.event_id, r.id,
              'consumido no evento', auth.uid());
    end if;
    update public.estoque_reserva
       set fechado_em = now(),
           consumido  = v_consumo,
           devolvido  = coalesce(p_devolvido, r.quantidade - v_consumo),
           perdido    = null
     where id = r.id;
  end if;
end $$;

revoke all on function public.estoque_fechar_reserva(uuid, numeric, numeric, numeric) from public, anon;
grant execute on function public.estoque_fechar_reserva(uuid, numeric, numeric, numeric) to authenticated;

-- ------------------------------------------------------------
-- 5) A NOTA NO BUCKET — a pasta da empresa, ao lado da pasta do evento
-- ------------------------------------------------------------
create or replace function public.pode_ver_comprovante(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_folder::uuid = (select mc.empresa_id from public.meu_cargo() mc) then
    return true;
  end if;
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
  if p_folder::uuid = (select mc.empresa_id from public.meu_cargo() mc)
     and (select mc.cargo from public.meu_cargo() mc)
         in ('proprietaria', 'coordenadora', 'cerimonialista') then
    return true;
  end if;
  return public.pode_editar_evento(p_folder::uuid);
exception when others then
  return false;
end $$;

-- ------------------------------------------------------------
-- 6) O QUE SE CONTA EM UNIDADES SOBE PARA O INTEIRO
-- ------------------------------------------------------------
-- 2,9 mesas e 1,16 garçons não existem. Peso e volume (kg, litros,
-- metros) continuam com duas casas; o resto arredonda para cima —
-- 4,35 garrafas de espumante são 5 garrafas.
create or replace function public.arredondar_previsto(p_unidade text, p_valor numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_valor is null then null
    when lower(coalesce(p_unidade, '')) in
         ('kg', 'g', 'litros', 'litro', 'l', 'ml', 'metros', 'metro', 'm', 'cm')
      then round(p_valor, 2)
    else ceil(p_valor)
  end;
$$;

-- corpo da 143 verbatim, com o arredondamento no lugar do round(…, 2)
create or replace function public.dimensionar_recursos_evento(
  p_event_id uuid,
  p_forcar   boolean default false
)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pub    int;
  v_origem text;
  v_mesas  int;
  v_n      int := 0;
begin
  if not public.pode_editar_evento(p_event_id) then
    return 0;
  end if;

  select p.quantidade, p.origem into v_pub, v_origem
  from public.publico_do_evento(p_event_id) p;

  select count(*) into v_mesas
  from public.evento_mesa m where m.event_id = p_event_id;

  update public.evento_recurso r
  set previsto = case r.regra
        when 'fixo'       then r.indice
        when 'por_pessoa' then public.arredondar_previsto(r.unidade, r.indice * coalesce(v_pub, 0))
        when 'por_unidade'then public.arredondar_previsto(r.unidade, r.indice * coalesce(v_mesas, 0))
      end,
      base_quantidade = case r.regra
        when 'fixo'        then null
        when 'por_pessoa'  then v_pub
        when 'por_unidade' then v_mesas
      end,
      base_origem = case r.regra
        when 'fixo'        then 'fixo'
        when 'por_pessoa'  then v_origem
        when 'por_unidade' then 'mesas'
      end,
      updated_at = now()
  where r.event_id = p_event_id
    and (p_forcar or r.previsto is null)
    and coalesce(r.base_origem, '') <> 'manual';

  get diagnostics v_n = row_count;

  -- a pendência de defasagem segue o fato: se o recálculo alinhou as
  -- bases com o público de hoje, ela se resolve agora
  if not exists (
    select 1 from public.evento_recurso r
    where r.event_id = p_event_id
      and r.regra = 'por_pessoa'
      and r.base_quantidade is not null
      and r.base_quantidade <> coalesce(v_pub, 0)
  ) then
    update public.financeiro_pendencia
    set status = 'resolvida', resolvida_em = now()
    where event_id = p_event_id
      and tipo = 'revisao'
      and task_id is null and evento_recurso_id is null
      and status = 'aberta';
  end if;

  return v_n;
end $$;

revoke all on function public.dimensionar_recursos_evento(uuid, boolean) from public, anon;
grant execute on function public.dimensionar_recursos_evento(uuid, boolean) to authenticated;

-- os eventos abertos que já foram dimensionados com fração sobem agora;
-- o que já passou fica como aconteceu, e o número dela ('manual') não se toca
update public.evento_recurso r
   set previsto = public.arredondar_previsto(r.unidade, r.previsto)
  from public.events e
 where e.id = r.event_id
   and e.status in ('orcamento', 'confirmado')
   and e.date >= (now() at time zone 'America/Sao_Paulo')::date
   and r.regra <> 'fixo'
   and coalesce(r.base_origem, '') <> 'manual'
   and r.previsto is not null
   and r.previsto <> public.arredondar_previsto(r.unidade, r.previsto);

-- ------------------------------------------------------------
-- 7) O MÉTODO PASSA A DIMENSIONAR MESAS, CADEIRAS, TAÇAS E GARÇONS
-- ------------------------------------------------------------
-- Aditivo, guardado por not-exists (molde da 133): nunca re-roda o
-- seed do método. Mesas e cadeiras entram na decoração; taças e garçons
-- no buffet. Nada disto se compra: mesa e cadeira vêm do estoque (ou do
-- fornecedor), garçom é conferido com o buffet. Os índices são ponto de
-- partida; o histórico dela manda depois.
create or replace function public.semear_recursos_estoque(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_recurso
    (objetivo_id, empresa_id, codigo, nome, unidade, regra, indice, compravel, ordem)
  select o.id, p_empresa_id, v.codigo, v.nome, v.unidade, v.regra, v.indice, false, v.ordem
  from (values
    ('casamento', 'decoracao', 'mesas',    'Mesas',    'mesas',    'por_pessoa', 0.100, 1),
    ('casamento', 'decoracao', 'cadeiras', 'Cadeiras', 'unidades', 'por_pessoa', 1.050, 2),
    ('casamento', 'buffet',    'tacas',    'Taças',    'unidades', 'por_pessoa', 1.500, 80),
    ('casamento', 'buffet',    'garcons',  'Garçons',  'garçons',  'por_pessoa', 0.040, 90),
    ('debutante', 'decoracao', 'mesas',    'Mesas',    'mesas',    'por_pessoa', 0.100, 1),
    ('debutante', 'decoracao', 'cadeiras', 'Cadeiras', 'unidades', 'por_pessoa', 1.050, 2),
    ('debutante', 'buffet',    'tacas',    'Taças',    'unidades', 'por_pessoa', 1.500, 80),
    ('debutante', 'buffet',    'garcons',  'Garçons',  'garçons',  'por_pessoa', 0.040, 90)
  ) as v(tipo, obj, codigo, nome, unidade, regra, indice, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id
   and o.tipo_evento::text = v.tipo
   and o.codigo = v.obj
  where not exists (
    select 1 from public.metodo_recurso mr
    where mr.objetivo_id = o.id and mr.codigo = v.codigo
  );
end $$;

revoke all on function public.semear_recursos_estoque(uuid) from public, anon;

-- empresa nova nasce com eles (corpo da 144 + uma linha)
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
  perform public.semear_metodo_debutante(new.id);
  perform public.semear_metodo_formatura(new.id);
  perform public.semear_metodo_show(new.id);
  perform public.semear_orcamento_show(new.id);
  perform public.semear_metodo_corporativo(new.id);
  perform public.semear_briefing_casal(new.id);
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_checklist_dia_formatura(new.id);
  perform public.semear_checklist_dia_show(new.id);
  perform public.semear_checklist_dia_corporativo(new.id);
  perform public.semear_roteiro_padrao(new.id);
  perform public.semear_roteiro_show(new.id);
  perform public.semear_roteiro_corporativo(new.id);
  perform public.semear_recursos_metodo(new.id);
  perform public.semear_recursos_corporativo(new.id);
  perform public.semear_recursos_estoque(new.id);
  return new;
end $$;

-- as empresas que já existem recebem agora
do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_recursos_estoque(e.id);
  end loop;
end $$;

-- e os eventos abertos ganham as linhas novas, já dimensionadas (molde
-- do bloco 14 da 132: INSERT direto, porque no SQL Editor não há sessão)
insert into public.evento_recurso
  (event_id, empresa_id, evento_objetivo_id, recurso_template_id,
   codigo, nome, unidade, regra, indice, ordem, compravel,
   base_quantidade, base_origem, previsto)
select
  e.id, e.empresa_id, eo.id, mr.id,
  mr.codigo, mr.nome, mr.unidade, mr.regra, mr.indice, mr.ordem, mr.compravel,
  pub.quantidade, pub.origem, public.arredondar_previsto(mr.unidade, mr.indice * pub.quantidade)
from public.events e
join public.evento_objetivo eo on eo.event_id = e.id and eo.ativo
join public.metodo_objetivo mo
  on mo.id = eo.objetivo_template_id and mo.tipo_evento::text = e.type
join public.metodo_recurso mr
  on mr.objetivo_id = mo.id and mr.empresa_id = e.empresa_id
 and mr.codigo in ('mesas', 'cadeiras', 'tacas', 'garcons')
cross join lateral (
  select p.quantidade, p.origem from public.publico_do_evento_interno(e.id) p
) pub
where e.status in ('orcamento', 'confirmado')
  and e.date >= (now() at time zone 'America/Sao_Paulo')::date
  and not exists (
    select 1 from public.evento_recurso x
    where x.event_id = e.id and x.codigo = mr.codigo
  );

-- ------------------------------------------------------------
-- Conferência — tudo true
-- ------------------------------------------------------------
select 'as cinco tabelas existem com RLS ligada' as item,
       (select count(*) = 5 from pg_class c
         where c.oid in (to_regclass('public.estoque_categoria'), to_regclass('public.estoque_item'),
                         to_regclass('public.estoque_compra'), to_regclass('public.estoque_movimento'),
                         to_regclass('public.estoque_reserva'))
           and c.relrowsecurity) as ok
union all
select 'nenhuma policy de anon nas tabelas do estoque',
       not exists (select 1 from pg_policies
                    where schemaname = 'public' and tablename like 'estoque_%'
                      and 'anon' = any(roles))
union all
select 'as cinco funções recusam anon e aceitam authenticated',
       not has_function_privilege('anon', 'public.estoque_saldos()', 'execute')
       and not has_function_privilege('anon', 'public.estoque_disponivel(uuid, date)', 'execute')
       and not has_function_privilege('anon', 'public.estoque_conflitos(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.estoque_fechar_reserva(uuid, numeric, numeric, numeric)', 'execute')
       and not has_function_privilege('anon', 'public.estoque_semear_categorias()', 'execute')
       and has_function_privilege('authenticated', 'public.estoque_saldos()', 'execute')
       and has_function_privilege('authenticated', 'public.estoque_fechar_reserva(uuid, numeric, numeric, numeric)', 'execute')
union all
select 'evento_recurso carrega origem_suprimento e compravel',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_recurso'
           and column_name in ('origem_suprimento', 'compravel'))
union all
select 'a pendência financeira sai cedo fora da compra',
       (select prosrc like '%origem_suprimento is distinct from ''compra''%'
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'trg_recurso_pendencia_financeira')
union all
select 'o disponível desconta só o mesmo dia para o reutilizável',
       (select prosrc like '%not item.reutilizavel or e.date = p_data%'
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'estoque_disponivel')
union all
select 'a nota da empresa entra no bucket pela pasta da empresa',
       (select prosrc like '%mc.empresa_id%'
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'pode_ver_comprovante')
union all
select 'toda empresa com método de casamento tem mesas, cadeiras, taças e garçons',
       not exists (
         select 1 from public.metodo_objetivo o
         where o.tipo_evento::text = 'casamento' and o.codigo = 'decoracao'
           and not exists (select 1 from public.metodo_recurso mr
                            where mr.objetivo_id = o.id and mr.codigo = 'cadeiras'))
union all
select 'o seed não duplica ao rodar de novo',
       not exists (
         select 1 from public.metodo_recurso
         group by objetivo_id, codigo having count(*) > 1)
union all
select 'o previsto contado em unidades sobe para o inteiro; peso e volume não',
       public.arredondar_previsto('mesas', 2.9) = 3
       and public.arredondar_previsto('garçons', 1.16) = 2
       and public.arredondar_previsto('kg', 2.94) = 2.94
       and (select prosrc like '%arredondar_previsto%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento')
union all
select 'a empresa nova nasce com os recursos do estoque',
       (select prosrc like '%semear_recursos_estoque%'
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'trg_semear_metodo_empresa');
