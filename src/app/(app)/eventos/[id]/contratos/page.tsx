import { getContratosDaTela } from "@/lib/supabase/contratos-tela";
import { createClient } from "@/lib/supabase/server";
import {
  ContratosTela,
  type DocumentoDaCliente,
} from "@/components/contratos/ContratosTela";

export const dynamic = "force-dynamic";

// A aba Contratos do evento: a MESMA tela da área global, restrita a um
// evento. Rota própria de propósito — deep-link, botão voltar e
// revalidatePath funcionam de graça.
export default async function EventoContratosPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const [{ linhas, semContrato, migracaoPendente }, { data: ev }] =
    await Promise.all([
      getContratosDaTela(params.id),
      supabase
        .from("events")
        .select("name, clients(name)")
        .eq("id", params.id)
        .maybeSingle(),
    ]);

  const cliente = Array.isArray(ev?.clients)
    ? (ev?.clients[0] as { name: string } | undefined)
    : (ev?.clients as { name: string } | null | undefined);
  const nomeEvento = (ev?.name as string) || cliente?.name || "Evento";

  // Termo e contrato da cliente. Pela RLS de evento_documento (162): o
  // crivo do evento. Os do orçamento que gerou este evento entram também —
  // uma proposta aceita sem data guarda o termo antes de o evento existir.
  // Antes da 162 a tabela não existe: erro vira lista vazia.
  const documentosDaCliente = await lerDocumentosDaCliente(supabase, params.id);

  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  if (migracaoPendente) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Esta parte ainda não está disponível neste banco. Avise a gente.
      </div>
    );
  }

  return (
    <ContratosTela
      linhas={linhas}
      semContrato={semContrato}
      hoje={hoje}
      escopoEvento={{ id: params.id, nome: nomeEvento }}
      podeEscrever
      documentosDaCliente={documentosDaCliente}
    />
  );
}

async function lerDocumentosDaCliente(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<DocumentoDaCliente[]> {
  const { data: orcs } = await supabase
    .from("orcamentos")
    .select("id")
    .eq("evento_gerado_id", eventId);
  const orcamentoIds = ((orcs ?? []) as { id: string }[]).map((o) => o.id);

  const filtro = orcamentoIds.length
    ? `event_id.eq.${eventId},orcamento_id.in.(${orcamentoIds.join(",")})`
    : `event_id.eq.${eventId}`;
  const { data, error } = await supabase
    .from("evento_documento")
    .select("id, categoria, nome, created_at")
    .or(filtro)
    .in("categoria", ["termo_aceite", "contrato_prestacao"])
    .order("created_at", { ascending: true });
  if (error) return [];

  return ((data ?? []) as { id: string; categoria: string; nome: string; created_at: string }[])
    .filter(
      (d): d is { id: string; categoria: DocumentoDaCliente["categoria"]; nome: string; created_at: string } =>
        d.categoria === "termo_aceite" || d.categoria === "contrato_prestacao"
    )
    .map((d) => ({ id: d.id, categoria: d.categoria, nome: d.nome, criadoEm: d.created_at }));
}
