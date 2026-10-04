import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getPlanejamentoDaNoiva } from "@/lib/supabase/portal-planejamento";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { TelaCapitulo } from "@/components/portal/noivos/telas/planejamento/TelaCapitulo";

export const dynamic = "force-dynamic";

// Um capítulo do planejamento da noiva (04/10/2026).
export default async function PortalCapituloPage({ params }: { params: { eventoId: string; capitulo: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  // só o casamento usa o portal dos noivos (a casca desta tela); a conta de
  // família de 15 anos continua no portal da família
  const plano = usaPortalNoivos(evento.tipo) ? await getPlanejamentoDaNoiva(evento.id, evento.data) : null;
  if (!plano) redirect(`/portal/${evento.id}`);
  const capitulo = plano.capitulos.find((c) => c.id === params.capitulo);
  if (!capitulo) notFound();
  return <TelaCapitulo capitulo={capitulo} fornecedores={plano.fornecedores} />;
}
