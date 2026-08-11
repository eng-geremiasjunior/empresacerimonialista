import { getAgendaFornecedores } from "@/lib/supabase/agenda-fornecedores";
import { AgendaFornecedoresTela } from "@/components/agenda/AgendaFornecedores";

export const dynamic = "force-dynamic";

// Agenda de Fornecedores — disponibilidade e reuniões operacionais.
// Nunca noivos: só compromissos com fornecedor vinculado entram aqui.
export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const dados = await getAgendaFornecedores();

  if (!dados) {
    return (
      <p className="text-sm text-stone-500">
        Sessão expirada — entre de novo.
      </p>
    );
  }

  return (
    <AgendaFornecedoresTela
      dados={dados}
      tabInicial={searchParams?.tab === "grade" ? "grade" : "reunioes"}
    />
  );
}
