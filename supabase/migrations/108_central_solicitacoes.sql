-- 108 — Central de Solicitações ao Fornecedor (fatia 1)
--
-- O que muda de conceito: o Vela para de tratar "confirmar presença" e
-- "marcar reunião" como dois recursos e passa a tratar os dois como o que
-- eles sempre foram — uma SOLICITAÇÃO ao fornecedor que amadurece numa
-- data, é entregue, cobra sozinha e volta com resposta que muda o estado.
--
-- O motor já existia espalhado: `tasks` carrega a política de disparo
-- (convite_offset_dias, convite_data, prazo_resposta_dias, reenvio_horas,
-- canal_convite), `supplier_confirmations` e `agendamento_convite` são dois
-- registros de despacho com a mesma forma. Aqui eles ganham um lugar só.
--
-- Três tabelas:
--
--   fornecedor_acesso     — a porta permanente do fornecedor. É o PRIMEIRO
--                           hash multi-evento do sistema: todos os outros 8
--                           são por evento. Por isso é o único que nasce com
--                           expiração e revogação de verdade.
--   solicitacao_fornecedor— a pendência: o que se pede, de quem, para quando.
--   batida                — a mensagem agrupada. Uma batida carrega várias
--                           solicitações do MESMO fornecedor, atravessando
--                           eventos. É também a unidade da fila do dia.
--
-- Por que o agrupamento é por fornecedor e não por evento: dentro de um
-- evento as pendências já são naturalmente espaçadas. O volume incômodo
-- aparece quando o mesmo buffet atende três casamentos dela — e aí três
-- mensagens no mesmo dia queimam a paciência de quem a gente precisa que
-- responda.
--
-- Convergente: pode rodar mais de uma vez.
-- Execute no SQL Editor.

begin;

-- ============================================================
-- 1) A PORTA DO FORNECEDOR
-- ============================================================
-- Uma linha por (empresa, fornecedor). O hash é a credencial; a validade
-- é DESLIZANTE — cada batida empurra o prazo para frente. Relação viva,
-- o link funciona para sempre sem ninguém pensar nisso; fornecedor que
-- sumiu, o link morre sozinho. Revogação por inatividade e limpeza pelo
-- mesmo mecanismo.
create table if not exists public.fornecedor_acesso (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  -- mesmo default canônico dos outros links do sistema (019, 041, 069,
  -- 077, 092, 094): 64 hex, nada derivado de dado pessoal
  hash text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  expira_em      timestamptz not null default now() + interval '90 days',
  revogado_em    timestamptz,
  aberturas      int not null default 0,
  ultima_abertura timestamptz,
  created_at     timestamptz not null default now(),
  unique (empresa_id, supplier_id)
);

-- PostgREST manda NULL explícito nas colunas omitidas, e NULL não aciona
-- DEFAULT — a 100 documenta essa armadilha. O trigger garante os defaults
-- mesmo em insert vindo do app.
create or replace function public.trg_fornecedor_acesso_defaults()
returns trigger
language plpgsql
as $$
begin
  new.hash := coalesce(
    nullif(new.hash, ''),
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  );
  new.expira_em := coalesce(new.expira_em, now() + interval '90 days');
  new.aberturas := coalesce(new.aberturas, 0);
  return new;
end $$;

drop trigger if exists trg_fornecedor_acesso_defaults on public.fornecedor_acesso;
create trigger trg_fornecedor_acesso_defaults
  before insert or update on public.fornecedor_acesso
  for each row execute function public.trg_fornecedor_acesso_defaults();

create index if not exists idx_fornecedor_acesso_empresa
  on public.fornecedor_acesso (empresa_id, supplier_id);

alter table public.fornecedor_acesso enable row level security;

drop policy if exists "fornecedor_acesso_equipe" on public.fornecedor_acesso;
create policy "fornecedor_acesso_equipe"
  on public.fornecedor_acesso for all
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

