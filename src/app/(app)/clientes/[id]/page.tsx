import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/clients/ClientForm";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type Client,
  type EventStatus,
  type EventType,
} from "@/lib/types";
import { updateClientRecord } from "../actions";

const STATUS_STYLES: Record<EventStatus, string> = {
  orcamento: "bg-amber-100 text-amber-800",
  confirmado: "bg-emerald-100 text-emerald-800",
  concluido: "bg-sky-100 text-sky-800",
  cancelado: "bg-rose-100 text-rose-700",
};

type EventRow = {
  id: string;
  type: EventType;
  date: string;
  location: string | null;
  status: EventStatus;
};

export default async function ClienteDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: clientData }, { data: eventsData }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, name, phone, whatsapp, email, cpf, instagram, address, city, birthday, notes"
      )
      .eq("id", params.id)
      .single(),
    supabase
      .from("events")
      .select("id, type, date, location, status")
      .eq("client_id", params.id)
      .order("date", { ascending: false }),
  ]);

  if (!clientData) {
    notFound();
  }

  const client = clientData as unknown as Client;
  const events = (eventsData ?? []) as EventRow[];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Voltar aos clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{client.name}</h1>
      </div>

      {/* Eventos do cliente */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            Eventos{" "}
            <span className="font-normal text-stone-400">
              ({events.length})
            </span>
          </h2>
          <Link
            href={`/eventos/novo?cliente=${client.id}`}
            className="rounded-lg bg-stone-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            + Novo evento para este cliente
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-500">
            Este cliente ainda não tem eventos.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/eventos/${event.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-stone-400"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {EVENT_TYPE_LABELS[event.type]}
                    </p>
                    <p className="text-sm text-stone-500">
                      {formatDate(event.date)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[event.status]}`}
                  >
                    {EVENT_STATUS_LABELS[event.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dados do cliente (editável) */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Dados do cliente</h2>
        <ClientForm
          action={updateClientRecord.bind(null, client.id)}
          client={client}
          submitLabel="Salvar alterações"
          showSaved
        />
      </section>
    </div>
  );
}
