import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getPlanejamentoDaNoiva } from "@/lib/supabase/portal-planejamento";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { TelaPlanejamento } from "@/components/portal/noivos/telas/planejamento/TelaPlanejamento";

export const dynamic = "force-dynamic";

// O planejamento da noiva que abriu a conta sozinha (04/10/2026). No
// evento de uma cerimonialista a tela não existe: volta para o início.
export default async function PortalPlanejamentoPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  // só o casamento usa o portal dos noivos (a casca desta tela); a conta de
  // família de 15 anos continua no portal da família
  const plano = usaPortalNoivos(evento.tipo) ? await getPlanejamentoDaNoiva(evento.id, evento.data) : null;
  if (!plano) redirect(`/portal/${evento.id}`);
  return <TelaPlanejamento eventoId={evento.id} plano={plano} />;
}
