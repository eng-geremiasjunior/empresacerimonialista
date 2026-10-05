import { notFound, redirect } from "next/navigation";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import { getAgendaDaNoiva } from "@/lib/supabase/portal-agenda";
import { TelaAgendaDaNoiva } from "@/components/portal/noivos/telas/agenda/TelaAgendaDaNoiva";

export const dynamic = "force-dynamic";

// A Agenda da noiva que abriu a conta sozinha (04/10/2026): o mês, os
// próximos compromissos e a Agenda do Google. Com cerimonialista quem
// marca é ela: a tela não existe e o endereço volta para o início.
export default async function PortalAgendaPage({ params }: { params: { eventoId: string } }) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();
  const agenda = usaPortalNoivos(evento.tipo) ? await getAgendaDaNoiva(evento.id) : null;
  if (!agenda) redirect(`/portal/${evento.id}`);
  return <TelaAgendaDaNoiva agenda={agenda} />;
}