-- ============================================================
-- 2) A SOLICITAÇÃO
-- ============================================================
-- `tipo` começa fechado em dois. A regra que segura o crescimento: só
-- entra tipo cuja resposta tenha DESTINO no dado. Se responder não muda
-- nada no banco, não é automação — é mensageria, e aí é melhor a
-- cerimonialista mandar no toque dela.
create table if not exists public.solicitacao_fornecedor (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  -- de onde nasceu, quando nasceu de uma tarefa do método
  task_id     uuid references public.tasks (id) on delete set null,
  tipo   text not null check (tipo in ('confirmacao', 'contrato')),
  titulo text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'enviada', 'reenviada', 'respondida', 'expirada', 'cancelada')),
  -- quando amadurece (entra na fila) e até quando vale cobrar
  dispara_em date not null default current_date,
  prazo_ate  timestamptz,
  batida_id  uuid,
  enviada_em    timestamptz,
  reenviada_em  timestamptz,
  respondida_em timestamptz,
  -- a resposta estruturada. Para 'confirmacao': o que ele confirmou e o
  -- que corrigiu. Para 'contrato': o caminho do arquivo no Storage.
  resposta jsonb,
  tentativas int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anti-duplicata: uma solicitação viva por (evento, fornecedor, tipo).
-- Molde do uq_convite_ativo da 077 — índice PARCIAL, para não impedir
-- pedir de novo depois que a anterior fechou.
create unique index if not exists uq_solicitacao_viva
  on public.solicitacao_fornecedor (event_id, supplier_id, tipo)
  where status in ('pendente', 'enviada', 'reenviada');

create index if not exists idx_solicitacao_fila
  on public.solicitacao_fornecedor (empresa_id, status, dispara_em);
create index if not exists idx_solicitacao_fornecedor
  on public.solicitacao_fornecedor (supplier_id, status);

alter table public.solicitacao_fornecedor enable row level security;

drop policy if exists "solicitacao_equipe" on public.solicitacao_fornecedor;
create policy "solicitacao_equipe"
  on public.solicitacao_fornecedor for all
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

