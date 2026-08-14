-- ============================================================
-- Vela — Migração 094: o link que a noiva espalha
--
-- Como funciona de verdade um casamento: a noiva chama a pessoa no
-- WhatsApp (ou entrega o convite em papel) e manda UM link, o mesmo para
-- todo mundo. Quem recebe se cadastra sozinho — nome, e-mail, quantas
-- pessoas vêm junto, restrição alimentar — e recebe a confirmação por
-- e-mail.
--
-- O caminho que já existe NÃO sai: a noiva continua podendo cadastrar
-- alguém na mão (o tio que não mexe com isso) e mandar o link individual
-- daquela pessoa. Os dois convivem e caem na mesma lista.
--
-- Detalhe que fecha o ciclo: o e-mail de confirmação leva o link
-- INDIVIDUAL de quem se cadastrou. Se ele mudar de ideia, muda por ali —
-- reusando exatamente a tela que a 092 já criou.
--
-- CUIDADO COM O ABUSO: um link público de cadastro é uma porta aberta.
-- Três travas, todas no servidor:
--   1. a noiva pode fechar o link a qualquer momento (rsvp_aberto);
--   2. mesmo e-mail no mesmo evento ATUALIZA em vez de criar duplicata;
--   3. teto de segurança por evento, alto o bastante para não atrapalhar
--      um casamento grande e baixo o bastante para conter um flood.
--
-- Execute no SQL Editor do Supabase (depois da 093).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) O link do evento
-- ------------------------------------------------------------
alter table public.events
  add column if not exists rsvp_hash text,
  add column if not exists rsvp_aberto boolean not null default true;

-- hash para quem ainda não tem (mesmo formato dos outros links do
-- sistema: dois uuids sem hífen, sem nada derivado de dado pessoal)
update public.events
set rsvp_hash = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where rsvp_hash is null;

alter table public.events
  alter column rsvp_hash set default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

create unique index if not exists uq_events_rsvp_hash on public.events (rsvp_hash);

comment on column public.events.rsvp_hash is
  'Credencial do link ÚNICO de confirmação, o que a cliente espalha. Não deriva de dado pessoal.';
comment on column public.events.rsvp_aberto is
  'false = o link para de aceitar cadastros novos. A válvula para o caso de o link vazar.';

-- ------------------------------------------------------------
-- 2) De onde veio cada convidado
-- ------------------------------------------------------------
-- CHECK como superconjunto: 'cliente' e 'equipe' já existem em linhas
-- reais, e agora entra quem se cadastrou sozinho.
alter table public.evento_convidado drop constraint if exists evento_convidado_origem_check;
alter table public.evento_convidado add constraint evento_convidado_origem_check
  check (origem in ('cliente', 'equipe', 'autocadastro'));

alter table public.evento_convidado
  add column if not exists email_confirmacao_enviado_em timestamptz;

comment on column public.evento_convidado.email_confirmacao_enviado_em is
  'Quando o e-mail de confirmação foi enviado. Nulo = ainda não saiu.';

-- busca por e-mail (o dedupe do autocadastro)
create index if not exists idx_convidado_email
  on public.evento_convidado (event_id, lower(email))
  where email is not null;

