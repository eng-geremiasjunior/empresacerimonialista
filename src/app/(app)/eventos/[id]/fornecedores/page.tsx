import { getFornecedoresDoEvento } from "@/lib/supabase/fornecedores-evento";
import { FornecedoresDoEvento } from "@/components/fornecedores/FornecedoresDoEvento";
import { AdicionarFornecedorButton } from "@/components/fornecedores/AdicionarFornecedorButton";

export const dynamic = "force-dynamic";

// A aba Fornecedores do evento. A leitura junta vínculo + cadastro +
// convite; quem decide status, grupo e contagem é fornecedores-core.
export default async function EventoFornecedoresPage({
  params,
}: {
  params: { id: string };
}) {
  const { fornecedores, automacao } = await getFornecedoresDoEvento(params.id);

  return (
    <FornecedoresDoEvento
      eventId={params.id}
      fornecedores={fornecedores}
      automacao={automacao}
      botaoAdicionar={<AdicionarFornecedorButton eventId={params.id} />}
    />
  );
}
