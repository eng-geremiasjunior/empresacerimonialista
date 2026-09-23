-- ============================================================
-- 171 — A EQUIPE DO DIA
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Pedido do dono (23/09/2026). No dia do evento a cerimonialista está
-- andando e falando no rádio, não olhando tela — o Modo Evento serve a
-- quem fica na base. Quem trabalha com EQUIPE (a cliente grande: a Aline
-- Campos tem "reunião e preparação da equipe de cerimonial") precisa que
-- cada pessoa saiba a SUA parte antes de a festa começar: onde fica,
-- que deixa puxa, quem ela avisa.
--
-- O que nasce aqui:
--   * equipe_do_dia — quem trabalha neste evento (nome, telefone, posto).
--     Não exige login: a extra contratada para a noite não tem conta.
--     Quem tem login pode ser ligada pelo membro_id. Cada pessoa tem o
--     seu hash — a credencial do link, igual ao do fornecedor (032).
--   * roteiro_items.equipe_do_dia_id — quem cuida do item.
--   * roteiro_items.deixa — o aviso: quem chama quem, e quando.
--   * roteiro_da_equipe(hash) — o dia inteiro, com as deixas da pessoa
--     marcadas, e a equipe com telefone. Allowlist campo a campo: nada
--     de valor, contato da cliente, alergia ou medicamento.
--   * equipe_marcar_item(hash, item, status, obs) — iniciar e concluir
--     os itens DELA; reportar problema em qualquer item do dia (o
--     problema avisa a cerimonialista pelo sino, gatilho da 032).
--
-- Quem cuida continua também em roteiro_items.responsavel_nome/telefone
-- (a tela grava os dois): o Modo Evento, a folha impressa e o link do
-- fornecedor já mostram "Responsável: Ana" e não precisam mudar.
--
-- A equipe marca pelo mesmo atualizar_status_item da 151, com origem
-- 'cerimonialista' — a equipe É a cerimonial, e a trava de conta
-- congelada vale para ela. Assim o CHECK do log não muda; a descrição
-- da linha é reescrita com o nome da pessoa.

-- ------------------------------------------------------------
-- 1) A equipe
-- ------------------------------------------------------------
create table if not exists public.equipe_do_dia (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete cascade,
  nome        text not null,
  telefone    text,
  -- onde ela fica / o que ela faz ("portaria", "noiva", "cortejo")
  posto       text,
  membro_id   uuid references public.membros_equipe (id) on delete set null,
  hash        text not null unique
              default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  ativo       boolean not null default true,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_equipe_do_dia_event
  on public.equipe_do_dia (event_id, ordem);

drop trigger if exists trg_fill_empresa on public.equipe_do_dia;
create trigger trg_fill_empresa before insert on public.equipe_do_dia
  for each row execute function public.fill_empresa_from_event();

alter table public.equipe_do_dia enable row level security;

drop policy if exists equipe_do_dia_select on public.equipe_do_dia;
create policy equipe_do_dia_select on public.equipe_do_dia
  for select using (public.pode_ver_evento(event_id));
drop policy if exists equipe_do_dia_insert on public.equipe_do_dia;
create policy equipe_do_dia_insert on public.equipe_do_dia
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists equipe_do_dia_update on public.equipe_do_dia;
create policy equipe_do_dia_update on public.equipe_do_dia
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists equipe_do_dia_delete on public.equipe_do_dia;
create policy equipe_do_dia_delete on public.equipe_do_dia
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 2) Quem cuida do item, e a deixa
-- ------------------------------------------------------------
alter table public.roteiro_items
  add column if not exists equipe_do_dia_id uuid
  references public.equipe_do_dia (id) on delete set null;
alter table public.roteiro_items
  add column if not exists deixa text;

