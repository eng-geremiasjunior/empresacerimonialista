import { notFound } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getProgramaDoDia } from "@/lib/supabase/programa-do-dia";
import { getTrilha } from "@/lib/supabase/portal-trilha";
import { usaPortalV2 } from "@/lib/portal-v2";
import { MOMENTOS_DA_TRILHA } from "@/lib/trilha";
import { TrilhaV2 } from "@/components/portal/v2/TrilhaV2";

export const dynamic = "force-dynamic";

// A trilha da noite (180): só no portal v2.
export default async function PortalTrilhaPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento || !usaPortalV2(evento.tipo)) notFound();

  const [escolhas, programa] = await Promise.all([getTrilha(evento.id), getProgramaDoDia(evento.id)]);

  // o horário e o tempo de cada momento, pelo roteiro dela (o ensaio e a
  // montagem não são o momento)
  const doDia = programa.filter((p) => !/ensaio|montagem|making|prepara/i.test(p.titulo));
  const noRoteiro = Object.fromEntries(
    MOMENTOS_DA_TRILHA.map((m) => {
      const achado = doDia.find((p) => m.noRoteiro.test(p.titulo) && (m.id !== "valsa" || !/pr[ií]ncipe/i.test(p.titulo) || !doDia.some((q) => /valsa/i.test(q.titulo) && !/pr[ií]ncipe/i.test(q.titulo))));
      return [m.id, { hora: achado?.hora?.slice(0, 5) ?? null, duracao: achado?.duracao ?? null }];
    })
  );

  return <TrilhaV2 eventoId={evento.id} escolhas={escolhas} noRoteiro={noRoteiro} />;
}
