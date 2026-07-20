"use client";

// Item da timeline do Cronograma.
// Layout: [trilho: círculo + linha conectora] [horário/duração] [card].
// Card: cabeçalho (título + categoria + menu), corpo em 2 blocos
// (identidade à esquerda, status à direita) e observação em largura
// total. Dimensionado para a largura real da coluna (~550px, limitada
// pelo max-w-5xl da página). min-w-0 + break-words em todo texto longo;
// badges whitespace-nowrap; nada de absolute (exceto o dropdown do menu).

import { useState } from "react";
import {
  Briefcase,
  Check,
  MoreVertical,
  Phone,
  Play,
  TriangleAlert,
  UserRound,
} from "lucide-react";
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

// Círculo do trilho: preenchido com a cor do status, anel branco para
// não encostar na linha conectora.
function StatusCirculo({
  item,
  destaque,
}: {
  item: CronogramaItem;
  destaque?: boolean;
}) {
  const s = item.status_novo;
  const base =
    "flex h-5 w-5 items-center justify-center rounded-full text-white ring-4 ring-white";
  if (s === "concluido")
    return (
      <span className={`${base} bg-emerald-500`}>
        <Check size={11} strokeWidth={3} />
      </span>
    );
  if (s === "em_andamento")
    return (
      <span className={`${base} bg-sky-500`}>
        <Play size={9} fill="currentColor" />
      </span>
    );
  if (s === "problema")
    return (
      <span className={`${base} bg-red-500`}>
        <TriangleAlert size={11} />
      </span>
    );
  if (destaque)
    return (
      <span className={`${base} bg-indigo-500`}>
        <Play size={9} fill="currentColor" />
      </span>
    );
  return (
    <span className="h-5 w-5 rounded-full border-2 border-stone-300 bg-white ring-4 ring-white" />
  );
}

export function ItemTimelineExpandido({
  item,
  destaque,
  isLast,
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

  return (
    <div className="flex gap-3 pb-5">
      {/* Trilho: círculo + linha conectora (fluxo normal, sem absolute) */}
      <div className="flex w-5 flex-shrink-0 flex-col items-center pt-4">
        <StatusCirculo item={item} destaque={destaque} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-stone-200" />}
      </div>

      {/* Horário + duração */}
      <div className="w-14 flex-shrink-0 pt-4 text-right">
        <div className="text-sm font-semibold tabular-nums text-stone-900">
          {formatTime(item.time)}
        </div>
        {dur && <div className="mt-0.5 text-xs text-stone-400">{dur}</div>}
      </div>

      {/* Card */}
      <div
        className={`min-w-0 flex-1 rounded-xl border p-4 ${
          destaque
            ? "border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-100"
            : "border-stone-200 bg-white"
        }`}
      >
        {/* Cabeçalho: título + categoria + AGORA · menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-medium text-stone-900">
              {item.title}
            </h3>
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

        {/* Corpo: identidade à esquerda · status à direita */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
          <div className="min-w-0 sm:flex-1">
            {item.supplier_name && (
              <div className="flex min-w-0 items-center gap-1.5 text-sm text-stone-600">
                <Briefcase size={14} className="flex-shrink-0 text-stone-400" />
                <span className="min-w-0 break-words">{item.supplier_name}</span>
              </div>
            )}
            {(item.responsavel_nome || item.responsavel_telefone) && (
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
                {item.responsavel_nome && (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <UserRound
                      size={14}
                      className="flex-shrink-0 text-stone-400"
                    />
                    <span className="min-w-0 break-words">{item.responsavel_nome}</span>
                  </span>
                )}
                {item.responsavel_telefone && (
                  <a
                    href={`tel:${item.responsavel_telefone}`}
                    className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800"
                  >
                    <Phone size={13} className="flex-shrink-0 text-stone-400" />
                    <span className="whitespace-nowrap">
                      {item.responsavel_telefone}
                    </span>
                  </a>
                )}
              </div>
            )}

            {item.description && (
              <p className="mt-2 whitespace-pre-line break-words text-sm text-stone-500">
                {item.description}
              </p>
            )}
          </div>

          {/* Direita — status + carimbo de horário + obrigatória */}
          <div className="min-w-0 sm:w-44 sm:flex-shrink-0">
            {atrasado ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Atrasado
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ui.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
                {ui.label}
              </span>
            )}
            {item.status_novo === "em_andamento" && inicioReal && (
              <p className="mt-1.5 text-xs text-stone-500">
                Iniciado às {inicioReal}
              </p>
            )}
            {concluido && fimReal && (
              <p className="mt-1.5 text-xs text-stone-500">
                Concluído às {fimReal}
              </p>
            )}
            {variacao && (
              <p className={`mt-0.5 text-xs ${variacao.cor}`}>
                {variacao.texto}
              </p>
            )}
            {item.etapa_obrigatoria && (
              <span className="mt-2 inline-flex whitespace-nowrap rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                🔖 Obrigatória
              </span>
            )}
          </div>
        </div>

        {/* Observação — largura total, com rótulo discreto */}
        {item.observacao && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Observação
            </p>
            <p className="mt-0.5 break-words text-sm leading-relaxed text-stone-600">
              {item.observacao}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
