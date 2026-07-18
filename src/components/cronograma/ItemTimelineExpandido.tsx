"use client";

// Card rico de item do cronograma (usado no item "atual" em destaque e
// como base detalhada). Mostra fornecedor, responsável, status, variação
// de horário, observação e menu de ações.

import { useState } from "react";
import {
  Check,
  Circle,
  CircleDot,
  MoreVertical,
  Phone,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { formatTime } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import {
  STATUS_UI,
  calcularVariacao,
  fraseVariacao,
  timeToMinutes,
  type CronogramaItem,
} from "@/lib/cronograma";

function StatusIcone({ item }: { item: CronogramaItem }) {
  const s = item.status_novo;
  if (s === "concluido")
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check size={16} strokeWidth={3} />
      </span>
    );
  if (s === "em_andamento")
    return <CircleDot size={26} className="text-sky-500" />;
  if (s === "problema")
    return <TriangleAlert size={24} className="text-red-500" />;
  return <Circle size={26} className="text-stone-300" />;
}

function horaLocal(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ItemTimelineExpandido({
  item,
  destaque,
  nowMinutes,
  onEditar,
  onExcluir,
  onVerHistorico,
}: {
  item: CronogramaItem;
  destaque?: boolean;
  nowMinutes: number;
  onEditar: () => void;
  onExcluir: () => void;
  onVerHistorico: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const ui = STATUS_UI[item.status_novo] ?? STATUS_UI.planejado;

  // Atraso: planejado com horário já passado.
  const previsto = timeToMinutes(item.time);
  const atrasado =
    item.status_novo === "planejado" &&
    previsto !== null &&
    nowMinutes > previsto;

  const inicioReal = horaLocal(item.horario_real_inicio);
  const fimReal = horaLocal(item.horario_real_fim);
  const variacao =
    item.status_novo === "em_andamento" || item.status_novo === "concluido"
      ? fraseVariacao(
          calcularVariacao(item.time, item.horario_real_inicio),
          item.status_novo === "concluido"
        )
      : null;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        destaque
          ? `border-stone-200 border-l-4 ${ui.border} ring-1 ring-stone-200`
          : `border-stone-200 border-l-4 ${ui.border}`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="pt-0.5">
            <StatusIcone item={item} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xl font-bold leading-none text-stone-900">
                {formatTime(item.time)}
              </span>
              {item.duracao_minutos ? (
                <span className="text-xs text-stone-400">
                  {item.duracao_minutos >= 60
                    ? `${Math.floor(item.duracao_minutos / 60)}h${
                        item.duracao_minutos % 60
                          ? String(item.duracao_minutos % 60)
                          : ""
                      }`
                    : `${item.duracao_minutos}min`}
                </span>
              ) : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold leading-snug text-stone-900">
              {item.title}
              {item.supplier_categoria && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  {categoriaLabel(item.supplier_categoria)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {destaque && (
            <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-xs font-semibold text-white">
              AGORA
            </span>
          )}
          {atrasado ? (
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              Atrasado
            </span>
          ) : (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ui.badge}`}
            >
              {ui.label}
            </span>
          )}
          <div className="relative">
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
      </div>

      {item.description && (
        <p className="mt-2 whitespace-pre-line text-sm text-stone-600">
          {item.description}
        </p>
      )}

      <div className="mt-3 space-y-1.5 text-sm">
        {item.supplier_name && (
          <p className="text-stone-600">
            <span className="text-stone-400">Fornecedor:</span>{" "}
            {item.supplier_name}
          </p>
        )}
        {item.responsavel_nome && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-600">
            <span className="flex items-center gap-1.5">
              <UserRound size={14} className="text-stone-400" />
              {item.responsavel_nome}
            </span>
            {item.responsavel_telefone && (
              <a
                href={`tel:${item.responsavel_telefone}`}
                className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800"
              >
                <Phone size={13} className="text-stone-400" />
                {item.responsavel_telefone}
              </a>
            )}
          </p>
        )}
      </div>

      {/* Horário real + variação */}
      {item.status_novo === "em_andamento" && inicioReal && (
        <p className="mt-2 text-sm font-medium text-sky-700">
          Iniciado às {inicioReal}
        </p>
      )}
      {item.status_novo === "concluido" && fimReal && (
        <p className="mt-2 text-sm font-medium text-emerald-700">
          Concluído às {fimReal}
        </p>
      )}
      {variacao && (
        <p className={`mt-0.5 text-xs ${variacao.cor}`}>{variacao.texto}</p>
      )}

      {/* Observação */}
      {item.observacao && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
          <span className="text-stone-400">Observação:</span> {item.observacao}
        </p>
      )}

      {item.etapa_obrigatoria && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
          🔖 Etapa obrigatória
        </p>
      )}
    </div>
  );
}
