import { createClient } from "@/lib/supabase/server";
import { getItensParaOperacao, getPublico, getRecursos } from "@/lib/supabase/recursos";
import { getConflitosDoEvento } from "@/lib/supabase/estoque";
import { OperacaoEvento } from "@/components/operacao/OperacaoEvento";

export const metadata = { title: "Operação" };

export default async function EventoOperacaoPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;
  const supabase = createClient();

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
  const eventoData = ev?.date ? String(ev.date) : null;
  const contagemLiberada = !!eventoData && eventoData <= hoje;

  const [recursos, publico, itensDoEstoque, conflitos, { data: sups }, { count: objetivos }] =
    await Promise.all([
      getRecursos(eventId),
      getPublico(eventId),
      getItensParaOperacao(eventoData),
      getConflitosDoEvento(eventId),
      supabase.from("suppliers").select("id, name").order("name"),
      // Evento nascido antes do método não tem mapa — oferecer "trazer do
      // método" ali seria um botão que não faz nada.
      supabase.from("evento_objetivo").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    ]);

  return (
    <OperacaoEvento
      eventId={eventId}
      recursos={recursos}
      fornecedores={(sups ?? []).map((s) => ({ id: s.id, nome: s.name }))}
      publico={publico}
      temMapa={(objetivos ?? 0) > 0}
      contagemLiberada={contagemLiberada}
      eventoData={eventoData}
      itensDoEstoque={itensDoEstoque}
      conflitos={conflitos}
    />
  );
}
