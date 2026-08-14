import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default async function PortalConvidadosPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  return (
    <EmBreve
      eventoId={evento.id}
      titulo="Convidados"
      texto="Aqui vocês vão montar a lista de convidados por lado, grupo e mesa — e cada convidado vai poder confirmar presença sozinho, por um link só dele."
    />
  );
}
