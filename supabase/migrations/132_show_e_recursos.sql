-- ============================================================
-- Vela — Migração 132: eventos de grande porte (show) e os RECURSOS
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Duas coisas numa migração, e elas se explicam juntas.
--
-- 1) O tipo SHOW entra pelo caminho batido (o mesmo da 122 e da 125):
--    domínio, CHECK, método semeado, roteiro por âncora e checklist do
--    dia. Zero arquitetura nova.
--
-- 2) O RECURSO — a parte que não existia. Até aqui o sistema só sabia
--    contar DINHEIRO: previsto → alocado → pago. Nunca soube contar
--    COISA. Quantos doces, quantos salgados, quantas latas, quantas
--    becas. O único par (número + unidade) do sistema inteiro eram os
--    campos de beca da formatura, e a única coisa que o Vela sabia
--    sobre bebida era um campo de texto livre.
--
--    O recurso é o mesmo ciclo do dinheiro, em unidades:
--      previsto → comprado → entrada → sobra   (consumido = entrada−sobra)
--    Com custo unitário, a sobra vira perda em reais. E o consumo real
--    por pessoa deste evento vira a previsão do próximo — estatística
--    simples, mediana, sem modelo nenhum.
--
-- A FRONTEIRA (a regra que impede isto de virar ERP): o recurso nasce e
-- morre dentro de um evento. Só ESTATÍSTICA atravessa. Nada de catálogo
-- de produto, estoque entre eventos, ordem de compra ou nota fiscal.
--
-- Códigos de decisão levam prefixo show_ porque metodo_decisao tem
-- unique (empresa_id, codigo) ATRAVESSANDO tipos (lição da 122 e 125).
-- Objetivo e recurso não precisam: o unique deles já inclui o escopo.

-- ------------------------------------------------------------
-- 1) O TIPO `show`
-- ------------------------------------------------------------
-- O domínio da 057 tem CHECK anônimo criado inline. Derruba qualquer
-- CHECK que exista nele e recria com nome fixo, superconjunto do antigo
-- — assim nenhuma linha existente vira inválida.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_type t on t.oid = con.contypid
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'tipo_evento_catalogo' and n.nspname = 'public'
  loop
    execute format('alter domain public.tipo_evento_catalogo drop constraint %I', c.conname);
  end loop;
end $$;

alter domain public.tipo_evento_catalogo
  add constraint tipo_evento_catalogo_valores
  check (value in (
    'casamento', 'debutante', 'formatura', 'aniversario', 'corporativo',
    'cha_revelacao', 'batizado', 'bodas', 'show', 'outro'
  ));

alter table public.events drop constraint if exists events_type_check;
alter table public.events
  add constraint events_type_check check (type in (
    'casamento', 'debutante', 'formatura', 'aniversario',
    'corporativo', 'cha_revelacao', 'batizado', 'bodas', 'show', 'outro'
  ));

-- ------------------------------------------------------------
-- 2) O RECURSO — template e instância
-- ------------------------------------------------------------
-- Template: pendurado no OBJETIVO (molde de metodo_tarefa, que pendura
-- na decisão). O objetivo é o assunto — "Buffet e bebidas" carrega
-- doces, salgados e bolo; "Bar e consumo" carrega cerveja e gelo.
create table if not exists public.metodo_recurso (
  id          uuid primary key default gen_random_uuid(),
  objetivo_id uuid not null references public.metodo_objetivo (id) on delete cascade,
  empresa_id  uuid not null references public.empresas (id) on delete cascade,

  codigo      text not null,
  nome        text not null,
  -- rótulo da unidade contável: 'unidades', 'latas', 'kg', 'becas'.
  -- Aqui unidade NÃO é decoração como em metodo_campo: ela é parte da
  -- identidade do número (100 o quê?).
  unidade     text not null default 'unidades',

  -- as três formas declarativas. Nada de fórmula livre: fórmula livre é
  -- planilha, e planilha é o que ela já tem e não quer.
  regra       text not null default 'por_pessoa'
              check (regra in ('fixo', 'por_pessoa', 'por_unidade')),
  -- fixo: a quantidade em si (1 gerador). por_pessoa: quanto por
  -- cabeça (8 salgados). por_unidade: quanto por mesa (1 centro).
  indice      numeric(12, 3) not null default 0 check (indice >= 0),

  -- false = não se compra (é serviço, é contagem). Só o comprável
  -- oferece caminho para o financeiro.
  compravel   boolean not null default true,

  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  unique (objetivo_id, codigo)
);

create index if not exists idx_metodo_recurso_empresa
  on public.metodo_recurso (empresa_id, ordem);

comment on table public.metodo_recurso is
  'Playbook do que se conta num evento deste tipo. O conteúdo é do método; o ciclo é genérico.';

-- Instância: o recurso do evento, com o ciclo inteiro.
create table if not exists public.evento_recurso (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id),
  -- null = recurso avulso, criado à mão nesta festa
  evento_objetivo_id  uuid references public.evento_objetivo (id) on delete set null,
  recurso_template_id uuid references public.metodo_recurso (id) on delete set null,

  -- snapshot (mesma doutrina de evento_campo_valor: o template pode
  -- mudar depois, o que aconteceu neste evento não muda)
  codigo      text not null,
  nome        text not null,
  unidade     text not null default 'unidades',
  regra       text not null default 'por_pessoa'
              check (regra in ('fixo', 'por_pessoa', 'por_unidade')),
  indice      numeric(12, 3) not null default 0 check (indice >= 0),

  -- sobre QUANTAS pessoas este número foi dimensionado, e de onde veio
  -- esse público. Fica gravado porque a tela precisa dizer "dimensionado
  -- por 180 confirmados, não pelos 200 estimados".
  base_quantidade int check (base_quantidade is null or base_quantidade >= 0),
  base_origem     text check (base_origem is null
                  or base_origem in ('guests', 'confirmados', 'mesas', 'fixo', 'manual')),

  -- O CICLO. Tudo numeric porque kg e litro não são inteiros.
  previsto    numeric(12, 2) check (previsto  is null or previsto  >= 0),
  comprado    numeric(12, 2) check (comprado  is null or comprado  >= 0),
  entrada     numeric(12, 2) check (entrada   is null or entrada   >= 0),
  sobra       numeric(12, 2) check (sobra     is null or sobra     >= 0),
  -- consumido NÃO é coluna: é entrada − sobra, derivado na leitura.

  custo_unitario numeric(12, 2) check (custo_unitario is null or custo_unitario >= 0),
  -- a ruptura: o dado que o bar sabe e ninguém registra
  acabou_em   time,

  supplier_id uuid references public.suppliers (id) on delete set null,
  observacao  text,
  ordem       int not null default 0,
  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, codigo)
);

