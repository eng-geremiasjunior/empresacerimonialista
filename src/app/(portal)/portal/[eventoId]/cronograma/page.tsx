import { notFound } from "next/navigation";
import { getContatoCerimonialista, getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalV2 } from "@/lib/portal-v2";
import { NoiteV2 } from "@/components/portal/v2/NoiteV2";
import { getTrilha } from "@/lib/supabase/portal-trilha";
import { MOMENTOS_DA_TRILHA } from "@/lib/trilha";
import { linhaDoLocal } from "@/components/portal/v2/dadosDoInicio";
import {
  getProgramaDoDia,
  getSugestoesDoEvento,
} from "@/lib/supabase/programa-do-dia";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { ProgramaDoDia } from "@/components/portal/ProgramaDoDia";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { RoteiroSecao } from "@/components/portal/noivos/telas/roteiro/Secao";
import { TelaRoteiroDaNoiva } from "@/components/portal/noivos/telas/roteiro/TelaRoteiroDaNoiva";
import { diaEMes } from "@/components/portal/noivos/telas/roteiro/montar";
import { exemploMomentoDoDia } from "@/lib/papel";
import { getRoteiroDaNoiva } from "@/lib/supabase/portal-roteiro";

export const dynamic = "force-dynamic";

export default async function PortalCronogramaPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  // O portal dos noivos (desenho v4): "20 de março, hora a hora".
  // A noiva que abriu a conta sozinha (04/10/2026) monta o próprio
  // roteiro; com cerimonialista, o casal vê e sugere.
  if (usaPortalNoivos(evento.tipo)) {
    const daNoiva = await getRoteiroDaNoiva(evento.id);
    if (daNoiva) {
      return <TelaRoteiroDaNoiva roteiro={daNoiva} dia={diaEMes(evento.data)} exemplo={exemploMomentoDoDia(evento.tipo)} />;
    }
    return <RoteiroSecao eventoId={evento.id} data={evento.data} tipo={evento.tipo} />;
  }

  const [momentos, sugestoes] = await Promise.all([
    getProgramaDoDia(evento.id),
    getSugestoesDoEvento(evento.id),
  ]);

  // portal v2: o palco com a luz de cada momento e a sugestão de horário
  if (usaPortalV2(evento.tipo)) {
    const [contato, trilha] = await Promise.all([getContatoCerimonialista(evento.id), getTrilha(evento.id)]);
    // a música de cada momento: o primeiro momento do roteiro que é dele
    const musicas: Record<string, string> = {};
    const doDia = momentos.filter((p) => !/ensaio|montagem|making|prepara/i.test(p.titulo));
    for (const t of MOMENTOS_DA_TRILHA) {
      const e = trilha[t.id];
      const alvo = e && doDia.find((p) => t.noRoteiro.test(p.titulo) && !musicas[p.id]);
      if (e && alvo) musicas[alvo.id] = e.artista ? `${e.titulo} · ${e.artista}` : e.titulo;
    }
    return (
      <NoiteV2
        eventoId={evento.id}
        momentos={momentos}
        sugestoes={sugestoes}
        cerimonialista={contato.nome?.split(" ")[0] ?? "Sua cerimonialista"}
        linha={linhaDoLocal(evento.data, null, evento.local, evento.cidade)}
        musicas={musicas}
      />
    );
  }

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Roteiro do dia"
        apoio="O programa como está hoje. Se algum horário não servir, é só sugerir — quem ajusta é a sua cerimonialista."
      />
      <ProgramaDoDia
        eventoId={evento.id}
        tipo={evento.tipo}
        momentos={momentos}
        sugestoes={sugestoes}
      />
    </div>
  );
}
