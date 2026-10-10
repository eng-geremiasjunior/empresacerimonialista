-- ============================================================
-- eOrganizei — Migração 202: o evento do plano gratuito conta para sempre
-- Execute no SQL Editor do Supabase (depois da 201).
--
-- O furo (09/10/2026): o plano gratuito dá UM evento (147: "o primeiro
-- evento é a primeira linha"), mas eventos_da_vida contava as linhas que
-- EXISTEM em events. Apagar o evento devolvia a vaga: uma conta montou o
-- evento inteiro (planejamento, roteiro), apagou e começou outro, várias
-- vezes, sem pagar.
--
-- Agora cada evento criado fica registrado em evento_criado, e apagar só
-- marca a hora. A conta de eventos da vida lê o registro, não events.
-- Exceção: o evento apagado em até 30 minutos depois de criado (o engano
-- de quem errou o tipo ou o nome) não conta.
--
-- O registro nasce com os eventos de HOJE (o passado apagado não é
-- conhecido): ninguém perde vaga que já tem; só deixa de existir o
-- "apagar para ganhar outra".
-- ============================================================

create table if not exists public.evento_criado (
  event_id    uuid primary key,
  empresa_id  uuid not null,
  exemplo     boolean not null default false,
  criado_em   timestamptz not null default now(),
  apagado_em  timestamptz
);

create index if not exists idx_evento_criado_empresa on public.evento_criado (empresa_id);

-- só as funções do banco (security definer) leem: nenhuma policy
alter table public.evento_criado enable row level security;

-- os eventos de hoje
insert into public.evento_criado (event_id, empresa_id, exemplo, criado_em)
select e.id, e.empresa_id, coalesce(e.exemplo, false), coalesce(e.created_at, now())
  from public.events e
 where e.empresa_id is not null
on conflict (event_id) do nothing;

-- o registro acompanha events: nasce no insert (depois do gatilho que
-- preenche empresa_id), marca o exemplo se ele mudar, e o delete só anota
-- a hora
create or replace function public.trg_evento_criado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.empresa_id is not null then
      insert into public.evento_criado (event_id, empresa_id, exemplo, criado_em)
      values (new.id, new.empresa_id, coalesce(new.exemplo, false), coalesce(new.created_at, now()))
      on conflict (event_id) do nothing;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    update public.evento_criado
       set exemplo = coalesce(new.exemplo, false),
           empresa_id = coalesce(new.empresa_id, empresa_id)
     where event_id = new.id;
    return new;
  else
    update public.evento_criado set apagado_em = now() where event_id = old.id;
    return old;
  end if;
end $$;

revoke all on function public.trg_evento_criado() from public, anon, authenticated;

drop trigger if exists evento_criado_ins on public.events;
create trigger evento_criado_ins
  after insert on public.events
  for each row execute function public.trg_evento_criado();

drop trigger if exists evento_criado_upd on public.events;
create trigger evento_criado_upd
  after update of exemplo, empresa_id on public.events
  for each row execute function public.trg_evento_criado();

drop trigger if exists evento_criado_del on public.events;
create trigger evento_criado_del
  after delete on public.events
  for each row execute function public.trg_evento_criado();

-- A conta de eventos da vida (mesma assinatura da 147/174): o registro,
-- sem os exemplos e sem o engano apagado em até 30 minutos.
create or replace function public.eventos_da_vida(p_empresa_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.evento_criado c
   where c.empresa_id = p_empresa_id
     and not c.exemplo
     and not (c.apagado_em is not null and c.apagado_em < c.criado_em + interval '30 minutes');
$$;

revoke all on function public.eventos_da_vida(uuid) from public, anon;
grant execute on function public.eventos_da_vida(uuid) to authenticated;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'tabela evento_criado com RLS ligada' as verificacao,
       coalesce((select relrowsecurity from pg_class where oid = 'public.evento_criado'::regclass), false) as ok
union all
select 'todo evento de hoje está no registro',
       not exists (select 1 from public.events e
                    where e.empresa_id is not null
                      and not exists (select 1 from public.evento_criado c where c.event_id = e.id))
union all
select 'os três gatilhos em events',
       (select count(*) = 3 from pg_trigger
         where tgrelid = 'public.events'::regclass
           and tgname in ('evento_criado_ins', 'evento_criado_upd', 'evento_criado_del'))
union all
select 'eventos_da_vida lê o registro',
       pg_get_functiondef('public.eventos_da_vida(uuid)'::regprocedure) ilike '%evento_criado%';