create index if not exists idx_evento_recurso_evento
  on public.evento_recurso (event_id, ordem);

comment on column public.evento_recurso.acabou_em is
  'Hora em que acabou. Ruptura: sobra zero não distingue "deu certo" de "faltou".';

drop trigger if exists trg_fill_empresa on public.evento_recurso;
create trigger trg_fill_empresa before insert on public.evento_recurso
  for each row execute function public.fill_empresa_from_event();

drop trigger if exists trg_touch on public.evento_recurso;
create trigger trg_touch before update on public.evento_recurso
  for each row execute function public.set_updated_at();

-- RLS do template: leitura da empresa, escrita só da proprietária (064).
alter table public.metodo_recurso enable row level security;

drop policy if exists metodo_recurso_select on public.metodo_recurso;
create policy metodo_recurso_select on public.metodo_recurso
  for select
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists metodo_recurso_write on public.metodo_recurso;
create policy metodo_recurso_write on public.metodo_recurso
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- RLS da instância: quem enxerga o evento lê; quem edita o evento
-- escreve. NENHUMA policy de portal — quantidade de bebida é operação
-- da produção, não conversa com a cliente. (Molde do croqui, 098.)
alter table public.evento_recurso enable row level security;

drop policy if exists recurso_select on public.evento_recurso;
create policy recurso_select on public.evento_recurso
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists recurso_insert on public.evento_recurso;
create policy recurso_insert on public.evento_recurso
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists recurso_update on public.evento_recurso;
create policy recurso_update on public.evento_recurso
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists recurso_delete on public.evento_recurso;
create policy recurso_delete on public.evento_recurso
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 3) O PÚBLICO CANÔNICO — a precedência, num lugar só
-- ------------------------------------------------------------
-- Medido antes desta migração: existem CINCO contadores de pessoas no
-- sistema (events.guests, orcamentos.numero_convidados,
-- orcamentos.convidados_inclusos, a soma da lista nominal e a soma dos
-- lugares das mesas) e nenhum reconcilia com outro. events.guests em
-- particular não alimentava NENHUM cálculo — era número de vitrine.
--
-- A regra, decidida com o dono: guests é o público esperado e é quem
-- dimensiona; quando existe lista nominal com gente confirmada, ela
-- manda. E a tela DIZ qual das duas foi usada — precedência escondida
-- é pior que precedência errada.
create or replace function public.publico_do_evento(p_event_id uuid)
returns table (quantidade int, origem text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_confirmados int;
  v_guests      int;
begin
  if not public.pode_ver_evento(p_event_id) then
    return;
  end if;

  select coalesce(sum(1 + c.acompanhantes + c.criancas), 0)
    into v_confirmados
  from public.evento_convidado c
  where c.event_id = p_event_id and c.confirmacao = 'confirmado';

  select e.guests into v_guests from public.events e where e.id = p_event_id;

  if coalesce(v_confirmados, 0) > 0 then
    quantidade := v_confirmados;
    origem := 'confirmados';
  else
    quantidade := coalesce(v_guests, 0);
    origem := 'guests';
  end if;
  return next;
end $$;

revoke all on function public.publico_do_evento(uuid) from public, anon;
grant execute on function public.publico_do_evento(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) DIMENSIONAR — a conta, e a regra de quem manda nela
-- ------------------------------------------------------------
-- p_forcar = false (o padrão): só preenche o que está VAZIO. Sugerir é
-- ajudar; sobrescrever o que ela digitou é como software perde a
-- confiança de quem usa. O botão "recalcular" da tela é quem passa true.
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
        when 'por_pessoa' then round(r.indice * coalesce(v_pub, 0), 2)
        when 'por_unidade'then round(r.indice * coalesce(v_mesas, 0), 2)
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
    and (p_forcar or r.previsto is null);

  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.dimensionar_recursos_evento(uuid, boolean) from public, anon;
grant execute on function public.dimensionar_recursos_evento(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 5) INSTANCIAR RECURSOS — e o conserto do enriquecimento
-- ------------------------------------------------------------
-- Função SEPARADA de propósito. instanciar_metodo_evento tem um guard
-- de idempotência no nível do evento inteiro ("já tem 1 objetivo? sai"),
-- o que significa que método enriquecido NUNCA chega a evento que já
-- existe — a 092 precisou de backfill manual por causa disso. Aqui o
-- guard é POR RECURSO (not exists pelo template), então esta função
-- pode rodar em evento novo e em evento vivo, quantas vezes for.
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
  -- sem guard, a funcao concedida a authenticated deixaria qualquer
  -- pessoa semear recurso no evento de outra empresa
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
     codigo, nome, unidade, regra, indice, ordem)
  select p_event_id, v_empresa, eo.id, mr.id,
         mr.codigo, mr.nome, mr.unidade, mr.regra, mr.indice, mr.ordem
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

  -- nasce já dimensionado pelo público que o evento tem hoje
  perform public.dimensionar_recursos_evento(p_event_id, false);
  return v_n;
end $$;

revoke all on function public.instanciar_recursos_evento(uuid) from public, anon;
grant execute on function public.instanciar_recursos_evento(uuid) to authenticated;
grant execute on function public.instanciar_recursos_evento(uuid) to service_role;

-- ------------------------------------------------------------
-- 6) O evento nasce com os recursos junto
-- ------------------------------------------------------------
-- Corpo da 120 verbatim + o quarto passo. O guard de idempotência
-- continua onde estava: quem já tem objetivo não é reinstanciado (isso
-- protege objetivo criado à mão). Os recursos de evento VIVO entram
-- pelo caminho incremental do fim desta migração.
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
  insert into public.evento_campo_valor
    (evento_decisao_id, event_id, empresa_id, campo_template_id,
     codigo, label, tipo, opcoes, unidade, ordem)
  select ed.id, p_event_id, v_empresa, c.id,
         c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem
  from public.metodo_campo c
  join public.evento_decisao ed
    on ed.event_id = p_event_id and ed.decisao_template_id = c.decisao_id;

  -- Aplica deltas de arquétipo e redistribui prazos.
  perform public.aplicar_arquetipos_evento(p_event_id);

  -- E os recursos: o que se conta neste evento, já dimensionado.
  perform public.instanciar_recursos_evento(p_event_id);
