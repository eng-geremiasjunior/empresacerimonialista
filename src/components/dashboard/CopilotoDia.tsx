import Link from "next/link";
import { Calendar, AlertCircle } from "lucide-react";
import type { CopilotoAlerta } from "@/lib/supabase/queries";

type Props = {
  greeting: string;
  dateLabel: string;
  eventosHoje: number;
  tarefasHoje: number;
  alertas: CopilotoAlerta[]; // já ordenados por urgência (mais cedo primeiro)
};

const MAX_VISIVEL = 3;

export function CopilotoDia({
  greeting,
  dateLabel,
  eventosHoje,
  tarefasHoje,
  alertas,
}: Props) {
  const visiveis = alertas.slice(0, MAX_VISIVEL);
  const restantes = alertas.length - visiveis.length;

  const hoje =
    `${eventosHoje} evento${eventosHoje === 1 ? "" : "s"} hoje` +
    ` · ${tarefasHoje} tarefa${tarefasHoje === 1 ? "" : "s"} para hoje`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{greeting}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{dateLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {alertas.length > 0 && (
            <Link
              href="/tarefas"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Ver todas as pendências
            </Link>
          )}
          <Link
            href="/calendario"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
          >
            Ver agenda do dia
          </Link>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <div className="flex items-center gap-2.5 text-sm">
          <Calendar size={18} className="shrink-0 text-gray-600" />
          <span className="text-gray-900">{hoje}</span>
        </div>

        {visiveis.length === 0 ? (
          <div className="flex items-center gap-2.5 text-sm">
            <AlertCircle size={18} className="shrink-0 text-gray-400" />
            <span className="text-gray-500">
              Nenhuma pendência crítica no momento
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visiveis.map((alerta) => (
              <Link
                key={alerta.id}
                href={alerta.href}
                className="flex items-start gap-2.5 rounded-md text-sm text-gray-900 hover:text-gray-600"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-gray-600" />
                <span>{alerta.texto}</span>
              </Link>
            ))}
            {restantes > 0 && (
              <Link
                href="/tarefas"
                className="ml-[26px] block text-sm text-gray-500 hover:text-gray-900"
              >
                +{restantes} pendência{restantes > 1 ? "s" : ""} — ver todas
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
