import { getFilaDoDia } from "@/lib/supabase/fila-solicitacoes";
import { FilaDoDia } from "@/components/solicitacoes/FilaDoDia";

export const dynamic = "force-dynamic";

export default async function SolicitacoesPage() {
  const itens = await getFilaDoDia();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solicitações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Uma mensagem por fornecedor, com tudo que você precisa dele agora.
        </p>
      </div>
      <FilaDoDia itens={itens} />
    </div>
  );
}
