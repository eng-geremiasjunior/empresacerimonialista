import { createClient } from "@/lib/supabase/server";
import { getPublico, getRecursos } from "@/lib/supabase/recursos";
import { OperacaoEvento } from "@/components/operacao/OperacaoEvento";

export const metadata = { title: "Operação" };

export default async function EventoOperacaoPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;
  const supabase = createClient();

  const [recursos, publico] = await Promise.all([
    getRecursos(eventId),
    getPublico(eventId),
  ]);

  const { data: sups } = await supabase
    .from("suppliers")
    .select("id, name")
    .order("name");

  // A contagem do dia só abre quando o dia chega: antes disso, entrada e
  // sobra seriam campos pedindo número que ninguém tem. Fuso de São Paulo
  // porque a festa é aqui, não em UTC.
  const { data: ev } = await supabase
    .from("events")
    .select("date")
    .eq("id", eventId)
    .maybeSingle();
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const contagemLiberada = !!ev?.date && String(ev.date) <= hoje;

  // Evento nascido antes do método não tem mapa — oferecer "trazer do
  // método" ali seria um botão que não faz nada.
  const { count: objetivos } = await supabase
    .from("evento_objetivo")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  return (
    <OperacaoEvento
      eventId={eventId}
      recursos={recursos}
      fornecedores={(sups ?? []).map((s) => ({ id: s.id, nome: s.name }))}
      publico={publico}
      temMapa={(objetivos ?? 0) > 0}
      contagemLiberada={contagemLiberada}
    />
  );
}
