import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MesasDoEvento } from "@/components/mesas/MesasDoEvento";
import {
  getConvidadosCroqui,
  getElementos,
  getMesas,
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
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (!evento) notFound();

  const [salao, mesas, elementos, convidados, relacoes] = await Promise.all([
    getSalao(params.id),
    getMesas(params.id),
    getElementos(params.id),
    getConvidadosCroqui(params.id),
    getRelacoes(params.id),
  ]);

  return (
    <MesasDoEvento
      eventId={params.id}
      salao={salao}
      mesas={mesas}
      elementos={elementos}
      convidados={convidados}
      relacoes={relacoes}
    />
  );
}
