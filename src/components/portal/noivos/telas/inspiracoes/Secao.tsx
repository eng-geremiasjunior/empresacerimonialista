// Inspirações — "O mural de vocês" (desenho v4, README §13). Componente
// de SERVIDOR: lê o mural pela sessão da família (a RLS decide) e quem
// está com o portal aberto (o autor das fotos que ela subir), e entrega
// só dados simples à tela (cliente).

import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { getNomesDoCasal } from "@/lib/supabase/portal-noivos";
import { iniciaisDoCasal } from "@/lib/portal-noivos";
import { getMural } from "./dados";
import { TelaInspiracoes } from "./TelaInspiracoes";

export async function InspiracoesSecao({
  eventoId,
  nomeDoEvento,
}: {
  eventoId: string;
  nomeDoEvento: string | null;
}) {
  const [fotos, eu, casal] = await Promise.all([
    getMural(eventoId),
    getMeuAcesso(eventoId),
    getNomesDoCasal(eventoId, nomeDoEvento),
  ]);

  return (
    <TelaInspiracoes
      fotos={fotos}
      autor={eu.nome?.trim() || null}
      inicialDoCasal={iniciaisDoCasal(casal).a}
    />
  );
}
