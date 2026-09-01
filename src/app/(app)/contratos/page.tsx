import { redirect } from "next/navigation";
import { getContratosDaTela } from "@/lib/supabase/contratos-tela";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { ContratosTela } from "@/components/contratos/ContratosTela";

export const dynamic = "force-dynamic";

// A área de Contratos — o ciclo inteiro, em todos os eventos: cobrança,
// recebimento, conferência e histórico. A leitura em lote e as visões
// moram em contratos-tela/contratos-lista; a página só monta.
export default async function ContratosPage() {
  // superfície de quem conduz: assistente (e conta sem cargo) não entra —
  // mesma guarda estrita de Solicitações (a RLS já esvazia, a guarda é
  // honestidade de UX: menu sem tela vazia)
  const { cargo } = await getMeuCargo();
  if (
    cargo !== "proprietaria" &&
    cargo !== "coordenadora" &&
    cargo !== "cerimonialista"
  ) {
    redirect("/eventos");
  }

  const { linhas, semContrato, migracaoPendente } = await getContratosDaTela();

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
      escopoEvento={null}
      podeEscrever
    />
  );
}
