import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { getConviteDoCasal } from "@/components/portal/noivos/telas/convite/dados";
import { TelaConvite } from "@/components/portal/noivos/telas/convite/TelaConvite";

export const dynamic = "force-dynamic";

// O convite animado (196): o que chega no WhatsApp e leva ao site. Hoje
// só no casamento (portal dos noivos); a debutante vem depois.
export default async function PortalConvitePage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento || !usaPortalNoivos(evento.tipo)) notFound();
  const dados = await getConviteDoCasal(evento.id);
  if (!dados) notFound();
  return <TelaConvite dados={dados} />;
}