-- ------------------------------------------------------------
-- 3) A tela do roteiro lê os dois
-- ------------------------------------------------------------
-- Cópia fiel da 112 com duas chaves a mais no objeto.
create or replace function public.cronograma_evento(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.pode_ver_evento(p_event_id) then '[]'::jsonb
    else coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ri.id,
            'time', ri.time,
            'title', ri.title,
            'description', ri.description,
            'supplier_id', ri.supplier_id,
            'supplier_name', s.name,
            'supplier_categoria', (
              select sc.categoria
              from public.supplier_categorias sc
              where sc.supplier_id = ri.supplier_id
              order by sc.categoria
              limit 1
            ),
            'status_novo', ri.status_novo,
            'horario_real_inicio', ri.horario_real_inicio,
            'horario_real_fim', ri.horario_real_fim,
            'observacao', ri.observacao,
            'responsavel_nome', ri.responsavel_nome,
            'responsavel_telefone', ri.responsavel_telefone,
            'etapa_obrigatoria', coalesce(ri.etapa_obrigatoria, false),
            'duracao_minutos', ri.duracao_minutos,
            'depende_de', ri.depende_de,
            'tipo_dependencia', ri.tipo_dependencia,
            'time_original', ri.time_original,
            'offset_min', ri.offset_min,
            'origem_horario', ri.origem_horario,
            'equipe_do_dia_id', ri.equipe_do_dia_id,
            'deixa', ri.deixa
          )
          order by ri.time nulls last, ri."order"
        )
        from public.roteiro_items ri
        left join public.suppliers s on s.id = ri.supplier_id
        where ri.event_id = p_event_id
      ),
      '[]'::jsonb
    )
  end
$$;

-- ------------------------------------------------------------
-- 4) O link de cada pessoa
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5) A pessoa marca o que é dela
-- ------------------------------------------------------------
create or replace function public.equipe_marcar_item(
  p_hash       text,
  p_item_id    uuid,
  p_status     text,
  p_observacao text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pessoa public.equipe_do_dia%rowtype;
  v_item   public.roteiro_items%rowtype;
  v_r      json;
begin
  select * into v_pessoa
  from public.equipe_do_dia
  where hash = p_hash and ativo;
  if not found then
    return json_build_object('error', 'link inválido');
  end if;

  select * into v_item
  from public.roteiro_items
  where id = p_item_id and event_id = v_pessoa.event_id;
  if not found then
    return json_build_object('error', 'item inválido');
  end if;

  if p_status not in ('em_andamento', 'concluido', 'problema') then
    return json_build_object('error', 'status inválido');
  end if;

  -- iniciar e concluir, só no que é dela; problema, em qualquer item
  if p_status <> 'problema'
     and v_item.equipe_do_dia_id is distinct from v_pessoa.id then
    return json_build_object('error', 'este item é de outra pessoa');
  end if;

  if p_status = 'problema'
     and (p_observacao is null or length(trim(p_observacao)) = 0) then
    return json_build_object('error', 'descreva o problema');
  end if;

  v_r := public.atualizar_status_item(p_item_id, p_status, p_observacao, 'cerimonialista');

  if v_r ->> 'error' is null then
    update public.roteiro_item_log
    set descricao = v_pessoa.nome || ' (equipe) ' ||
                    case p_status
                      when 'em_andamento' then 'iniciou a etapa'
                      when 'concluido'    then 'concluiu a etapa'
                      else 'reportou um problema'
                    end
    where id = (
      select l.id
      from public.roteiro_item_log l
      where l.roteiro_item_id = p_item_id
        and l.origem = 'cerimonialista'
        and l.tipo_evento in ('iniciado', 'concluido', 'problema_reportado')
      order by l.created_at desc
      limit 1
    );
  end if;

  return v_r;
end $$;

revoke all on function public.equipe_marcar_item(text, uuid, text, text) from public;
grant execute on function public.equipe_marcar_item(text, uuid, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6) Conferência: cada linha tem de voltar true
-- ------------------------------------------------------------
select 'tabela equipe_do_dia com RLS' as verificacao,
       coalesce((select relrowsecurity from pg_class
                  where oid = to_regclass('public.equipe_do_dia')), false) as aplicou
union all
select 'roteiro_items tem quem cuida e a deixa',
       (select count(*) = 2 from information_schema.columns
         where table_schema = 'public' and table_name = 'roteiro_items'
           and column_name in ('equipe_do_dia_id', 'deixa'))
union all
select 'a tela do roteiro lê a deixa',
       pg_get_functiondef('public.cronograma_evento(uuid)'::regprocedure) like '%''deixa'', ri.deixa%'
union all
select 'a tela do roteiro ainda devolve a origem do horário',
       pg_get_functiondef('public.cronograma_evento(uuid)'::regprocedure) like '%origem_horario%'
union all
select 'o link da equipe abre sem login',
       has_function_privilege('anon', 'public.roteiro_da_equipe(text)', 'execute')
union all
select 'a equipe marca pelo link',
       has_function_privilege('anon', 'public.equipe_marcar_item(text, uuid, text, text)', 'execute')
union all
select 'hash inválido não devolve nada',
       public.roteiro_da_equipe('nao-existe') is null;
