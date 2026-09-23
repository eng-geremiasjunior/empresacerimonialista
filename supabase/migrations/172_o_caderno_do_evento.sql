-- ============================================================
-- 172 — O CADERNO DO EVENTO
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Pedido do dono (23/09/2026): "senti falta de algo onde ela mesma possa
-- anotar" — e o dado confirmou: ZERO notas nos 17 eventos de clientes,
-- porque a caixa de notas mora no fim do Resumo, longe de onde ela
-- trabalha. O Caderno é um terceiro modo do Planejamento (ao lado de
-- Foco e Amplo): uma página por mês até a data, com as decisões do mês,
-- as reuniões e as anotações DELA — que não viram tarefa.
--
-- O que muda no banco:
--   1) event_notes (028) ganha onde a nota mora: o mês do caderno, a
--      decisão ou a reunião (compromisso, 069 — "reunião é só um
--      compromisso"). E ganha a política de EDITAR, que não existia.
--   3) o checklist do dia ganha dono na equipe do dia (ver seção 3).
--   2) o conserto da 170: a prévia e o "salvar como meu modelo"
--      comparavam o título da decisão só dentro do MESMO assunto.
--      "Contratar o celebrante", que eventos antigos têm dentro de
--      "Cerimônia religiosa", entrava duplicada no modelo — o assunto
--      "Celebrante" já tem a mesma decisão. Agora compara no tipo
--      inteiro, como a importação do checklist já fazia. Corpo da 170
--      inteiro nas duas funções; só a comparação muda.

-- ------------------------------------------------------------
-- 1) Onde a nota mora
-- ------------------------------------------------------------
alter table public.event_notes
  add column if not exists evento_decisao_id uuid
  references public.evento_decisao (id) on delete set null;
alter table public.event_notes
  add column if not exists compromisso_id uuid
  references public.compromisso (id) on delete set null;
-- o mês do caderno (sempre o dia 1); nulo = o mês em que ela escreveu
alter table public.event_notes add column if not exists mes date;
alter table public.event_notes add column if not exists updated_at timestamptz;

create index if not exists idx_event_notes_decisao
  on public.event_notes (evento_decisao_id) where evento_decisao_id is not null;
create index if not exists idx_event_notes_compromisso
  on public.event_notes (compromisso_id) where compromisso_id is not null;

-- editar a própria nota (ou quem edita o evento)
drop policy if exists "event_notes_update" on public.event_notes;
create policy "event_notes_update" on public.event_notes
  for update using (
    author_id = auth.uid() or public.pode_editar_evento(event_id)
  )
  with check (
    author_id = auth.uid() or public.pode_editar_evento(event_id)
  );

