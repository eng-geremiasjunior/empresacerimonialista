import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

// Card do Copiloto na sidebar (todas as páginas). N real de eventos que
// precisam de atenção; "Ver recomendações" leva à listagem já filtrada.
export function CopilotoSidebarCard({ atencao }: { atencao: number }) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
        <Sparkles size={13} className="text-indigo-400" />
        Copiloto Vela
      </p>
      {atencao > 0 ? (
        <>
          <p className="mt-1.5 text-xs leading-snug text-stone-300">
            {atencao} evento{atencao === 1 ? "" : "s"}{" "}
            {atencao === 1 ? "precisa" : "precisam"} da sua atenção hoje.
          </p>
          <Link
            href="/eventos?saude=pendente"
            className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            Ver recomendações
            <ArrowRight size={12} />
          </Link>
        </>
      ) : (
        <p className="mt-1.5 text-xs leading-snug text-stone-400">
          Nenhum evento precisa de atenção hoje.
        </p>
      )}
    </div>
  );
}
