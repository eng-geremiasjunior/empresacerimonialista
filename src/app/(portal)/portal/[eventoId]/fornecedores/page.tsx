import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getFornecedoresDoPortal } from "@/lib/supabase/portal-fornecedores";
import { usaPortalV2 } from "@/lib/portal-v2";
import { FornecedoresV2 } from "@/components/portal/v2/FornecedoresV2";
import { EmBreve } from "@/components/portal/EmBreve";

export const dynamic = "force-dynamic";

export default async function PortalFornecedoresPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  // portal v2 (181): os da cerimonialista e os da família
  if (usaPortalV2(evento.tipo)) {
    const [{ daCerimonialista, daFamilia }, contato] = await Promise.all([
      getFornecedoresDoPortal(evento.id),
      getContatoCerimonialista(evento.id),
    ]);
    return (
      <FornecedoresV2
        eventoId={evento.id}
        daCerimonialista={daCerimonialista}
        daFamilia={daFamilia}
        cerimonialista={contato.nome?.split(" ")[0] ?? "Sua cerimonialista"}
      />
    );
  }
  return (
    <EmBreve
      eventoId={evento.id}
      titulo="Fornecedores"
      texto="Os fornecedores já confirmados para o seu evento vão aparecer aqui, com o que cada um cuida no dia."
    />
  );
}
