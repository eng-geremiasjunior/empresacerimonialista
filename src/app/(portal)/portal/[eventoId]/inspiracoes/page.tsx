import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getInspiracoes } from "@/lib/supabase/inspiracoes";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { MuralInspiracoes } from "@/components/portal/MuralInspiracoes";

export const dynamic = "force-dynamic";

export default async function PortalInspiracoesPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const imagens = await getInspiracoes(evento.id);

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Inspirações"
        apoio="O que vocês gostaram, num lugar só. Sua cerimonialista usa isso nas conversas com os fornecedores."
      />
      <MuralInspiracoes eventoId={evento.id} imagens={imagens} />
    </div>
  );
}
