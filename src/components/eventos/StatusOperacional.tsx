import Link from "next/link";
import { AlertTriangle, ChevronRight, Circle, Check } from "lucide-react";
import type { Saude, SaudeAba } from "@/lib/saude-evento";
import type { ResumoEvento } from "@/lib/supabase/resumo-evento";

const ABA_PATH: Record<SaudeAba, string> = {
  tarefas: "tarefas",
  fornecedores: "fornecedores",
  financeiro: "financeiro",
  roteiro: "roteiro",
};

export function StatusOperacional({
  eventId,
  saude,
  criterios,
}: {
  eventId: string;
  saude: Saude;
  criterios: ResumoEvento["criterios"];
}) {
  const sobControle = saude.score >= 80;

  // Linhas verdes: só as que estão realmente OK.
  const oks: string[] = [];
  if (criterios.temTarefas && criterios.tarefasOk) {
    oks.push("Todas as tarefas concluídas");
  }
  if (criterios.temFornecedores && criterios.fornecedoresOk) {
    oks.push("Todos os fornecedores confirmados");
  }
  if (criterios.financeiroOk) oks.push("Financeiro em dia");
  if (criterios.cronogramaOk) oks.push("Cronograma definido");

  return (
    <section>
      <div className="flex items-center gap-2">
        {sobControle ? (
          <Circle size={11} className="fill-emerald-500 text-emerald-500" />
        ) : (
          <Circle size={11} className="fill-amber-500 text-amber-500" />
        )}
        <h2 className="text-base font-semibold tracking-tight text-gray-900">
          {sobControle ? "Evento sob controle" : "Requer atenção"}
        </h2>
      </div>

      {sobControle ? (
        <ul className="mt-3 space-y-1.5">
          {oks.map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm text-gray-600">
              <Check size={15} className="shrink-0 text-emerald-500" />
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {saude.alertas.map((a) => (
            <li key={a.texto}>
              <Link
                href={`/eventos/${eventId}/${ABA_PATH[a.aba]}`}
                className="group flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <AlertTriangle size={15} className="shrink-0 text-amber-500" />
                <span className="flex-1">{a.texto}</span>
                <ChevronRight
                  size={15}
                  className="text-gray-300 transition-colors group-hover:text-gray-500"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
