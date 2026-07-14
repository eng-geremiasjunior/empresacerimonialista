import Link from "next/link";
import { AlertTriangle, Circle } from "lucide-react";
import { SAUDE_UI, type Saude, type SaudeAba } from "@/lib/saude-evento";

const ABA_HREF: Record<SaudeAba, string> = {
  tarefas: "tarefas",
  fornecedores: "fornecedores",
  financeiro: "financeiro",
  roteiro: "roteiro",
};

// Copiloto — Saúde do Evento. Fundo neutro, barra fina, cor só no ponto/barra.
export function SaudeEvento({
  saude,
  eventId,
}: {
  saude: Saude;
  eventId: string;
}) {
  const ui = SAUDE_UI[saude.nivel];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Circle size={8} className={`${ui.dot} fill-current`} aria-hidden />
          <p className="text-sm font-medium text-gray-700">{ui.titulo}</p>
        </div>
        <p className="text-sm font-semibold text-gray-900 tabular-nums">
          {saude.score}%
        </p>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${ui.bar}`}
          style={{ width: `${saude.score}%` }}
        />
      </div>

      {saude.alertas.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          Nenhum risco crítico identificado.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {saude.alertas.map((alerta, i) => (
            <li key={i}>
              <Link
                href={`/eventos/${eventId}/${ABA_HREF[alerta.aba]}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <AlertTriangle size={14} className="shrink-0 text-gray-400" />
                {alerta.texto}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