end $$;

-- ------------------------------------------------------------
-- 7) O APRENDIZADO — estatística simples, sem modelo nenhum
-- ------------------------------------------------------------
-- Mediana, não média: com 3 a 8 eventos um evento atípico destrói a
-- média. E devolve o `n` junto, porque a tela só sugere com n >= 3 —
-- abaixo disso mostra o histórico bruto e deixa ela decidir.
--
-- Isto é o mesmo padrão de historico_preco_fornecedor (097), que existe
-- no banco desde então e nunca ganhou chamador. Aqui ele ganha tela.
create or replace function public.consumo_do_historico(
  p_codigo      text,
  p_tipo_evento text default null
)
returns table (
  n                  int,
  mediana_por_pessoa numeric,
  ultimo_por_pessoa  numeric,
  ultimo_indice      numeric,
  ultimo_evento      text,
  ultima_data        date
)
language plpgsql
stable
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

  return query
  with base as (
    select
      e.id,
      coalesce(nullif(e.name, ''), c.name, 'Evento') as evento,
      e.date,
      (r.entrada - r.sobra) / nullif(r.base_quantidade, 0) as por_pessoa,
      r.indice
    from public.evento_recurso r
    join public.events e on e.id = r.event_id
    left join public.clients c on c.id = e.client_id
    where r.empresa_id = v_empresa
      and r.codigo = p_codigo
      and r.regra = 'por_pessoa'
      and r.entrada is not null
      and r.sobra is not null
      and coalesce(r.base_quantidade, 0) > 0
      and (p_tipo_evento is null or e.type = p_tipo_evento)
      and e.date <= current_date
  ),
  ultimo as (
    select * from base order by date desc limit 1
  )
  select
    (select count(*)::int from base),
    -- percentile_cont devolve double precision; a assinatura da funcao
    -- e numeric, e RETURN QUERY nao converte sozinho
    (select round(
       (percentile_cont(0.5) within group (order by por_pessoa))::numeric, 3
     ) from base),
    (select round(por_pessoa, 3) from ultimo),
    (select indice from ultimo),
    (select evento from ultimo),
    (select date from ultimo);
end $$;

revoke all on function public.consumo_do_historico(text, text) from public, anon;
grant execute on function public.consumo_do_historico(text, text) to authenticated;

-- ------------------------------------------------------------
-- 8) A PONTE COM O DINHEIRO — a pendência deixa de ser um bilhete
-- ------------------------------------------------------------
-- Medido antes: financeiro_pendencia carregava SÓ o título da tarefa.
-- tasks.valor e tasks.supplier_id existiam na linha e não eram
-- copiados — a cerimonialista redigitava tudo no formulário. Agora a
-- pendência leva o que já se sabe, e pode nascer de um RECURSO comprado
-- (quantidade x custo unitário) em vez de só de uma tarefa concluída.
alter table public.financeiro_pendencia
  add column if not exists evento_recurso_id uuid
    references public.evento_recurso (id) on delete cascade,
  add column if not exists quantidade     numeric(12, 2),
  add column if not exists valor_sugerido numeric(12, 2),
  add column if not exists supplier_id    uuid
    references public.suppliers (id) on delete set null;

-- Um recurso não abre duas pendências ao mesmo tempo.
create unique index if not exists uq_pendencia_recurso
  on public.financeiro_pendencia (evento_recurso_id)
  where evento_recurso_id is not null;

-- O ramo 'revisao' estava MORTO: o ilike procurava 'Confirmar
-- quantidade%', título que a 084 apagou no re-seed. Desde então toda
-- pendência saía como 'pagamento', inclusive a de conferir quantidade.
-- O casamento agora é por 'quantidade' em qualquer posição — que é o
-- que os títulos vigentes (084 e 106) realmente dizem.
create or replace function public.trg_tarefa_pendencia_financeira()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
begin
  if new.vinculo_modulo is distinct from 'financeiro' then
    return new;
  end if;

  if new.status = 'concluido' and coalesce(old.status, '') <> 'concluido' then
    v_tipo := case
      when new.title ilike '%quantidade%' then 'revisao'
      else 'pagamento'
    end;

    insert into public.financeiro_pendencia
      (event_id, task_id, titulo, tipo, valor_sugerido, supplier_id)
    values (new.event_id, new.id, new.title, v_tipo, new.valor, new.supplier_id)
    on conflict (task_id) where task_id is not null do nothing;

  elsif old.status = 'concluido' and new.status <> 'concluido' then
    delete from public.financeiro_pendencia
    where task_id = new.id and status = 'aberta';
  end if;

  return new;
end $$;

