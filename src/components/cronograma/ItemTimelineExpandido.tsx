"use client";

// Item da timeline do Cronograma — REESCRITO com estrutura simples e
// robusta (flex + min-w-0 + flex-wrap; nada de position:absolute em
// badge). Coluna de horário + ponto de status à esquerda; card com
// título/categoria, fornecedor/responsável, status, observação.
// Toda a lógica de dados vem pronta via props — só exibição aqui.

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { formatTime } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import {
  STATUS_UI,
  calcularVariacao,
  categoriaBadgeClass,
  fraseVariacao,
  timeToMinutes,
  type CronogramaItem,
} from "@/lib/cronograma";

function horaLocal(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function duracaoLabel(min: number | null): string | null {
  if (!min) return null;
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m}` : `${h}h`;
  }
  return `${min}min`;
}

// Cor do ponto de status (preenchido).
const DOT_COLOR: Record<string, string> = {
  planejado: "bg-stone-300",
  em_andamento: "bg-sky-500",
  concluido: "bg-emerald-500",
  problema: "bg-red-500",
};

export function ItemTimelineExpandido({
  item,
  destaque,
  isLast: _isLast,
  nowMinutes,
  onEditar,
  onExcluir,
  onVerHistorico,
}: {
  item: CronogramaItem;
  destaque?: boolean;
  isLast?: boolean;
  nowMinutes: number;
  onEditar: () => void;
  onExcluir: () => void;
  onVerHistorico: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const concluido = item.status_novo === "concluido";
  const ui = STATUS_UI[item.status_novo] ?? STATUS_UI.planejado;

  const previsto = timeToMinutes(item.time);
  const atrasado =
    item.status_novo === "planejado" &&
    previsto !== null &&
    nowMinutes > previsto;

  const inicioReal = horaLocal(item.horario_real_inicio);
  const fimReal = horaLocal(item.horario_real_fim);
  const variacao =
    item.status_novo === "em_andamento" || concluido
      ? fraseVariacao(
          calcularVariacao(item.time, item.horario_real_inicio),
          concluido
        )
      : null;
  const dur = duracaoLabel(item.duracao_minutos);
  const dotColor = destaque && item.status_novo === "planejado"
    ? "bg-indigo-500"
    : DOT_COLOR[item.status_novo] ?? "bg-stone-300";

  return (
    <div className="flex gap-4 py-4">
      {/* Coluna do horário + ponto de status */}
      <div className="flex w-16 flex-shrink-0 flex-col items-center pt-4">
        <span className="text-sm font-semibold text-stone-900">
          {formatTime(item.time)}
        </span>
        {dur && <span className="text-xs text-stone-400">{dur}</span>}
        <div className={`mt-1.5 h-3 w-3 rounded-full ${dotColor}`} />
      </div>

      {/* Card do item */}
      <div
        className={`min-w-0 flex-1 rounded-lg border bg-white p-4 ${
          destaque
            ? "border-sky-200 border-l-4 border-l-sky-500 bg-sky-50/40"
            : "border-stone-200"
        }`}
      >
        {/* Cabeçalho: título + categoria + AGORA + menu (flex-wrap, nunca sobrepõe) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-medium text-stone-900">{item.title}</h3>
            {item.supplier_categoria && (
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${categoriaBadgeClass(
                  item.supplier_categoria
                )}`}
              >
                {categoriaLabel(item.supplier_categoria)}
              </span>
            )}
            {destaque && item.status_novo === "em_andamento" && (
              <span className="whitespace-nowrap rounded-full bg-sky-500 px-2 py-0.5 text-xs font-semibold text-white">
                AGORA
              </span>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuAberto((v) => !v)}
              onBlur={() => setTimeout(() => setMenuAberto(false), 150)}
              aria-label="Ações"
              className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <MoreVertical size={18} />
            </button>
            {menuAberto && (
              <div className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                <button
                  onMouseDown={onEditar}
                  className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                >
                  Editar
                </button>
                <button
                  onMouseDown={onVerHistorico}
                  className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                >
                  Ver histórico
                </button>
                <button
                  onMouseDown={onExcluir}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fornecedor · responsável · telefone */}
        {(item.supplier_name ||
          item.responsavel_nome ||
          item.responsavel_telefone) && (
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
            {item.supplier_name && <span>{item.supplier_name}</span>}
            {item.responsavel_nome && (
              <>
                {item.supplier_name && <span className="text-stone-300">·</span>}
                <span>{item.responsavel_nome}</span>
              </>
            )}
            {item.responsavel_telefone && (
              <>
                <span className="text-stone-300">·</span>
                <a
                  href={`tel:${item.responsavel_telefone}`}
                  className="whitespace-nowrap text-stone-500 hover:text-stone-800"
                >
                  {item.responsavel_telefone}
                </a>
              </>
            )}
          </div>
        )}

        {item.description && (
          <p className="mt-2 whitespace-pre-line text-sm text-stone-500">
            {item.description}
          </p>
        )}

        {/* Status + carimbo de horário real + variação (flex-wrap) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {atrasado ? (
            <span className="whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              Atrasado
            </span>
          ) : (
            <span
              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ui.badge}`}
            >
              {ui.label}
            </span>
          )}
          {item.status_novo === "em_andamento" && inicioReal && (
            <span className="whitespace-nowrap text-xs font-medium text-sky-700">
              Iniciado às {inicioReal}
            </span>
          )}
          {concluido && fimReal && (
            <span className="whitespace-nowrap text-xs font-medium text-emerald-700">
              Concluído às {fimReal}
            </span>
          )}
          {variacao && (
            <span className={`text-xs ${variacao.cor}`}>{variacao.texto}</span>
          )}
          {item.etapa_obrigatoria && (
            <span className="whitespace-nowrap rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              🔖 Obrigatória
            </span>
          )}
        </div>

        {/* Observação */}
        {item.observacao && (
          <p className="mt-2 text-sm text-stone-500">
            <span className="text-stone-400">Observação:</span> {item.observacao}
          </p>
        )}
      </div>
    </div>
  );
}