-- ------------------------------------------------------------
-- 2) O modelo compara o título no tipo inteiro
-- ------------------------------------------------------------
create or replace function public.previa_do_modelo(p_event_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_emp  uuid;
  v_tipo text;
begin
  select empresa_id, type into v_emp, v_tipo
  from public.events where id = p_event_id;
  if v_emp is null then
    return null;
  end if;

  return jsonb_build_object(
    'tipo', v_tipo,
    'pode_salvar', exists (
      select 1 from public.meu_cargo() mc
      where mc.empresa_id = v_emp and mc.cargo = 'proprietaria'
    ),
    -- assuntos próprios cujo nome o modelo ainda não tem
    'objetivos', coalesce((
      select jsonb_agg(eo.nome order by eo.ordem)
      from public.evento_objetivo eo
      where eo.event_id = p_event_id
        and eo.objetivo_template_id is null
        and not exists (
          select 1 from public.metodo_objetivo mo
          where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
            and lower(trim(mo.nome)) = lower(trim(eo.nome))
        )
    ), '[]'::jsonb),
    -- decisões próprias cujo título o modelo do tipo ainda não tem, em
    -- NENHUM assunto (172: "Contratar o celebrante" em Cerimônia religiosa
    -- é a mesma decisão do assunto Celebrante)
    'decisoes', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', ed.titulo, 'objetivo', eo.nome)
                       order by eo.ordem, ed.ordem)
      from public.evento_decisao ed
      join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
      where ed.event_id = p_event_id
        and ed.decisao_template_id is null
        and not exists (
          select 1
          from public.metodo_decisao md
          join public.metodo_objetivo mo on mo.id = md.objetivo_id
          where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
            and lower(trim(md.titulo)) = lower(trim(ed.titulo))
        )
    ), '[]'::jsonb),
    -- campos próprios (proprio_*) que a decisão do modelo ainda não tem
    'campos', coalesce((
      select jsonb_agg(jsonb_build_object('label', c.label, 'decisao', ed.titulo)
                       order by ed.ordem, c.ordem)
      from public.evento_campo_valor c
      join public.evento_decisao ed on ed.id = c.evento_decisao_id
      where c.event_id = p_event_id
        and c.campo_template_id is null
        and c.codigo like 'proprio\_%'
        and (ed.decisao_template_id is null
             or not exists (
               select 1 from public.metodo_campo mc
               where mc.decisao_id = ed.decisao_template_id and mc.codigo = c.codigo
             ))
    ), '[]'::jsonb),
    -- decisões do modelo que ela marcou "não se aplica" aqui
    'podem_sair', coalesce((
      select jsonb_agg(jsonb_build_object('id', ed.id, 'titulo', ed.titulo, 'objetivo', eo.nome)
                       order by eo.ordem, ed.ordem)
      from public.evento_decisao ed
      join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
      join public.metodo_decisao md on md.id = ed.decisao_template_id
      where ed.event_id = p_event_id
        and ed.estado = 'nao_se_aplica'
        and not md.fora_do_modelo
    ), '[]'::jsonb),
    -- decisões que estavam fora do modelo e ela usou neste evento
    'voltam', coalesce((
      select jsonb_agg(jsonb_build_object('titulo', ed.titulo, 'objetivo', eo.nome)
                       order by eo.ordem, ed.ordem)
      from public.evento_decisao ed
      join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
      join public.metodo_decisao md on md.id = ed.decisao_template_id
      where ed.event_id = p_event_id
        and ed.estado <> 'nao_se_aplica'
        and md.fora_do_modelo
    ), '[]'::jsonb),
    'ultimo', (
      select jsonb_build_object(
        'salvo_em', s.salvo_em,
        'evento', coalesce(nullif(trim(e.name), ''), cl.name)
      )
      from public.metodo_modelo_salvo s
      left join public.events e on e.id = s.event_id
      left join public.clients cl on cl.id = e.client_id
      where s.empresa_id = v_emp and s.tipo_evento = v_tipo
      order by s.salvo_em desc
      limit 1
    )
  );
end $$;

