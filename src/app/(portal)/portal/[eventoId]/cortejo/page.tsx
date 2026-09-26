import { notFound } from "next/navigation";
import { rotuloCortejo } from "@/lib/papel";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getCortejo } from "@/lib/supabase/portal-pessoas";
import { tem } from "@/lib/capacidades";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ListaCortejo } from "@/components/portal/ListaCortejo";
import { CorteV2 } from "@/components/portal/v2/CorteV2";
import { getProgramaDoDia } from "@/lib/supabase/programa-do-dia";
import { pessoaDoEvento, usaPortalV2 } from "@/lib/portal-v2";

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
  if (evento.eventoPaiId) {
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

  // portal v2: o palco das 15 velas, a ordem de chamada e a corte
  if (usaPortalV2(evento.tipo)) {
    const [pessoasV2, programa] = await Promise.all([getCortejo(evento.id), getProgramaDoDia(evento.id)]);
    const momentoDasVelas = programa.find((m) => /vela/i.test(m.titulo) && m.hora);
    return (
      <CorteV2
        eventoId={evento.id}
        pessoas={pessoasV2}
        debutante={pessoaDoEvento(evento.nome)}
        horaDasVelas={momentoDasVelas?.hora?.slice(0, 5) ?? null}
      />
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
            : evento.tipo === "debutante"
              ? "Quem entra com ela, o príncipe, os pares da valsa e quem recebe as 15 velas, na ordem em que são chamados. Basta o nome para começar."
              : "Quem entra com vocês. Basta o nome para começar — o resto pode vir depois."
        }
      />
      <ListaCortejo eventoId={evento.id} tipo={evento.tipo} pessoas={pessoas} />
    </div>
  );
}
