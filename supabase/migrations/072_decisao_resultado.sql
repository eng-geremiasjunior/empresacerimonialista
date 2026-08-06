-- 072 — Resultado da decisão (capturar o QUE foi decidido, não só o estado)
--
-- Até aqui a decisão só guardava estado (pendente/decidida/nao_se_aplica) e
-- gerava tarefas. Faltava o operacional: registrar o conteúdo — qual buffet,
-- qual valor, qual formato. Sem isso a cerimonialista não responde "o que
-- fechamos?" olhando o Planejamento.
--
-- Coluna livre, opcional. A DATA do casamento é caso à parte: já é campo de
-- primeira classe em events.date (a UI grava lá direto, disparando o
-- recálculo 4D), então não duplica aqui.

alter table public.evento_decisao
  add column if not exists resultado text;

comment on column public.evento_decisao.resultado is
  'O que foi decidido (texto livre): fornecedor, valor, formato… '
  'A data do casamento não vem aqui — é events.date.';
