import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { getRecebedor, listaDePresentesLiberada } from "@/lib/supabase/portal-presentes";
import { usaPortalV2 } from "@/lib/portal-v2";
import { PresentesV2 } from "@/components/portal/v2/PresentesV2";

export const dynamic = "force-dynamic";

// A lista de presentes (182+): hoje no portal v2.
export default async function PortalPresentesPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento || !usaPortalV2(evento.tipo) || !(await listaDePresentesLiberada(evento.id))) notFound();

  const [recebedor, eu, contato] = await Promise.all([
    getRecebedor(evento.id),
    getMeuAcesso(evento.id),
    getContatoCerimonialista(evento.id),
  ]);

  return (
    <PresentesV2
      eventoId={evento.id}
      recebedor={recebedor}
      souResponsavel={eu.papel !== null && eu.papel !== "debutante"}
      meuNome={eu.nome}
      cerimonialista={contato.nome?.split(" ")[0] ?? "Sua cerimonialista"}
    />
  );
}
