import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default async function PortalPagamentosPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  return (
    <EmBreve
      eventoId={evento.id}
      titulo="Pagamentos"
      texto="O histórico dos pagamentos combinados com cada fornecedor vai morar aqui. Por enquanto, o Resumo financeiro mostra as parcelas e o que já foi pago."
    />
  );
}
