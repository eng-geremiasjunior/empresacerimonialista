import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { InspiracoesSecao } from "@/components/portal/noivos/telas/inspiracoes/Secao";

export const dynamic = "force-dynamic";

// Inspirações — "O mural de vocês" (portal dos noivos, desenho v4). Tela
// só do casamento: nos outros tipos, as referências continuam dentro do
// guia de estilo.
export default async function PortalInspiracoesPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!usaPortalNoivos(evento.tipo)) redirect(`/portal/${evento.id}`);

  return <InspiracoesSecao eventoId={evento.id} nomeDoEvento={evento.nome} />;
}
