import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { RoteiroList } from "@/components/RoteiroList";
import { type Event, type RoteiroItem, type Supplier } from "@/lib/types";

export default async function RoteiroPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // Fornecedores disponíveis para os itens do roteiro = os VINCULADOS ao
  // evento (aba Fornecedores). Não há mais criação de fornecedor solto aqui.
  const [{ data: eventData }, itemsResult, linksResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, date, location, clients(id, name, phone, email)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("roteiro_items")
      .select(
        "id, event_id, time, title, description, supplier_id, status, suppliers(id, name)"
      )
      .eq("event_id", params.id)
      .order("time", { ascending: true }),
    supabase
      .from("roteiro_links")
      .select("supplier_id, hash, suppliers(id, name)")
      .eq("event_id", params.id),
  ]);

  if (!eventData) {
    notFound();
  }

  const event = eventData as unknown as Pick<
    Event,
    "id" | "type" | "date" | "location" | "clients"
  >;
  const items = (itemsResult.data ?? []) as unknown as RoteiroItem[];

  const linkRows = (linksResult.data ?? []) as unknown as {
    supplier_id: string;
    hash: string;
    suppliers: { id: string; name: string } | null;
  }[];

  // Só os fornecedores vinculados aparecem no select do item de roteiro.
  const suppliers: Supplier[] = linkRows
    .filter((l) => l.suppliers)
    .map((l) => ({ id: l.suppliers!.id, name: l.suppliers!.name }) as Supplier)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-stone-700">
        Cronograma do dia
      </h2>

      {itemsResult.error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar o roteiro. Se o banco ainda não foi
          atualizado, execute <code>supabase/migrations/002_roteiro.sql</code>{" "}
          no SQL Editor do Supabase.
        </div>
      )}

      <RoteiroList
        eventId={event.id}
        items={items}
        suppliers={suppliers}
      />

      {suppliers.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Links para fornecedores</h2>
          <p className="mt-1 text-sm text-stone-500">
            Envie o link para cada fornecedor: ele vê só os itens dele, sem
            precisar de login, e a página se atualiza sozinha.
          </p>
          <ul className="mt-3 space-y-2">
            {linkRows
              .filter((l) => l.suppliers)
              .map((l) => (
                <li
                  key={l.supplier_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <span className="min-w-0 truncate font-medium">
                    {l.suppliers!.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/eventos/${event.id}/comunicacao?fornecedor=${l.supplier_id}`}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400"
                    >
                      Contatar
                    </Link>
                    <CopyLinkButton
                      path={`/eventos/${event.id}/roteiro/publico/${l.hash}`}
                    />
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
