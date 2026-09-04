import { notFound } from "next/navigation";
import { rotuloCortejo } from "@/lib/papel";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getCortejo } from "@/lib/supabase/portal-pessoas";
import { tem } from "@/lib/capacidades";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaCortejo } from "@/components/portal/ListaCortejo";

export const dynamic = "force-dynamic";

export default async function PortalCortejoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!tem(evento.tipo, "cortejo")) notFound();

  // Evento ligado (a colação de uma formatura): a lista da turma é UMA e
  // vive no evento principal. Gravar aqui criaria uma segunda lista que a
  // equipe nunca veria — melhor apontar o caminho do que divergir.
  const supabase = createClient();
  const { data: euMesmo } = await supabase
    .from("events")
    .select("evento_pai_id")
    .eq("id", evento.id)
    .maybeSingle();
  if (euMesmo?.evento_pai_id) {
    return (
      <div className="portal-tela">
        <TopoInterno
          eventoId={evento.id}
          titulo={rotuloCortejo(evento.tipo)}
          apoio="As listas da turma ficam no evento do baile — é lá que vocês preenchem e a chamada é montada."
        />
      </div>
    );
  }

  const pessoas = await getCortejo(evento.id);
  const ehFormatura = evento.tipo === "formatura";

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo={rotuloCortejo(evento.tipo)}
        apoio={
          ehFormatura
            ? "Formandos na ordem de entrada, mesa de honra e quem discursa. Basta o nome para começar."
            : "Quem entra com vocês. Basta o nome para começar — o resto pode vir depois."
        }
      />
      <ListaCortejo eventoId={evento.id} tipo={evento.tipo} pessoas={pessoas} />
    </div>
  );
}
