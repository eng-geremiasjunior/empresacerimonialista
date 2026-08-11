-- 083 — Planejamento com substância (5A): campos tipados + arquétipos + verba
--
-- O erro de fundação corrigido aqui: a decisão era um EVENTO ("aconteceu,
-- marquei") — checklist de perguntas + caixa de texto genérica. Ela passa a
-- ser um FORMULÁRIO ESTRUTURADO: produz valores nomeados e tipados que o
-- resto do sistema consome ("duração: 6h" dimensiona cronograma; "verba
-- total" alimenta o Financeiro; "fornecedor + valor" vira orçamento).
--
-- O guia VIRA os campos (não convive): cada pergunta ("tem gerador?") é um
-- campo com o tipo certo; os campos vazios SÃO o roteiro de conversa.
-- metodo_guia/evento_guia PERMANECEM nesta migração (fonte preservada) —
-- apenas param de ser copiados na instanciação. DROP fica para migração
-- posterior, depois de validar. evento_decisao.resultado idem: fica, sem uso.
--
-- Arquétipos como DELTA que compõe (nunca template por combinação — seria
-- explosão N×M): dois eixos independentes, ESCALA (tradicional/mini/
-- elopement) × CENÁRIO (igreja/salão/praia/campo/destination). Cada escolha
-- aplica sua diferença em 4 dimensões (objetivos on/off, offsets, % de
-- verba, prioridade) sobre a INSTÂNCIA — "mini na praia" = delta mini +
-- delta praia. A compressão 4D lê offset da instância, então herda tudo.
--
-- Três dinheiros (nunca somar entre si na mesma linha):
--   ALOCAÇÃO       = evento_objetivo.valor_previsto (SEM data — é intenção)
--   COMPROMETIMENTO= evento_fornecedor_orcamento.valor_alocado (ao contratar)
--   DESEMBOLSO     = transactions (parcelas, datadas — é o que agrega por mês)
-- Antes do contrato o mês vem do prazo_previsto da decisão; depois, das
-- parcelas. Sem coluna "competência" — seria inventar informação.

-- ============================================================
-- 1) CAMPOS TIPADOS — template (Playbook)
-- ============================================================

create table if not exists public.metodo_campo (
  id          uuid primary key default gen_random_uuid(),
  decisao_id  uuid not null references public.metodo_decisao (id) on delete cascade,
  -- denormalizado para a RLS por empresa não precisar de join (padrão 064).
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  codigo      text not null,
  label       text not null,
  tipo        text not null
              check (tipo in ('texto', 'numero', 'moeda', 'sim_nao',
                              'escolha', 'data', 'anexo', 'fornecedor')),
  -- valores possíveis quando tipo = 'escolha'.
  opcoes      text[],
  -- rótulo da unidade quando fizer sentido ("horas", "pessoas", "%").
  unidade     text,
  ordem       int not null default 0,
  -- Metadados de ativação condicional (engine fica para a 5D; o schema já
  -- nasce pronto para não virar migração): responder este campo com
  -- ativa_quando liga o objetivo ativa_objetivo_codigo.
  -- Ex.: "tem gerador?" = 'nao' → ativa infraestrutura.
  ativa_objetivo_codigo text,
  ativa_quando          text,
  created_at  timestamptz not null default now(),
  unique (decisao_id, codigo)
);

create index if not exists idx_metodo_campo_decisao
  on public.metodo_campo (decisao_id, ordem);

-- ============================================================
-- 2) CAMPOS TIPADOS — instância (o valor vive aqui)
-- ============================================================
-- Snapshot como o resto do modelo: codigo/label/tipo são COPIADOS para a
-- instância (editar o Playbook depois não altera eventos já criados).
--
-- campo_template_id NULLABLE = liberdade (mesmo padrão de
-- decisao_template_id): a cerimonialista cria campo próprio num evento sem
-- tocar no método da empresa.

