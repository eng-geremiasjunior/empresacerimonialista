import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { DocumentosSecao } from "@/components/portal/noivos/telas/documentos/Secao";
import { TelaDocumentosDaNoiva } from "@/components/portal/noivos/telas/documentos/TelaDocumentosDaNoiva";
import { getDocumentosDaNoiva } from "@/lib/supabase/portal-documentos-da-noiva";

export const dynamic = "force-dynamic";

// Documentos (portal dos noivos, desenho v4): contratos e comprovantes, o
// que espera a aprovação do casal e o histórico. Só no casamento; nos
// outros tipos a tela não existe e o endereço volta para o início.
export default async function PortalDocumentosPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!usaPortalNoivos(evento.tipo)) redirect(`/portal/${evento.id}`);

  // a noiva que abriu a conta sozinha (04/10/2026) anexa os contratos e os
  // comprovantes dela; com cerimonialista, a tela de sempre
  const daNoiva = await getDocumentosDaNoiva(evento.id);
  if (daNoiva) return <TelaDocumentosDaNoiva documentos={daNoiva} />;
  return <DocumentosSecao eventoId={evento.id} />;
}
