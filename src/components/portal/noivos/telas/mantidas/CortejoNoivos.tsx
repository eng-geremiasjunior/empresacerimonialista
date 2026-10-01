// Cortejo no portal dos noivos (README §22: mantida). Componente de
// SERVIDOR: a mesma leitura e a mesma lista do ramo de sempre
// (cortejo/page.tsx), com o cabeçalho do desenho no lugar do
// TopoInterno.

import { getCortejo } from "@/lib/supabase/portal-pessoas";
import { ListaCortejo } from "@/components/portal/ListaCortejo";
import { TelaMantida } from "./TelaMantida";

export async function CortejoNoivos({ eventoId, tipo }: { eventoId: string; tipo: string }) {
  const pessoas = await getCortejo(eventoId);

  return (
    <TelaMantida
      eyebrow="Cortejo"
      titulo="Quem entra e em que ordem"
      sub="Quem entra com vocês. Basta o nome para começar — o resto pode vir depois."
    >
      <ListaCortejo eventoId={eventoId} tipo={tipo} pessoas={pessoas} />
    </TelaMantida>
  );
}
