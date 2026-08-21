-- ============================================================
-- Vela — Migração 111: Checklist do dia do evento
-- ============================================================
-- A Execução não tem entrada de dados própria: ela projeta o que o
-- Planejamento decidiu e a Organização montou. O dia da cerimonialista
-- tem três documentos; o sistema tinha um. O roteiro é o documento
-- PÚBLICO do dia (fornecedor e noivos enxergam). Este é o segundo: a
-- operação interna dela — conferir o microfone do celebrante, a água dos
-- músicos, a chave do carro dos noivos.
--
-- Por isso ele é OUTRO OBJETO, em tabelas próprias, e não uma variação
-- de roteiro_items nem de tasks:
--   · roteiro_items alimenta roteiro_publico(text), que anon lê por hash
--     de fornecedor — um item de checklist ali dependeria de disciplina
--     de allowlist para não vazar;
--   · tasks.title já sai para anon via consultar_convite, a category tem
--     CHECK fixo, e a 076 firmou "tarefa sem decisão de origem é lixo".
-- Tabela própria SEM policy de portal e SEM RPC anon herda a garantia
-- estrutural: não há caminho público até ela. Manter assim.
--
-- O par template/instância copia o Método (064): metodo_* é o Playbook
-- da empresa, evento_* é snapshot por evento; `codigo` é a chave natural
-- do seed (título muda, código não).
--
-- Ordenação: bloco do dia (montagem → cerimônia → recepção →
-- desmontagem), nunca prazo/prioridade — no dia tudo vence hoje; o que
-- ordena é o momento. Horário por item é opcional.
--
-- Convergente: pode rodar quantas vezes for preciso.

begin;

-- ------------------------------------------------------------
-- 1) TEMPLATE — o Playbook do dia, por empresa e tipo de evento
-- ------------------------------------------------------------
create table if not exists public.metodo_checklist_dia (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  tipo_evento public.tipo_evento_catalogo not null,
  codigo      text not null,
  bloco       text not null
              check (bloco in ('montagem', 'cerimonia', 'recepcao', 'desmontagem')),
  titulo      text not null,
  ordem       int  not null default 0,
  -- O item só nasce no evento se o objetivo com este codigo estiver
  -- ativo lá (molde da 106: pendurar por codigo faz a condicionalidade
  -- vir de graça). null = nasce sempre. Ex.: itens de igreja levam
  -- 'cerimonia', que o cenário igreja liga.
  requer_objetivo_codigo text,
  created_at  timestamptz not null default now(),
  unique (empresa_id, tipo_evento, codigo)
);

alter table public.metodo_checklist_dia enable row level security;

-- Leitura da empresa toda, escrita só da proprietária (padrão 064).
drop policy if exists metodo_checklist_dia_select on public.metodo_checklist_dia;
create policy metodo_checklist_dia_select on public.metodo_checklist_dia
  for select
  using (empresa_id = (select mc.empresa_id from public.meu_cargo() mc));

drop policy if exists metodo_checklist_dia_write on public.metodo_checklist_dia;
create policy metodo_checklist_dia_write on public.metodo_checklist_dia
  for all
  using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) = 'proprietaria'
  );