-- Comprar um recurso abre a pendência do lançamento. Só quando há os
-- dois números (quanto e por quanto) — sem eles não há nada a lançar.
create or replace function public.trg_recurso_pendencia_financeira()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.comprado is null or new.custo_unitario is null
     or new.comprado <= 0 or new.custo_unitario <= 0 then
    return new;
  end if;

  -- OLD so existe no UPDATE: referenciar fora dele quebra o INSERT
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
-- 9) MÉTODO DE SHOW — semear_metodo_show
-- ------------------------------------------------------------
-- Molde da 125, enxuto: 7 objetivos, sem faixas de verba (o dinheiro é
-- do produtor, não verba administrada de uma cliente) e sem arquétipos.
-- Offsets em dias antes do evento — o ciclo de um show é mais curto e
-- mais duro que o de um casamento: o que atrasa não adia, cancela.
--
-- 'noivos' aqui é o CLIENTE do evento, que num show é o produtor. O
-- valor no banco continua sendo 'noivos' (é regra de acesso do portal,
-- medida antes desta migração); quem traduz para "produtor" é a tela.
create or replace function public.semear_metodo_show(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.metodo_objetivo
    where empresa_id = p_empresa_id and tipo_evento = 'show';

  -- 9.1) OBJETIVOS
  insert into public.metodo_objetivo
    (empresa_id, tipo_evento, codigo, nome, descricao, ordem,
     ativo_padrao, faixa_pct_min, faixa_pct_ideal, faixa_pct_max)
  select p_empresa_id, 'show', v.codigo, v.nome, v.descricao, v.ordem,
         true, null::int, null::int, null::int
  from (values
    ('artista',   'Atração e contratação',
     'Cachê, contrato, rider técnico, hospedagem e passagem de som.', 1),
    ('licencas',  'Licenças e segurança',
     'Alvará, bombeiros, ECAD, ambulância e brigadistas. É o que fecha o evento na porta.', 2),
    ('estrutura', 'Estrutura',
     'Palco, som, luz, painel, gerador, banheiros e fechamento.', 3),
    ('bar',       'Bar e consumo',
     'Bebida, gelo, copos e a equipe do bar — quanto comprar e quanto sobrou.', 4),
    ('portaria',  'Portaria e credenciamento',
     'Pulseiras, cortesias, revista e o fluxo de entrada.', 5),
    ('equipe',    'Equipe de campo',
     'Postos, turnos e comunicação no dia.', 6),
    ('pos_evento','Pós-evento',
     'Devoluções, avarias e prestação de contas.', 7)
  ) as v(codigo, nome, descricao, ordem);

  -- 9.2) DECISÕES (offset em dias antes do evento)
  insert into public.metodo_decisao
    (objetivo_id, empresa_id, codigo, titulo, responsavel,
     offset_ideal_dias, offset_min_dias, offset_max_dias, prioridade, ordem)
  select o.id, p_empresa_id, v.codigo, v.titulo, v.resp,
         v.offi, v.offn, v.offx, v.prio, v.ordem
  from (values
    -- atração
    ('artista',   'show_artista_contratar',    'Contratar a atração principal',              'ambos',          120, 90, 180, 100, 1),
    ('artista',   'show_artista_rider',        'Receber e conferir o rider técnico',         'cerimonialista',  60, 30,  90,  90, 2),
    ('artista',   'show_artista_logistica',    'Definir hospedagem e transporte da equipe',  'cerimonialista',  45, 20,  70,  80, 3),
    ('artista',   'show_abertura_definir',     'Definir as atrações de abertura',            'noivos',          60, 30,  90,  70, 4),
    -- licenças e segurança
    ('licencas',  'show_alvara',               'Dar entrada no alvará do evento',            'cerimonialista',  60, 30,  90,  99, 1),
    ('licencas',  'show_bombeiros',            'Agendar a vistoria dos bombeiros (AVCB)',    'cerimonialista',  45, 25,  75,  98, 2),
    ('licencas',  'show_saude_contratar',      'Contratar ambulância e equipe de APH',       'ambos',           40, 20,  60,  96, 3),
    ('licencas',  'show_seguranca_contratar',  'Contratar segurança e brigadistas',          'ambos',           40, 20,  60,  96, 4),
    ('licencas',  'show_ecad',                 'Recolher o ECAD',                            'cerimonialista',  20,  7,  40,  70, 5),
    ('licencas',  'show_seguro',               'Contratar o seguro do evento',               'noivos',          45, 20,  70,  65, 6),
    -- estrutura
    ('estrutura', 'show_palco_contratar',      'Contratar palco, som e luz',                 'ambos',           90, 60, 120,  97, 1),
    ('estrutura', 'show_energia',              'Definir energia e gerador',                  'cerimonialista',  45, 25,  70,  85, 2),
    ('estrutura', 'show_banheiros_contratar',  'Contratar banheiros químicos',               'ambos',           40, 20,  60,  75, 3),
    ('estrutura', 'show_fechamento',           'Definir fechamento, tendas e barreiras',     'cerimonialista',  35, 15,  60,  72, 4),
    -- bar e consumo
    ('bar',       'show_bar_contratar',        'Contratar o fornecedor de bebidas',          'ambos',           60, 30,  90,  90, 1),
    ('bar',       'show_bar_dimensionar',      'Dimensionar o consumo do bar',               'cerimonialista',  30, 10,  50,  88, 2),
    ('bar',       'show_bar_equipe',           'Definir a equipe e os pontos de bar',        'cerimonialista',  25, 10,  45,  70, 3),
    -- portaria
    ('portaria',  'show_credenciamento',       'Definir pulseiras, cortesias e credenciamento', 'ambos',        30, 14,  50,  75, 1),
    ('portaria',  'show_portaria_fluxo',       'Definir o fluxo de entrada e a revista',     'cerimonialista',  20, 10,  40,  68, 2),
    -- equipe
    ('equipe',    'show_equipe_escala',        'Montar a escala da equipe por posto',        'cerimonialista',  15,  7,  30,  66, 1),
    ('equipe',    'show_comunicacao',          'Definir rádios e canais da equipe',          'cerimonialista',  10,  5,  20,  60, 2),
    -- pós-evento
    ('pos_evento','show_devolucoes',           'Conferir devoluções e avarias',              'cerimonialista',   0,  0,   0,  40, 1),
    ('pos_evento','show_prestacao_contas',     'Fechar a prestação de contas do evento',     'ambos',            0,  0,   0,  40, 2)
  ) as v(obj, codigo, titulo, resp, offi, offn, offx, prio, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id and o.tipo_evento = 'show' and o.codigo = v.obj;

  -- 9.3) CAMPOS TIPADOS
  insert into public.metodo_campo
    (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem,
     ativa_objetivo_codigo, ativa_quando)
  select d.id, p_empresa_id, c.codigo, c.label, c.tipo,
         case when c.opcoes = '' then null else string_to_array(c.opcoes, '|') end,
         nullif(c.unidade, ''), c.ordem, null, null
  from (values
    ('show_artista_contratar',   'artista',           'Atração',                  'fornecedor', '', '', 1),
    ('show_artista_contratar',   'valor_contratado',  'Cachê',                    'moeda',      '', '', 2),
    ('show_artista_contratar',   'contrato',          'Contrato assinado',        'anexo',      '', '', 3),
    ('show_artista_rider',       'rider',             'Rider técnico',            'anexo',      '', '', 1),
    ('show_artista_rider',       'passagem_som',      'Horário da passagem de som','hora',      '', '', 2),
    ('show_artista_logistica',   'hospedagem',        'Hospedagem',               'texto',      '', '', 1),
    ('show_abertura_definir',    'atracoes_abertura', 'Atrações de abertura',     'texto',      '', '', 1),

    ('show_alvara',              'numero_alvara',     'Número do alvará',         'texto',      '', '', 1),
    ('show_alvara',              'alvara_documento',  'Alvará',                   'anexo',      '', '', 2),
    ('show_bombeiros',           'data_vistoria',     'Data da vistoria',         'data',       '', '', 1),
    ('show_bombeiros',           'avcb',              'AVCB emitido',             'sim_nao',    '', '', 2),
    ('show_saude_contratar',     'servico_aph',       'Serviço de APH',           'fornecedor', '', '', 1),
    ('show_saude_contratar',     'valor_contratado',  'Valor',                    'moeda',      '', '', 2),
    ('show_saude_contratar',     'ambulancias',       'Ambulâncias',              'numero',     '', 'ambulâncias', 3),
    ('show_seguranca_contratar', 'seguranca',         'Empresa de segurança',     'fornecedor', '', '', 1),
    ('show_seguranca_contratar', 'valor_contratado',  'Valor',                    'moeda',      '', '', 2),
    ('show_seguranca_contratar', 'brigadistas',       'Brigadistas',              'numero',     '', 'brigadistas', 3),
    ('show_ecad',                'ecad_pago',         'ECAD recolhido',           'sim_nao',    '', '', 1),
    ('show_seguro',              'apolice',           'Apólice',                  'anexo',      '', '', 1),

    ('show_palco_contratar',     'estrutura',         'Fornecedor de estrutura',  'fornecedor', '', '', 1),
    ('show_palco_contratar',     'valor_contratado',  'Valor',                    'moeda',      '', '', 2),
    ('show_palco_contratar',     'palco_medidas',     'Medidas do palco',         'texto',      '', '', 3),
    ('show_energia',             'gerador',           'Terá gerador',             'sim_nao',    '', '', 1),
    ('show_energia',             'potencia',          'Potência necessária',      'numero',     '', 'kVA', 2),
    ('show_banheiros_contratar', 'banheiros',         'Fornecedor',               'fornecedor', '', '', 1),
    ('show_banheiros_contratar', 'valor_contratado',  'Valor',                    'moeda',      '', '', 2),
    ('show_fechamento',          'fechamento_tipo',   'Tipo de fechamento',       'texto',      '', '', 1),

    ('show_bar_contratar',       'bebidas',           'Fornecedor de bebidas',    'fornecedor', '', '', 1),
    ('show_bar_contratar',       'valor_contratado',  'Valor',                    'moeda',      '', '', 2),
    ('show_bar_dimensionar',     'horas_evento',      'Duração prevista',         'numero',     '', 'horas', 1),
    ('show_bar_equipe',          'pontos_bar',        'Pontos de bar',            'numero',     '', 'pontos', 1),
    ('show_bar_equipe',          'bartenders',        'Bartenders',               'numero',     '', 'pessoas', 2),

    ('show_credenciamento',      'cortesias',         'Cortesias',                'numero',     '', 'cortesias', 1),
    ('show_portaria_fluxo',      'portoes',           'Portões de entrada',       'numero',     '', 'portões', 1),
    ('show_portaria_fluxo',      'abertura_portoes',  'Abertura dos portões',     'hora',       '', '', 2),

    ('show_equipe_escala',       'equipe_total',      'Pessoas na equipe',        'numero',     '', 'pessoas', 1),
    ('show_comunicacao',         'canal_radio',       'Canal do rádio',           'texto',      '', '', 1),

    ('show_prestacao_contas',    'observacoes_fecho', 'Observações do fechamento','texto',      '', '', 1)
  ) as c(dec, codigo, label, tipo, opcoes, unidade, ordem)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = c.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'show';

  -- 9.4) TAREFAS — o padrão de contrato + as específicas do show
  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, t.titulo, 'cerimonialista', d.offset_ideal_dias, t.ord, t.vinc
  from public.metodo_decisao d
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'show'
  cross join (values
    ('Solicitar e receber o contrato',               1, null),
    ('Analisar as cláusulas do contrato',            2, null),
    ('Assinar e arquivar o contrato',                3, null),
    ('Registrar o valor no financeiro (1ª parcela)', 4, 'financeiro')
  ) as t(titulo, ord, vinc)
  where d.empresa_id = p_empresa_id
    and d.codigo like '%contratar%';

  insert into public.metodo_tarefa
    (decisao_id, empresa_id, titulo, responsavel, offset_ideal_dias, ordem, vinculo_modulo)
  select d.id, p_empresa_id, v.titulo, v.resp, v.off, v.ord, v.vinc
  from (values
    ('show_alvara',          'Reunir a documentação do alvará',                'cerimonialista', 70, 10, null::text),
    ('show_alvara',          'Protocolar o pedido na prefeitura',              'cerimonialista', 60, 11, null),
    ('show_bombeiros',       'Acompanhar a vistoria no local',                 'cerimonialista', 30, 10, null),
    ('show_artista_rider',   'Repassar o rider ao fornecedor de estrutura',    'cerimonialista', 50, 10, null),
    ('show_bar_dimensionar', 'Fechar a lista de compras do bar',               'cerimonialista', 20, 10, null),
    ('show_bar_dimensionar', 'Registrar a quantidade final no financeiro',     'cerimonialista', 10, 11, 'financeiro'),
    ('show_equipe_escala',   'Imprimir a escala e os postos',                  'cerimonialista',  3, 10, 'execucao'),
    ('show_comunicacao',     'Conferir e distribuir os rádios',                'cerimonialista',  1, 10, 'execucao'),
    ('show_devolucoes',      'Conferir devoluções com os fornecedores',        'cerimonialista',  0, 10, null),
    ('show_prestacao_contas','Conferir sobras e perdas do bar',                'cerimonialista',  0, 10, 'financeiro')
  ) as v(dec, titulo, resp, off, ord, vinc)
  join public.metodo_decisao d
    on d.empresa_id = p_empresa_id and d.codigo = v.dec
  join public.metodo_objetivo o
    on o.id = d.objetivo_id and o.tipo_evento = 'show';
