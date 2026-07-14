import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const { data } = await supabase
    .from("events")
    .select("id, client_id, type, date, location, status, clients(id, name, phone, email)")
    .eq("id", params.id)
    .single();

  if (!data) {
    notFound();
  }

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
        initial={{
          eventId: event.id,
          clientId: event.clients?.id ?? null,
          clientName: event.clients?.name ?? "",
          clientPhone: event.clients?.phone ?? "",
          type: event.type,
          date: event.date,
          location: event.location ?? "",
          status: event.status,
        }}
      />
    </div>
  );
}
