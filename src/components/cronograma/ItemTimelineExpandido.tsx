"use client";

// Linha da timeline do cronograma (lado da cerimonialista): trilho com
// círculo de status preenchido + conector vertical, coluna de horário/
// duração e o card rico expandido. Usado para TODOS os itens; o item
// atual ganha destaque forte (borda + fundo + "AGORA").

import { useState } from "react";
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
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

// Círculo de status preenchido (verde/azul/vermelho/accent) ou vazio.
function StatusCirculo({
  item,
  destaque,
}: {
  item: CronogramaItem;
  destaque?: boolean;
}) {
  const s = item.status_novo;
  if (s === "concluido")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
        <Check size={13} strokeWidth={3} />
      </span>
    );
  if (s === "em_andamento")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white ring-4 ring-white">
        <Play size={11} fill="currentColor" />
      </span>
    );
  if (s === "problema")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white ring-4 ring-white">
        <TriangleAlert size={13} />
      </span>
    );
  if (destaque)
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white ring-4 ring-white">
        <Play size={11} fill="currentColor" />
      </span>
    );
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-300 bg-white ring-4 ring-white" />
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
  const [aberto, setAberto] = useState(!concluido); // concluídos colapsam extras
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
  const temExtras = Boolean(item.observacao || item.etapa_obrigatoria);

  return (
    <li className="relative flex gap-3">
      {/* Trilho: círculo + conector vertical */}
      <div className="relative flex w-6 shrink-0 flex-col items-center">
        <div className="pt-1.5">
          <StatusCirculo item={item} destaque={destaque} />
        </div>
        {!isLast && (
          <span className="absolute top-8 bottom-[-1rem] w-px bg-stone-200" />
        )}
      </div>

      {/* Coluna de horário + duração */}
      <div className="w-14 shrink-0 pt-1.5 text-right">
        <div className="font-mono text-sm font-bold text-stone-900">
          {formatTime(item.time)}
        </div>
        {dur && <div className="text-xs text-stone-400">{dur}</div>}
      </div>

      {/* Card */}
      <div
        className={`mb-4 min-w-0 flex-1 rounded-xl border p-4 ${
          destaque
            ? "border-stone-200 border-l-4 border-l-sky-500 bg-sky-50/40 shadow-sm"
            : "border-stone-200 bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-base font-semibold leading-snug text-stone-900">
              {item.title}
            </p>
            {item.supplier_categoria && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoriaBadgeClass(
                  item.supplier_categoria
                )}`}
              >
                {categoriaLabel(item.supplier_categoria)}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {destaque && item.status_novo === "em_andamento" && (
              <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                AGORA
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

        {/* Fornecedor + responsável + telefone */}
        {(item.supplier_name || item.responsavel_nome) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
            {item.supplier_name && (
              <span className="flex items-center gap-1.5">
                <Briefcase size={14} className="text-stone-400" />
                {item.supplier_name}
              </span>
            )}
            {item.responsavel_nome && (
              <span className="flex items-center gap-1.5">
                <UserRound size={14} className="text-stone-400" />
                {item.responsavel_nome}
              </span>
            )}
            {item.responsavel_telefone && (
              <a
                href={`tel:${item.responsavel_telefone}`}
                className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800"
              >
                <Phone size={13} className="text-stone-400" />
                {item.responsavel_telefone}
              </a>
            )}
          </div>
        )}

        {item.description && aberto && (
          <p className="mt-2 whitespace-pre-line text-sm text-stone-600">
            {item.description}
          </p>
        )}

        {/* Status + horário real */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
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
          {item.status_novo === "em_andamento" && inicioReal && (
            <span className="text-xs font-medium text-sky-700">
              Iniciado às {inicioReal}
            </span>
          )}
          {concluido && fimReal && (
            <span className="text-xs font-medium text-emerald-700">
              Concluído às {fimReal}
            </span>
          )}
          {variacao && <span className={`text-xs ${variacao.cor}`}>· {variacao.texto}</span>}
        </div>

        {/* Extras (observação / obrigatória) — colapsáveis nos concluídos */}
        {temExtras && aberto && (
          <div className="mt-2 space-y-1.5">
            {item.observacao && (
              <p className="text-sm text-stone-600">
                <span className="text-stone-400">Observação:</span>{" "}
                {item.observacao}
              </p>
            )}
            {item.etapa_obrigatoria && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                🔖 Obrigatória
              </span>
            )}
          </div>
        )}

        {/* Toggle de expandir (só quando há extras a esconder — concluídos) */}
        {concluido && temExtras && (
          <button
            onClick={() => setAberto((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-stone-600"
          >
            {aberto ? (
              <>
                <ChevronDown size={13} /> Recolher
              </>
            ) : (
              <>
                <ChevronRight size={13} /> Ver detalhes
              </>
            )}
          </button>
        )}
      </div>
    </li>
  );
}
