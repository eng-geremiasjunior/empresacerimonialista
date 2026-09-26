import { notFound, redirect } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { getEscolhasDoPortal } from "@/lib/supabase/portal-escolhas";
import { PainelEscolhaV2 } from "@/components/portal/v2/PainelEscolhaV2";
import { usaPortalV2 } from "@/lib/portal-v2";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";

// O painel de uma decisão no portal v2 (177): opções da cerimonialista,
// propostas da família e as perguntas daquela decisão. Só no v2.
export default async function PortalPainelEscolhaPage({
  params,
}: {
  params: { eventoId: string; decisaoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  if (!usaPortalV2(evento.tipo)) redirect(`/portal/${evento.id}/escolhas`);

  const [{ listadas, outras }, contato] = await Promise.all([
    getEscolhasDoPortal(evento.id, evento.data),
    getContatoCerimonialista(evento.id),
  ]);
  const cerimonialista = contato.nome?.split(" ")[0] ?? "Sua cerimonialista";
  let escolha = listadas.find((e) => e.decisaoId === params.decisaoId) ?? null;
  // uma decisão ainda sem nada: o painel abre só com "Propor outra opção"
  if (!escolha) {
    const o = outras.find((x) => x.decisaoId === params.decisaoId);
    if (!o) notFound();
    escolha = {
      decisaoId: o.decisaoId,
      titulo: o.titulo,
      topico: o.topico,
      quem: "juntas",
      prazo: null,
      estado: "voces",
      decididaEm: null,
      perguntas: [],
      curadoria: null,
      propostas: [],
    };
  }

  return <PainelEscolhaV2 eventoId={evento.id} escolha={escolha} cerimonialista={cerimonialista} hoje={hojeBR()} />;
}
