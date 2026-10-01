// A linha do tempo do portal dos noivos (desenho v4, README §7), como
// seção de servidor: carrega os próprios dados e entrega o cartão. A rota
// /linha-do-tempo e a Visão geral renderizam a mesma seção.
//
// Tudo pela sessão da família (a RLS decide o que volta) e com os
// carregadores que o portal já tem; os que a Visão geral também pede saem
// uma vez só por request (cache()). Nenhum valor em dinheiro atravessa:
// da parcela vai só a data.

import { getEventoDoPortal, getHomePortal, getInvestimento, getLinhaDoTempo } from "@/lib/supabase/portal";
import { getTarefasDoPortal } from "@/lib/supabase/portal-tarefas";
import { getNomesDoCasal } from "@/lib/supabase/portal-noivos";
import { hojeBR } from "@/lib/tempo";
import { montarLinhaDoTempo } from "./montar";
import { CartaoLinhaDoTempo } from "./CartaoLinhaDoTempo";

export async function LinhaDoTempoSecao({ eventoId }: { eventoId: string }) {
  const evento = await getEventoDoPortal(eventoId);
  if (!evento) return null;

  const [linhaDoTempo, home, investimento, tarefas, casal] = await Promise.all([
    getLinhaDoTempo(evento.id),
    getHomePortal(evento.id, evento.data),
    getInvestimento(evento.id),
    getTarefasDoPortal(evento.id),
    getNomesDoCasal(evento.id, evento.nome),
  ]);

  const meses = montarLinhaDoTempo({
    hoje: hojeBR(),
    dataEvento: evento.data,
    horaEvento: evento.hora,
    local: evento.local,
    cidade: evento.cidade,
    casal,
    tarefas: tarefas.tarefas,
    daCerimonialista: tarefas.daCerimonialista,
    decisoes: home.faltaDecidir,
    linhaDoTempo,
    // da parcela, montar() usa só a data e se já foi paga
    parcelas: investimento?.parcelas ?? [],
  });
  if (meses.length === 0) return null;

  return <CartaoLinhaDoTempo meses={meses} />;
}
