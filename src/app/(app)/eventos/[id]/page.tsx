import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type StatCardProps = {
  label: string;
  value: string;
  href: string;
};

function StatCard({ label, value, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-400"
    >
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-900">{value}</p>
    </Link>
  );
}

export default async function ResumoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const [clientRes, tasksRes, itemsRes, linksRes, unreadRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("clients(name, phone, whatsapp, email, instagram)")
        .eq("id", eventId)
        .single(),
      supabase.from("tasks").select("status").eq("event_id", eventId),
      supabase
        .from("roteiro_items")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase.from("roteiro_links").select("confirmed").eq("event_id", eventId),
      supabase
        .from("event_messages")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("sender_type", "fornecedor")
        .is("read_at", null),
    ]);

  const client = (
    clientRes.data as unknown as {
      clients: {
        name: string;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        instagram: string | null;
      } | null;
    } | null
  )?.clients;

  const tasks = (tasksRes.data ?? []) as { status: string }[];
  const tasksDone = tasks.filter((t) => t.status === "concluido").length;
  const links = (linksRes.data ?? []) as { confirmed: boolean }[];
  const suppliersConfirmed = links.filter((l) => l.confirmed).length;

  const base = `/eventos/${eventId}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Cronograma"
          value={`${itemsRes.count ?? 0} ${
            (itemsRes.count ?? 0) === 1 ? "item" : "itens"
          }`}
          href={`${base}/roteiro`}
        />
        <StatCard
          label="Tarefas"
          value={`${tasksDone}/${tasks.length}`}
          href={`${base}/tarefas`}
        />
        <StatCard
          label="Fornecedores"
          value={`${suppliersConfirmed}/${links.length}`}
          href={`${base}/fornecedores`}
        />
        <StatCard
          label="Mensagens novas"
          value={String(unreadRes.count ?? 0)}
          href={`${base}/comunicacao`}
        />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-700">Cliente</h2>
          <Link
            href={`${base}/editar`}
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            Editar dados do evento
          </Link>
        </div>
        {client ? (
          <div className="mt-2">
            <p className="font-medium">{client.name}</p>
            <p className="mt-1 text-sm text-stone-500">
              {[
                client.phone,
                client.whatsapp && `WhatsApp: ${client.whatsapp}`,
                client.email,
                client.instagram,
              ]
                .filter(Boolean)
                .join(" · ") || "Sem contatos cadastrados"}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone-500">Sem cliente vinculado.</p>
        )}
      </div>
    </div>
  );
}
