import { getContratosDaTela } from "@/lib/supabase/contratos-tela";
import { createClient } from "@/lib/supabase/server";
import { ContratosTela } from "@/components/contratos/ContratosTela";

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
    />
  );
}
