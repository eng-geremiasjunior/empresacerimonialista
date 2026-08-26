-- ============================================================
-- Vela — Migração 121: uma verba só
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Existiam DUAS verbas para o mesmo evento, e elas divergiam de verdade
-- no banco (medido: um evento com R$ 1.500.000 no Financeiro e
-- R$ 450.000 no Planejamento). Uma tela dizia uma coisa, a outra dizia
-- outra, e quem lê para de confiar nas duas.
--
--   Planejamento: campo tipado 'verba_total' da decisão "Levantar o
--     budget" (evento_campo_valor) — versionado, com detecção de
--     conflito, alcançável pela noiva no portal, e é dele que saem a
--     reserva, a distribuição e o termômetro.
--   Financeiro: coluna events.verba_total (097), escrita por outro
--     caminho, sem saber do campo.
--
-- Decisão: o CAMPO é a fonte da verdade; a coluna vira espelho mantido
-- por gatilho — qualquer escritor (app, portal, futuro) sincroniza sem
-- ninguém precisar lembrar. É o mesmo padrão que escala/cenario já usam.
-- O código que acompanha faz o editor do Financeiro escrever ATRAVÉS do
-- campo quando ele existe (eventos sem Planejamento instanciado seguem
-- escrevendo direto na coluna — nesses só existe uma verba mesmo).

-- ------------------------------------------------------------
-- 1) O gatilho de espelho
-- ------------------------------------------------------------
create or replace function public.espelhar_verba_evento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo = 'verba_total' then
    update public.events
       set verba_total = new.valor_numero
     where id = new.event_id
       and verba_total is distinct from new.valor_numero;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_espelhar_verba on public.evento_campo_valor;
create trigger trg_espelhar_verba
  after insert or update of valor_numero on public.evento_campo_valor
  for each row execute function public.espelhar_verba_evento();

-- ------------------------------------------------------------
-- 2) Acerto do dado que já divergiu
-- ------------------------------------------------------------
-- Campo preenchido vence: definir a verba no Planejamento é o gesto
-- deliberado do método; o editor do Financeiro era o caminho avulso.
update public.events e
   set verba_total = cv.valor_numero
  from public.evento_campo_valor cv
 where cv.event_id = e.id
   and cv.codigo = 'verba_total'
   and cv.valor_numero is not null
   and e.verba_total is distinct from cv.valor_numero;

-- Campo existe mas está vazio e a coluna tem valor: o valor sobe para o
-- campo (senão o gatilho apagaria a coluna na primeira gravação vazia).
update public.evento_campo_valor cv
   set valor_numero = e.verba_total,
       updated_at   = now()
  from public.events e
 where e.id = cv.event_id
   and cv.codigo = 'verba_total'
   and cv.valor_numero is null
   and e.verba_total is not null;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'gatilho de espelho existe' as item,
       exists (select 1 from pg_trigger
               where tgname = 'trg_espelhar_verba') as ok
union all
select 'nenhum evento com as duas verbas divergindo',
       not exists (
         select 1
           from public.evento_campo_valor cv
           join public.events e on e.id = cv.event_id
          where cv.codigo = 'verba_total'
            and cv.valor_numero is not null
            and e.verba_total is distinct from cv.valor_numero
       )
union all
select 'nenhum campo vazio com coluna preenchida',
       not exists (
         select 1
           from public.evento_campo_valor cv
           join public.events e on e.id = cv.event_id
          where cv.codigo = 'verba_total'
            and cv.valor_numero is null
            and e.verba_total is not null
       );
