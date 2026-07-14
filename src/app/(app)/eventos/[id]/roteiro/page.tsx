import { randomBytes } from "crypto";
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

  const [{ data: eventData }, itemsResult, { data: suppliersData }] =
    await Promise.all([
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
        .from("suppliers")
        .select("id, name, category, phone")
        .order("name"),
    ]);

  if (!eventData) {
    notFound();
  }

  const event = eventData as unknown as Pick<
    Event,
    "id" | "type" | "date" | "location" | "clients"
  >;
  const items = (itemsResult.data ?? []) as unknown as RoteiroItem[];
  const suppliers = (suppliersData ?? []) as Supplier[];

  // Fornecedores que aparecem no roteiro ganham (ou já têm) um link público.
  const itemSuppliers = new Map<string, string>();
  for (const item of items) {
    if (item.supplier_id && item.suppliers) {
      itemSuppliers.set(item.supplier_id, item.suppliers.name);
    }
  }

  let links: { supplier_id: string; hash: string }[] = [];
  if (itemSuppliers.size > 0) {
    const { data: existing } = await supabase
      .from("roteiro_links")
      .select("supplier_id, hash")
      .eq("event_id", event.id);
    links = existing ?? [];

    const missing = [...itemSuppliers.keys()].filter(
      (supplierId) => !links.some((link) => link.supplier_id === supplierId)
    );
    if (missing.length > 0) {
      const { data: created } = await supabase
        .from("roteiro_links")
        .upsert(
          missing.map((supplierId) => ({
            event_id: event.id,
            supplier_id: supplierId,
            hash: randomBytes(16).toString("hex"),
          })),
          { onConflict: "event_id,supplier_id", ignoreDuplicates: true }
        )
        .select("supplier_id, hash");
      links = [...links, ...(created ?? [])];
    }
  }

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

      <RoteiroList eventId={event.id} items={items} suppliers={suppliers} />

      {itemSuppliers.size > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Links para fornecedores</h2>
          <p className="mt-1 text-sm text-stone-500">
            Envie o link para cada fornecedor: ele vê só os itens dele, sem
            precisar de login, e a página se atualiza sozinha.
          </p>
          <ul className="mt-3 space-y-2">
            {[...itemSuppliers.entries()].map(([supplierId, name]) => {
              const link = links.find((l) => l.supplier_id === supplierId);
              if (!link) return null;
              return (
                <li
                  key={supplierId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <span className="min-w-0 truncate font-medium">{name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/eventos/${event.id}/comunicacao?fornecedor=${supplierId}`}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400"
                    >
                      Contatar
                    </Link>
                    <CopyLinkButton
                      path={`/eventos/${event.id}/roteiro/publico/${link.hash}`}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
