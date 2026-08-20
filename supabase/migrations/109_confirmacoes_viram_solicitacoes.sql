-- 109 — as confirmações que já existem viram solicitações.
--
-- supplier_confirmations é o primeiro motor de "pedir algo ao fornecedor"
-- do sistema, e tem histórico real. A Central de Solicitações generaliza
-- esse motor, então em vez de nascer vazia ela nasce com o que já existe.
--
-- Sem big bang: a tabela antiga continua de pé, o link /confirmacao/[hash]
-- continua funcionando, e a RPC responder_solicitacao mantém as duas em
-- sincronia. Esta migração só espelha o passado para dentro do modelo novo.
--
-- Uma decisão importante aqui: as confirmações ainda pendentes entram com
-- as tentativas ESGOTADAS. Elas aparecem na página do fornecedor (é
-- contexto verdadeiro: ele deve isso mesmo), mas não entram na fila de
-- cobrança automática. Importar o passado como se fosse novo faria a
-- rotina montar dezenas de mensagens na primeira manhã de uso — a
-- cerimonialista abriria o Vela e encontraria um mutirão que ela não pediu.
-- A cobrança automática vale para o que nascer daqui em diante.
--
-- Convergente: pode rodar quantas vezes for preciso.

begin;

insert into public.solicitacao_fornecedor
  (empresa_id, supplier_id, event_id, tipo, titulo, status,
   enviada_em, respondida_em, resposta, tentativas, prazo_ate)
select
  sc.empresa_id,
  sc.supplier_id,
  sc.event_id,
  'confirmacao',
  'Confirmar presença no evento',
  case when sc.status = 'pendente' then 'enviada' else 'respondida' end,
  coalesce(sc.created_at, now()),
  sc.responded_at,
  case
    when sc.status = 'confirmado' then jsonb_build_object('confirmado', true,  'origem', 'link antigo')
    when sc.status = 'recusado'   then jsonb_build_object('confirmado', false, 'origem', 'link antigo')
    else null
  end,
  2,     -- tentativas esgotadas: entra como contexto, não como cobrança
  null   -- sem prazo, para não expirar sozinha e virar tarefa em massa
from public.supplier_confirmations sc
join public.events ev on ev.id = sc.event_id
where sc.empresa_id is not null
  and ev.status <> 'cancelado'
  and not exists (
    select 1
    from public.solicitacao_fornecedor sf
    where sf.event_id = sc.event_id
      and sf.supplier_id = sc.supplier_id
      and sf.tipo = 'confirmacao'
  );

commit;

do $$
declare
  v_total int;
  v_abertas int;
begin
  select count(*) into v_total
  from public.solicitacao_fornecedor where tipo = 'confirmacao';
  select count(*) into v_abertas
  from public.solicitacao_fornecedor
  where tipo = 'confirmacao' and status in ('enviada', 'reenviada');
  raise notice '109 aplicada: % confirmações na Central, % ainda sem resposta.',
    v_total, v_abertas;
end $$;