revoke all on function public.previa_do_modelo(uuid) from public, anon;
grant execute on function public.previa_do_modelo(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2b) Salvar como meu modelo (a mesma da 170, comparando no tipo inteiro)
-- ------------------------------------------------------------
-- SECURITY DEFINER porque escreve no modelo; a trava é a mesma da
-- política de escrita da 064: só a PROPRIETÁRIA da empresa do evento.
-- p_tirar: ids de evento_decisao ("não se aplica" aqui) que também saem
-- do modelo. O que ela reativou neste evento volta sozinho — a prévia
-- mostra isso antes.
create or replace function public.salvar_planejamento_como_modelo(
  p_event_id uuid,
  p_tirar    uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp     uuid;
  v_tipo    text;
  v_data    date;
  v_id      uuid;
  r         record;
  n_obj     int := 0;
  n_dec     int := 0;
  n_campo   int := 0;
  n_sai     int := 0;
  n_volta   int := 0;
begin
  select empresa_id, type, date into v_emp, v_tipo, v_data
  from public.events where id = p_event_id;

  if v_emp is null then
    raise exception 'Evento não encontrado.';
  end if;
  if not exists (
    select 1 from public.meu_cargo() mc
    where mc.empresa_id = v_emp and mc.cargo = 'proprietaria'
  ) then
    raise exception 'Só a proprietária da conta muda o modelo.';
  end if;

  -- 1) assuntos próprios: religa pelo nome ou cria
  for r in
    select eo.id, eo.nome, eo.descricao, eo.ordem
    from public.evento_objetivo eo
    where eo.event_id = p_event_id and eo.objetivo_template_id is null
    order by eo.ordem
  loop
    v_id := null;
    select mo.id into v_id
    from public.metodo_objetivo mo
    where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
      and lower(trim(mo.nome)) = lower(trim(r.nome))
    limit 1;

    if v_id is null then
      begin
        insert into public.metodo_objetivo
          (empresa_id, tipo_evento, codigo, nome, descricao, ordem, proprio)
        values
          (v_emp, v_tipo, 'meu_' || left(md5(r.id::text), 10), r.nome, r.descricao, r.ordem, true)
        on conflict (empresa_id, tipo_evento, codigo) do update
          set nome = excluded.nome, updated_at = now()
        returning id into v_id;
      exception when check_violation then
        raise exception 'Este tipo de evento ainda não tem modelo.';
      end;
      n_obj := n_obj + 1;
    end if;

    if not exists (
      select 1 from public.evento_objetivo x
      where x.event_id = p_event_id and x.objetivo_template_id = v_id
    ) then
      update public.evento_objetivo set objetivo_template_id = v_id where id = r.id;
    end if;
  end loop;

  -- 2) decisões próprias: religa pelo título — no mesmo assunto de
  --    preferência, senão em qualquer assunto do tipo (172) — ou cria.
  --    O prazo só vai se ela tiver um (decisão própria costuma não ter).
  for r in
    select ed.id, ed.titulo, ed.descricao, ed.responsavel, ed.prioridade,
           ed.ordem, ed.prazo_previsto, ed.evento_objetivo_id,
           eo.objetivo_template_id as mo_id
    from public.evento_decisao ed
    join public.evento_objetivo eo on eo.id = ed.evento_objetivo_id
    where ed.event_id = p_event_id
      and ed.decisao_template_id is null
      and eo.objetivo_template_id is not null
    order by eo.ordem, ed.ordem
  loop
    v_id := null;
    select md.id into v_id
    from public.metodo_decisao md
    join public.metodo_objetivo mo on mo.id = md.objetivo_id
    where mo.empresa_id = v_emp and mo.tipo_evento::text = v_tipo
      and lower(trim(md.titulo)) = lower(trim(r.titulo))
    order by (md.objetivo_id = r.mo_id) desc
    limit 1;

    if v_id is null then
      insert into public.metodo_decisao
        (objetivo_id, empresa_id, codigo, titulo, descricao, responsavel,
         offset_ideal_dias, prioridade, ordem, proprio)
      values
        (r.mo_id, v_emp, 'meu_' || left(md5(r.id::text), 10), r.titulo, r.descricao, r.responsavel,
         case when r.prazo_previsto is not null and v_data is not null
              then greatest(v_data - r.prazo_previsto, 0) end,
         r.prioridade, r.ordem, true)
      on conflict (empresa_id, codigo) do update
        set titulo = excluded.titulo, updated_at = now()
      returning id into v_id;
      n_dec := n_dec + 1;
    end if;

    if not exists (
      select 1 from public.evento_decisao x
      where x.evento_objetivo_id = r.evento_objetivo_id and x.decisao_template_id = v_id
    ) then
      update public.evento_decisao set decisao_template_id = v_id where id = r.id;
    end if;
  end loop;

  -- 3) campos próprios (proprio_*): o mesmo código na mesma decisão é o
  --    mesmo campo
  for r in
    select c.id, c.codigo, c.label, c.tipo, c.opcoes, c.unidade, c.ordem,
           ed.decisao_template_id as md_id
    from public.evento_campo_valor c
    join public.evento_decisao ed on ed.id = c.evento_decisao_id
    where c.event_id = p_event_id
      and c.campo_template_id is null
      and c.codigo like 'proprio\_%'
      and ed.decisao_template_id is not null
  loop
    v_id := null;
    select mc.id into v_id
    from public.metodo_campo mc
    where mc.decisao_id = r.md_id and mc.codigo = r.codigo;

    if v_id is null then
      insert into public.metodo_campo
        (decisao_id, empresa_id, codigo, label, tipo, opcoes, unidade, ordem, proprio)
      values
        (r.md_id, v_emp, r.codigo, r.label, r.tipo, r.opcoes, r.unidade, r.ordem, true)
      returning id into v_id;
      n_campo := n_campo + 1;
    end if;

    update public.evento_campo_valor set campo_template_id = v_id where id = r.id;
  end loop;

  -- 4) o que ela tirou do modelo
  update public.metodo_decisao md
  set fora_do_modelo = true, updated_at = now()
  from public.evento_decisao ed
  where ed.id = any (coalesce(p_tirar, '{}'))
    and ed.event_id = p_event_id
    and ed.estado = 'nao_se_aplica'
    and md.id = ed.decisao_template_id
    and md.empresa_id = v_emp
    and not md.fora_do_modelo;
  get diagnostics n_sai = row_count;

  -- 5) o que estava fora e ela usou aqui volta
  update public.metodo_decisao md
  set fora_do_modelo = false, updated_at = now()
  from public.evento_decisao ed
  where ed.event_id = p_event_id
    and ed.estado <> 'nao_se_aplica'
    and md.id = ed.decisao_template_id
    and md.empresa_id = v_emp
    and md.fora_do_modelo;
  get diagnostics n_volta = row_count;

  insert into public.metodo_modelo_salvo (empresa_id, tipo_evento, event_id, salvo_por, resumo)
  values (
    v_emp, v_tipo, p_event_id, auth.uid(),
    jsonb_build_object('objetivos', n_obj, 'decisoes', n_dec, 'campos', n_campo,
                       'sairam', n_sai, 'voltaram', n_volta)
  );

  return jsonb_build_object('objetivos', n_obj, 'decisoes', n_dec, 'campos', n_campo,
                            'sairam', n_sai, 'voltaram', n_volta);