end;
$$;

revoke all on function public.semear_metodo_show(uuid) from public, anon;

-- ------------------------------------------------------------
-- 10) ROTEIRO DO SHOW — âncora: a abertura dos portões
-- ------------------------------------------------------------
-- Função separada (molde do checklist da 125), para não reescrever a
-- semear_roteiro_padrao inteira só para acrescentar um tipo.
create or replace function public.semear_roteiro_show(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_roteiro_item
    (empresa_id, tipo_evento, codigo, titulo, offset_min, duracao_min, condicao, ordem)
  select p_empresa_id, 'show', v.codigo, v.titulo, v.off, v.dur, null::text, v.ordem
  from (values
    ('montagem_estrutura', 'Montagem de palco, som e luz',      -600, 300,  10),
    ('chegada_equipe',     'Chegada da equipe de produção',     -420, null,  20),
    ('montagem_bar',       'Montagem e abastecimento do bar',   -360, 180,  30),
    ('vistoria_seguranca', 'Vistoria de segurança e saídas',    -180,  40,  40),
    ('passagem_som',       'Passagem de som',                   -240,  90,  50),
    ('briefing_equipe',    'Briefing da equipe e postos',        -90,  30,  60),
    ('abertura_portoes',   'Abertura dos portões',                 0,  60,  70),
    ('atracao_abertura',   'Atração de abertura',                 90,  60,  80),
    ('atracao_principal',  'Atração principal',                  180, 120,  90),
    ('encerramento',       'Encerramento e esvaziamento',        330,  60, 100),
    ('desmontagem',        'Desmontagem e devoluções',           420, 240, 110)
  ) as v(codigo, titulo, off, dur, ordem)
  where not exists (
    select 1 from public.metodo_roteiro_item m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'show' and m.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_roteiro_show(uuid) from public, anon;

-- ------------------------------------------------------------
-- 11) CHECKLIST DO DIA — show
-- ------------------------------------------------------------
-- Sem bloco novo: montagem / recepcao / desmontagem já existem (111).
create or replace function public.semear_checklist_dia_show(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_checklist_dia
    (empresa_id, tipo_evento, codigo, bloco, titulo, ordem, requer_objetivo_codigo)
  select p_empresa_id, 'show', v.codigo, v.bloco, v.titulo, v.ordem, v.req
  from (values
    -- montagem
    ('alvara_na_mao',      'montagem',    'Alvará e AVCB impressos e na mão',            10, 'licencas'::text),
    ('saidas_livres',      'montagem',    'Saídas de emergência livres e sinalizadas',   20, 'licencas'),
    ('extintores',         'montagem',    'Extintores no lugar e dentro da validade',    30, 'licencas'),
    ('brigadistas_posto',  'montagem',    'Brigadistas em posto',                        40, 'licencas'),
    ('ambulancia_local',   'montagem',    'Ambulância e equipe de APH no local',         50, 'licencas'),
    ('estrutura_liberada', 'montagem',    'Palco, som e luz liberados pelo técnico',     60, 'estrutura'),
    ('gerador_testado',    'montagem',    'Gerador testado com carga',                   70, 'estrutura'),
    ('banheiros_prontos',  'montagem',    'Banheiros abastecidos e sinalizados',         80, 'estrutura'),
    ('radios_testados',    'montagem',    'Rádios distribuídos e testados',              90, 'equipe'),
    ('bar_abastecido',     'montagem',    'Bar abastecido e gelo posicionado',          100, 'bar'),
    ('contagem_entrada',   'montagem',    'Contagem de entrada da bebida registrada',   110, 'bar'),
    ('caixa_troco',        'montagem',    'Caixa e troco conferidos',                   120, 'bar'),
    ('pulseiras_portaria', 'montagem',    'Pulseiras e cortesias entregues à portaria', 130, 'portaria'),
    -- recepção (o evento acontecendo)
    ('revista_portaria',   'recepcao',    'Revista funcionando no fluxo de entrada',     10, 'portaria'),
    ('camarim_pronto',     'recepcao',    'Camarim montado conforme o rider',            20, 'artista'),
    ('passagem_cumprida',  'recepcao',    'Passagem de som cumprida no horário',         30, 'artista'),
    ('lotacao_monitorada', 'recepcao',    'Lotação monitorada e dentro do limite',       40, 'licencas'),
    ('reposicao_bar',      'recepcao',    'Reposição do bar acompanhada',                50, 'bar'),
    -- desmontagem
    ('contagem_sobra',     'desmontagem', 'Contagem de sobra do bar registrada',         10, 'bar'),
    ('devolucoes',         'desmontagem', 'Itens alugados conferidos para devolução',    20, 'pos_evento'),
    ('avarias',            'desmontagem', 'Ocorrências e avarias registradas',           30, 'pos_evento'),
    ('saida_publico',      'desmontagem', 'Saída do público acompanhada',                40, null)
  ) as v(codigo, bloco, titulo, ordem, req)
  where not exists (
    select 1 from public.metodo_checklist_dia m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'show'
      and m.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_checklist_dia_show(uuid) from public, anon;

-- ------------------------------------------------------------
-- 12) OS RECURSOS DE CADA MÉTODO
-- ------------------------------------------------------------
-- Um seed só para os três tipos que ganham recurso agora. Ao contrário
-- dos seeds de método (que apagam e recriam), este é NÃO destrutivo:
-- guarda por not-exists, então índice ajustado pela proprietária
-- sobrevive a rodar a migração de novo. Os índices abaixo são ponto de
-- partida do mercado — quem manda depois é o histórico dela.
create or replace function public.semear_recursos_metodo(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_recurso
    (objetivo_id, empresa_id, codigo, nome, unidade, regra, indice, compravel, ordem)
  select o.id, p_empresa_id, v.codigo, v.nome, v.unidade, v.regra, v.indice, v.compravel, v.ordem
  from (values
    -- ---------------- CASAMENTO: o buffet ----------------
    ('casamento', 'buffet', 'salgados',      'Salgados',            'unidades', 'por_pessoa',  10.000, true, 10),
    ('casamento', 'buffet', 'agua',          'Água',                'garrafas', 'por_pessoa',   1.000, true, 20),
    ('casamento', 'buffet', 'refrigerante',  'Refrigerante',        'litros',   'por_pessoa',   0.600, true, 30),
    ('casamento', 'buffet', 'cerveja',       'Cerveja',             'latas',    'por_pessoa',   3.000, true, 40),
    ('casamento', 'buffet', 'espumante',     'Espumante do brinde', 'garrafas', 'por_pessoa',   0.150, true, 50),
    ('casamento', 'buffet', 'gelo',          'Gelo',                'kg',       'por_pessoa',   0.500, true, 60),
    ('casamento', 'buffet', 'copos',         'Copos',               'unidades', 'por_pessoa',   2.500, true, 70),
    ('casamento', 'doces',  'doces_finos',   'Doces finos',         'unidades', 'por_pessoa',   6.000, true, 10),
    ('casamento', 'doces',  'bolo',          'Bolo',                'kg',       'por_pessoa',   0.120, true, 20),
    ('casamento', 'doces',  'lembrancinhas', 'Lembrancinhas',       'unidades', 'por_pessoa',   1.000, true, 30),
    ('casamento', 'decoracao', 'centros_mesa','Centros de mesa',    'unidades', 'por_unidade',  1.000, true, 10),
    ('casamento', 'decoracao', 'toalhas',    'Toalhas de mesa',     'unidades', 'por_unidade',  1.000, true, 20),

    -- ---------------- FORMATURA ----------------
    ('formatura', 'becas',  'becas_qtd',     'Becas',               'becas',    'por_pessoa',   1.000, true, 10),
    ('formatura', 'becas',  'canudos_qtd',   'Canudos',             'canudos',  'por_pessoa',   1.000, true, 20),
    ('formatura', 'papeis', 'agua_mesa',     'Água da mesa de honra','garrafas','fixo',        12.000, true, 10),

    -- ---------------- SHOW ----------------
    ('show', 'bar',       'cerveja',      'Cerveja',              'latas',    'por_pessoa',   3.000, true, 10),
    ('show', 'bar',       'agua',         'Água',                 'garrafas', 'por_pessoa',   0.800, true, 20),
    ('show', 'bar',       'refrigerante', 'Refrigerante',         'litros',   'por_pessoa',   0.500, true, 30),
    ('show', 'bar',       'destilado',    'Destilados',           'garrafas', 'por_pessoa',   0.050, true, 40),
    ('show', 'bar',       'energetico',   'Energético',           'latas',    'por_pessoa',   0.300, true, 50),
    ('show', 'bar',       'gelo',         'Gelo',                 'kg',       'por_pessoa',   1.000, true, 60),
    ('show', 'bar',       'copos',        'Copos',                'unidades', 'por_pessoa',   3.000, true, 70),
    ('show', 'portaria',  'pulseiras',    'Pulseiras',            'pulseiras','por_pessoa',   1.100, true, 10),
    ('show', 'estrutura', 'banheiros',    'Cabines de banheiro',  'cabines',  'por_pessoa',   0.010, true, 10),
    ('show', 'equipe',    'radios',       'Rádios',               'rádios',   'fixo',        10.000, true, 10),
    ('show', 'equipe',    'agua_equipe',  'Água da equipe',       'garrafas', 'fixo',        60.000, true, 20)
  ) as v(tipo, obj, codigo, nome, unidade, regra, indice, compravel, ordem)
  join public.metodo_objetivo o
    on o.empresa_id = p_empresa_id
   and o.tipo_evento::text = v.tipo
   and o.codigo = v.obj
  where not exists (
    select 1 from public.metodo_recurso mr
    where mr.objetivo_id = o.id and mr.codigo = v.codigo
  );
end;
$$;

revoke all on function public.semear_recursos_metodo(uuid) from public, anon;

-- ------------------------------------------------------------
-- 13) EMPRESA NOVA + RE-SEED + EVENTOS VIVOS
-- ------------------------------------------------------------
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
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  perform public.semear_checklist_dia_formatura(new.id);
  perform public.semear_checklist_dia_show(new.id);
  perform public.semear_roteiro_padrao(new.id);
  perform public.semear_roteiro_show(new.id);
  -- os recursos vêm por último: dependem dos objetivos já semeados
  perform public.semear_recursos_metodo(new.id);
  return new;
end $$;

do $$
declare e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_metodo_show(e.id);
    perform public.semear_checklist_dia_show(e.id);
    perform public.semear_roteiro_show(e.id);
    perform public.semear_recursos_metodo(e.id);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 14) O ENRIQUECIMENTO DOS EVENTOS QUE JÁ EXISTEM
-- ------------------------------------------------------------
-- Aqui mora o conserto do problema que a 092 sofreu na mão: método
-- enriquecido não alcançava evento vivo, porque instanciar_metodo_evento
-- sai fora quando já existe objetivo. Os recursos não têm esse guard —
-- e este bloco os leva a todo evento aberto de uma vez.
--
-- O INSERT é direto (não passa pelas funções) porque no SQL Editor não
-- há sessão de usuária: pode_editar_evento devolveria false e o bloco
-- seria um no-op silencioso.
insert into public.evento_recurso
  (event_id, empresa_id, evento_objetivo_id, recurso_template_id,
   codigo, nome, unidade, regra, indice, ordem,
   base_quantidade, base_origem, previsto)
select
  e.id, e.empresa_id, eo.id, mr.id,
  mr.codigo, mr.nome, mr.unidade, mr.regra, mr.indice, mr.ordem,
  case mr.regra
    when 'fixo'        then null
    when 'por_pessoa'  then pub.quantidade
    when 'por_unidade' then pub.mesas
  end,
  case mr.regra
    when 'fixo'        then 'fixo'
    when 'por_pessoa'  then pub.origem
    when 'por_unidade' then 'mesas'
  end,
  case mr.regra
    when 'fixo'        then mr.indice
    when 'por_pessoa'  then round(mr.indice * pub.quantidade, 2)
    when 'por_unidade' then round(mr.indice * pub.mesas, 2)
  end
from public.events e
join public.evento_objetivo eo on eo.event_id = e.id and eo.ativo
join public.metodo_objetivo mo
  on mo.id = eo.objetivo_template_id and mo.tipo_evento::text = e.type
join public.metodo_recurso mr
  on mr.objetivo_id = mo.id and mr.empresa_id = e.empresa_id
cross join lateral (
  select
    coalesce(nullif(conf.total, 0), coalesce(e.guests, 0)) as quantidade,
    case when coalesce(conf.total, 0) > 0 then 'confirmados' else 'guests' end as origem,
    (select count(*) from public.evento_mesa m where m.event_id = e.id) as mesas
  from (
    select coalesce(sum(1 + c.acompanhantes + c.criancas), 0)::int as total
    from public.evento_convidado c
    where c.event_id = e.id and c.confirmacao = 'confirmado'
  ) conf
) pub
where e.status in ('orcamento', 'confirmado')
  and not exists (
    select 1 from public.evento_recurso x
    where x.event_id = e.id and x.codigo = mr.codigo
  );

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'dominio tipo_evento_catalogo aceita show' as item,
       exists (
         select 1 from pg_constraint con
         join pg_type t on t.oid = con.contypid
         where t.typname = 'tipo_evento_catalogo'
           and pg_get_constraintdef(con.oid) like '%show%'
       ) as ok
union all
select 'events.type aceita show',
       (select pg_get_constraintdef(oid) like '%show%'
        from pg_constraint
        where conrelid = 'public.events'::regclass and conname = 'events_type_check')
union all
select 'metodo_recurso e evento_recurso existem com RLS',
       (select count(*) = 2 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('metodo_recurso', 'evento_recurso')
          and c.relrowsecurity)
union all
select 'evento_recurso nao tem nenhuma policy para anon',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'evento_recurso'
           and 'anon' = any(roles)
       )