create table if not exists public.evento_campo_valor (
  id                uuid primary key default gen_random_uuid(),
  evento_decisao_id uuid not null references public.evento_decisao (id) on delete cascade,
  event_id          uuid not null references public.events (id) on delete cascade,
  empresa_id        uuid,
  campo_template_id uuid references public.metodo_campo (id) on delete set null,
  codigo      text not null,
  label       text not null,
  tipo        text not null
              check (tipo in ('texto', 'numero', 'moeda', 'sim_nao',
                              'escolha', 'data', 'anexo', 'fornecedor')),
  opcoes      text[],
  unidade     text,
  ordem       int not null default 0,

  -- Uma coluna por tipo, para o valor ser REAL (numérico soma sem cast —
  -- essencial para a ponte de orçamento). O tipo diz qual é a canônica.
  -- 'anexo' guarda o caminho do Storage em valor_texto (upload fica para a
  -- tela final).
  valor_texto       text,
  valor_numero      numeric(12, 2),
  valor_bool        boolean,
  valor_data        date,
  valor_opcao       text,
  valor_supplier_id uuid references public.suppliers (id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (evento_decisao_id, codigo)
);

create index if not exists idx_evento_campo_decisao
  on public.evento_campo_valor (evento_decisao_id, ordem);
create index if not exists idx_evento_campo_event
  on public.evento_campo_valor (event_id);

drop trigger if exists trg_fill_empresa on public.evento_campo_valor;
create trigger trg_fill_empresa before insert on public.evento_campo_valor
  for each row execute function public.fill_empresa_from_event();

-- ============================================================
-- 3) VERBA E FAIXAS — objetivo é também categoria de orçamento
-- ============================================================

-- Alocação: quanto da verba está reservado para este assunto. SEM data
-- (intenção não tem vencimento — ver cabeçalho). Nunca gera transactions.
alter table public.evento_objetivo
  add column if not exists valor_previsto numeric(12, 2);

-- Faixas de referência de mercado (%), no template E na instância: a
-- instância recebe a cópia na criação e o delta de cenário ajusta por cima
-- (praia: infra 10–15%; salão: ~3%). "Sugerir distribuição" lê a INSTÂNCIA.
alter table public.metodo_objetivo
  add column if not exists faixa_pct_min   int,
  add column if not exists faixa_pct_ideal int,
  add column if not exists faixa_pct_max   int,
  -- objetivos condicionais nascem desligados (ex.: Cerimônia religiosa) e
  -- o arquétipo/campo liga. Os demais nascem ligados.
  add column if not exists ativo_padrao    boolean not null default true;

alter table public.evento_objetivo
  add column if not exists faixa_pct_min   int,
  add column if not exists faixa_pct_ideal int,
  add column if not exists faixa_pct_max   int;

-- Prazo como FAIXA, não ponto (fontes divergem: fotógrafo 6–12m). Permite
-- o Copiloto avisar "prazo apertado para a categoria" em vez de só atrasado.
alter table public.metodo_decisao
  add column if not exists offset_min_dias int,
  add column if not exists offset_max_dias int;

alter table public.evento_decisao
  add column if not exists offset_min_dias int,
  add column if not exists offset_max_dias int;

-- ============================================================
-- 4) ARQUÉTIPOS — delta sobre o método base
-- ============================================================

create table if not exists public.metodo_arquetipo (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo_evento public.tipo_evento_catalogo not null,
  eixo        text not null check (eixo in ('escala', 'cenario')),
  codigo      text not null,
  nome        text not null,
  descricao   text,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  unique (empresa_id, tipo_evento, eixo, codigo)
);

