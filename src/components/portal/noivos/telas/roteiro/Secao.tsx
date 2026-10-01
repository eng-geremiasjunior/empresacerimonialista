// Roteiro do dia — "20 de março, hora a hora" (desenho v4, README §16;
// protótipo, template 690–706 e lógica 1104–1105). Componente de
// SERVIDOR: lê o programa pela janela da 092 (portal_programa_do_dia: só
// horário, título e duração) e as sugestões do casal (roteiro_sugestao),
// pela sessão da família, e entrega só dados simples à tela (cliente).

import { getProgramaDoDia, getSugestoesDoEvento } from "@/lib/supabase/programa-do-dia";
import { exemploMomentoDoDia } from "@/lib/papel";
import { diaEMes, montarRoteiro } from "./montar";
import { TelaRoteiro } from "./TelaRoteiro";

export async function RoteiroSecao({
  eventoId,
  data,
  tipo,
}: {
  eventoId: string;
  /** a data da festa, AAAA-MM-DD */
  data: string;
  tipo: string;
}) {
  const [momentos, sugestoes] = await Promise.all([getProgramaDoDia(eventoId), getSugestoesDoEvento(eventoId)]);
  const { linhas, pedidos } = montarRoteiro(momentos, sugestoes);

  return <TelaRoteiro linhas={linhas} pedidos={pedidos} dia={diaEMes(data)} exemplo={exemploMomentoDoDia(tipo)} />;
}
