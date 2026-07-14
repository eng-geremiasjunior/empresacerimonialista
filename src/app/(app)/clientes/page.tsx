import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { EventStatus } from "@/lib/types";

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
};

type EventRow = {
  client_id: string | null;
  status: EventStatus;
  created_at: string;
};

function isFuture(status: EventStatus) {
  return status === "confirmado" || status === "orcamento";
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const supabase = createClient();
  const q = (searchParams?.q ?? "").trim();

  let query = supabase
    .from("clients")
    .select("id, name, phone, whatsapp, email, instagram, city")
    .order("name", { ascending: true });
  if (q) query = query.ilike("name", `%${q}%`);

  const [{ data: clientsData }, { data: eventsData }] = await Promise.all([
    query,
    supabase.from("events").select("client_id, status, created_at"),
  ]);

  const clients = (clientsData ?? []) as ClientRow[];
  const events = (eventsData ?? []) as EventRow[];

  // Agrega por cliente: futuros, realizados e último contato.
  const stats = new Map<
    string,
    { futuros: number; realizados: number; ultimo: string | null }
  >();
  for (const event of events) {
    if (!event.client_id) continue;
    const s = stats.get(event.client_id) ?? {
      futuros: 0,
      realizados: 0,
      ultimo: null,
    };
    if (event.status === "concluido") s.realizados += 1;
    else if (isFuture(event.status)) s.futuros += 1;
    if (!s.ultimo || event.created_at > s.ultimo) s.ultimo = event.created_at;
    stats.set(event.client_id, s);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          + Novo cliente
        </Link>
      </div>

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome..."
          className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </form>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-stone-600">
            {q
              ? "Nenhum cliente encontrado para essa busca."
              : "Você ainda não tem clientes."}
          </p>
          {!q && (
            <Link
              href="/clientes/novo"
              className="mt-3 inline-block text-sm font-medium text-stone-900 underline underline-offset-4 hover:no-underline"
            >
              Cadastrar o primeiro cliente
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => {
            const s = stats.get(client.id);
            const contacts = [
              client.phone,
              client.whatsapp && `WhatsApp: ${client.whatsapp}`,
              client.email,
              client.instagram,
            ].filter(Boolean);

            return (
              <li key={client.id}>
                <Link
                  href={`/clientes/${client.id}`}
                  className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-400"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {client.name}
                        {client.city && (
                          <span className="ml-2 text-sm font-normal text-stone-500">
                            {client.city}
                          </span>
                        )}
                      </p>
                      {contacts.length > 0 && (
                        <p className="mt-1 truncate text-sm text-stone-500">
                          {contacts.join(" · ")}
                        </p>
                      )}
                      {s?.ultimo && (
                        <p className="mt-1 text-xs text-stone-400">
                          Último contato: {formatDate(s.ultimo.slice(0, 10))}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs">
                      {(s?.futuros ?? 0) > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-800">
                          {s!.futuros} futuro{s!.futuros > 1 ? "s" : ""}
                        </span>
                      )}
                      {(s?.realizados ?? 0) > 0 && (
                        <span className="rounded-full bg-stone-200 px-2.5 py-0.5 font-medium text-stone-600">
                          {s!.realizados} realizado{s!.realizados > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
