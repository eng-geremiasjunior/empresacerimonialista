import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { getRecebedor, listaDePresentesLiberada } from "@/lib/supabase/portal-presentes";
import { usaPortalV2 } from "@/lib/portal-v2";
import { PresentesV2 } from "@/components/portal/v2/PresentesV2";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { PresentesSecao } from "@/components/portal/noivos/telas/presentes/Secao";
import { getListaDoCasal } from "@/components/portal/noivos/telas/presentes/lista/dados";
import { TelaLista } from "@/components/portal/noivos/telas/presentes/lista/TelaLista";

export const dynamic = "force-dynamic";

// A lista de presentes (182+): no portal dos noivos, a lista com o botão
// de comprar (197), liberada para todos os casamentos em 02/10/2026. No
// portal v2 (a debutante), só a conta que recebe, e só nas contas da casa
// (listaDePresentesLiberada decide).
export default async function PortalPresentesPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  if (usaPortalNoivos(evento.tipo)) {
    if (await listaDePresentesLiberada(evento.id)) return <TelaLista dados={await getListaDoCasal(evento.id)} />;
    return <PresentesSecao eventoId={evento.id} />;
  }

  if (!usaPortalV2(evento.tipo) || !(await listaDePresentesLiberada(evento.id))) notFound();

  const [recebedor, eu, contato] = await Promise.all([
    getRecebedor(evento.id),
    getMeuAcesso(evento.id),
    getContatoCerimonialista(evento.id),
  ]);

  return (
    <PresentesV2
      eventoId={evento.id}
      recebedor={recebedor}
      souResponsavel={eu.papel !== null && eu.papel !== "debutante"}
      meuNome={eu.nome}
      cerimonialista={contato.nome?.split(" ")[0] ?? "Sua cerimonialista"}
    />
  );
}
