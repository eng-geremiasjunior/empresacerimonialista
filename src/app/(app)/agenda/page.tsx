import { getAgendaFornecedores } from "@/lib/supabase/agenda-fornecedores";
import { AgendaFornecedoresTela } from "@/components/agenda/AgendaFornecedores";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { SubNav } from "@/components/SubNav";
import { VISOES_FORNECEDORES } from "@/lib/visoes";

export const dynamic = "force-dynamic";

// Agenda de Fornecedores — disponibilidade e reuniões operacionais.
// Nunca noivos: só compromissos com fornecedor vinculado entram aqui.
export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const [dados, { cargo }] = await Promise.all([
    getAgendaFornecedores(),
    getMeuCargo(),
  ]);

  if (!dados) {
    return (
      <p className="text-sm text-stone-500">
        Sessão expirada — entre de novo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <SubNav itens={VISOES_FORNECEDORES} cargo={cargo} />
    <AgendaFornecedoresTela
      dados={dados}
      tabInicial={searchParams?.tab === "grade" ? "grade" : "reunioes"}
    />
    </div>
  );
}
