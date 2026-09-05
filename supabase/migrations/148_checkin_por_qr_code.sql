-- ============================================================
-- 148 — Check-in por QR Code na recepção do evento
-- ============================================================
-- Pedido do dono (04/09/2026): o convidado confirma e recebe um QR; na
-- porta, a recepção escaneia e marca quem chegou — inclusive os
-- acompanhantes, um a um — sem login e sem instalar nada; a
-- cerimonialista vê ao vivo quantos entraram. É o que já existia pela
-- metade: `evento_convidado.presente_em` está aqui desde a 141 e a
-- prestação de contas já lê "presentes", mas a única mão que preenchia
-- isso era a tela de Mesas, logada, pessoa por pessoa.
--
-- CINCO DECISÕES DE SEGURANÇA, cada uma por um furo medido:
--
--   1. O QR NÃO carrega `evento_convidado.hash`. Esse hash é credencial
--      de ESCRITA do RSVP: responder_convite_convidado e
--      registrar_acompanhantes têm grant para anon. Fotografar o QR de
--      alguém na fila daria poder de trocar a resposta dela e apagar os
--      acompanhantes. Nasce `checkin_hash`, uma segunda credencial que
--      só serve para ser lida na porta — e só por quem tem a credencial
--      DO POSTO. Dois segredos; um sozinho não faz nada.
--
--   2. A porta do operador é um POSTO (evento_recepcao_posto), no molde
--      do único link do sistema que tem revogação e validade de verdade
--      (fornecedor_acesso, 108). A validade NÃO é perguntada a ninguém:
--      vai da véspera ao dia seguinte, calculada da data do evento.
--      Esquecer de desligar deixa de ser falha de segurança. Revogar tem
--      botão — a 108 tinha a coluna e nunca ganhou o botão. E um posto
--      revogado não diz nem o nome do evento a quem tiver o link.
--
--   3. A presença vira um LIVRO (evento_chegada), append-only: quem
--      marcou, quando aconteceu, quando o servidor soube, por qual porta.
--      `presente_em` continua existindo como ESPELHO derivado, então os
--      leitores de hoje não mudam — e um UPDATE direto em presente_em
--      (a tela de Mesas de hoje, o portal) também cai no livro, por
--      gatilho: nenhuma tela consegue furar a contagem. Desfazer pela
--      porta pública escreve "desfez", só sobre marcação do MESMO posto
--      e nos últimos 15 minutos.
--
--   4. A porta pública NUNCA alterna. Escanear a mesma pessoa duas vezes
--      responde "já entrou às 20:14" e não escreve. Na fila, com o QR do
--      marido num celular e o da mulher no outro, um toggle transformaria
--      a segunda leitura em cancelamento silencioso.
--
--   5. Nenhuma função de escrita da porta tem grant para anon nem para
--      authenticated: todas são service_role, chamadas pela rota
--      /api/recepcao com limitador por IP — a doutrina da 120 ("RPC
--      aberta ao anon faz o limitador virar decoração"). A única RPC
--      pública é a que diz se o posto está aberto, e ela não devolve
--      nome de ninguém.
--
-- DUAS DECISÕES DE INTEGRIDADE:
--
--   * A linha VIGENTE de cada pessoa é a última que o SERVIDOR recebeu
--     (registrado_em), não a de maior hora de celular (`em`). A fila
--     offline manda marcações com hora no passado; se a hora do celular
--     mandasse, um relógio atrasado travaria a pessoa num estado que só
--     a equipe destrava. `em` é a hora exibida; a ordem é do servidor.
--
--   * O custo por pessoa da prestação de contas divide por `presentes`
--     sempre que presentes > 0. Check-in usado pela metade — 40 marcados
--     de 200 — estragaria o número que vai para a cliente. Por isso
--     existe `events.porta_encerrada_em`: enquanto ela não encerrar a
--     contagem, presentes é informação ao lado e o divisor continua
--     sendo o público do evento; depois do carimbo, presentes manda.
--
-- Aditiva e convergente. Nada é apagado. Conferência no fim, tudo `true`.
-- ============================================================

-- ------------------------------------------------------------
-- 1) A credencial de entrada, separada da credencial de RSVP
-- ------------------------------------------------------------
alter table public.evento_convidado
  add column if not exists checkin_hash text;

comment on column public.evento_convidado.checkin_hash is
  'O que vai no QR. Só serve para ser lido na porta por um posto válido. NÃO é o hash do convite (esse escreve o RSVP).';

update public.evento_convidado
   set checkin_hash = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where checkin_hash is null;

create unique index if not exists idx_convidado_checkin_hash
  on public.evento_convidado (checkin_hash);

-- PostgREST manda NULL explícito nas colunas omitidas e NULL não aciona
-- DEFAULT (armadilha documentada na 100 e na 108).
create or replace function public.trg_convidado_checkin_hash()
returns trigger
language plpgsql
as $$
begin
  new.checkin_hash := coalesce(
    nullif(new.checkin_hash, ''),
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  );
  return new;
end $$;

drop trigger if exists trg_convidado_checkin_hash on public.evento_convidado;
create trigger trg_convidado_checkin_hash
  before insert on public.evento_convidado
  for each row execute function public.trg_convidado_checkin_hash();

alter table public.evento_convidado
  alter column checkin_hash set not null;

-- Quem chega sem estar na lista entra pela porta — e fica marcado como
-- tal. Superconjunto do CHECK da 094: 'autocadastro' continua lá.
alter table public.evento_convidado drop constraint if exists evento_convidado_origem_check;
alter table public.evento_convidado add constraint evento_convidado_origem_check
  check (origem in ('cliente', 'equipe', 'autocadastro', 'porta'));

-- O acompanhante com nome (129) não tinha onde gravar presença.
alter table public.evento_acompanhante
  add column if not exists presente_em timestamptz;

-- A contagem derivada (129) disparava em TODO update do acompanhante —
-- inclusive ao marcar presença. Passa a disparar só no que ela conta.
drop trigger if exists trg_sincronizar_contagem on public.evento_acompanhante;
create trigger trg_sincronizar_contagem
  after insert or delete on public.evento_acompanhante
  for each row execute function public.sincronizar_contagem_acompanhantes();

