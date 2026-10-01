import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { DocumentosSecao } from "@/components/portal/noivos/telas/documentos/Secao";

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

  return <DocumentosSecao eventoId={evento.id} />;
}
