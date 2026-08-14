import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default async function PortalInformacoesPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  return (
    <EmBreve
      eventoId={evento.id}
      titulo="Informações importantes"
      texto="O que vocês precisam saber para o dia do evento — endereços, horários de chegada e orientações da sua cerimonialista — vai ficar reunido aqui."
    />
  );
}
