import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { getTarefasDoPortal } from "@/lib/supabase/portal-tarefas";
import { pessoaDoEvento, usaPortalV2 } from "@/lib/portal-v2";
import { TarefasV2 } from "@/components/portal/v2/TarefasV2";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";

// Tarefas da família (179). Só existe no portal v2: no portal de hoje as
// tarefas da cliente aparecem nas perguntas e no Início.
export default async function PortalTarefasPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento || !usaPortalV2(evento.tipo)) notFound();

  const [{ tarefas, daCerimonialista }, contato, eu] = await Promise.all([
    getTarefasDoPortal(evento.id),
    getContatoCerimonialista(evento.id),
    getMeuAcesso(evento.id),
  ]);

  // "quem faz": a debutante, quem abriu o portal e a família
  const quemPode = Array.from(
    new Set([pessoaDoEvento(evento.nome), eu.nome?.split(" ")[0] ?? null, "família"].filter((x): x is string => !!x))
  );

  return (
    <TarefasV2
      eventoId={evento.id}
      tarefas={tarefas}
      daCerimonialista={daCerimonialista}
      cerimonialista={contato.nome?.split(" ")[0] ?? "Sua cerimonialista"}
      quemPode={quemPode}
      hoje={hojeBR()}
    />
  );
}
