-- ============================================================
-- 204 — A confirmação de presença (RSVP) só nos planos pagos
-- ============================================================
-- Decisão dele (09/10/2026): "eu acrescentaria o RSVP também só nos
-- pagos; o gratuito será basicamente para conhecer". Base: a 203
-- (nivel_do_plano).
--
-- Como: o link de confirmação de cada evento já tem uma chave
-- (events.rsvp_aberto, 094) que TODAS as portas do convidado respeitam
-- — autocadastrar_convidado, responder_convite_convidado e
-- responder_convite_por_pessoa devolvem 'encerrado', e a página diz "As
-- confirmações já foram encerradas". Esta migração mantém essa chave
-- desligada nas contas do Gratuito:
--   1) gatilho em events: quem não tem o RSVP no plano não liga a chave
--      (e o evento novo do Gratuito já nasce com ela desligada);
--   2) fechar_rsvp_do_gratuito(): desliga a chave dos eventos de quem
--      está no Gratuito — roda aqui uma vez e todo dia pelo despachante
--      (o teste que vence vira Gratuito sem ninguém mexer);
--   3) gatilho em evento_convidado: a gravação ANÔNIMA (o convidado) de
--      uma confirmação numa conta sem o RSVP é recusada — a rede de
--      segurança para o intervalo entre o plano cair e a rotina rodar.
--
-- Fora da trava: a conta de família (o portal da noiva; nivel 'familia')
-- e as contas da casa (os exemplos do /conhecer e as contas de teste
-- dele). A equipe continua marcando presença à mão; o que sai é o
-- convidado confirmar sozinho.
--
-- Convergente: pode rodar mais de uma vez.

begin;

create or replace function public.rsvp_liberado(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_empresa_id is null
      or exists (select 1 from public.contas_da_casa c where c.empresa_id = p_empresa_id)
      or coalesce(public.nivel_do_plano(p_empresa_id), 'gratuito') <> 'gratuito';
$$;

revoke all on function public.rsvp_liberado(uuid) from public, anon, authenticated;

-- 1) a chave do link
create or replace function public.trg_rsvp_do_plano()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rsvp_aberto is distinct from false and not public.rsvp_liberado(new.empresa_id) then
    new.rsvp_aberto := false;
  end if;
  return new;
end;
$$;

revoke all on function public.trg_rsvp_do_plano() from public, anon, authenticated;

drop trigger if exists trg_rsvp_do_plano on public.events;
create trigger trg_rsvp_do_plano
  before insert or update of rsvp_aberto on public.events
  for each row execute function public.trg_rsvp_do_plano();

-- 2) a rotina
create or replace function public.fechar_rsvp_do_gratuito()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  update public.events e
     set rsvp_aberto = false
   where e.rsvp_aberto is distinct from false
     and not public.rsvp_liberado(e.empresa_id);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.fechar_rsvp_do_gratuito() from public, anon, authenticated;
grant execute on function public.fechar_rsvp_do_gratuito() to service_role;

select public.fechar_rsvp_do_gratuito();

-- 3) a rede de segurança: o convidado (anônimo) não confirma sem o plano
create or replace function public.trg_confirmacao_do_plano()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'anon'
     and not public.rsvp_liberado((select e.empresa_id from public.events e where e.id = new.event_id)) then
    raise exception 'as confirmações deste evento estão encerradas';
  end if;
  return new;
end;
$$;

revoke all on function public.trg_confirmacao_do_plano() from public, anon, authenticated;

drop trigger if exists trg_confirmacao_do_plano on public.evento_convidado;
create trigger trg_confirmacao_do_plano
  before insert or update of confirmacao on public.evento_convidado
  for each row execute function public.trg_confirmacao_do_plano();

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'nenhum evento do Gratuito com o link aberto (fora as contas da casa e de família)' as item,
       not exists (select 1 from public.events e
                    where e.rsvp_aberto is distinct from false
                      and not public.rsvp_liberado(e.empresa_id)) as ok
union all
select 'os dois gatilhos existem',
       exists (select 1 from pg_trigger where tgname = 'trg_rsvp_do_plano' and not tgisinternal)
       and exists (select 1 from pg_trigger where tgname = 'trg_confirmacao_do_plano' and not tgisinternal)
union all
select 'a conta de família e as da casa continuam liberadas',
       not exists (select 1 from public.empresas x where x.tipo = 'familia' and not public.rsvp_liberado(x.id))
       and not exists (select 1 from public.contas_da_casa c where not public.rsvp_liberado(c.empresa_id))
union all
select 'ninguém de fora chama as funções novas',
       not has_function_privilege('anon', 'public.rsvp_liberado(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.fechar_rsvp_do_gratuito()', 'execute')
       and not has_function_privilege('anon', 'public.fechar_rsvp_do_gratuito()', 'execute');