end $$;

revoke all on function public.salvar_planejamento_como_modelo(uuid, uuid[]) from public, anon;
grant execute on function public.salvar_planejamento_como_modelo(uuid, uuid[]) to authenticated;

-- ------------------------------------------------------------
-- 3) O checklist do dia ganha dono na equipe do dia
-- ------------------------------------------------------------
-- Achado do dono no primeiro teste (23/09/2026): o "— quem?" do
-- checklist do dia só oferecia quem tem login, e a escala da pessoa só
-- trazia itens do roteiro — a Júlia, da portaria, abria o link e via
-- "nenhum item". Agora o item do checklist pode ser de alguém da equipe
-- do dia, aparece na escala dela e ela marca como feito pelo celular.
alter table public.evento_checklist_dia
  add column if not exists equipe_do_dia_id uuid
  references public.equipe_do_dia (id) on delete set null;

-- Corpo da 171 inteiro, com a chave 'checklist' a mais.
create or replace function public.roteiro_da_equipe(p_hash text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'evento', jsonb_build_object(
      'nome', coalesce(nullif(trim(e.name), ''), c.name),
      'tipo', e.type,
      'data', e.date,
      'hora', e.time,
      'local', e.location,
      'empresa', emp.nome
    ),
    'pessoa', jsonb_build_object('id', q.id, 'nome', q.nome, 'posto', q.posto),
    'itens', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'time', ri.time,
            'title', ri.title,
            'description', ri.description,
            'status_novo', ri.status_novo,
            'horario_real_inicio', ri.horario_real_inicio,
            'horario_real_fim', ri.horario_real_fim,
            'duracao_minutos', ri.duracao_minutos,
            'origem_horario', ri.origem_horario,
            'fornecedor', s.name,
            'responsavel', ri.responsavel_nome,
            'deixa', ri.deixa,
            'meu', ri.equipe_do_dia_id is not distinct from q.id
          )
          order by ri.time nulls last, ri."order"
        )
        from public.roteiro_items ri
        left join public.suppliers s on s.id = ri.supplier_id
        where ri.event_id = q.event_id
      ),
      '[]'::jsonb
    ),
    -- 172: o checklist do dia também tem dono na equipe
    'checklist', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ck.id,
            'bloco', ck.bloco,
            'titulo', ck.titulo,
            'horario', ck.horario,
            'feito', ck.conferido_em is not null,
            'meu', ck.equipe_do_dia_id is not distinct from q.id
          )
          order by case ck.bloco when 'montagem' then 1 when 'cerimonia' then 2
                                 when 'recepcao' then 3 else 4 end,
                   ck.horario nulls last, ck.ordem
        )
        from public.evento_checklist_dia ck
        where ck.event_id = q.event_id and ck.ativo
      ),
      '[]'::jsonb
    ),
    'equipe', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'nome', o.nome,
            'posto', o.posto,
            'telefone', o.telefone,
            'eu', o.id = q.id
          )
          order by o.ordem, o.created_at
        )
        from public.equipe_do_dia o
        where o.event_id = q.event_id and o.ativo
      ),
      '[]'::jsonb
    )
  )
  from public.equipe_do_dia q
  join public.events e on e.id = q.event_id
  left join public.clients c on c.id = e.client_id
  left join public.empresas emp on emp.id = e.empresa_id
  where q.hash = p_hash and q.ativo
