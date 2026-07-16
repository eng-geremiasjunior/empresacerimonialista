import Link from "next/link";
import {
  CalendarRange,
  ListChecks,
  MessageSquare,
  Users,
} from "lucide-react";
import type { ResumoEvento } from "@/lib/supabase/resumo-evento";

// 4 blocos ricos (item 8) — números reais, títulos fortes, pouca borda.
export function ResumoOperacional({
  eventId,
  op,
}: {
  eventId: string;
  op: ResumoEvento["operacional"];
}) {
  const base = `/eventos/${eventId}`;
  const cards = [
    {
      href: `${base}/roteiro`,
      icon: CalendarRange,
      titulo: "Cronograma",
      valor: `${op.cronogramaItens}`,
      unidade: op.cronogramaItens === 1 ? "etapa" : "etapas",
      detalhe: null as string | null,
    },
    {
      href: `${base}/tarefas`,
      icon: ListChecks,
      titulo: "Checklist",
      valor: `${op.checklistFeitas}/${op.checklistTotal}`,
      unidade: "concluído",
      detalhe: null,
    },
    {
      href: `${base}/fornecedores`,
      icon: Users,
      titulo: "Fornecedores",
      valor: `${op.fornecedoresTotal}`,
      unidade: op.fornecedoresTotal === 1 ? "total" : "no total",
      detalhe:
        op.fornecedoresTotal > 0
          ? `${op.fornecedoresConfirmados} confirmados · ${op.fornecedoresPendentes} pendentes`
          : null,
    },
    {
      href: `${base}/comunicacao`,
      icon: MessageSquare,
      titulo: "Comunicação",
      valor: `${op.comunicacaoNaoLidas}`,
      unidade: op.comunicacaoNaoLidas === 1 ? "não lida" : "não lidas",
      detalhe: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ href, icon: Icon, titulo, valor, unidade, detalhe }) => (
        <Link
          key={titulo}
          href={href}
          className="group rounded-xl p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-1.5 text-gray-500">
            <Icon size={15} strokeWidth={1.75} />
            <span className="text-xs font-medium">{titulo}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
            {valor}
          </p>
          <p className="text-xs text-gray-500">{unidade}</p>
          {detalhe && (
            <p className="mt-1 text-[11px] leading-tight text-gray-400">
              {detalhe}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
