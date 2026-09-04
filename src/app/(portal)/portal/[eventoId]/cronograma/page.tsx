import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import {
  getProgramaDoDia,
  getSugestoesDoEvento,
} from "@/lib/supabase/programa-do-dia";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ProgramaDoDia } from "@/components/portal/ProgramaDoDia";

export const dynamic = "force-dynamic";

export default async function PortalCronogramaPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const [momentos, sugestoes] = await Promise.all([
    getProgramaDoDia(evento.id),
    getSugestoesDoEvento(evento.id),
  ]);

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Roteiro do dia"
        apoio="O programa como está hoje. Se algum horário não servir, é só sugerir — quem ajusta é a sua cerimonialista."
      />
      <ProgramaDoDia
        eventoId={evento.id}
        tipo={evento.tipo}
        momentos={momentos}
        sugestoes={sugestoes}
      />
    </div>
  );
}
