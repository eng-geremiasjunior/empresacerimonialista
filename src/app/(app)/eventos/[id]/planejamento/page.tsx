import { createClient } from "@/lib/supabase/server";
import { getPlanejamento } from "@/lib/supabase/planejamento";
import { PlanejamentoEvento } from "@/components/planejamento/PlanejamentoEvento";

export default async function EventoPlanejamentoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { decisao?: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const [{ data: ev }, { data: sups }] = await Promise.all([
    supabase.from("events").select("date").eq("id", eventId).single(),
    // para os campos tipo "fornecedor" das decisões de contratar
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  const planejamento = await getPlanejamento(eventId, ev?.date ?? null);

  return (
    <PlanejamentoEvento
      eventId={eventId}
      inicial={planejamento}
      suppliers={sups ?? []}
      decisaoInicial={searchParams?.decisao ?? null}
    />
  );
}
