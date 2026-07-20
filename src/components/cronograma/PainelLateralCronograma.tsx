"use client";

// Painel lateral da aba Cronograma (300px) — segue o handoff de design:
// cards brancos radius 14, borda #ECEBF3, padding 20; anel de progresso
// em conic-gradient; links de ação em roxo #6C5DD3.
// Relógio ao vivo alimenta a contagem regressiva e os alertas de atraso;
// os cálculos continuam vindo de lib/cronograma (regras reais).

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  alertasCronograma,
  contagemRegressiva,
  progressoDoDia,
  proximosItens,
  type CronogramaItem,
} from "@/lib/cronograma";

function agoraEmMinutos() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

const CARD =
  "rounded-[14px] border border-[#ECEBF3] bg-white p-5";
const TITULO = "text-[14.5px] font-bold text-[#17162A]";
const LINK =
  "mt-3.5 inline-block text-[13px] font-bold text-[#6C5DD3] hover:underline";

export function PainelLateralCronograma({
  items,
  eventId,
  eventoHoje,
  onAtualizarStatus,
  onFocarItem,
}: {
  items: CronogramaItem[];
  eventId: string;
  eventoHoje: boolean;
  onAtualizarStatus: () => void;
  onFocarItem: (itemId: string) => void;
}) {
  // Começa neutro (-1) para casar SSR e 1ª render do cliente; o tempo
  // real entra após o mount (evita divergência de hidratação).
  const [nowMinutes, setNowMinutes] = useState(-1);
  const mounted = nowMinutes >= 0;

  useEffect(() => {
    setNowMinutes(agoraEmMinutos());
    const t = setInterval(() => setNowMinutes(agoraEmMinutos()), 60_000);
    return () => clearInterval(t);
  }, []);

  const progresso = progressoDoDia(items);
  const proximos = proximosItens(items, 3);
  const alertas = alertasCronograma(
    items,
    eventoHoje && mounted ? nowMinutes : -1
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Progresso do dia */}
      <section className={CARD}>
        <div className={`${TITULO} mb-3.5`}>Progresso do dia</div>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#17A34A 0% ${progresso.pct}%, #E9E8F1 ${progresso.pct}% 100%)`,
            }}
          >
            <div className="h-12 w-12 rounded-full bg-white" />
          </div>
          <div>
            <div className="text-[22px] font-extrabold text-[#17162A]">
              {progresso.pct}%
            </div>
            <div className="text-[12.5px] text-[#6B6884]">
              {progresso.concluidos} de {progresso.total} itens concluídos
            </div>
          </div>
        </div>
        <Link href={`/eventos/${eventId}`} className={LINK}>
          Ver análise completa →
        </Link>
      </section>

      {/* Próximos itens */}
      <section className={CARD}>
        <div className={`${TITULO} mb-3.5`}>Próximos itens</div>
        {proximos.length === 0 ? (
          <p className="text-[12.5px] text-[#9A97AE]">
            Nada planejado à frente.
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {proximos.map((item, i) => (
              <button
                key={item.id}
                onClick={() => onFocarItem(item.id)}
                className="flex items-center gap-2.5 text-left"
              >
                <span
                  className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[10px]"
                  style={{
                    background: i === 0 ? "#F1EFFC" : "#F1F0F5",
                    color: i === 0 ? "#6C5DD3" : "#9A97AE",
                  }}
                >
                  {i === 0 ? "▶" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[#17162A]">
                    {(item.time ?? "").slice(0, 5)}{" "}
                    <span className="font-normal text-[#6B6884]">
                      {item.title}
                    </span>
                  </span>
                </span>
                {eventoHoje && mounted && (
                  <span className="whitespace-nowrap text-xs text-[#9A97AE]">
                    {contagemRegressiva(item.time, nowMinutes)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <Link href={`/eventos/${eventId}/roteiro`} className={LINK}>
          Ver cronograma completo →
        </Link>
      </section>

      {/* Alertas do Copiloto */}
      <section className={CARD}>
        <div className="mb-3.5 flex items-center gap-1.5">
          <span className={TITULO}>Alertas do Copiloto</span>
          {alertas.length > 0 && (
            <span className="rounded-lg bg-[#F1EFFC] px-[7px] py-px text-[11.5px] font-bold text-[#6C5DD3]">
              {alertas.length}
            </span>
          )}
        </div>
        {alertas.length === 0 ? (
          <p className="text-[12.5px] text-[#6B6884]">
            Tudo tranquilo por aqui 🎉
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {alertas.slice(0, 5).map((a) => (
              <div key={a.id} className="flex gap-2.5">
                <span
                  className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px]"
                  style={{
                    background: a.tipo === "problema" ? "#FDECEA" : "#FEF3C7",
                    color: a.tipo === "problema" ? "#E0574F" : "#B4790E",
                  }}
                >
                  !
                </span>
                <div className="min-w-0">
                  <div className="break-words text-[12.5px] leading-normal text-[#3D3A52]">
                    {a.titulo}
                  </div>
                  <div className="break-words text-[12px] leading-normal text-[#9A97AE]">
                    {a.detalhe}
                  </div>
                  <button
                    onClick={() => onFocarItem(a.itemId)}
                    className="mt-1 text-[12.5px] font-bold text-[#6C5DD3] hover:underline"
                  >
                    Ver item →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ações rápidas */}
      <section className={CARD}>
        <div className={`${TITULO} mb-3.5`}>Ações rápidas</div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/eventos/${eventId}/fornecedores`}
            className="flex items-center gap-2 rounded-[9px] border border-[#ECEBF3] px-[11px] py-2.5 text-[12.5px] font-semibold text-[#3D3A52] hover:bg-[#F6F6FA]"
          >
            ✉ Enviar lembrete
          </Link>
          <button
            onClick={onAtualizarStatus}
            className="flex items-center gap-2 rounded-[9px] border border-[#ECEBF3] px-[11px] py-2.5 text-left text-[12.5px] font-semibold text-[#3D3A52] hover:bg-[#F6F6FA]"
          >
            ↻ Atualizar status
          </button>
          <Link
            href={`/eventos/${eventId}/comunicacao`}
            className="flex items-center gap-2 rounded-[9px] border border-[#ECEBF3] px-[11px] py-2.5 text-[12.5px] font-semibold text-[#3D3A52] hover:bg-[#F6F6FA]"
          >
            💬 Ver comunicação
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-[9px] border border-[#ECEBF3] px-[11px] py-2.5 text-left text-[12.5px] font-semibold text-[#3D3A52] hover:bg-[#F6F6FA]"
          >
            🖶 Imprimir
          </button>
        </div>
      </section>
    </div>
  );
}