-- O delta em si: operações sobre objetivo/decisão da INSTÂNCIA, casando
-- pelo codigo do template. Composição: base → escala → cenário (o
-- posterior sobrescreve o anterior no mesmo alvo+campo).
create table if not exists public.metodo_arquetipo_delta (
  id           uuid primary key default gen_random_uuid(),
  arquetipo_id uuid not null references public.metodo_arquetipo (id) on delete cascade,
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  alvo_tipo    text not null check (alvo_tipo in ('objetivo', 'decisao')),
  alvo_codigo  text not null,
  operacao     text not null check (operacao in (
    'ativar_objetivo', 'desativar_objetivo',
    'set_offset_ideal', 'set_offset_min', 'set_offset_max',
    'set_faixa_pct_min', 'set_faixa_pct_ideal', 'set_faixa_pct_max',
    'set_prioridade'
  )),
  valor_num    numeric,
  ordem        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_arquetipo_empresa
  on public.metodo_arquetipo (empresa_id, tipo_evento, eixo);
create index if not exists idx_arquetipo_delta
  on public.metodo_arquetipo_delta (arquetipo_id, ordem);

-- A escolha do evento. Produzida pelos campos 'escala'/'cenario' da decisão
-- de estrutura (a action grava aqui, padrão do ehData → events.date).
alter table public.events
  add column if not exists escala  text
    check (escala  in ('tradicional', 'mini_wedding', 'elopement')),
  add column if not exists cenario text
    check (cenario in ('igreja', 'salao_urbano', 'praia',
                       'campo_chacara', 'destination'));

-- ------------------------------------------------------------
-- Aplicação dos deltas (re-chamável quando escala/cenario mudam)
-- ------------------------------------------------------------
-- Clobber-safety:
--   * atributos NUMÉRICOS (faixas, offsets, prioridade) são rebaseados do
--     template e re-derivados — determinístico e idempotente;
--   * `ativo` NUNCA rebaseia: só operações explícitas ativar/desativar
--     mexem (escolha manual dela é preservada ao máximo sem tracking);
--   * valor_previsto e campos preenchidos NUNCA são tocados (dinheiro e
--     respostas são dela). A distribuição desatualizada é DETECTADA na
--     leitura e vira aviso "re-sugerir?" — nunca sobrescrita.
create or replace function public.aplicar_arquetipos_evento(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_tipo    text;
  v_escala  text;
  v_cenario text;
  r         record;
begin
  select empresa_id, type, escala, cenario
    into v_empresa, v_tipo, v_escala, v_cenario
  from public.events where id = p_event_id;

  if v_empresa is null or v_tipo is null then
    return;
  end if;

  -- 1) Rebase numérico do template (só o que é derivado-de-template).
  update public.evento_objetivo eo
  set faixa_pct_min   = mo.faixa_pct_min,
      faixa_pct_ideal = mo.faixa_pct_ideal,
      faixa_pct_max   = mo.faixa_pct_max
  from public.metodo_objetivo mo
  where eo.event_id = p_event_id
    and mo.id = eo.objetivo_template_id;

  -- Decisões: só as pendentes (decidida guarda o que valeu na decisão).
  update public.evento_decisao ed
  set offset_ideal_dias = md.offset_ideal_dias,
      offset_min_dias   = md.offset_min_dias,
      offset_max_dias   = md.offset_max_dias,
      prioridade        = md.prioridade
  from public.metodo_decisao md
  where ed.event_id = p_event_id
    and md.id = ed.decisao_template_id
    and ed.estado = 'pendente';

  -- 2) Deltas: escala primeiro, cenário depois (posterior sobrescreve).
  for r in
    select d.alvo_tipo, d.alvo_codigo, d.operacao, d.valor_num
    from public.metodo_arquetipo a
    join public.metodo_arquetipo_delta d on d.arquetipo_id = a.id
    where a.empresa_id = v_empresa
      and a.tipo_evento::text = v_tipo
      and ((a.eixo = 'escala'  and a.codigo = v_escala)
        or (a.eixo = 'cenario' and a.codigo = v_cenario))
    order by case a.eixo when 'escala' then 1 else 2 end, d.ordem
  loop
    if r.alvo_tipo = 'objetivo' then
      if r.operacao = 'ativar_objetivo' then
        update public.evento_objetivo eo set ativo = true
        from public.metodo_objetivo mo
        where eo.event_id = p_event_id
          and mo.id = eo.objetivo_template_id and mo.codigo = r.alvo_codigo;
      elsif r.operacao = 'desativar_objetivo' then
        update public.evento_objetivo eo set ativo = false
        from public.metodo_objetivo mo
        where eo.event_id = p_event_id
          and mo.id = eo.objetivo_template_id and mo.codigo = r.alvo_codigo;
      elsif r.operacao = 'set_faixa_pct_min' then
        update public.evento_objetivo eo set faixa_pct_min = r.valor_num::int
        from public.metodo_objetivo mo
        where eo.event_id = p_event_id
          and mo.id = eo.objetivo_template_id and mo.codigo = r.alvo_codigo;
      elsif r.operacao = 'set_faixa_pct_ideal' then
        update public.evento_objetivo eo set faixa_pct_ideal = r.valor_num::int
        from public.metodo_objetivo mo
        where eo.event_id = p_event_id
          and mo.id = eo.objetivo_template_id and mo.codigo = r.alvo_codigo;
      elsif r.operacao = 'set_faixa_pct_max' then
        update public.evento_objetivo eo set faixa_pct_max = r.valor_num::int
        from public.metodo_objetivo mo
        where eo.event_id = p_event_id
          and mo.id = eo.objetivo_template_id and mo.codigo = r.alvo_codigo;
      end if;
    else
      -- decisão: offsets/prioridade, só nas pendentes (mesma regra do rebase)
      if r.operacao = 'set_offset_ideal' then
        update public.evento_decisao ed set offset_ideal_dias = r.valor_num::int
        from public.metodo_decisao md
        where ed.event_id = p_event_id and ed.estado = 'pendente'
          and md.id = ed.decisao_template_id and md.codigo = r.alvo_codigo;
      elsif r.operacao = 'set_offset_min' then
        update public.evento_decisao ed set offset_min_dias = r.valor_num::int
        from public.metodo_decisao md
        where ed.event_id = p_event_id and ed.estado = 'pendente'
          and md.id = ed.decisao_template_id and md.codigo = r.alvo_codigo;
      elsif r.operacao = 'set_offset_max' then
        update public.evento_decisao ed set offset_max_dias = r.valor_num::int
        from public.metodo_decisao md
        where ed.event_id = p_event_id and ed.estado = 'pendente'
          and md.id = ed.decisao_template_id and md.codigo = r.alvo_codigo;
      elsif r.operacao = 'set_prioridade' then
        update public.evento_decisao ed set prioridade = r.valor_num::int
        from public.metodo_decisao md
        where ed.event_id = p_event_id and ed.estado = 'pendente'
          and md.id = ed.decisao_template_id and md.codigo = r.alvo_codigo;
      end if;
    end if;
  end loop;

  -- 3) Offsets mudaram → a 4D redistribui os prazos (só pendentes).
  perform public.redistribuir_decisoes_evento(p_event_id);
