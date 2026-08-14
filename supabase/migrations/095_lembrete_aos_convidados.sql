-- ============================================================
-- Vela — Migração 095: o lembrete que a noiva agenda
--
-- Mesma ideia da confirmação de fornecedores (events.
-- confirmation_days_before + cron diário), agora do lado dos convidados
-- e com a MÃO DA CLIENTE no gatilho: ela escolhe quantos dias antes o
-- lembrete sai.
--
-- Duas cartas diferentes, porque são duas situações diferentes:
--   quem JÁ confirmou recebe um "falta pouco" — carinhoso, com data,
--     hora e lugar, para ninguém chegar atrasado por esquecimento;
--   quem NÃO respondeu recebe um empurrão gentil — ainda dá tempo.
-- Quem avisou que não vai não recebe nada. Seria falta de educação.
--
-- Cada convidado recebe no MÁXIMO um lembrete (lembrete_enviado_em), e
-- só se tiver e-mail. Sem isso, um cron diário viraria perseguição.
--
-- Execute no SQL Editor do Supabase (depois da 094).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Quando o lembrete sai
-- ------------------------------------------------------------
alter table public.events
  add column if not exists rsvp_lembrete_dias int;

comment on column public.events.rsvp_lembrete_dias is
  'Quantos dias antes do evento o lembrete vai aos convidados. NULL = a cliente não quer lembrete automático.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_rsvp_lembrete_dias_check') then
    alter table public.events add constraint events_rsvp_lembrete_dias_check
      check (rsvp_lembrete_dias is null or (rsvp_lembrete_dias between 1 and 60));
  end if;
end $$;

alter table public.evento_convidado
  add column if not exists lembrete_enviado_em timestamptz;

comment on column public.evento_convidado.lembrete_enviado_em is
  'Quando o lembrete foi enviado a esta pessoa. Nulo = ainda não recebeu. Garante um por convidado.';

-- O cron varre por aqui: evento com lembrete configurado e data à frente.
create index if not exists idx_convidado_lembrete
  on public.evento_convidado (event_id)
  where lembrete_enviado_em is null and email is not null;

-- ------------------------------------------------------------
-- 2) Quem recebe o lembrete hoje
-- ------------------------------------------------------------
-- Uma função só, chamada pelo cron com service role. Devolve o que o
-- e-mail precisa e nada além — o cron não varre a lista inteira nem
-- carrega telefone de ninguém.
create or replace function public.convidados_para_lembrete()
returns table (
  convidado_id  uuid,
  hash          text,
  nome          text,
  email         text,
  confirmado    boolean,
  pessoas       int,
  event_id      uuid,
  evento_tipo   text,
  evento_data   date,
  evento_hora   time,
  evento_local  text,
  evento_cidade text,
  anfitrioes    text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.hash, c.nome, c.email,
    (c.confirmacao = 'confirmado') as confirmado,
    case when c.confirmacao = 'confirmado'
         then 1 + c.acompanhantes + c.criancas else 0 end as pessoas,
    e.id, e.type::text, e.date, e.time, e.location, e.city,
    coalesce(nullif(trim(e.name), ''), 'os noivos')
  from public.evento_convidado c
  join public.events e on e.id = c.event_id
  where e.rsvp_lembrete_dias is not null
    and e.date >= current_date
    -- chegou a janela: faltam N dias ou menos para o evento
    and current_date >= (e.date - e.rsvp_lembrete_dias)
    and c.email is not null
    and c.lembrete_enviado_em is null
    -- quem avisou que não vai fica em paz
    and c.confirmacao in ('aguardando', 'confirmado')
  order by e.date, c.nome;
$$;

revoke all on function public.convidados_para_lembrete() from public, anon, authenticated;
-- só o service role (o cron) executa

create or replace function public.marcar_lembrete_enviado(p_convidado_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.evento_convidado
     set lembrete_enviado_em = now()
   where id = p_convidado_id;
$$;

revoke all on function public.marcar_lembrete_enviado(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3) Relatório
-- ------------------------------------------------------------
do $$
declare
  v_prontos int;
begin
  select count(*) into v_prontos from public.convidados_para_lembrete();
  raise notice '--- 095 ---';
  raise notice 'convidados que receberiam lembrete hoje: %', v_prontos;
  raise notice '(0 e o esperado: nenhuma cliente configurou o lembrete ainda)';
end $$;

commit;
