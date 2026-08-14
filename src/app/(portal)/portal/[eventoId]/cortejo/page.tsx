import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getCortejo } from "@/lib/supabase/portal-pessoas";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaCortejo } from "@/components/portal/ListaCortejo";

export const dynamic = "force-dynamic";

export default async function PortalCortejoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const pessoas = await getCortejo(evento.id);

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Cortejo"
        apoio="Quem entra com vocês. Basta o nome para começar — o resto pode vir depois."
      />
      <ListaCortejo eventoId={evento.id} pessoas={pessoas} />
    </div>
  );
}