end $$;

-- Mudou escala/cenário depois de criado → re-aplica.
create or replace function public.trg_aplicar_arquetipos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.escala is distinct from old.escala
     or new.cenario is distinct from old.cenario then
    perform public.aplicar_arquetipos_evento(new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_aplicar_arquetipos on public.events;
create trigger trg_aplicar_arquetipos
  after update of escala, cenario on public.events
  for each row execute function public.trg_aplicar_arquetipos();

-- ============================================================
-- 5) PONTE Objetivo → Financeiro (sem contagem dupla)
-- ============================================================
-- Alocação ≠ Comprometimento — a "economia" (estimado − alocado) depende
-- dos DOIS existirem. valor_alocado passa a ser nullable: a linha pode
-- nascer com o previsto do Planejamento antes de existir contrato.
alter table public.evento_fornecedor_orcamento
  alter column valor_alocado drop not null;

comment on column public.evento_fornecedor_orcamento.valor_alocado is
  'Comprometimento: quanto foi efetivamente negociado. NULL = ainda não '
  'contratado (a linha pode existir só com o previsto do Planejamento).';

-- Quando a decisão com campo fornecedor é decidida: o previsto do objetivo
-- vira valor_estimado_inicial (Alocação) e, SE houver valor_contratado,
-- ele vira valor_alocado (Comprometimento). NUNCA cria transactions —
-- receita/despesa só existe como parcela lançada na Organização (lição da
-- 050→052).
create or replace function public.sincronizar_orcamento_fornecedor(p_evento_decisao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event      uuid;
  v_obj        uuid;
  v_supplier   uuid;
  v_contratado numeric(12, 2);
  v_previsto   numeric(12, 2);
begin
  select event_id, evento_objetivo_id into v_event, v_obj
  from public.evento_decisao where id = p_evento_decisao_id;
  if v_event is null then return; end if;

  -- o gatilho é um campo tipo fornecedor preenchido; sem ele, nada a fazer
  select valor_supplier_id into v_supplier
  from public.evento_campo_valor
  where evento_decisao_id = p_evento_decisao_id
    and tipo = 'fornecedor' and valor_supplier_id is not null
  order by ordem
  limit 1;
  if v_supplier is null then return; end if;

  select valor_numero into v_contratado
  from public.evento_campo_valor
  where evento_decisao_id = p_evento_decisao_id
    and codigo = 'valor_contratado' and valor_numero is not null
  limit 1;

  select valor_previsto into v_previsto
  from public.evento_objetivo where id = v_obj;

  insert into public.evento_fornecedor_orcamento
    (event_id, supplier_id, valor_estimado_inicial, valor_alocado)
  values (v_event, v_supplier, v_previsto, v_contratado)
  on conflict (event_id, supplier_id) do update
    set valor_estimado_inicial = coalesce(excluded.valor_estimado_inicial,
          evento_fornecedor_orcamento.valor_estimado_inicial),
        valor_alocado = coalesce(excluded.valor_alocado,
          evento_fornecedor_orcamento.valor_alocado),
        updated_at = now();
end $$;

-- Hook único de estado (067) ganha a ponte: decidir sincroniza o
-- financeiro; reverter NÃO desfaz (dinheiro não some por reversão — mesma
-- regra das tarefas concluídas).
create or replace function public.trg_decisao_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'decidida' and coalesce(old.estado, '') <> 'decidida' then
    perform public.gerar_tarefas_da_decisao(new.id);
    perform public.sincronizar_orcamento_fornecedor(new.id);
  elsif old.estado = 'decidida' and new.estado <> 'decidida' then
    perform public.remover_tarefas_da_decisao(new.id);
  end if;
  return new;
end $$;

-- (o trigger em si já existe — AFTER UPDATE OF estado — e aponta para esta
-- função; recriar o corpo basta.)

-- ============================================================
-- 6) INSTANCIAÇÃO — copia campos, não copia mais o guia
-- ============================================================
create or replace function public.instanciar_metodo_evento(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_tipo    text;
begin
  select empresa_id, type into v_empresa, v_tipo
  from public.events where id = p_event_id;

  if v_empresa is null or v_tipo is null then
    return;
  end if;

  if exists (select 1 from public.evento_objetivo where event_id = p_event_id) then
    return;
  end if;

  insert into public.evento_objetivo
    (event_id, empresa_id, objetivo_template_id, nome, descricao, ordem,
     ativo, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_event_id, v_empresa, o.id, o.nome, o.descricao, o.ordem,
         o.ativo_padrao, o.faixa_pct_min, o.faixa_pct_ideal, o.faixa_pct_max
  from public.metodo_objetivo o
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  insert into public.evento_decisao
    (evento_objetivo_id, event_id, empresa_id, decisao_template_id,
     titulo, descricao, responsavel, offset_ideal_dias,
     offset_min_dias, offset_max_dias, prioridade, ordem)
  select eo.id, p_event_id, v_empresa, d.id,
         d.titulo, d.descricao, d.responsavel, d.offset_ideal_dias,
         d.offset_min_dias, d.offset_max_dias, d.prioridade, d.ordem
  from public.metodo_decisao d
  join public.metodo_objetivo o on o.id = d.objetivo_id
  join public.evento_objetivo eo
    on eo.event_id = p_event_id and eo.objetivo_template_id = o.id
  where o.empresa_id = v_empresa and o.tipo_evento::text = v_tipo;

  -- Campos tipados nascem vazios: o formulário É o roteiro de conversa.
  -- (evento_guia não é mais copiado — o guia virou os campos.)
  insert into public.evento_campo_valor
    (evento_decisao_id, event_id, empresa_id, campo_template_id,
     codigo, label, tipo, opcoes, unidade, ordem)
  select ed.id, p_event_id, v_empresa, c.id,
         c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem
  from public.metodo_campo c
  join public.evento_decisao ed
    on ed.event_id = p_event_id and ed.decisao_template_id = c.decisao_id;

  -- Aplica deltas de arquétipo (se o evento já nasceu com escala/cenário) e
  -- redistribui prazos (a aplicação chama a 4D no final).
  perform public.aplicar_arquetipos_evento(p_event_id);
end $$;

-- ============================================================
-- 7) RLS
-- ============================================================
-- Template: leitura da empresa, escrita da proprietária (padrão 064).
alter table public.metodo_campo           enable row level security;
alter table public.metodo_arquetipo       enable row level security;
alter table public.metodo_arquetipo_delta enable row level security;

do $$
declare t text;
begin
  foreach t in array array['metodo_campo', 'metodo_arquetipo', 'metodo_arquetipo_delta'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format($f$
      create policy %I_select on public.%I for select
      using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc))
    $f$, t, t);

    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all
      using (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
      )
      with check (
        empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
        and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
      )
    $f$, t, t);
  end loop;
end $$;

-- Instância: por evento (padrão 064).
alter table public.evento_campo_valor enable row level security;

drop policy if exists evento_campo_valor_select on public.evento_campo_valor;
create policy evento_campo_valor_select on public.evento_campo_valor
  for select using (public.pode_ver_evento(event_id));

drop policy if exists evento_campo_valor_insert on public.evento_campo_valor;
create policy evento_campo_valor_insert on public.evento_campo_valor
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists evento_campo_valor_update on public.evento_campo_valor;
create policy evento_campo_valor_update on public.evento_campo_valor
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists evento_campo_valor_delete on public.evento_campo_valor;
create policy evento_campo_valor_delete on public.evento_campo_valor
  for delete using (public.pode_editar_evento(event_id));
