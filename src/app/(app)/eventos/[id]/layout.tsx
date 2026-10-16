import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { EventoContainer } from "@/components/evento/EventoContainer";
import { RequerAtencao } from "@/components/eventos/RequerAtencao";
import { UltimaAba } from "@/components/eventos/UltimaAba";
import { LembrarEvento } from "@/components/eventos/LembrarEvento";
import { PartesDoEvento } from "@/components/moldura/PartesDoEvento";
import { FatosDaBarra } from "@/components/moldura/contexto";
import { getCabecalhoEvento } from "@/lib/supabase/resumo-evento";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { inicioDoDiaBR } from "@/lib/tempo";
import { FaixaDoExemplo } from "@/components/evento/FaixaDoExemplo";
import { AREAS_DO_EXEMPLO } from "@/lib/evento-exemplo";

// Página do evento na moldura de programa (15/10/2026, handoff
// design_handoff_eorganizei). O evento é o documento aberto na aba; a
// segunda linha são as partes dele (PartesDoEvento) e a barra de status
// diz quanto falta. "Requer atenção" continua uma linha, só com alerta.

export default async function EventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();

  const { data } = await supabase
    .from("events")
    .select("id, type, name, date, location, city, exemplo, exemplo_visto, cover_image_url, clients(name)")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const event = data as unknown as {
    id: string;
    type: EventType;
    name: string | null;
    date: string;
    location: string | null;
    city: string | null;
    exemplo: boolean | null;
    exemplo_visto: string[] | null;
    cover_image_url: string | null;
    clients: { name: string } | null;
  };

  const { saude } = await getCabecalhoEvento(event.id, event.date);

  const tipoLabel = EVENT_TYPE_LABELS[event.type];
  const titulo =
    event.name ||
    `${tipoLabel}${event.clients?.name ? ` — ${event.clients.name}` : ""}`;

  const dias = differenceInCalendarDays(new Date(`${event.date}T00:00:00`), inicioDoDiaBR());
  const proximidade =
    dias > 0 ? `faltam ${dias} dia${dias === 1 ? "" : "s"}` : dias === 0 ? "é hoje" : "já realizado";
  const local = event.location || event.city;

  // Modo Evento: aparece na linha das partes na última semana (regra mantida).
  const modoDestaque = dias <= 7 && dias >= 0;

  // Evento sem nada montado: os alertas diriam "monte o checklist, vincule
  // fornecedores, monte o roteiro" — os passos do "Para começar" do Resumo.
  const alertas = saude.semDados ? [] : saude.alertas;

  // Os fatos da barra de status: quanto falta e onde.
  const fatos = [proximidade, local].filter(Boolean).join(" · ");

  return (
    <EventoContainer>
      {/* a moldura de programa (15/10/2026): as partes do evento são a
          segunda linha; o cabeçalho com capa e o bloco de fases saíram.
          A capa continua editável em Editar dados do evento. */}
      <PartesDoEvento
        eventId={event.id}
        tipo={event.type}
        nome={titulo}
        data={event.date}
        modoEventoPerto={modoDestaque}
      />
      <FatosDaBarra texto={fatos} />
      <UltimaAba eventId={event.id} />
      <LembrarEvento
        eventId={event.id}
        titulo={titulo}
        data={formatDate(event.date)}
        capa={event.cover_image_url}
        tipo={event.type}
      />
      {/* o evento de exemplo da conta nova (174): bem à vista, em toda tela dele */}
      {event.exemplo && (
        <FaixaDoExemplo
          eventId={event.id}
          areas={AREAS_DO_EXEMPLO.map((a) => ({ ...a }))}
          visto={event.exemplo_visto ?? []}
          tipo={event.type}
        />
      )}

      <RequerAtencao alertas={alertas} eventId={event.id} />

      <div>{children}</div>
    </EventoContainer>
  );
}
