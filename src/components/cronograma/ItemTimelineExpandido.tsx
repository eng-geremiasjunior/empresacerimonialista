"use client";

// Item da timeline do Cronograma — segue o handoff de design
// (design_handoff_cronograma). Estrutura: trilho (bolinha 20px + linha
// conectora 2px) + card em colunas fixas: 74px horário · 200px identidade
// · 150px status · flex-1 observação · 70px ações.
// As larguras fixas valem de `2xl` (1536px) para cima — é onde o card
// alcança ~845px, a largura que o handoff pressupõe. Abaixo disso tudo
// empilha (em 1280 o card tem 589px e as colunas fixas cortariam texto). min-w-0 + break-words em todo texto longo e
// whitespace-nowrap nos badges evitam transbordo/sobreposição.

import { useState } from "react";
import { Briefcase, Phone, UserRound } from "lucide-react";
import { formatTime } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import {
  calcularVariacao,
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

// Tokens de status do handoff.
type StatusVis = {
  label: string;
  icon: string;
  bg: string;
  color: string;
  dotBg: string;
  dotBorder: string;
  dotColor: string;
  dotGlyph: string;
};

function statusVisual(
  item: CronogramaItem,
  atrasado: boolean,
  destaque: boolean
): StatusVis {
  if (item.status_novo === "concluido")
    return {
      label: "Concluído",
      icon: "✓",
      bg: "#E7F8ED",
      color: "#17A34A",
      dotBg: "#17A34A",
      dotBorder: "#17A34A",
      dotColor: "#fff",
      dotGlyph: "✓",
    };
  if (item.status_novo === "em_andamento")
    return {
      label: "Em andamento",
      icon: "◐",
      bg: "#DBEAFE",
      color: "#2563EB",
      dotBg: destaque ? "#6C5DD3" : "#2563EB",
      dotBorder: destaque ? "#6C5DD3" : "#2563EB",
      dotColor: "#fff",
      dotGlyph: "▶",
    };
  if (item.status_novo === "problema")
    return {
      label: "Problema reportado",
      icon: "!",
      bg: "#FDECEA",
      color: "#E0574F",
      dotBg: "#E0574F",
      dotBorder: "#E0574F",
      dotColor: "#fff",
      dotGlyph: "!",
    };
  if (atrasado)
    return {
      label: "Atrasado",
      icon: "!",
      bg: "#FDECEA",
      color: "#DC2626",
      dotBg: "#fff",
      dotBorder: "#DC2626",
      dotColor: "#DC2626",
      dotGlyph: "",
    };
  return {
    label: "Pendente",
    icon: "○",
    bg: "#F1F0F5",
    color: "#6B6884",
    dotBg: destaque ? "#6C5DD3" : "#fff",
    dotBorder: destaque ? "#6C5DD3" : "#D8D6E4",
    dotColor: destaque ? "#fff" : "#9A97AE",
    dotGlyph: destaque ? "▶" : "",
  };
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

  const previsto = timeToMinutes(item.time);
  const atrasado =
    item.status_novo === "planejado" &&
    previsto !== null &&
    nowMinutes > previsto;

  const vis = statusVisual(item, atrasado, Boolean(destaque));
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

  // Sublinha do status (statusSub do handoff).
  const statusSub = concluido
    ? fimReal
      ? `Concluído às ${fimReal}`
      : null
    : item.status_novo === "em_andamento"
      ? inicioReal
        ? `Iniciado às ${inicioReal}`
        : null
      : item.status_novo === "planejado"
        ? "Aguardando início"
        : null;

  return (
    <div className="flex gap-3.5">
      {/* Trilho: bolinha + linha conectora */}
      <div className="flex w-5 flex-shrink-0 flex-col items-center">
        <div
          className="z-[1] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            background: vis.dotBg,
            border: `2px solid ${vis.dotBorder}`,
            color: vis.dotColor,
          }}
        >
          {vis.dotGlyph}
        </div>
        {!isLast && (
          <div className="my-0.5 w-0.5 flex-1" style={{ background: "#E9E8F1" }} />
        )}
      </div>

      {/* Card */}
      <div className="min-w-0 flex-1 pb-[18px]">
        <div
          className="flex flex-col gap-4 rounded-xl px-[18px] py-4 2xl:flex-row 2xl:items-start 2xl:gap-[18px]"
          style={{
            border: `1px solid ${destaque ? "#6C5DD3" : "#ECEBF3"}`,
            background: destaque ? "#FAF9FF" : "#fff",
          }}
        >
          {/* 74px — horário + duração */}
          <div className="2xl:w-[74px] 2xl:flex-shrink-0">
            <div
              className="text-[15px] font-extrabold"
              style={{ color: destaque ? "#6C5DD3" : "#17162A" }}
            >
              {formatTime(item.time)}
            </div>
            {dur && (
              <div className="mt-0.5 text-xs" style={{ color: "#9A97AE" }}>
                {dur}
              </div>
            )}
          </div>

          {/* 200px — identidade */}
          <div className="min-w-0 2xl:w-[200px] 2xl:flex-shrink-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="min-w-0 break-words text-[14.5px] font-bold"
                style={{ color: "#17162A" }}
              >
                {item.title}
              </span>
              {item.supplier_categoria && (
                <span
                  className="whitespace-nowrap rounded-full px-[9px] py-0.5 text-[11.5px] font-semibold"
                  style={{ background: "#F1EFFC", color: "#6C5DD3" }}
                >
                  {categoriaLabel(item.supplier_categoria)}
                </span>
              )}
              {destaque && item.status_novo === "em_andamento" && (
                <span
                  className="whitespace-nowrap rounded-full px-[9px] py-0.5 text-[11.5px] font-bold text-white"
                  style={{ background: "#6C5DD3" }}
                >
                  AGORA
                </span>
              )}
            </div>
            {item.supplier_name && (
              <div
                className="mb-1 flex min-w-0 items-center gap-1.5 text-[12.5px]"
                style={{ color: "#6B6884" }}
              >
                <Briefcase size={13} className="flex-shrink-0 opacity-60" />
                <span className="min-w-0 break-words">{item.supplier_name}</span>
              </div>
            )}
            {item.responsavel_nome && (
              <div
                className="flex min-w-0 items-center gap-1.5 text-[12.5px]"
                style={{ color: "#6B6884" }}
              >
                <UserRound size={13} className="flex-shrink-0 opacity-60" />
                <span className="min-w-0 break-words">
                  {item.responsavel_nome}
                </span>
              </div>
            )}
            {item.responsavel_telefone && (
              <a
                href={`tel:${item.responsavel_telefone}`}
                className="mt-0.5 flex items-center gap-1.5 text-[12.5px] hover:underline"
                style={{ color: "#6B6884" }}
              >
                <Phone size={12} className="flex-shrink-0 opacity-60" />
                <span className="whitespace-nowrap">
                  {item.responsavel_telefone}
                </span>
              </a>
            )}
          </div>

          {/* 150px — status */}
          <div className="min-w-0 2xl:w-[150px] 2xl:flex-shrink-0">
            <span
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-[5px] text-xs font-bold"
              style={{ background: vis.bg, color: vis.color }}
            >
              {vis.icon} {vis.label}
            </span>
            {statusSub && (
              <div
                className="mt-2 text-xs leading-normal"
                style={{ color: "#9A97AE" }}
              >
                {statusSub}
              </div>
            )}
            {variacao && (
              <div className={`mt-0.5 text-xs ${variacao.cor}`}>
                {variacao.texto}
              </div>
            )}
          </div>

          {/* flex-1 — observação */}
          <div className="min-w-0 2xl:flex-1">
            {item.observacao ? (
              <>
                <div
                  className="mb-1 text-xs font-bold"
                  style={{ color: "#17162A" }}
                >
                  Observação
                </div>
                <div
                  className="break-words text-[12.5px] leading-normal"
                  style={{ color: "#6B6884" }}
                >
                  {item.observacao}
                </div>
              </>
            ) : item.description ? (
              <div
                className="break-words text-[12.5px] leading-normal"
                style={{ color: "#9A97AE" }}
              >
                {item.description}
              </div>
            ) : null}
          </div>

          {/* 70px — obrigatória + menu */}
          <div className="flex flex-shrink-0 items-start justify-between gap-3 2xl:w-[70px] 2xl:flex-col 2xl:items-end">
            {item.etapa_obrigatoria && (
              <span
                className="whitespace-nowrap text-[12.5px] font-semibold"
                style={{ color: "#6B6884" }}
              >
                🔖 Obrigatória
              </span>
            )}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuAberto((v) => !v)}
                onBlur={() => setTimeout(() => setMenuAberto(false), 150)}
                aria-label="Ações"
                className="rounded px-1 text-base leading-none hover:opacity-70"
                style={{ color: "#B4B1C8" }}
              >
                ⋮
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-7 z-10 w-44 overflow-hidden rounded-lg border border-[#ECEBF3] bg-white py-1 shadow-lg">
                  <button
                    onMouseDown={onEditar}
                    className="block w-full px-3 py-2 text-left text-[12.5px] text-[#3D3A52] hover:bg-[#F6F6FA]"
                  >
                    Editar
                  </button>
                  <button
                    onMouseDown={onVerHistorico}
                    className="block w-full px-3 py-2 text-left text-[12.5px] text-[#3D3A52] hover:bg-[#F6F6FA]"
                  >
                    Ver histórico
                  </button>
                  <button
                    onMouseDown={onExcluir}
                    className="block w-full px-3 py-2 text-left text-[12.5px] text-[#DC2626] hover:bg-[#FDECEA]"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
