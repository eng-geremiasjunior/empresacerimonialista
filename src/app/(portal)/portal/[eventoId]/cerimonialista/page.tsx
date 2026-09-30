import { notFound, redirect } from "next/navigation";
import { getEventoDaFamilia, getEventoDoPortal, nomeDeExibicao } from "@/lib/supabase/portal";
import { appUrl } from "@/lib/app-url";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ConviteParaCerimonialista } from "@/components/portal/ConviteParaCerimonialista";
import { estadoDoConvite } from "./actions";

// A sua cerimonialista (188): só no evento da conta de família. Depois que
// ela aceita, o evento sai da conta de família e esta tela devolve ao
// início — o portal volta a ser o de sempre.
export const dynamic = "force-dynamic";

export default async function CerimonialistaPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!(await getEventoDaFamilia(evento.id))) redirect(`/portal/${evento.id}`);

  // só LÊ: o link que ainda vale e o pedido esperando. O link novo só
  // nasce no clique — abrir a tela (ou a pré-busca) não cria convite
  const estado = await estadoDoConvite(evento.id);
  const festa =
    evento.tipo === "casamento" ? `o nosso casamento` : `a festa de 15 anos`;

  return (
    <div className="portal-tela">
      <TopoInterno eventoId={evento.id} titulo="A sua cerimonialista" apoio={nomeDeExibicao(evento)} />
      <ConviteParaCerimonialista eventoId={evento.id} base={appUrl()} tokenInicial={estado.token}
        pedido={estado.pedido}
        festa={festa}
      />
    </div>
  );
}
