import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { tem } from "@/lib/capacidades";
import {
  getConvidadosCroqui,
  getElementos,
  getMesas,
  getPresentes,
  getRelacoes,
  getSalao,
} from "@/lib/supabase/mesas";
import { MesasDaNoiva } from "@/components/portal/noivos/telas/mesas/MesasDaNoiva";

export const dynamic = "force-dynamic";

// As mesas da noiva que abriu a conta sozinha (04/10/2026). Com
// cerimonialista quem senta é ela: a tela não existe, e o mapa de mesas
// continua em Convidados, só leitura.
export default async function PortalMesasPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!usaPortalNoivos(evento.tipo) || !tem(evento.tipo, "mesas") || !(await donaDaFesta(evento.id))) {
    redirect(`/portal/${evento.id}/convidados`);
  }

  const [salao, mesas, elementos, convidados, relacoes, presentes] = await Promise.all([
    getSalao(evento.id),
    getMesas(evento.id),
    getElementos(evento.id),
    getConvidadosCroqui(evento.id),
    getRelacoes(evento.id),
    getPresentes(evento.id),
  ]);

  return (
    <MesasDaNoiva
      eventoId={evento.id}
      tipoEvento={evento.tipo}
      data={evento.data}
      salao={salao}
      mesas={mesas}
      elementos={elementos}
      convidados={convidados}
      relacoes={relacoes}
      presentes={presentes?.quantidade ?? null}
    />
  );
}
