"use client";

// O item do roteiro antes do dia (04/10/2026). O cartão grande repetia
// "Pendente · Aguardando início" e o botão Editar em todo item — semanas
// antes, todo item está "pendente" por definição — e nove horários
// ocupavam a tela inteira. Primeiro virou uma linha de texto; o dono achou
// que perdeu a beleza. Ficou o meio-termo: o mesmo trilho, o horário na
// etiqueta escura e o cartão do desenho original, sem as três linhas
// repetidas. Tocar no cartão edita. No dia, a lista volta ao cartão com
// status (ItemTimelineExpandido).

import { Briefcase, Pencil, Trash2, UserRound } from "lucide-react";
import { formatTime } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import type { CronogramaItem } from "@/lib/cronograma";

export function LinhaDoRoteiro({
  item,
  equipe,
  isLast,
  onEditar,
  onExcluir,
}: {
  item: CronogramaItem;
  equipe: { id: string; nome: string }[];
  isLast: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const daEquipe = item.equipe_do_dia_id
    ? equipe.find((p) => p.id === item.equipe_do_dia_id)?.nome
    : null;
  const responsavel = item.responsavel_nome ?? daEquipe ?? null;

  return (
    <div className="flex gap-3.5">
      {/* trilho: bolinha + linha até o próximo */}
      <div className="flex w-5 flex-shrink-0 flex-col items-center">
        <div
          className="z-[1] mt-[18px] h-3.5 w-3.5 flex-shrink-0 rounded-full"
          style={{ background: "#fff", border: "2px solid #B4B1C8" }}
        />
        {!isLast && <div className="my-0.5 w-0.5 flex-1" style={{ background: "#E9E8F1" }} />}
      </div>

      <div className="min-w-0 flex-1 pb-2.5">
        <div
          className="group flex items-start gap-3.5 rounded-xl border border-[#ECEBF3] bg-white px-4 py-3 transition-colors hover:border-[#D9D7E6]"
        >
          <span className="w-[58px] flex-shrink-0 pt-px">
            {item.time ? (
              <span className="inline-flex items-center rounded-md bg-[#3D3A52] px-2 py-1 text-[14px] font-extrabold leading-none text-white">
                {formatTime(item.time)}
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-[#9A97AE]">sem hora</span>
            )}
          </span>

          <button type="button" onClick={onEditar} className="min-w-0 flex-1 text-left" title="Editar">
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-words text-[14.5px] font-bold text-[#17162A]">{item.title}</span>
              {item.supplier_categoria && (
                <span className="whitespace-nowrap rounded-full bg-[#F1EFFC] px-[9px] py-0.5 text-[11.5px] font-semibold text-[#6C5DD3]">
                  {categoriaLabel(item.supplier_categoria)}
                </span>
              )}
            </span>
            {(item.supplier_name || responsavel) && (
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-[#6B6884]">
                {item.supplier_name && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Briefcase size={13} className="flex-shrink-0 opacity-60" />
                    {item.supplier_name}
                  </span>
                )}
                {responsavel && (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <UserRound size={13} className="flex-shrink-0 opacity-60" />
                    {responsavel}
                  </span>
                )}
              </span>
            )}
            {item.description && (
              <span className="mt-1 block truncate text-[12.5px] text-[#9A97AE]">{item.description}</span>
            )}
          </button>

          <span className="flex flex-shrink-0 items-center gap-0.5 opacity-50 transition-opacity group-hover:opacity-100 print:hidden">
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
      </div>
    </div>
  );
}
