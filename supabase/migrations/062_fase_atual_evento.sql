-- 062 — Jornada do evento: PLANEJAMENTO → ORGANIZAÇÃO → EXECUÇÃO
--
-- fase_atual é só a fase que o sistema SUGERE abrir ao entrar no evento
-- (a primeira ainda não concluída). Não restringe navegação: a
-- cerimonialista clica em qualquer fase a qualquer momento, inclusive
-- voltando para Planejamento.
--
-- A coluna entra em `events`, não em `eventos`: as duas são a mesma
-- relação (mesmas colunas, mesmas 49 linhas) e todo o código usa
-- from("events"). Um ALTER TABLE no lado errado falharia se `eventos`
-- for view.
--
-- Antes disso as fases eram Planejamento/Operação/Pós-evento, calculadas
-- em src/lib/supabase/resumo-evento.ts e nunca gravadas. Elas somem: a
-- jornada nova as substitui, para não ficarem dois medidores de progresso
-- dizendo coisas diferentes na mesma tela.

alter table public.events
  add column if not exists fase_atual text not null default 'planejamento';

alter table public.events
  drop constraint if exists events_fase_atual_check;
alter table public.events
  add constraint events_fase_atual_check
  check (fase_atual in ('planejamento', 'organizacao', 'execucao'));

-- Filtrar a lista de eventos por fase é uma leitura de tela; o índice
-- evita varredura quando a empresa cresce.
create index if not exists idx_events_empresa_fase
  on public.events (empresa_id, fase_atual);
