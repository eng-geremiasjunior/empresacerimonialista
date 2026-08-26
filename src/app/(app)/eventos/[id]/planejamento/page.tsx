import { createClient } from "@/lib/supabase/server";
import { getPlanejamento } from "@/lib/supabase/planejamento";
import { PlanejamentoEvento } from "@/components/planejamento/PlanejamentoEvento";
import { TemaNeutro } from "@/components/planejamento/TemaNeutro";

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
    // escala/cenario = arquétipo do evento (chips editáveis da faixa de
    // contexto); a data alimenta os prazos relativos.
    supabase
      .from("events")
      .select("type, date, escala, cenario, location, city, clients(name)")
      .eq("id", eventId)
      .single(),
    // para os campos tipo "fornecedor" das decisões de contratar
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  const planejamento = await getPlanejamento(eventId, ev?.date ?? null);

  const cliente = (
    ev as unknown as { clients: { name: string } | null } | null
  )?.clients;

  return (
    <>
      <TemaNeutro />
      <PlanejamentoEvento
        eventId={eventId}
        inicial={planejamento}
        suppliers={sups ?? []}
        decisaoInicial={searchParams?.decisao ?? null}
        escala={ev?.escala ?? null}
        cenario={ev?.cenario ?? null}
        clienteNome={cliente?.name ?? null}
        tipoEvento={(ev?.type as string) ?? "casamento"}
        localEvento={ev?.location ?? ev?.city ?? null}
      />
    </>
  );
}
