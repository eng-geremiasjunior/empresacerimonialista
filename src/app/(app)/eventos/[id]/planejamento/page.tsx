import { createClient } from "@/lib/supabase/server";
import { getPlanejamento } from "@/lib/supabase/planejamento";
import { PlanejamentoEvento } from "@/components/planejamento/PlanejamentoEvento";
import { TemaNeutro } from "@/components/planejamento/TemaNeutro";
import type { Arquetipos } from "@/components/planejamento/celebra";

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

  const tipoEvento = (ev?.type as string) ?? "casamento";

  const [planejamento, { data: arqs }] = await Promise.all([
    getPlanejamento(eventId, ev?.date ?? null),
    // opções dos chips escala/cenário: as do método deste tipo, na ordem
    // do seed — a debutante deixa de ver "Mini wedding"
    supabase
      .from("metodo_arquetipo")
      .select("eixo, codigo, nome, ordem")
      .eq("tipo_evento", tipoEvento)
      .order("ordem"),
  ]);

  const arquetipos: Arquetipos = { escala: [], cenario: [] };
  for (const a of (arqs ?? []) as { eixo: string; codigo: string; nome: string }[]) {
    if (a.eixo === "escala" || a.eixo === "cenario")
      arquetipos[a.eixo].push({ valor: a.codigo, rotulo: a.nome });
  }

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
        arquetipos={arquetipos}
        clienteNome={cliente?.name ?? null}
        tipoEvento={tipoEvento}
        localEvento={ev?.location ?? ev?.city ?? null}
      />
    </>
  );
}