-- ------------------------------------------------------------
-- 3) A tela pública do link do evento
-- ------------------------------------------------------------
-- Devolve só o que o convidado precisa para se situar. NUNCA a lista,
-- nunca contagem de quem já confirmou, nunca contato de ninguém.
create or replace function public.consultar_rsvp_evento(p_hash text)
returns table (
  evento_tipo   text,
  evento_data   date,
  evento_hora   time,
  evento_local  text,
  evento_cidade text,
  anfitrioes    text,
  aberto        boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.type::text, e.date, e.time, e.location, e.city,
    coalesce(nullif(trim(e.name), ''), 'os noivos') as anfitrioes,
    e.rsvp_aberto
  from public.events e
  where e.rsvp_hash = p_hash;
$$;

revoke all on function public.consultar_rsvp_evento(text) from public;
grant execute on function public.consultar_rsvp_evento(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) O convidado se cadastra
-- ------------------------------------------------------------
-- Devolve o hash INDIVIDUAL dele, que vai no e-mail de confirmação e
-- permite mudar a resposta depois pela tela da 092.
create or replace function public.autocadastrar_convidado(
  p_hash          text,
  p_nome          text,
  p_email         text,
  p_confirmacao   text default 'confirmado',
  p_acompanhantes int default 0,
  p_criancas      int default 0,
  p_restricao     text default null,
  p_telefone      text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev      public.events%rowtype;
  v_nome    text := nullif(trim(p_nome), '');
  v_email   text := lower(nullif(trim(p_email), ''));
  v_id      uuid;
  v_hash    text;
  v_qtd     int;
  v_acomp   int;
  v_crian   int;
begin
  select * into v_ev from public.events where rsvp_hash = p_hash;
  if not found then
    return json_build_object('ok', false, 'erro', 'link_invalido');
  end if;
  if not v_ev.rsvp_aberto then
    return json_build_object('ok', false, 'erro', 'link_fechado');
  end if;
  if v_nome is null then
    return json_build_object('ok', false, 'erro', 'nome_obrigatorio');
  end if;
  -- e-mail é obrigatório aqui porque é por ele que a confirmação volta
  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return json_build_object('ok', false, 'erro', 'email_invalido');
  end if;
  if p_confirmacao not in ('confirmado', 'nao_vai') then
    return json_build_object('ok', false, 'erro', 'resposta_invalida');
  end if;

  v_acomp := greatest(0, least(coalesce(p_acompanhantes, 0), 20));
  v_crian := greatest(0, least(coalesce(p_criancas, 0), 20));
  if p_confirmacao = 'nao_vai' then
    v_acomp := 0;
    v_crian := 0;
  end if;

  -- mesma pessoa respondendo de novo: atualiza, não duplica
  select id, hash into v_id, v_hash
  from public.evento_convidado
  where event_id = v_ev.id and lower(email) = v_email
  limit 1;

  if v_id is not null then
    update public.evento_convidado
       set nome = v_nome,
           telefone = coalesce(nullif(trim(p_telefone), ''), telefone),
           confirmacao = p_confirmacao,
           acompanhantes = v_acomp,
           criancas = v_crian,
           restricao_alimentar = case when p_confirmacao = 'confirmado'
             then nullif(left(trim(coalesce(p_restricao, '')), 400), '') else null end,
           confirmado_em = now(),
           confirmado_via = 'link',
           updated_at = now()
     where id = v_id;
    return json_build_object('ok', true, 'hash', v_hash, 'atualizado', true);
  end if;

  -- teto de segurança: alto para um casamento grande, baixo para conter
  -- um flood se o link cair em lugar errado
  select count(*) into v_qtd from public.evento_convidado where event_id = v_ev.id;
  if v_qtd >= 1500 then
    return json_build_object('ok', false, 'erro', 'lista_cheia');
  end if;

  insert into public.evento_convidado
    (event_id, nome, email, telefone, confirmacao, acompanhantes, criancas,
     restricao_alimentar, confirmado_em, confirmado_via, origem)
  values
    (v_ev.id, v_nome, v_email, nullif(trim(p_telefone), ''),
     p_confirmacao, v_acomp, v_crian,
     case when p_confirmacao = 'confirmado'
       then nullif(left(trim(coalesce(p_restricao, '')), 400), '') else null end,
     now(), 'link', 'autocadastro')
  returning hash into v_hash;

  return json_build_object('ok', true, 'hash', v_hash, 'atualizado', false);
end $$;

revoke all on function public.autocadastrar_convidado(text, text, text, text, int, int, text, text) from public;
grant execute on function public.autocadastrar_convidado(text, text, text, text, int, int, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5) Marcar que o e-mail saiu
-- ------------------------------------------------------------
-- Chamada pelo servidor depois do envio (a chave do Resend nunca vai ao
-- navegador, então quem envia é a rota, não a tela).
create or replace function public.marcar_email_convidado_enviado(p_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.evento_convidado
     set email_confirmacao_enviado_em = now()
   where hash = p_hash;
$$;

revoke all on function public.marcar_email_convidado_enviado(text) from public;
grant execute on function public.marcar_email_convidado_enviado(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6) Relatório
-- ------------------------------------------------------------
do $$
declare
  v_ev int;
begin
  select count(*) into v_ev from public.events where rsvp_hash is not null;
  raise notice '--- 094 ---';
  raise notice 'eventos com link de confirmacao: %', v_ev;
  raise notice 'RPCs: consultar_rsvp_evento, autocadastrar_convidado, marcar_email_convidado_enviado';
end $$;

commit;
