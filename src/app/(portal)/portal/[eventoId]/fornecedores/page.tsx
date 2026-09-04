import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default async function PortalFornecedoresPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  return (
    <EmBreve
      eventoId={evento.id}
      titulo="Fornecedores"
      texto="Os fornecedores já confirmados para o seu evento vão aparecer aqui, com o que cada um cuida no dia."
    />
  );
}
