import Link from "next/link";
import {
  CalendarRange,
  ListChecks,
  MessageSquare,
  Users,
} from "lucide-react";
import type { ResumoEvento } from "@/lib/supabase/resumo-evento";

// 4 blocos ricos (item 8) — cards com ícone colorido, número forte e
// rótulo, no estilo do painel de referência.
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
      href: `${base}/tarefas`,
      icon: ListChecks,
      cor: "bg-indigo-50 text-indigo-600",
      titulo: "Tarefas",
      valor: `${op.checklistFeitas}/${op.checklistTotal}`,
      label: "Concluídas",
    },
    {
      href: `${base}/roteiro`,
      icon: CalendarRange,
      cor: "bg-emerald-50 text-emerald-600",
      titulo: "Cronograma",
      valor: `${op.cronogramaItens}`,
      label: op.cronogramaItens === 1 ? "Item" : "Itens",
    },
    {
      href: `${base}/fornecedores`,
      icon: Users,
      cor: "bg-sky-50 text-sky-600",
      titulo: "Fornecedores",
      valor: `${op.fornecedoresConfirmados}/${op.fornecedoresTotal}`,
      label: "Confirmados",
    },
    {
      href: `${base}/comunicacao`,
      icon: MessageSquare,
      cor: "bg-amber-50 text-amber-600",
      titulo: "Mensagens",
      valor: `${op.comunicacaoNaoLidas}`,
      label: op.comunicacaoNaoLidas === 1 ? "Não lida" : "Não lidas",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ href, icon: Icon, cor, titulo, valor, label }) => (
        <Link
          key={titulo}
          href={href}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cor}`}
            >
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-gray-700">{titulo}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
            {valor}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </Link>
      ))}
    </div>
  );
}