union all
select 'metodo_recurso nao tem nenhuma policy para anon',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'metodo_recurso'
           and 'anon' = any(roles)
       )
union all
select 'toda empresa tem os 7 objetivos de show',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_objetivo o
                where o.empresa_id = em.id and o.tipo_evento = 'show') <> 7
       )
union all
select 'toda empresa tem as 23 decisoes de show',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_decisao d
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where d.empresa_id = em.id and o.tipo_evento = 'show') <> 23
       )
union all
select 'show tem campos tipados e tarefas',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_campo mc
                join public.metodo_decisao d on d.id = mc.decisao_id
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.tipo_evento = 'show' and mc.empresa_id = em.id) = 0
            or (select count(*) from public.metodo_tarefa mt
                join public.metodo_decisao d on d.id = mt.decisao_id
                join public.metodo_objetivo o on o.id = d.objetivo_id
                where o.tipo_evento = 'show' and mt.empresa_id = em.id) = 0
       )
union all
select 'codigo de decisao de show nao colide com outro tipo',
       not exists (
         select 1 from public.metodo_decisao d
         join public.metodo_objetivo o on o.id = d.objetivo_id
         where o.tipo_evento = 'show' and d.codigo not like 'show\_%'
       )
union all
select 'roteiro do show semeado (11 itens por empresa)',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_roteiro_item m
                where m.empresa_id = em.id and m.tipo_evento = 'show') <> 11
       )
