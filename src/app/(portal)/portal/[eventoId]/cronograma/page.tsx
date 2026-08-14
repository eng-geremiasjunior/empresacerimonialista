import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default async function PortalCronogramaPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  return (
    <EmBreve
      eventoId={evento.id}
      titulo="Cronograma do dia"
      texto="O programa do grande dia, momento a momento. Quando estiver montado, vocês vão poder acompanhar por aqui — e sugerir ajustes para a sua cerimonialista."
    />
  );
}
