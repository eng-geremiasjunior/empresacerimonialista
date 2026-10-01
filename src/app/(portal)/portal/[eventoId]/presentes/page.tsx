import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { getRecebedor, listaDePresentesLiberada } from "@/lib/supabase/portal-presentes";
import { usaPortalV2 } from "@/lib/portal-v2";
import { PresentesV2 } from "@/components/portal/v2/PresentesV2";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { PresentesSecao } from "@/components/portal/noivos/telas/presentes/Secao";

export const dynamic = "force-dynamic";

// A lista de presentes (182+): hoje no portal v2.
export default async function PortalPresentesPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  // portal dos noivos (desenho v4): o casamento — a chave Pix e a lista do site
  if (usaPortalNoivos(evento.tipo)) return <PresentesSecao eventoId={evento.id} />;

  if (!usaPortalV2(evento.tipo) || !(await listaDePresentesLiberada(evento.id))) notFound();

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