union all
select 'checklist do dia do show semeado (22 itens por empresa)',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_checklist_dia m
                where m.empresa_id = em.id and m.tipo_evento = 'show') <> 22
       )
union all
select 'recursos semeados: casamento 12, formatura 3, show 11',
       not exists (
         select 1 from public.empresas em
         where (select count(*) from public.metodo_recurso mr
                join public.metodo_objetivo o on o.id = mr.objetivo_id
                where mr.empresa_id = em.id and o.tipo_evento = 'casamento') <> 12
            or (select count(*) from public.metodo_recurso mr
                join public.metodo_objetivo o on o.id = mr.objetivo_id
                where mr.empresa_id = em.id and o.tipo_evento = 'formatura') <> 3
            or (select count(*) from public.metodo_recurso mr
                join public.metodo_objetivo o on o.id = mr.objetivo_id
                where mr.empresa_id = em.id and o.tipo_evento = 'show') <> 11
       )
union all
select 'as funcoes novas existem UMA vez cada (sem overload)',
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'publico_do_evento') = 1
       and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'consumo_do_historico') = 1
       and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento') = 1
       and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'instanciar_recursos_evento') = 1
       and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'semear_metodo_show') = 1
union all
select 'evento novo passa a nascer com recursos',
       (select prosrc like '%instanciar_recursos_evento%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'instanciar_metodo_evento')
union all
select 'empresa nova nasce com show e com recursos',
       (select prosrc like '%semear_metodo_show%' and prosrc like '%semear_recursos_metodo%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'trg_semear_metodo_empresa')
union all
select 'financeiro_pendencia carrega item, quantidade e valor',
       (select count(*) = 4 from information_schema.columns
        where table_schema = 'public' and table_name = 'financeiro_pendencia'
          and column_name in ('evento_recurso_id', 'quantidade', 'valor_sugerido', 'supplier_id'))
union all
select 'o ramo revisao voltou a ser alcancavel pelos titulos vigentes',
       exists (
         select 1 from public.metodo_tarefa mt
         where mt.vinculo_modulo = 'financeiro' and mt.titulo ilike '%quantidade%'
       )
       and (select prosrc like '%quantidade%'
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'trg_tarefa_pendencia_financeira')
union all
select 'todo evento aberto cujo metodo tem recurso ja recebeu os seus',
       not exists (
         select 1
         from public.events e
         join public.evento_objetivo eo on eo.event_id = e.id and eo.ativo
         join public.metodo_objetivo mo
           on mo.id = eo.objetivo_template_id and mo.tipo_evento::text = e.type
         join public.metodo_recurso mr
           on mr.objetivo_id = mo.id and mr.empresa_id = e.empresa_id
         where e.status in ('orcamento', 'confirmado')
           and not exists (
             select 1 from public.evento_recurso x
             where x.event_id = e.id and x.codigo = mr.codigo
           )
       )
union all
select 'recurso por_pessoa nasceu dimensionado e com a base gravada',
       not exists (
         select 1 from public.evento_recurso r
         where r.regra = 'por_pessoa'
           and (r.base_origem is null or r.base_quantidade is null)
       )
union all
select 'nenhum recurso ficou com previsto negativo ou incoerente',
       not exists (
         select 1 from public.evento_recurso r
         where coalesce(r.previsto, 0) < 0
            or (r.regra = 'fixo' and r.previsto is not null and r.previsto <> r.indice)
       );