-- ------------------------------------------------------------
-- 2) INSTÂNCIA — o checklist de UM evento
-- ------------------------------------------------------------
create table if not exists public.evento_checklist_dia (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  empresa_id  uuid,
  template_id uuid references public.metodo_checklist_dia (id) on delete set null,
  bloco       text not null
              check (bloco in ('montagem', 'cerimonia', 'recepcao', 'desmontagem')),
  titulo      text not null,
  ordem       int  not null default 0,
  horario     time,
  responsavel_membro_id uuid references public.membros_equipe (id) on delete set null,
  -- "não se aplica" é estado, nunca delete de item de template: o delete
  -- seria desfeito pela próxima semeadura lazy. Avulso (template_id null)
  -- pode ser deletado de verdade.
  ativo       boolean not null default true,
  conferido_em  timestamptz,
  conferido_por uuid references public.membros_equipe (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- idempotência da semeadura; nulls distintos = avulsos ilimitados
  unique (event_id, template_id)
);

create index if not exists idx_evento_checklist_dia_event
  on public.evento_checklist_dia (event_id, bloco, ordem);

drop trigger if exists trg_fill_empresa on public.evento_checklist_dia;
create trigger trg_fill_empresa before insert on public.evento_checklist_dia
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_checklist_dia enable row level security;

-- Quem participa do evento VÊ (a assistente escalada precisa da lista).
-- Escrita estrutural (editar, esconder, responsável, avulso) fica com
-- quem pode editar o evento. Conferir/desconferir é pela RPC abaixo,
-- que aceita participante — riscar item no meio da festa é trabalho de
-- assistente, não de coordenadora.
drop policy if exists evento_checklist_dia_select on public.evento_checklist_dia;
create policy evento_checklist_dia_select on public.evento_checklist_dia
  for select using (public.pode_ver_evento(event_id));

drop policy if exists evento_checklist_dia_insert on public.evento_checklist_dia;
create policy evento_checklist_dia_insert on public.evento_checklist_dia
  for insert with check (public.pode_editar_evento(event_id));

drop policy if exists evento_checklist_dia_update on public.evento_checklist_dia;
create policy evento_checklist_dia_update on public.evento_checklist_dia
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

drop policy if exists evento_checklist_dia_delete on public.evento_checklist_dia;
create policy evento_checklist_dia_delete on public.evento_checklist_dia
  for delete using (public.pode_editar_evento(event_id));

-- FRONTEIRA (deliberada): nenhuma policy para anon, nenhuma policy de
-- portal, nenhuma RPC pública toca estas tabelas. O checklist é operação
-- interna — se um dia alguém propuser expô-lo, a resposta é não.

-- ------------------------------------------------------------
-- 3) Semeadura lazy, convergente POR ITEM
-- ------------------------------------------------------------
-- Chamada quando a tela do checklist abre (ajuste ou Modo Evento). Não
-- há trigger na criação do evento de propósito: as decisões ainda não
-- existem nesse momento, e o conjunto certo de itens depende delas.
-- Por item (e não com guard "já semeado?" tudo-ou-nada): um objetivo que
-- ligar DEPOIS — cenário igreja escolhido na semana seguinte — faz os
-- itens condicionais entrarem na próxima abertura, sem apagar nada.
create or replace function public.semear_checklist_dia(p_event_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.pode_ver_evento(p_event_id) then
    return;
  end if;

  insert into public.evento_checklist_dia
    (event_id, template_id, bloco, titulo, ordem)
  select p_event_id, t.id, t.bloco, t.titulo, t.ordem
  from public.metodo_checklist_dia t
  join public.events e on e.id = p_event_id
  where t.empresa_id = e.empresa_id
    and t.tipo_evento::text = e.type
    and (
      t.requer_objetivo_codigo is null
      or exists (
        select 1
        from public.evento_objetivo eo
        join public.metodo_objetivo mo on mo.id = eo.objetivo_template_id
        where eo.event_id = p_event_id
          and mo.codigo = t.requer_objetivo_codigo
          and eo.ativo
      )
    )
    and not exists (
      select 1 from public.evento_checklist_dia x
      where x.event_id = p_event_id and x.template_id = t.id
    );
end;
$$;

-- from public E anon: os default privileges do Supabase concedem execute
-- a anon na criação, e revogar só de public não desfaz essa concessão.
revoke all on function public.semear_checklist_dia(uuid) from public, anon;
grant execute on function public.semear_checklist_dia(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) Conferir — com autoria resolvida no servidor
-- ------------------------------------------------------------
-- Um toque risca, outro desfaz. Quem marcou e quando ficam gravados:
-- com três assistentes trabalhando, "quem conferiu o som?" é pergunta
-- real no meio da festa. O gate é pode_VER de propósito (a assistente
-- escalada risca); a RPC é o único caminho de escrita dela.
create or replace function public.conferir_item_dia(p_item_id uuid, p_conferido boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_event  uuid;
  v_membro uuid;
begin
  select event_id into v_event
  from public.evento_checklist_dia where id = p_item_id;

  if v_event is null or not public.pode_ver_evento(v_event) then
    return;
  end if;

  select mc.membro_equipe_id into v_membro from public.meu_cargo() mc;

  update public.evento_checklist_dia
  set conferido_em  = case when p_conferido then now() end,
      conferido_por = case when p_conferido then v_membro end,
      updated_at    = now()
  where id = p_item_id;
end;
$$;

revoke all on function public.conferir_item_dia(uuid, boolean) from public, anon;
grant execute on function public.conferir_item_dia(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 5) SEED — casamento (ponto de partida digno; a proprietária ajusta)
-- ------------------------------------------------------------
create or replace function public.semear_checklist_dia_casamento(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_checklist_dia
    (empresa_id, tipo_evento, codigo, bloco, titulo, ordem, requer_objetivo_codigo)
  select p_empresa_id, 'casamento', v.codigo, v.bloco, v.titulo, v.ordem, v.req
  from (values
    -- montagem
    ('reuniao_equipe',       'montagem',    'Reunião com a equipe do dia (postos e horários)',        10, null),
    ('contratos_equipe',     'montagem',    'Contratos assinados da equipe conferidos',               20, null),
    ('orientar_fornecedores','montagem',    'Orientar fornecedores na montagem',                      30, null),
    ('conferir_decoracao',   'montagem',    'Decoração conferida com o projeto aprovado',             40, null),
    ('som_luz_festa',        'montagem',    'Som e iluminação da festa testados',                     50, null),
    ('conferir_mapa_mesas',  'montagem',    'Montagem do salão conferida com o mapa de mesas',        60, null),
    ('bem_casados',          'montagem',    'Bem-casados e lembrancinhas recebidos',                  70, null),
    ('itens_noivos',         'montagem',    'Itens dos noivos recebidos (alianças, troca, documentos)', 80, null),
    -- cerimônia
    ('conferencia_igreja',   'cerimonia',   'Conferência da igreja (som, tomadas, climatização)',     10, 'cerimonia'),
    ('decoracao_igreja',     'cerimonia',   'Decoração da igreja conferida',                          20, 'cerimonia'),
    ('cadeiras_cortejo',     'cerimonia',   'Cadeiras do cortejo posicionadas',                       30, null),
    ('som_cerimonia',        'cerimonia',   'Som da cerimônia e microfone do celebrante testados',    40, null),
    ('roteiro_celebrante',   'cerimonia',   'Roteiro repassado com o celebrante',                     50, null),
    ('musicas_cerimonia',    'cerimonia',   'Músicas conferidas com os músicos',                      60, null),
    ('agua_musicos',         'cerimonia',   'Água para músicos e celebrante',                         70, null),
    ('lapelas',              'cerimonia',   'Lapelas do noivo, pais e padrinhos',                     80, null),
    ('lagrimas_alegria',     'cerimonia',   'Lágrimas de alegria distribuídas',                       90, null),
    ('buque_noiva',          'cerimonia',   'Buquê da noiva no lugar',                               100, null),
    ('receber_pais',         'cerimonia',   'Receber e posicionar os pais',                          110, null),
    ('acomodar_convidados',  'cerimonia',   'Acomodar convidados e reservar as fileiras da família', 120, null),
    ('orientar_fotografos',  'cerimonia',   'Orientar fotógrafos sobre os momentos combinados',      130, null),
    -- recepção
    ('sala_noivos',          'recepcao',    'Sala dos noivos pronta (comida, bebida, troca)',         10, null),
    ('horario_jantar',       'recepcao',    'Horário do jantar alinhado com o buffet',                20, null),
    ('itens_bolo',           'recepcao',    'Itens do corte do bolo no lugar (taças, espada)',        30, null),
    ('chave_carro',          'recepcao',    'Chave do carro dos noivos com responsável definido',     40, null),
    -- desmontagem
    ('pertences_noivos',     'desmontagem', 'Pertences dos noivos recolhidos e entregues',            10, null),
    ('itens_alugados',       'desmontagem', 'Itens alugados conferidos para devolução',               20, null),
    ('avarias_espaco',       'desmontagem', 'Ocorrências e avarias registradas com o espaço',         30, null),
    ('saida_fornecedores',   'desmontagem', 'Saída dos fornecedores acompanhada',                     40, null)
  ) as v(codigo, bloco, titulo, ordem, req)
  where not exists (
    select 1 from public.metodo_checklist_dia m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'casamento'
      and m.codigo = v.codigo
  );
end;
$$;

-- ------------------------------------------------------------
-- 6) SEED — debutante (o relógio é outro; itens incondicionais, porque
--    o método de debutante ainda não é semeado — sem objetivo, condição
--    nunca casaria)
-- ------------------------------------------------------------
create or replace function public.semear_checklist_dia_debutante(p_empresa_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.metodo_checklist_dia
    (empresa_id, tipo_evento, codigo, bloco, titulo, ordem)
  select p_empresa_id, 'debutante', v.codigo, v.bloco, v.titulo, v.ordem
  from (values
    -- montagem
    ('reuniao_equipe',        'montagem',    'Reunião com a equipe do dia (postos e horários)',       10),
    ('orientar_fornecedores', 'montagem',    'Orientar fornecedores na montagem',                     20),
    ('conferir_decoracao',    'montagem',    'Decoração conferida com o projeto aprovado',            30),
    ('som_luz_telao',         'montagem',    'Som, luz e telão testados',                             40),
    ('conferir_mapa_mesas',   'montagem',    'Montagem do salão conferida com o mapa de mesas',       50),
    ('lembrancinhas',         'montagem',    'Lembrancinhas recebidas',                               60),
    ('itens_debutante',       'montagem',    'Itens da debutante recebidos (vestidos, sapatos, velas)', 70),
    -- cerimônia (o momento principal dela)
    ('entrada_alinhada',      'cerimonia',   'Entrada alinhada com DJ e mestre de cerimônia',         10),
    ('grupo_valsa',           'cerimonia',   'Grupo da valsa presente e posicionado',                 20),
    ('lista_velas',           'cerimonia',   'Lista das 15 velas com o cerimonial',                   30),
    ('homenagem_pais',        'cerimonia',   'Homenagem aos pais pronta (vídeo testado)',             40),
    ('agua_familia',          'cerimonia',   'Água para a família no palco',                          50),
    ('orientar_fotografos',   'cerimonia',   'Orientar fotógrafos sobre os momentos combinados',      60),
    -- recepção
    ('camarim_troca',         'recepcao',    'Camarim pronto para a troca de vestido',                10),
    ('horario_jantar',        'recepcao',    'Horário do jantar alinhado com o buffet',               20),
    ('bolo_parabens',         'recepcao',    'Bolo e parabéns alinhados com buffet e DJ',             30),
    -- desmontagem
    ('pertences_debutante',   'desmontagem', 'Pertences da debutante recolhidos e entregues',         10),
    ('itens_alugados',        'desmontagem', 'Itens alugados conferidos para devolução',              20),
    ('saida_fornecedores',    'desmontagem', 'Saída dos fornecedores acompanhada',                    30)
  ) as v(codigo, bloco, titulo, ordem)
  where not exists (
    select 1 from public.metodo_checklist_dia m
    where m.empresa_id = p_empresa_id
      and m.tipo_evento = 'debutante'
      and m.codigo = v.codigo
  );
end;
$$;

-- ------------------------------------------------------------
-- 7) Empresa nova nasce com o Playbook do dia
-- ------------------------------------------------------------
-- Cópia da 106 com duas linhas a mais. As três chamadas antigas ficam
-- exatamente como estavam.
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
  perform public.semear_checklist_dia_casamento(new.id);
  perform public.semear_checklist_dia_debutante(new.id);
  return new;
end $$;

-- ------------------------------------------------------------
-- 8) Empresas que já existem
-- ------------------------------------------------------------
do $$
declare
  e record;
begin
  for e in select id from public.empresas loop
    perform public.semear_checklist_dia_casamento(e.id);
    perform public.semear_checklist_dia_debutante(e.id);
  end loop;
end $$;

commit;

-- ------------------------------------------------------------
-- Conferência: todas as linhas devem voltar "true".
-- ------------------------------------------------------------
select 'template de casamento semeado (29 itens por empresa)' as verificacao,
       (select count(*) from public.metodo_checklist_dia
        where tipo_evento = 'casamento') =
       (select count(*) from public.empresas) * 29 as aplicou
union all
select 'template de debutante semeado (19 itens por empresa)',
       (select count(*) from public.metodo_checklist_dia
        where tipo_evento = 'debutante') =
       (select count(*) from public.empresas) * 19
union all
select 'RPC de semeadura existe e nega anon',
       exists (select 1 from pg_proc where proname = 'semear_checklist_dia')
       and not exists (
         select 1 from information_schema.routine_privileges
         where routine_name = 'semear_checklist_dia' and grantee = 'anon')
union all
select 'RPC de conferir existe e nega anon',
       exists (select 1 from pg_proc where proname = 'conferir_item_dia')
       and not exists (
         select 1 from information_schema.routine_privileges
         where routine_name = 'conferir_item_dia' and grantee = 'anon')
union all
select 'nenhuma policy anon nas tabelas do checklist',
       not exists (
         select 1 from pg_policies
         where tablename in ('evento_checklist_dia', 'metodo_checklist_dia')
           and 'anon' = any(roles));
