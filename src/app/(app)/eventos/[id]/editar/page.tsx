import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembrosSelecionaveis } from "@/lib/supabase/equipe";
import { EventForm } from "@/components/EventForm";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import type { Event } from "@/lib/types";
import { updateEvent } from "../../actions";

export default async function EditarEventoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // Tenta com o responsável (migração 022); sem a coluna, degrada.
  let responsavelId: string | null = null;
  let { data, error } = await supabase
    .from("events")
    .select(
      "id, client_id, type, date, location, status, cover_image_url, cerimonialista_responsavel_id, clients(id, name, phone, email)"
    )
    .eq("id", params.id)
    .single();

  let temResponsavel = true;
  if (error?.code === "42703") {
    temResponsavel = false;
    ({ data } = await supabase
      .from("events")
      .select("id, client_id, type, date, location, status, clients(id, name, phone, email)")
      .eq("id", params.id)
      .single());
  }

  if (!data) {
    notFound();
  }

  responsavelId =
    (data as { cerimonialista_responsavel_id?: string | null })
      .cerimonialista_responsavel_id ?? null;

  const equipe = temResponsavel
    ? await getMembrosSelecionaveis()
    : { membros: [], meuMembroId: null };

  const event = data as unknown as Event;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-700">
          Dados do evento
        </h2>
        <DeleteEventButton eventId={event.id} />
      </div>
      <EventForm
        action={updateEvent}
        membros={equipe.membros}
        initial={{
          eventId: event.id,
          clientId: event.clients?.id ?? null,
          clientName: event.clients?.name ?? "",
          clientPhone: event.clients?.phone ?? "",
          type: event.type,
          date: event.date,
          location: event.location ?? "",
          status: event.status,
          responsavelId,
          coverUrl:
            (data as { cover_image_url?: string | null }).cover_image_url ??
            null,
        }}
      />
    </div>
  );
}