$$;

revoke all on function public.roteiro_da_equipe(text) from public;
grant execute on function public.roteiro_da_equipe(text) to anon, authenticated;

-- A pessoa marca o item do checklist que é dela. Mesma trava da
-- conferir_item_dia (151): conta congelada não altera.
create or replace function public.equipe_conferir_item(
  p_hash     text,
  p_item_id  uuid,
  p_feito    boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pessoa public.equipe_do_dia%rowtype;
  v_item   public.evento_checklist_dia%rowtype;
begin
  select * into v_pessoa from public.equipe_do_dia where hash = p_hash and ativo;
  if not found then
    return json_build_object('error', 'link inválido');
  end if;

  select * into v_item
  from public.evento_checklist_dia
  where id = p_item_id and event_id = v_pessoa.event_id and ativo;
  if not found then
    return json_build_object('error', 'item inválido');
  end if;

  if v_item.equipe_do_dia_id is distinct from v_pessoa.id then
    return json_build_object('error', 'este item é de outra pessoa');
  end if;

  if public.conta_congelada(
       (select e.empresa_id from public.events e where e.id = v_pessoa.event_id)
     ) then
    return json_build_object('error', 'conta somente leitura');
  end if;

  update public.evento_checklist_dia
  set conferido_em = case when p_feito then now() end,
      conferido_por = null,
      updated_at = now()
  where id = p_item_id;

  return json_build_object('success', true);
end $$;

revoke all on function public.equipe_conferir_item(text, uuid, boolean) from public;
grant execute on function public.equipe_conferir_item(text, uuid, boolean) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) Conferência: cada linha tem de voltar true
-- ------------------------------------------------------------
select 'a nota sabe o mês, a decisão e a reunião' as verificacao,
       (select count(*) = 3 from information_schema.columns
         where table_schema = 'public' and table_name = 'event_notes'
           and column_name in ('evento_decisao_id', 'compromisso_id', 'mes')) as aplicou
union all
select 'a nota pode ser editada',
       exists (select 1 from pg_policies
                where schemaname = 'public' and tablename = 'event_notes'
                  and policyname = 'event_notes_update')
union all
select 'a prévia compara o título no tipo inteiro',
       pg_get_functiondef('public.previa_do_modelo(uuid)'::regprocedure)
         not like '%mo.id = eo.objetivo_template_id%'
union all
select 'o salvar religa pelo título no tipo inteiro',
       pg_get_functiondef('public.salvar_planejamento_como_modelo(uuid, uuid[])'::regprocedure)
         like '%order by (md.objetivo_id = r.mo_id) desc%'
union all
select 'anônimo continua sem salvar modelo',
       not has_function_privilege('anon', 'public.salvar_planejamento_como_modelo(uuid, uuid[])', 'execute')
union all
select 'o checklist do dia aceita alguém da equipe',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'evento_checklist_dia'
                  and column_name = 'equipe_do_dia_id')
union all
select 'a escala traz o checklist da pessoa',
       pg_get_functiondef('public.roteiro_da_equipe(text)'::regprocedure) like '%''checklist''%'
union all
select 'a pessoa marca o checklist pelo link',
       has_function_privilege('anon', 'public.equipe_conferir_item(text, uuid, boolean)', 'execute');
