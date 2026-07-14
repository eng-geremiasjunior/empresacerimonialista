import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventChat, type ChatSupplier } from "@/components/chat/EventChat";
import { type EventType } from "@/lib/types";

export default async function ComunicacaoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { fornecedor?: string };
}) {
  const supabase = createClient();

  const [{ data: eventData }, { data: linksData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, clients(name)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("roteiro_links")
      .select("supplier_id, suppliers(id, name)")
      .eq("event_id", params.id),
  ]);

  if (!eventData) {
    notFound();
  }

  const event = eventData as unknown as {
    id: string;
    type: EventType;
    clients: { name: string } | null;
  };

  const suppliers: ChatSupplier[] = (linksData ?? [])
    .map((row) => {
      const record = row as unknown as {
        supplier_id: string;
        suppliers: { id: string; name: string } | null;
      };
      return record.suppliers
        ? { id: record.supplier_id, name: record.suppliers.name }
        : null;
    })
    .filter((s): s is ChatSupplier => s !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Converse com os fornecedores do evento. Eles respondem pelo mesmo link
        do roteiro, sem precisar de login.
      </p>

      {suppliers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-12 text-center text-stone-600">
          <p>
            Nenhum fornecedor conectado a este evento ainda. Adicione
            fornecedores aos itens do roteiro — o link público deles também é o
            canal do chat.
          </p>
          <Link
            href={`/eventos/${event.id}/roteiro`}
            className="mt-4 inline-block text-sm font-medium text-stone-900 underline underline-offset-4 hover:no-underline"
          >
            Ir para o roteiro
          </Link>
        </div>
      ) : (
        <EventChat
          eventId={event.id}
          suppliers={suppliers}
          initialSupplierId={searchParams?.fornecedor ?? null}
        />
      )}
    </div>
  );
}
