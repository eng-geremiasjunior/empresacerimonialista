import { redirect } from "next/navigation";
import { getFilaDoDia } from "@/lib/supabase/fila-solicitacoes";
import { getEspera } from "@/lib/supabase/espera-solicitacoes";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { FilaDoDia } from "@/components/solicitacoes/FilaDoDia";
import { EsperaFornecedores } from "@/components/solicitacoes/EsperaFornecedores";

export const dynamic = "force-dynamic";

export default async function SolicitacoesPage() {
  // superfície de quem conduz: assistente (e conta sem cargo) não entra —
  // guarda ESTRITA, diferente do padrão frouxo que deixava null passar
  const { cargo } = await getMeuCargo();
  if (cargo !== "proprietaria" && cargo !== "coordenadora" && cargo !== "cerimonialista") {
    redirect("/eventos");
  }

  const [itens, espera] = await Promise.all([getFilaDoDia(), getEspera()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solicitações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Uma mensagem por fornecedor, com tudo que você precisa dele agora.
        </p>
      </div>
      <FilaDoDia itens={itens} />

      {espera ? (
        <EsperaFornecedores grupos={espera.grupos} />
      ) : (
        <p className="mt-10 text-sm text-gray-400">
          Não deu para carregar quem está te devendo. Recarregue a página.
        </p>
      )}
    </div>
  );
}