-- ============================================================
-- 3) A BATIDA NA PORTA
-- ============================================================
-- A mensagem agrupada. Nasce 'na_fila' e a cerimonialista pode segurar
-- antes de sair — nada automático fala em nome dela sem ela poder olhar.
create table if not exists public.batida (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  canal  text not null default 'whatsapp' check (canal in ('whatsapp', 'email')),
  status text not null default 'na_fila'
    check (status in ('na_fila', 'segurada', 'enviada', 'cancelada')),
  programada_para date not null default current_date,
  enviada_em   timestamptz,
  reenviada_em timestamptz,
  segurada_em  timestamptz,
  segurada_por uuid references public.membros_equipe (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_batida_fila
  on public.batida (empresa_id, status, programada_para);

alter table public.batida enable row level security;

drop policy if exists "batida_equipe" on public.batida;
create policy "batida_equipe"
  on public.batida for all
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
  with check (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

-- FK da solicitação para a batida (depois da batida existir)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'solicitacao_batida_fk'
  ) then
    alter table public.solicitacao_fornecedor
      add constraint solicitacao_batida_fk
      foreign key (batida_id) references public.batida (id) on delete set null;
  end if;
end $$;

-- ============================================================
-- 4) LEITURA PÚBLICA (a página do fornecedor)
-- ============================================================
-- plpgsql volatile: conta a abertura ANTES de devolver, molde da 100.
-- Três gates dentro da função, molde do guia_publico (096): existe,
-- não revogado, não expirado. Fora disso devolve null — a página trata.
--
-- Devolve só o que interessa a ele: pendências abertas e o que ele
-- resolveu nos últimos 7 dias (para não parecer que sumiu). Evento
-- concluído não aparece — a limpeza é consequência, não rotina.
create or replace function public.consultar_pendencias_fornecedor(p_hash text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso public.fornecedor_acesso%rowtype;
begin
  select * into v_acesso
  from public.fornecedor_acesso
  where hash = p_hash;

  if not found then return null; end if;
  if v_acesso.revogado_em is not null then return null; end if;
  if v_acesso.expira_em < now() then return null; end if;

  update public.fornecedor_acesso
  set aberturas = aberturas + 1, ultima_abertura = now()
  where id = v_acesso.id;

  return (
    select json_build_object(
      'fornecedor', (
        select json_build_object('nome', s.name)
        from public.suppliers s where s.id = v_acesso.supplier_id
      ),
      'empresa', (
        select json_build_object('nome', e.nome, 'logo_url', e.logo_url)
        from public.empresas e where e.id = v_acesso.empresa_id
      ),
      'pendencias', coalesce((
        select json_agg(
          json_build_object(
            'id', sf.id,
            'tipo', sf.tipo,
            'titulo', sf.titulo,
            'status', sf.status,
            'prazo_ate', sf.prazo_ate,
            'respondida_em', sf.respondida_em,
            'evento', json_build_object(
              'nome', coalesce(ev.name, c.name),
              'data', ev.date,
              'local', ev.location
            )
          ) order by ev.date, sf.created_at
        )
        from public.solicitacao_fornecedor sf
        join public.events ev on ev.id = sf.event_id
        left join public.clients c on c.id = ev.client_id
        where sf.supplier_id = v_acesso.supplier_id
          and sf.empresa_id = v_acesso.empresa_id
          and ev.status <> 'concluido'
          and (
            sf.status in ('enviada', 'reenviada')
            -- Pendente que já venceu também aparece: a página é o lugar
            -- onde está tudo, e a cerimonialista pode ter mandado o link
            -- por fora, sem passar pela fila. O que ainda não venceu fica
            -- de fora — mostrar seria cobrar antes da hora.
            or (
              sf.status = 'pendente'
              and (
                sf.dispara_em is null
                or sf.dispara_em <= (now() at time zone 'America/Sao_Paulo')::date
              )
            )
            or (sf.status = 'respondida' and sf.respondida_em > now() - interval '7 days')
          )
      ), '[]'::json)
    )
  );
end;
$$;

revoke all on function public.consultar_pendencias_fornecedor(text) from public;
grant execute on function public.consultar_pendencias_fornecedor(text) to anon, authenticated;

-- ============================================================
-- 5) ESCRITA PÚBLICA (o fornecedor responde)
-- ============================================================
-- Função separada que REVALIDA a pertinência: a solicitação tem que ser
-- do fornecedor dono do hash. Sem isso, quem tem um hash qualquer
-- responderia pela solicitação de outro. Molde do _item_do_link (032).
create or replace function public.responder_solicitacao(
  p_hash          text,
  p_solicitacao_id uuid,
  p_resposta      jsonb
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso public.fornecedor_acesso%rowtype;
  v_sol    public.solicitacao_fornecedor%rowtype;
  v_sincronizou int := 0;
begin
  select * into v_acesso from public.fornecedor_acesso where hash = p_hash;
  if not found
     or v_acesso.revogado_em is not null
     or v_acesso.expira_em < now() then
    return json_build_object('error', 'link inválido');
  end if;

  select * into v_sol
  from public.solicitacao_fornecedor
  where id = p_solicitacao_id
    and supplier_id = v_acesso.supplier_id
    and empresa_id  = v_acesso.empresa_id
  for update;

  if not found then
    return json_build_object('error', 'solicitação não encontrada');
  end if;
  -- 'pendente' entra aqui porque o fornecedor pode chegar pela página
  -- antes de a fila ter mandado a mensagem. Resposta adiantada é resposta
  -- boa: fecha a pendência e evita a cobrança que sairia amanhã.
  if v_sol.status not in ('pendente', 'enviada', 'reenviada') then
    return json_build_object('error', 'esta solicitação já foi respondida');
  end if;

  update public.solicitacao_fornecedor
  set status = 'respondida',
      respondida_em = now(),
      resposta = p_resposta,
      updated_at = now()
  where id = v_sol.id;

  -- Confirmação também atualiza o registro antigo, que é o que a tela de
  -- fornecedores do evento e a saúde do evento já leem hoje.
  if v_sol.tipo = 'confirmacao' then
    update public.supplier_confirmations
    set status = case
          when coalesce(p_resposta->>'confirmado', 'true') = 'false' then 'recusado'
          else 'confirmado'
        end,
        responded_at = now()
    where event_id = v_sol.event_id and supplier_id = v_sol.supplier_id;
    get diagnostics v_sincronizou = row_count;
  end if;

  -- O registro antigo tem gatilho proprio de notificacao (019). Quando ele
  -- existe, o aviso ja saiu por la; repetir daqui duplicaria na tela dela.
  if v_sincronizou = 0 then
    insert into public.notifications
      (cerimonialista_id, empresa_id, type, title, message, link)
    select ev.cerimonialista_id, v_sol.empresa_id, 'fornecedor',
           s.name || ' respondeu',
           v_sol.titulo,
           '/eventos/' || v_sol.event_id || '/fornecedores'
    from public.events ev
    join public.suppliers s on s.id = v_sol.supplier_id
    where ev.id = v_sol.event_id and ev.cerimonialista_id is not null;
  end if;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.responder_solicitacao(text, uuid, jsonb) from public;
grant execute on function public.responder_solicitacao(text, uuid, jsonb) to anon, authenticated;

commit;

do $$
begin
  raise notice '108 aplicada: fornecedor_acesso, solicitacao_fornecedor e batida criadas.';
end $$;
