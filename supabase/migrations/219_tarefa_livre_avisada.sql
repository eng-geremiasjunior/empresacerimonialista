-- ============================================================
-- 219 — A tarefa livre entra no aviso da véspera (19/10/2026)
-- ============================================================
-- A rotina das 9h (api/cron/lembretes-tarefas) avisa no sino o que vence
-- amanhã e marca tasks.notified para não repetir. A tarefa livre (217)
-- ganha a mesma marca: `avisada`. Se o prazo mudar, a marca volta a
-- falso, para o aviso do prazo novo sair (a mesma regra da tarefa do
-- evento, que rearma o lembrete quando a data muda).
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. Conferência no fim.

begin;

alter table public.tarefa_livre add column if not exists avisada boolean not null default false;

create index if not exists idx_tarefa_livre_aviso on public.tarefa_livre (prazo) where not avisada and feita_em is null;

create or replace function public.tarefa_livre_rearma_aviso()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.prazo is distinct from old.prazo then
    new.avisada := false;
  end if;
  return new;
end;
$$;

revoke all on function public.tarefa_livre_rearma_aviso() from public, anon, authenticated;

drop trigger if exists trg_rearma_aviso on public.tarefa_livre;
create trigger trg_rearma_aviso before update of prazo on public.tarefa_livre
  for each row execute function public.tarefa_livre_rearma_aviso();

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a marca de aviso existe' as item,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'tarefa_livre' and column_name = 'avisada') as ok
union all
select 'prazo novo rearma o aviso',
       exists (select 1 from pg_trigger where tgname = 'trg_rearma_aviso' and tgrelid = 'public.tarefa_livre'::regclass);
