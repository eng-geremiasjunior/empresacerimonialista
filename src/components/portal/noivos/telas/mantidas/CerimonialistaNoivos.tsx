// "A sua cerimonialista" no portal dos noivos (conta de família, 188):
// mantida como está — o link do convite e a resposta ao pedido —, com o
// cabeçalho do desenho no lugar do TopoInterno. Componente de SERVIDOR:
// a mesma leitura do ramo de sempre (cerimonialista/page.tsx).
//
// Sem subtítulo: o de sempre era o nome do evento, que a capa nova já
// mostra; o cartão logo abaixo diz o que fazer.

import { appUrl } from "@/lib/app-url";
import { ConviteParaCerimonialista } from "@/components/portal/ConviteParaCerimonialista";
import { estadoDoConvite } from "@/app/(portal)/portal/[eventoId]/cerimonialista/actions";
import { TelaMantida } from "./TelaMantida";

export async function CerimonialistaNoivos({ eventoId }: { eventoId: string }) {
  // só LÊ: o link que ainda vale e o pedido esperando (o link novo só
  // nasce no clique)
  const estado = await estadoDoConvite(eventoId);

  return (
    <TelaMantida eyebrow="Cerimonialista" titulo="A sua cerimonialista">
      <ConviteParaCerimonialista
        eventoId={eventoId}
        base={appUrl()}
        tokenInicial={estado.token}
        pedido={estado.pedido}
        festa="o nosso casamento"
      />
    </TelaMantida>
  );
}
