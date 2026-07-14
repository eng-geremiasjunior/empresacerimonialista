"use client";

import { deleteEvent } from "@/app/(app)/eventos/actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  return (
    <form
      action={deleteEvent.bind(null, eventId)}
      onSubmit={(e) => {
        if (!confirm("Excluir este evento? Essa ação não pode ser desfeita.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-sm text-rose-600 hover:text-rose-800"
      >
        Excluir evento
      </button>
    </form>
  );
}
