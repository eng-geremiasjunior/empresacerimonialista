import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalV2 } from "@/lib/portal-v2";
import { NoiteV2 } from "@/components/portal/v2/NoiteV2";
import { linhaDoLocal } from "@/components/portal/v2/dadosDoInicio";
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

  // portal v2: o palco com a luz de cada momento e a sugestão de horário
  if (usaPortalV2(evento.tipo)) {
    const contato = await getContatoCerimonialista(evento.id);
    return (
      <NoiteV2
        eventoId={evento.id}
        momentos={momentos}
        sugestoes={sugestoes}
        cerimonialista={contato.nome?.split(" ")[0] ?? "Sua cerimonialista"}
        linha={linhaDoLocal(evento.data, null, evento.local, evento.cidade)}
      />
    );
  }

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
