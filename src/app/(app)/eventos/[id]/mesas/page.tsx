import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tem } from "@/lib/capacidades";
import { MesasDoEvento } from "@/components/mesas/MesasDoEvento";
import {
  getConvidadosCroqui,
  getElementos,
  getMesas,
  getPresentes,
  getRelacoes,
  getSalao,
} from "@/lib/supabase/mesas";

export const dynamic = "force-dynamic";

// O croqui do salão: mesas em escala real, alocação de convidados e as
// três folhas do dia (recepção, buffet, montagem).
export default async function MesasPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: evento } = await supabase
    .from("events")
    .select("id, type, date")
    .eq("id", params.id)
    .maybeSingle();
  if (!evento) notFound();
  if (!tem(evento.type as string, "mesas")) notFound();

  const [salao, mesas, elementos, convidados, relacoes, presentes] = await Promise.all([
    getSalao(params.id),
    getMesas(params.id),
    getElementos(params.id),
    getConvidadosCroqui(params.id),
    getRelacoes(params.id),
    // "chegaram" vem do banco (148), não de uma soma na tela
    getPresentes(params.id),
  ]);

  return (
    <MesasDoEvento
      eventId={params.id}
      tipoEvento={evento.type as string}
      eventDate={evento.date as string}
      salao={salao}
      mesas={mesas}
      elementos={elementos}
      convidados={convidados}
      relacoes={relacoes}
      presentes={presentes?.quantidade ?? null}
    />
  );
}