drop trigger if exists trg_sincronizar_contagem_upd on public.evento_acompanhante;
create trigger trg_sincronizar_contagem_upd
  after update of eh_crianca, convidado_id on public.evento_acompanhante
  for each row
  when (old.eh_crianca is distinct from new.eh_crianca
        or old.convidado_id is distinct from new.convidado_id)
  execute function public.sincronizar_contagem_acompanhantes();

alter table public.events
  add column if not exists porta_encerrada_em timestamptz;

comment on column public.events.porta_encerrada_em is
  'Quando a cerimonialista encerrou a contagem da porta. Nulo = presentes ainda não vale como número final.';

-- ------------------------------------------------------------
-- 2) O posto de recepção — a porta do operador
-- ------------------------------------------------------------
create table if not exists public.evento_recepcao_posto (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  empresa_id      uuid references public.empresas (id) on delete cascade,
  nome            text not null check (char_length(btrim(nome)) between 1 and 60),
  hash            text not null unique
                  default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  vale_de         timestamptz not null,
  vale_ate        timestamptz not null,
  revogado_em     timestamptz,
  criado_por      uuid references auth.users (id) on delete set null,
  aberturas       int not null default 0,
  ultima_abertura timestamptz,
  marcacoes       int not null default 0,
  desfazimentos   int not null default 0,
  avulsos         int not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.evento_recepcao_posto is
  'Link público e revogável da recepção. Vale da véspera ao dia seguinte ao evento. Só ele autoriza leitura de QR.';

create index if not exists idx_recepcao_posto_evento
  on public.evento_recepcao_posto (event_id);

create or replace function public.trg_recepcao_posto_defaults()
returns trigger
language plpgsql
as $$
begin
  new.hash := coalesce(
    nullif(new.hash, ''),
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  );
  if new.empresa_id is null then
    select e.empresa_id into new.empresa_id from public.events e where e.id = new.event_id;
  end if;
  new.aberturas     := coalesce(new.aberturas, 0);
  new.marcacoes     := coalesce(new.marcacoes, 0);
  new.desfazimentos := coalesce(new.desfazimentos, 0);
  new.avulsos       := coalesce(new.avulsos, 0);
  return new;
end $$;

drop trigger if exists trg_recepcao_posto_defaults on public.evento_recepcao_posto;
create trigger trg_recepcao_posto_defaults
  before insert or update on public.evento_recepcao_posto
  for each row execute function public.trg_recepcao_posto_defaults();

alter table public.evento_recepcao_posto enable row level security;

-- Vê quem vê o evento; cria e altera quem edita. NINGUÉM apaga por
-- policy: revogar é por função, e o livro guarda o posto. (Uma policy
-- "for all" deixaria quem só vê o evento apagar o posto — DELETE só
-- consulta USING.) A cliente não vê o posto: é credencial de escrita.
drop policy if exists recepcao_posto_equipe on public.evento_recepcao_posto;
drop policy if exists recepcao_posto_select on public.evento_recepcao_posto;
create policy recepcao_posto_select on public.evento_recepcao_posto
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists recepcao_posto_insert on public.evento_recepcao_posto;
create policy recepcao_posto_insert on public.evento_recepcao_posto
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists recepcao_posto_update on public.evento_recepcao_posto;
create policy recepcao_posto_update on public.evento_recepcao_posto
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- 3) O livro de chegadas
-- ------------------------------------------------------------
create table if not exists public.evento_chegada (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  empresa_id      uuid references public.empresas (id) on delete cascade,
  convidado_id    uuid not null references public.evento_convidado (id) on delete cascade,
  -- nulo = linha do titular (e dos acompanhantes SEM nome que vieram com
  -- ele, contados em `pessoas`); preenchido = de um acompanhante nominal.
  -- RESTRICT: quem já entrou não pode ser apagado — registrar_acompanhantes
  -- apaga e reinsere a lista, e levaria as chegadas junto.
  acompanhante_id uuid references public.evento_acompanhante (id) on delete restrict,
  acao            text not null check (acao in ('chegou', 'desfez')),
  -- 41 = 1 + 20 acompanhantes + 20 crianças, o máximo que a 129 aceita
  pessoas         int not null default 1 check (pessoas between 1 and 41),
  em              timestamptz not null default now(),
  registrado_em   timestamptz not null default now(),
  porta           text not null check (porta in ('recepcao', 'equipe')),
  via             text not null check (via in ('qr', 'codigo', 'busca', 'avulso', 'manual')),
  posto_id        uuid references public.evento_recepcao_posto (id) on delete set null,
  operador        text,
  autor_user_id   uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table public.evento_chegada is
  'Append-only. Uma linha por marcação na porta ou pela equipe. presente_em é espelho derivado daqui.';

create index if not exists idx_chegada_evento_reg
  on public.evento_chegada (event_id, registrado_em desc);
create index if not exists idx_chegada_par
  on public.evento_chegada (convidado_id, acompanhante_id, registrado_em desc);
create index if not exists idx_chegada_posto
  on public.evento_chegada (posto_id);

create or replace function public.trg_chegada_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.empresa_id is null then
    select e.empresa_id into new.empresa_id from public.events e where e.id = new.event_id;
  end if;
  new.em            := coalesce(new.em, now());
  new.registrado_em := coalesce(new.registrado_em, now());
  new.pessoas       := coalesce(new.pessoas, 1);
  return new;
end $$;

drop trigger if exists trg_chegada_defaults on public.evento_chegada;
create trigger trg_chegada_defaults
  before insert on public.evento_chegada
  for each row execute function public.trg_chegada_defaults();

alter table public.evento_chegada enable row level security;

drop policy if exists chegada_select on public.evento_chegada;
create policy chegada_select on public.evento_chegada
  for select using (
    event_id in (select public.eventos_visiveis())
    or event_id in (select public.eventos_da_cliente())
  );

-- O ESPELHO e a SUA VOLTA. Duas mãos escrevem presença e as duas têm de
-- cair no livro sem se morderem:
--   livro → espelho: cada linha do livro atualiza presente_em;
--   presente_em → livro: um UPDATE direto (Mesas de hoje, portal) gera
--   a linha no livro.
-- A flag de transação diz quem começou, para o outro lado não responder
-- e o mesmo UPDATE não virar duas linhas (nem o erro "tuple already
-- modified by an operation triggered by the current command").
create or replace function public.trg_chegada_espelho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- a linha nasceu de um UPDATE direto: o próprio UPDATE já leva o valor
  if coalesce(current_setting('recepcao.origem', true), '') = 'direto' then
    return null;
  end if;
  perform set_config('recepcao.origem', 'espelho', true);
  if new.acompanhante_id is null then
    update public.evento_convidado
       set presente_em = case when new.acao = 'chegou' then new.em else null end
     where id = new.convidado_id;
  else
    update public.evento_acompanhante
       set presente_em = case when new.acao = 'chegou' then new.em else null end
     where id = new.acompanhante_id;
  end if;
  perform set_config('recepcao.origem', '', true);
  return null;
end $$;

drop trigger if exists trg_chegada_espelho on public.evento_chegada;
create trigger trg_chegada_espelho
  after insert on public.evento_chegada
  for each row execute function public.trg_chegada_espelho();

create or replace function public.trg_presenca_direta_convidado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_pessoas int;
begin
  if coalesce(current_setting('recepcao.origem', true), '') = 'espelho' then
    return new;
  end if;
  if old.presente_em is not distinct from new.presente_em then
    return new;
  end if;
  select least(41, greatest(1,
           1 + coalesce(new.acompanhantes, 0) + coalesce(new.criancas, 0)
             - (select count(*) from public.evento_acompanhante a where a.convidado_id = new.id)))
    into v_pessoas;
  perform set_config('recepcao.origem', 'direto', true);
  insert into public.evento_chegada
    (event_id, convidado_id, acompanhante_id, acao, pessoas, em, porta, via, autor_user_id)
  values (new.event_id, new.id, null,
          case when new.presente_em is null then 'desfez' else 'chegou' end,
          v_pessoas, coalesce(new.presente_em, now()), 'equipe', 'manual', auth.uid());
  perform set_config('recepcao.origem', '', true);
  return new;
end $$;

drop trigger if exists trg_presenca_direta_convidado on public.evento_convidado;
create trigger trg_presenca_direta_convidado
  before update of presente_em on public.evento_convidado
  for each row execute function public.trg_presenca_direta_convidado();

create or replace function public.trg_presenca_direta_acompanhante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('recepcao.origem', true), '') = 'espelho' then
    return new;
  end if;
  if old.presente_em is not distinct from new.presente_em then
    return new;
  end if;
  perform set_config('recepcao.origem', 'direto', true);
  insert into public.evento_chegada
    (event_id, convidado_id, acompanhante_id, acao, pessoas, em, porta, via, autor_user_id)
  values (new.event_id, new.convidado_id, new.id,
          case when new.presente_em is null then 'desfez' else 'chegou' end,
          1, coalesce(new.presente_em, now()), 'equipe', 'manual', auth.uid());
  perform set_config('recepcao.origem', '', true);
  return new;
end $$;

drop trigger if exists trg_presenca_direta_acompanhante on public.evento_acompanhante;
create trigger trg_presenca_direta_acompanhante
  before update of presente_em on public.evento_acompanhante
  for each row execute function public.trg_presenca_direta_acompanhante();

-- Backfill: quem já estava marcado presente ganha sua linha no livro —
-- o titular com os SEM nome, e uma linha por acompanhante nominal. A
-- soma por evento é EXATAMENTE a conta antiga (1 + acompanhantes +
-- crianças), porque a 129 garante nominais ≤ acompanhantes + crianças.
insert into public.evento_chegada
  (event_id, empresa_id, convidado_id, acompanhante_id, acao, pessoas, em, registrado_em, porta, via)
select c.event_id, c.empresa_id, c.id, null, 'chegou',
       least(41, greatest(1,
         1 + coalesce(c.acompanhantes, 0) + coalesce(c.criancas, 0)
           - (select count(*) from public.evento_acompanhante a where a.convidado_id = c.id))),
       c.presente_em, now(), 'equipe', 'manual'
from public.evento_convidado c
where c.presente_em is not null
  and not exists (select 1 from public.evento_chegada ch
                  where ch.convidado_id = c.id and ch.acompanhante_id is null);

insert into public.evento_chegada
  (event_id, empresa_id, convidado_id, acompanhante_id, acao, pessoas, em, registrado_em, porta, via)
select c.event_id, c.empresa_id, c.id, a.id, 'chegou', 1, c.presente_em, now(), 'equipe', 'manual'
from public.evento_convidado c
join public.evento_acompanhante a on a.convidado_id = c.id
where c.presente_em is not null
  and a.presente_em is null
  and not exists (select 1 from public.evento_chegada ch where ch.acompanhante_id = a.id);

-- ------------------------------------------------------------
-- 4) A ÚNICA fórmula de "quantos chegaram"
-- ------------------------------------------------------------
-- A linha vigente de cada par (convidado, acompanhante): a última que o
-- servidor recebeu. Tudo que conta chegada lê daqui.
-- `drop` antes das três funções `returns table`: create or replace não
-- aceita mudar a forma, e um rascunho anterior abortaria a migração.
drop function if exists public._chegadas_vigentes(uuid);
create function public._chegadas_vigentes(p_event_id uuid)
returns table (
  convidado_id uuid, acompanhante_id uuid, acao text, pessoas int,
  em timestamptz, porta text, via text, posto_id uuid, operador text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (ch.convidado_id, coalesce(ch.acompanhante_id, '00000000-0000-0000-0000-000000000000'::uuid))
         ch.convidado_id, ch.acompanhante_id, ch.acao, ch.pessoas, ch.em, ch.porta, ch.via, ch.posto_id, ch.operador
  from public.evento_chegada ch
  where ch.event_id = p_event_id
  order by ch.convidado_id,
           coalesce(ch.acompanhante_id, '00000000-0000-0000-0000-000000000000'::uuid),
           ch.registrado_em desc, ch.em desc;
$$;

revoke all on function public._chegadas_vigentes(uuid) from public, anon, authenticated;

drop function if exists public.presentes_do_evento_interno(uuid);
create function public.presentes_do_evento_interno(p_event_id uuid)
returns table (quantidade int, origem text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total int; v_porta int; v_equipe int;
begin
  select coalesce(sum(v.pessoas) filter (where v.acao = 'chegou'), 0),
         coalesce(sum(v.pessoas) filter (where v.acao = 'chegou' and v.porta = 'recepcao'), 0),
         coalesce(sum(v.pessoas) filter (where v.acao = 'chegou' and v.porta = 'equipe'), 0)
    into v_total, v_porta, v_equipe
  from public._chegadas_vigentes(p_event_id) v;

  quantidade := v_total;
  origem := case
    when v_total = 0 then 'sem_marcacao'
    when v_porta > 0 and v_equipe > 0 then 'mista'
    when v_porta > 0 then 'porta'
    else 'equipe'
  end;
  return next;
end $$;

revoke all on function public.presentes_do_evento_interno(uuid)
  from public, anon, authenticated;

drop function if exists public.presentes_do_evento(uuid);
create function public.presentes_do_evento(p_event_id uuid)
returns table (quantidade int, origem text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pode_ver_evento(p_event_id) then
    return;
  end if;
  return query select * from public.presentes_do_evento_interno(p_event_id);
end $$;

revoke all on function public.presentes_do_evento(uuid) from public, anon;
grant execute on function public.presentes_do_evento(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5) A lista de acompanhantes não pode mais ser apagada por baixo de
--    quem já entrou
-- ------------------------------------------------------------
-- registrar_acompanhantes (129) apaga e reinsere a lista. Depois que
-- alguém do grupo entrou, isso é recusado — e, como responder_convite,
-- também respeita o RSVP encerrado. Mesma assinatura, mesmos grants.
create or replace function public.registrar_acompanhantes(
  p_hash  text,
  p_nomes jsonb
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_c public.evento_convidado%rowtype;
  v_aberto boolean;
  v_item jsonb;
  v_ordem int := 0;
  v_nome text;
begin
  select * into v_c from public.evento_convidado where hash = p_hash;
  if not found then
    return json_build_object('ok', false, 'erro', 'convite_invalido');
  end if;
  select e.rsvp_aberto is not false into v_aberto
    from public.events e where e.id = v_c.event_id;
  if not coalesce(v_aberto, true) then
    return json_build_object('ok', false, 'erro', 'encerrado');
  end if;
  -- qualquer linha no livro — inclusive um 'desfez' — prende o
  -- acompanhante pelo RESTRICT; então a régua é "este grupo já passou
  -- pela porta", não "está presente agora"
  if exists (select 1 from public.evento_chegada ch where ch.convidado_id = v_c.id) then
    return json_build_object('ok', false, 'erro', 'ja_na_festa');
  end if;
  if jsonb_typeof(coalesce(p_nomes, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_nomes, '[]'::jsonb)) > 20 then
    return json_build_object('ok', false, 'erro', 'lista');
  end if;

  delete from public.evento_acompanhante where convidado_id = v_c.id;
  for v_item in select * from jsonb_array_elements(coalesce(p_nomes, '[]'::jsonb)) loop
    v_nome := btrim(coalesce(v_item->>'nome', ''));
    if v_nome <> '' then
      v_ordem := v_ordem + 10;
      insert into public.evento_acompanhante (convidado_id, nome, eh_crianca, ordem)
      values (v_c.id, left(v_nome, 120),
              coalesce((v_item->>'crianca')::boolean, false), v_ordem);
    end if;
  end loop;

  return json_build_object('ok', true);
end $$;

revoke all on function public.registrar_acompanhantes(text, jsonb) from public;
grant execute on function public.registrar_acompanhantes(text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 6) As funções da cerimonialista (logada)
-- ------------------------------------------------------------
create or replace function public.recepcao_abrir_posto(p_event_id uuid, p_nome text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ev   public.events%rowtype;
  v_nome text := left(coalesce(nullif(btrim(p_nome), ''), 'Recepção'), 60);
  v_posto public.evento_recepcao_posto%rowtype;
begin
  if not public.pode_editar_evento(p_event_id) then
    raise exception 'sem_permissao';
  end if;
  select * into v_ev from public.events where id = p_event_id;
  if v_ev.date is null then
    raise exception 'evento_sem_data'
      using hint = 'Defina a data do evento antes de abrir a recepção.';
  end if;

  -- convergente: mesmo nome, vivo e na validade → devolve o mesmo link
  select * into v_posto
  from public.evento_recepcao_posto p
  where p.event_id = p_event_id
    and p.nome = v_nome
    and p.revogado_em is null
    and now() < p.vale_ate
  order by p.created_at desc
  limit 1;

  if v_posto.id is null then
    insert into public.evento_recepcao_posto
      (event_id, empresa_id, nome, vale_de, vale_ate, criado_por)
    values (
      p_event_id, v_ev.empresa_id, v_nome,
      -- da meia-noite da véspera à meia-noite de dois dias depois, no
      -- fuso do país: uma festa que atravessa a madrugada continua dentro
      ((v_ev.date - 1)::timestamp at time zone 'America/Sao_Paulo'),
      ((v_ev.date + 2)::timestamp at time zone 'America/Sao_Paulo'),
      auth.uid()
    )
    returning * into v_posto;
  end if;

  return json_build_object(
    'id', v_posto.id, 'nome', v_posto.nome, 'hash', v_posto.hash,
    'vale_de', v_posto.vale_de, 'vale_ate', v_posto.vale_ate
  );
end $$;

revoke all on function public.recepcao_abrir_posto(uuid, text) from public, anon;
grant execute on function public.recepcao_abrir_posto(uuid, text) to authenticated;

create or replace function public.recepcao_revogar_posto(p_posto_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_event uuid;
begin
  select event_id into v_event from public.evento_recepcao_posto where id = p_posto_id;
  if v_event is null or not public.pode_editar_evento(v_event) then
    raise exception 'sem_permissao';
  end if;
  update public.evento_recepcao_posto
     set revogado_em = coalesce(revogado_em, now())
   where id = p_posto_id;
end $$;

revoke all on function public.recepcao_revogar_posto(uuid) from public, anon;
grant execute on function public.recepcao_revogar_posto(uuid) to authenticated;

-- O carimbo: "encerrei a contagem da porta" (e o desfazer dele).
create or replace function public.recepcao_encerrar_porta(p_event_id uuid, p_encerrar boolean default true)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.pode_editar_evento(p_event_id) then
    raise exception 'sem_permissao';
  end if;
  update public.events
     set porta_encerrada_em = case when p_encerrar then coalesce(porta_encerrada_em, now()) else null end
   where id = p_event_id;
  return json_build_object('ok', true,
    'porta_encerrada_em', (select porta_encerrada_em from public.events where id = p_event_id));
end $$;

revoke all on function public.recepcao_encerrar_porta(uuid, boolean) from public, anon;
grant execute on function public.recepcao_encerrar_porta(uuid, boolean) to authenticated;

-- A porta de DENTRO: a tela de Mesas passa a escrever no mesmo livro por
-- aqui (e, se não passar, o gatilho de presente_em a leva ao livro do
-- mesmo jeito). Sem janela para desfazer: quem está logado responde pelo uid.
create or replace function public.registrar_chegada_equipe(
  p_event_id        uuid,
  p_convidado_id    uuid,
  p_acompanhante_id uuid default null,
  p_presente        boolean default true
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pessoas int := 1;
  v_ok boolean;
begin
  if not public.pode_editar_evento(p_event_id) then
    raise exception 'sem_permissao';
  end if;
  select exists (
    select 1 from public.evento_convidado c
    where c.id = p_convidado_id and c.event_id = p_event_id
  ) into v_ok;
  if not v_ok then raise exception 'convidado_de_outro_evento'; end if;
  if p_acompanhante_id is not null then
    select exists (
      select 1 from public.evento_acompanhante a
      where a.id = p_acompanhante_id and a.convidado_id = p_convidado_id
    ) into v_ok;
    if not v_ok then raise exception 'acompanhante_de_outro_convidado'; end if;
  else
    select least(41, greatest(1,
             1 + coalesce(c.acompanhantes, 0) + coalesce(c.criancas, 0)
               - (select count(*) from public.evento_acompanhante a where a.convidado_id = c.id)))
      into v_pessoas
    from public.evento_convidado c where c.id = p_convidado_id;
  end if;

  insert into public.evento_chegada
    (event_id, convidado_id, acompanhante_id, acao, pessoas, porta, via, autor_user_id)
  values (p_event_id, p_convidado_id, p_acompanhante_id,
          case when p_presente then 'chegou' else 'desfez' end,
          v_pessoas, 'equipe', 'manual', auth.uid());

  return json_build_object('ok', true);
end $$;

revoke all on function public.registrar_chegada_equipe(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.registrar_chegada_equipe(uuid, uuid, uuid, boolean) to authenticated;

-- O painel dela, ao vivo, atrás de sessão. A lista nominal com hora mora
-- AQUI — nunca na rota pública. Tudo lê a vigente, nunca a linha crua.
create or replace function public.recepcao_painel(p_event_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_presentes int; v_origem text; v_esperados int;
begin
  if not public.pode_ver_evento(p_event_id) then
    raise exception 'sem_permissao';
  end if;
  select quantidade, origem into v_presentes, v_origem
    from public.presentes_do_evento_interno(p_event_id);
  select quantidade into v_esperados
    from public.publico_do_evento_interno(p_event_id);

  return json_build_object(
    'presentes', v_presentes,
    'origem', v_origem,
    'esperados', v_esperados,
    'porta_encerrada_em', (select porta_encerrada_em from public.events where id = p_event_id),
    'sem_confirmar', (
      select count(distinct v.convidado_id)
      from public._chegadas_vigentes(p_event_id) v
      join public.evento_convidado c on c.id = v.convidado_id
      where v.acao = 'chegou' and c.confirmacao <> 'confirmado' and c.origem <> 'porta'
    ),
    'avulsos', (
      select count(*) from public.evento_convidado c
      where c.event_id = p_event_id and c.origem = 'porta'
    ),
    'ultimas', (
      select coalesce(json_agg(json_build_object(
        'nome', coalesce(a.nome, c.nome),
        'pessoas', v.pessoas,
        'em', v.em,
        'porta', v.porta,
        'operador', v.operador
      ) order by v.em desc), '[]'::json)
      from (
        select * from public._chegadas_vigentes(p_event_id)
        where acao = 'chegou' order by em desc limit 10
      ) v
      join public.evento_convidado c on c.id = v.convidado_id
      left join public.evento_acompanhante a on a.id = v.acompanhante_id
    ),
    'postos', (
      select coalesce(json_agg(json_build_object(
        'id', p.id, 'nome', p.nome, 'hash', p.hash,
        'vale_de', p.vale_de, 'vale_ate', p.vale_ate,
        'revogado_em', p.revogado_em,
        'aberturas', p.aberturas, 'marcacoes', p.marcacoes,
        'desfazimentos', p.desfazimentos, 'avulsos', p.avulsos,
        'aberto', p.revogado_em is null and now() between p.vale_de and p.vale_ate
      ) order by p.created_at desc), '[]'::json)
      from public.evento_recepcao_posto p
      where p.event_id = p_event_id
    )
  );
end $$;

revoke all on function public.recepcao_painel(uuid) from public, anon;
grant execute on function public.recepcao_painel(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7) As funções da PORTA (service_role, via /api/recepcao)
-- ------------------------------------------------------------
create or replace function public._recepcao_posto(p_hash text)
returns public.evento_recepcao_posto
language plpgsql
stable
security definer
set search_path = public
as $$
declare v public.evento_recepcao_posto%rowtype;
begin
  if p_hash is null or length(p_hash) <> 64 then
    raise exception 'posto_invalido';
  end if;
  select * into v from public.evento_recepcao_posto where hash = p_hash;
  if v.id is null then raise exception 'posto_invalido'; end if;
  if v.revogado_em is not null then raise exception 'posto_revogado'; end if;
  if now() < v.vale_de or now() > v.vale_ate then raise exception 'posto_fora_da_janela'; end if;
  return v;
end $$;

revoke all on function public._recepcao_posto(text) from public, anon, authenticated;

-- A única RPC pública. Posto revogado ou fora da janela responde NULL —
-- nem o nome do evento sai para quem tiver um link morto.
create or replace function public.recepcao_posto_publico(p_hash text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.evento_recepcao_posto%rowtype;
  v_ev public.events%rowtype;
begin
  if p_hash is null or length(p_hash) <> 64 then return null; end if;
  select * into v from public.evento_recepcao_posto where hash = p_hash;
  if v.id is null or v.revogado_em is not null
     or now() < v.vale_de or now() > v.vale_ate then
    return null;
  end if;
  select * into v_ev from public.events where id = v.event_id;
  return json_build_object(
    'posto_nome', v.nome,
    'evento_nome', coalesce(nullif(btrim(v_ev.name), ''), 'Seu evento'),
    'evento_data', v_ev.date,
    'aberto', true
  );
end $$;

revoke all on function public.recepcao_posto_publico(text) from public;
grant execute on function public.recepcao_posto_publico(text) to anon, authenticated;

-- A lista magra, baixada UMA vez quando o posto abre no celular. Nome,
-- acompanhantes pelo nome, quantos sem nome, presença. NUNCA telefone,
-- e-mail, lado, grupo ou restrição. VOLATILE porque conta a abertura.
create or replace function public.recepcao_lista(p_posto_hash text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v public.evento_recepcao_posto%rowtype;
begin
  v := public._recepcao_posto(p_posto_hash);
  update public.evento_recepcao_posto
     set aberturas = aberturas + 1, ultima_abertura = now()
   where id = v.id;
  return json_build_object(
    'evento', (select json_build_object(
                 'nome', coalesce(nullif(btrim(e.name), ''), 'Seu evento'),
                 'data', e.date, 'hora', e.time)
               from public.events e where e.id = v.event_id),
    'posto', json_build_object('nome', v.nome),
    'esperados', (select quantidade from public.publico_do_evento_interno(v.event_id)),
    'presentes', (select quantidade from public.presentes_do_evento_interno(v.event_id)),
    'convidados', (
      select coalesce(json_agg(json_build_object(
        'id', c.id,
        'codigo', upper(right(c.checkin_hash, 6)),
        'nome', c.nome,
        'confirmacao', c.confirmacao,
        'presente_em', c.presente_em,
        'sem_nome', greatest(0, coalesce(c.acompanhantes, 0) + coalesce(c.criancas, 0)
                      - (select count(*) from public.evento_acompanhante a where a.convidado_id = c.id)),
        'acompanhantes', (
          select coalesce(json_agg(json_build_object(
            'id', a.id, 'nome', a.nome, 'crianca', a.eh_crianca, 'presente_em', a.presente_em
          ) order by a.ordem), '[]'::json)
          from public.evento_acompanhante a where a.convidado_id = c.id
        )
      ) order by c.nome), '[]'::json)
      from public.evento_convidado c
      where c.event_id = v.event_id and c.confirmacao <> 'nao_vai'
    )
  );
end $$;

revoke all on function public.recepcao_lista(text) from public, anon, authenticated;
grant execute on function public.recepcao_lista(text) to service_role;

-- Acha o convidado pelo QR (hash inteiro) ou pelos 6 últimos caracteres
-- digitados, sempre dentro do evento do posto. 6 caracteres ambíguos
-- devolvem 'ambiguo' — código curto que escolhe a pessoa errada em
-- silêncio é a falha que este desenho existe para impedir.
create or replace function public.recepcao_consultar(p_posto_hash text, p_codigo text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.evento_recepcao_posto%rowtype;
  v_cod text := lower(regexp_replace(coalesce(p_codigo, ''), '[^0-9a-zA-Z]', '', 'g'));
  v_n int;
  v_id uuid;
begin
  v := public._recepcao_posto(p_posto_hash);
  if length(v_cod) = 64 then
    select id into v_id from public.evento_convidado
     where event_id = v.event_id and checkin_hash = v_cod;
  elsif length(v_cod) = 6 then
    select count(*), min(id::text)::uuid into v_n, v_id
      from public.evento_convidado
     where event_id = v.event_id and right(checkin_hash, 6) = v_cod;
    if v_n > 1 then return json_build_object('erro', 'ambiguo'); end if;
  else
    return json_build_object('erro', 'codigo_invalido');
  end if;
  if v_id is null then return json_build_object('erro', 'nao_encontrado'); end if;
  return json_build_object('id', v_id);
end $$;

revoke all on function public.recepcao_consultar(text, text) from public, anon, authenticated;
grant execute on function public.recepcao_consultar(text, text) to service_role;

-- Marca a chegada de um grupo. MONOTÔNICA: quem já entrou não entra de
-- novo — devolve a hora em que entrou. `p_em` é a hora do toque no
-- celular (a fila offline manda depois), presa a [agora − 12h, agora].
-- `p_titular` false = só os acompanhantes listados entram (a esposa
-- chegou antes do marido; o marido, titular, ainda não).
drop function if exists public.recepcao_marcar(text, uuid, uuid[], int, text, timestamptz);
create or replace function public.recepcao_marcar(
  p_posto_hash    text,
  p_convidado_id  uuid,
  p_acompanhantes uuid[] default '{}',
  p_sem_nome      int default null,
  p_operador      text default null,
  p_em            timestamptz default null,
  p_titular       boolean default true
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v public.evento_recepcao_posto%rowtype;
  v_conv public.evento_convidado%rowtype;
  v_em timestamptz := greatest(least(coalesce(p_em, now()), now()), now() - interval '12 hours');
  v_ja timestamptz;
  v_sem_nome int;
  v_acomp uuid;
  v_marcados int := 0;
begin
  v := public._recepcao_posto(p_posto_hash);
  select * into v_conv from public.evento_convidado
   where id = p_convidado_id and event_id = v.event_id;
  if v_conv.id is null then raise exception 'convidado_de_outro_evento'; end if;

  v_ja := v_conv.presente_em;
  if v_ja is null and coalesce(p_titular, true) then
    v_sem_nome := least(40, greatest(0, coalesce(p_sem_nome,
        coalesce(v_conv.acompanhantes, 0) + coalesce(v_conv.criancas, 0)
        - (select count(*) from public.evento_acompanhante a where a.convidado_id = v_conv.id))));
    insert into public.evento_chegada
      (event_id, convidado_id, acompanhante_id, acao, pessoas, em, porta, via, posto_id, operador)
    values (v.event_id, v_conv.id, null, 'chegou', 1 + v_sem_nome, v_em, 'recepcao',
            case when p_sem_nome is null then 'qr' else 'busca' end, v.id, left(p_operador, 60));
    v_marcados := v_marcados + 1;
  end if;

  foreach v_acomp in array coalesce(p_acompanhantes, '{}')
  loop
    if exists (select 1 from public.evento_acompanhante a
               where a.id = v_acomp and a.convidado_id = v_conv.id and a.presente_em is null) then
      insert into public.evento_chegada
        (event_id, convidado_id, acompanhante_id, acao, pessoas, em, porta, via, posto_id, operador)
      values (v.event_id, v_conv.id, v_acomp, 'chegou', 1, v_em, 'recepcao', 'qr', v.id, left(p_operador, 60));
      v_marcados := v_marcados + 1;
    end if;
  end loop;

  if v_marcados > 0 then
    update public.evento_recepcao_posto set marcacoes = marcacoes + v_marcados where id = v.id;
  end if;

  return json_build_object(
    'ok', true,
    'ja_entrou_em', v_ja,
    'marcados', v_marcados,
    'presentes', (select quantidade from public.presentes_do_evento_interno(v.event_id))
  );
end $$;

revoke all on function public.recepcao_marcar(text, uuid, uuid[], int, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.recepcao_marcar(text, uuid, uuid[], int, text, timestamptz, boolean)
  to service_role;

-- Desfazer pela porta: só marcação DESTE posto, nos últimos 15 minutos
-- (pelo relógio do servidor). Escreve 'desfez'; nunca apaga.
create or replace function public.recepcao_desfazer(
  p_posto_hash      text,
  p_convidado_id    uuid,
  p_acompanhante_id uuid default null,
  p_operador        text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v public.evento_recepcao_posto%rowtype;
  v_ult public.evento_chegada%rowtype;
begin
  v := public._recepcao_posto(p_posto_hash);
  select * into v_ult from public.evento_chegada ch
   where ch.event_id = v.event_id and ch.convidado_id = p_convidado_id
     and ch.acompanhante_id is not distinct from p_acompanhante_id
   order by ch.registrado_em desc, ch.em desc limit 1;
  if v_ult.id is null or v_ult.acao <> 'chegou' then
    return json_build_object('erro', 'nada_a_desfazer');
  end if;
  if v_ult.posto_id is distinct from v.id then
    return json_build_object('erro', 'marcado_por_outra_porta');
  end if;
  if v_ult.registrado_em < now() - interval '15 minutes' then
    return json_build_object('erro', 'janela_passou');
  end if;
  insert into public.evento_chegada
    (event_id, convidado_id, acompanhante_id, acao, pessoas, porta, via, posto_id, operador)
  values (v.event_id, p_convidado_id, p_acompanhante_id, 'desfez', v_ult.pessoas,
          'recepcao', v_ult.via, v.id, left(p_operador, 60));
  update public.evento_recepcao_posto set desfazimentos = desfazimentos + 1 where id = v.id;
  return json_build_object('ok', true,
    'presentes', (select quantidade from public.presentes_do_evento_interno(v.event_id)));
end $$;

revoke all on function public.recepcao_desfazer(text, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.recepcao_desfazer(text, uuid, uuid, text) to service_role;

-- Quem apareceu sem estar na lista: vira convidado de verdade, marcado
-- origem='porta', já presente. Grupo de até 21 (o titular + os 20
-- acompanhantes que a 129 aceita). Teto de 100 avulsos por posto; o de
-- 1500 por evento (094) continua valendo por cima.
create or replace function public.recepcao_avulso(
  p_posto_hash text,
  p_nome       text,
  p_pessoas    int default 1,
  p_operador   text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v public.evento_recepcao_posto%rowtype;
  v_nome text := left(btrim(coalesce(p_nome, '')), 120);
  v_pessoas int := least(21, greatest(1, coalesce(p_pessoas, 1)));
  v_id uuid;
begin
  v := public._recepcao_posto(p_posto_hash);
  if char_length(v_nome) < 2 then raise exception 'nome_invalido'; end if;
  if v.avulsos >= 100 then raise exception 'teto_de_avulsos'; end if;
  if (select count(*) from public.evento_convidado where event_id = v.event_id) >= 1500 then
    raise exception 'teto_de_convidados';
  end if;

  insert into public.evento_convidado
    (event_id, empresa_id, nome, confirmacao, acompanhantes, origem, confirmado_em, confirmado_via)
  values (v.event_id, v.empresa_id, v_nome, 'confirmado', v_pessoas - 1, 'porta', now(), 'manual')
  returning id into v_id;

  insert into public.evento_chegada
    (event_id, convidado_id, acao, pessoas, porta, via, posto_id, operador)
  values (v.event_id, v_id, 'chegou', v_pessoas, 'recepcao', 'avulso', v.id, left(p_operador, 60));

  update public.evento_recepcao_posto
     set avulsos = avulsos + 1, marcacoes = marcacoes + 1 where id = v.id;

  return json_build_object('ok', true, 'id', v_id,
    'presentes', (select quantidade from public.presentes_do_evento_interno(v.event_id)));
end $$;

revoke all on function public.recepcao_avulso(text, text, int, text)
  from public, anon, authenticated;
grant execute on function public.recepcao_avulso(text, text, int, text) to service_role;

-- ------------------------------------------------------------
-- 8) O convidado recebe a SUA credencial
-- ------------------------------------------------------------
-- Quem tem o hash do convite (a credencial forte, que já escreve o RSVP)
-- vê o seu checkin_hash (a fraca, que sozinha não faz nada). É o que a
-- tela de confirmação desenha no QR.
create or replace function public.credencial_de_entrada(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'checkin_hash', c.checkin_hash,
    'codigo', upper(right(c.checkin_hash, 6)),
    'nome', c.nome
  )
  from public.evento_convidado c
  where c.hash = p_hash and c.confirmacao = 'confirmado';
$$;

revoke all on function public.credencial_de_entrada(text) from public;
grant execute on function public.credencial_de_entrada(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'toda linha viva tem checkin_hash' as item,
       (select count(*) = 0 from public.evento_convidado where checkin_hash is null) as ok
union all
select 'checkin_hash nunca é o hash do convite',
       (select count(*) = 0 from public.evento_convidado where checkin_hash = hash)
union all
select 'origem aceita porta E ainda aceita autocadastro',
       (select pg_get_constraintdef(oid) ilike '%porta%' and pg_get_constraintdef(oid) ilike '%autocadastro%'
        from pg_constraint where conname = 'evento_convidado_origem_check')
union all
select 'acompanhante tem presente_em; events tem porta_encerrada_em',
       (select count(*) = 2 from information_schema.columns
        where table_schema = 'public'
          and ((table_name = 'evento_acompanhante' and column_name = 'presente_em')
            or (table_name = 'events' and column_name = 'porta_encerrada_em')))
union all
select 'posto e livro existem com RLS ligada',
       (select bool_and(relrowsecurity) from pg_class
        where relname in ('evento_recepcao_posto', 'evento_chegada'))
union all
select 'o livro não tem policy de escrita; o posto não tem policy de delete',
       (select count(*) = 0 from pg_policies
        where (tablename = 'evento_chegada' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))
           or (tablename = 'evento_recepcao_posto' and cmd in ('DELETE', 'ALL')))
union all
select 'o livro segura o acompanhante que já entrou (restrict)',
       (select confdeltype = 'r' from pg_constraint
        where conrelid = 'public.evento_chegada'::regclass and contype = 'f'
          and confrelid = 'public.evento_acompanhante'::regclass)
union all
select 'todo presente_em legado tem linha no livro',
       (select count(*) = 0 from public.evento_convidado c
        where c.presente_em is not null
          and not exists (select 1 from public.evento_chegada ch
                          where ch.convidado_id = c.id and ch.acompanhante_id is null))
union all
select 'o livro reproduz a conta antiga (1 + acompanhantes + crianças)',
       (select coalesce(bool_and(
          (select quantidade from public.presentes_do_evento_interno(e.id))
          = (select coalesce(sum(1 + coalesce(c.acompanhantes,0) + coalesce(c.criancas,0)), 0)
             from public.evento_convidado c where c.event_id = e.id and c.presente_em is not null)
        ), true)
        from public.events e
        where exists (select 1 from public.evento_convidado c where c.event_id = e.id and c.presente_em is not null)
          -- só vale para o estado que o backfill produz: depois de a porta
          -- ser usada, as duas contas divergem de propósito (e está certo)
          and not exists (select 1 from public.evento_chegada ch
                          where ch.event_id = e.id and (ch.porta = 'recepcao' or ch.acao = 'desfez')))
union all
select 'a vigente é decidida pelo relógio do servidor',
       (select pg_get_functiondef('public._chegadas_vigentes(uuid)'::regprocedure)
        ilike '%registrado_em desc, ch.em desc%')
union all
select 'registrar_acompanhantes recusa quem já está na festa',
       (select pg_get_functiondef('public.registrar_acompanhantes(text,jsonb)'::regprocedure)
        ilike '%ja_na_festa%')
union all
select 'anon executa só posto_publico e credencial_de_entrada',
       (select has_function_privilege('anon', 'public.recepcao_posto_publico(text)', 'execute')
           and has_function_privilege('anon', 'public.credencial_de_entrada(text)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_lista(text)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_consultar(text,text)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_marcar(text,uuid,uuid[],int,text,timestamptz,boolean)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_desfazer(text,uuid,uuid,text)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_avulso(text,text,int,text)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_abrir_posto(uuid,text)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_painel(uuid)', 'execute')
           and not has_function_privilege('anon', 'public.recepcao_encerrar_porta(uuid,boolean)', 'execute'))
union all
select 'authenticated não escreve pela porta pública',
       (select not has_function_privilege('authenticated', 'public.recepcao_marcar(text,uuid,uuid[],int,text,timestamptz,boolean)', 'execute')
           and not has_function_privilege('authenticated', 'public.recepcao_lista(text)', 'execute'))
union all
select 'service_role executa as cinco funções da porta',
       (select has_function_privilege('service_role', 'public.recepcao_lista(text)', 'execute')
           and has_function_privilege('service_role', 'public.recepcao_consultar(text,text)', 'execute')
           and has_function_privilege('service_role', 'public.recepcao_marcar(text,uuid,uuid[],int,text,timestamptz,boolean)', 'execute')
           and has_function_privilege('service_role', 'public.recepcao_desfazer(text,uuid,uuid,text)', 'execute')
           and has_function_privilege('service_role', 'public.recepcao_avulso(text,text,int,text)', 'execute'))
union all
select 'as superfícies antigas do RSVP continuam abertas',
       (select has_function_privilege('anon', 'public.consultar_convite_convidado(text)', 'execute')
           and has_function_privilege('anon', 'public.registrar_acompanhantes(text,jsonb)', 'execute'))
union all
select 'a contagem de acompanhantes não dispara mais em todo update',
       (select count(*) = 2 from pg_trigger
        where tgrelid = 'public.evento_acompanhante'::regclass
          and tgname in ('trg_sincronizar_contagem', 'trg_sincronizar_contagem_upd')
          and not tgisinternal)
union all
select 'espelho, volta do espelho e defaults estão de pé',
       (select count(*) = 6 from pg_trigger
        where tgname in ('trg_chegada_espelho', 'trg_chegada_defaults',
                         'trg_recepcao_posto_defaults', 'trg_convidado_checkin_hash',
                         'trg_presenca_direta_convidado', 'trg_presenca_direta_acompanhante')
          and not tgisinternal);
