import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCortejo } from "@/lib/supabase/portal-pessoas";
import { CortejoEquipe } from "@/components/eventos/CortejoEquipe";

export const dynamic = "force-dynamic";

// As listas de pessoas do evento, pelo lado da equipe. No casamento é o
// cortejo de entrada; na formatura são as listas da colação — formandos
// em ordem, mesa de honra, quem discursa — e é daqui que sai a folha de
// chamada do mestre de cerimônias.

export default async function CortejoEquipePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("id, type, name, evento_pai_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) notFound();

  // A lista é UMA por turma e mora no evento principal. Aberto pelo
  // evento da colação (filho), esta tela lê e edita a lista do pai —
  // senão a chamada apareceria vazia justamente no dia em que é usada.
  const paiId = data.evento_pai_id as string | null;
  const alvoId = paiId ?? data.id;

  // Quem enxerga só a colação (escala por evento) não alcança a lista,
  // que vive no principal — dizer isso vale mais do que fingir lista vazia.
  if (paiId) {
    const { data: pai } = await supabase
      .from("events")
      .select("id")
      .eq("id", paiId)
      .maybeSingle();
    if (!pai) {
      return (
        <p className="text-sm text-gray-500">
          A lista desta turma fica no evento principal (o baile), que não
          está na sua escala. Peça acesso a quem coordena o evento.
        </p>
      );
    }
  }

  const pessoas = await getCortejo(alvoId);

  return (
    <CortejoEquipe
      eventId={alvoId}
      // a folha sai com a data e o local do evento ABERTO (a colação tem
      // os dela); só a lista vem do principal
      printEventId={data.id}
      tipo={data.type as string}
      pessoas={pessoas}
    />
  );
}
