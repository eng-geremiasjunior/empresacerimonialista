"use client";

// Uma linha por item, antes do dia (04/10/2026): hora · o quê · quem.
// O cartão grande com "Pendente · Aguardando início" em todo item fazia
// nove horários ocuparem a tela inteira, e o status só existe no dia —
// semanas antes, todo item está "pendente" por definição. No dia, a
// lista volta ao cartão com status (ItemTimelineExpandido).

import { Pencil, Trash2 } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { CronogramaItem } from "@/lib/cronograma";

export function LinhaDoRoteiro({
  item,
  equipe,
  onEditar,
  onExcluir,
}: {
  item: CronogramaItem;
  equipe: { id: string; nome: string }[];
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const daEquipe = item.equipe_do_dia_id
    ? equipe.find((p) => p.id === item.equipe_do_dia_id)?.nome
    : null;
  const quem = [item.supplier_name, item.responsavel_nome ?? daEquipe].filter(Boolean).join(" · ");

  return (
    <div className="group flex items-baseline gap-3 border-b border-[#EFEEF4] py-2.5 last:border-b-0 sm:gap-4">
      <span className="w-12 shrink-0 font-mono text-[13px] font-semibold tabular-nums text-[#17162A]">
        {item.time ? formatTime(item.time) : "—"}
      </span>
      <button
        type="button"
        onClick={onEditar}
        className="min-w-0 flex-1 text-left"
        title="Editar"
      >
        <span className="block text-[14px] font-semibold leading-snug text-[#17162A] sm:inline">
          {item.title}
        </span>
        {quem && (
          <span className="block text-[13px] text-[#6B6884] sm:ml-2 sm:inline">{quem}</span>
        )}
        {item.description && (
          <span className="block truncate text-[12.5px] text-[#9A97AE]">{item.description}</span>
        )}
      </button>
      <span className="flex shrink-0 items-center gap-1 self-center opacity-60 transition-opacity group-hover:opacity-100 print:hidden">
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Editar ${item.title}`}
          className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onExcluir}
          aria-label={`Excluir ${item.title}`}
          className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </span>
    </div>
  );
}
