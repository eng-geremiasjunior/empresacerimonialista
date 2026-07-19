"use client";

// Linha da timeline do cronograma (lado da cerimonialista): trilho com
// círculo de status preenchido + conector vertical, coluna de horário/
// duração e card premium expandido. Usado para TODOS os itens; o item
// atual ganha destaque forte (acento lateral + fundo tingido + "AGORA").

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

// Círculo de status preenchido (verde/azul/vermelho/accent) ou vazio,
// isolado do trilho por um anel branco.
function StatusCirculo({
  item,
  destaque,
}: {
  item: CronogramaItem;
  destaque?: boolean;
}) {
  const s = item.status_novo;
  const base =
    "flex h-6 w-6 items-center justify-center rounded-full text-white ring-4 ring-white shadow-sm";
  if (s === "concluido")
    return (
      <span className={`${base} bg-emerald-500`}>
        <Check size={13} strokeWidth={3} />
      </span>
    );
  if (s === "em_andamento")
    return (
      <span className={`${base} bg-sky-500`}>
        <Play size={10} fill="currentColor" />
      </span>
    );
  if (s === "problema")
    return (
      <span className={`${base} bg-red-500`}>
        <TriangleAlert size={12} />
      </span>
    );
  if (destaque)
    return (
      <span className={`${base} bg-indigo-500`}>
        <Play size={10} fill="currentColor" />
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
    <li className="relative flex gap-4 pb-5">
      {/* Trilho: círculo + conector vertical */}
      <div className="relative flex w-6 shrink-0 flex-col items-center">
        <div className="pt-1">
          <StatusCirculo item={item} destaque={destaque} />
        </div>
        {!isLast && (
          <span className="absolute left-1/2 top-8 bottom-[-1.25rem] w-px -translate-x-1/2 bg-stone-200" />
        )}
      </div>

      {/* Coluna de horário + duração */}
      <div className="w-14 shrink-0 pt-1 text-right">
        <div className="font-mono text-sm font-bold tabular-nums text-stone-900">
          {formatTime(item.time)}
        </div>
        {dur && <div className="mt-0.5 text-[11px] text-stone-400">{dur}</div>}
      </div>

      {/* Card */}
      <div
        className={`min-w-0 flex-1 rounded-2xl border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ${
          destaque
            ? "border-sky-100 border-l-[3px] border-l-sky-500 bg-sky-50/40 ring-1 ring-sky-100"
            : concluido
              ? "border-stone-200 bg-white"
              : "border-stone-200 bg-white"
        }`}
      >
        {/* Linha 1: título + categoria · menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <p
              className={`text-[15px] font-semibold leading-snug ${
                concluido ? "text-stone-700" : "text-stone-900"
              }`}
            >
              {item.title}
            </p>
            {item.supplier_categoria && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${categoriaBadgeClass(
                  item.supplier_categoria
                )}`}
              >
                {categoriaLabel(item.supplier_categoria)}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {destaque && item.status_novo === "em_andamento" && (
              <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                AGORA
              </span>
            )}
            <div className="relative">
              <button
                onClick={() => setMenuAberto((v) => !v)}
                onBlur={() => setTimeout(() => setMenuAberto(false), 150)}
                aria-label="Ações"
                className="-mr-1 rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              >
                <MoreVertical size={18} />
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
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

        {/* Linha 2: identidade (fornecedor · responsável · telefone) */}
        {(item.supplier_name || item.responsavel_nome) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-stone-500">
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
                className="flex items-center gap-1.5 text-stone-500 transition-colors hover:text-stone-800"
              >
                <Phone size={13} className="text-stone-400" />
                {item.responsavel_telefone}
              </a>
            )}
          </div>
        )}

        {item.description && aberto && (
          <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-stone-500">
            {item.description}
          </p>
        )}

        {/* Linha 3: status + carimbo de horário real + variação */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {atrasado ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Atrasado
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${ui.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
              {ui.label}
            </span>
          )}
          {item.status_novo === "em_andamento" && inicioReal && (
            <span className="text-[12px] font-medium text-sky-700">
              Iniciado às {inicioReal}
            </span>
          )}
          {concluido && fimReal && (
            <span className="text-[12px] font-medium text-emerald-700">
              Concluído às {fimReal}
            </span>
          )}
          {variacao && (
            <span className={`text-[12px] ${variacao.cor}`}>
              · {variacao.texto}
            </span>
          )}
        </div>

        {/* Observação + obrigatória (colapsáveis nos concluídos) */}
        {temExtras && aberto && (
          <div className="mt-3 space-y-2">
            {item.observacao && (
              <div className="border-l-2 border-stone-200 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  Observação
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-stone-600">
                  {item.observacao}
                </p>
              </div>
            )}
            {item.etapa_obrigatoria && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                🔖 Obrigatória
              </span>
            )}
          </div>
        )}

        {/* Toggle de expandir (só quando há extras a esconder — concluídos) */}
        {concluido && temExtras && (
          <button
            onClick={() => setAberto((v) => !v)}
            className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-600"
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
