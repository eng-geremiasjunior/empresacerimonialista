"use client";

// Painel lateral da aba Cronograma (centro operacional). Cards uniformes,
// relógio ao vivo (atualiza a cada minuto) para a contagem regressiva dos
// próximos itens e os alertas de atraso. Cálculos client-side a partir do
// estado real dos itens (regras reais, sem IA).

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  MessageSquare,
  Printer,
  RefreshCw,
  Send,
  TriangleAlert,
} from "lucide-react";
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

const cardClass =
  "rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const tituloClass = "text-[13px] font-semibold text-stone-800";
const linkClass =
  "inline-flex items-center gap-1 text-[12px] font-medium text-stone-400 transition-colors hover:text-stone-700";

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
  // Atrasos só fazem sentido no dia do evento e após o mount; problema
  // alerta sempre.
  const alertas = alertasCronograma(
    items,
    eventoHoje && mounted ? nowMinutes : -1
  );

  const raio = 26;
  const circ = 2 * Math.PI * raio;

  return (
    <div className="space-y-5">
      {/* CARD 1 — Progresso do dia */}
      <section className={cardClass}>
        <h3 className={tituloClass}>Progresso do dia</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-[70px] w-[70px] shrink-0">
            <svg className="h-[70px] w-[70px] -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className="text-stone-100"
              />
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (circ * progresso.pct) / 100}
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-stone-800">
              {progresso.pct}%
            </span>
          </div>
          <div className="text-[13px] leading-snug text-stone-500">
            <span className="font-semibold text-stone-800">
              {progresso.concluidos}
            </span>{" "}
            de {progresso.total} itens concluídos
          </div>
        </div>
        <Link href={`/eventos/${eventId}`} className={`mt-4 ${linkClass}`}>
          Ver análise completa <ArrowRight size={13} />
        </Link>
      </section>

      {/* CARD 2 — Próximos itens */}
      <section className={cardClass}>
        <h3 className={tituloClass}>Próximos itens</h3>
        {proximos.length === 0 ? (
          <p className="mt-3 text-[13px] text-stone-400">
            Nada planejado à frente.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {proximos.map((item, i) => (
              <li key={item.id}>
                <button
                  onClick={() => onFocarItem(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                    i === 0 ? "bg-sky-50" : "hover:bg-stone-50"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      i === 0 ? "bg-sky-500" : "bg-stone-300"
                    }`}
                  />
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-stone-600">
                    {(item.time ?? "").slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-stone-700">
                    {item.title}
                  </span>
                  {eventoHoje && mounted && (
                    <span className="shrink-0 text-[11px] font-medium text-stone-400">
                      {contagemRegressiva(item.time, nowMinutes)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/eventos/${eventId}/roteiro`}
          className={`mt-3 ${linkClass}`}
        >
          Ver cronograma completo <ArrowRight size={13} />
        </Link>
      </section>

      {/* CARD 3 — Alertas do Copiloto */}
      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <h3 className={`flex items-center gap-1.5 ${tituloClass}`}>
            <Bell size={14} className="text-stone-400" />
            Alertas do Copiloto
          </h3>
          {alertas.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
              {alertas.length}
            </span>
          )}
        </div>
        {alertas.length === 0 ? (
          <p className="mt-3 text-[13px] text-stone-500">
            Tudo tranquilo por aqui 🎉
          </p>
        ) : (
          <ul className="mt-3 space-y-3.5">
            {alertas.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    a.tipo === "problema"
                      ? "bg-red-50 text-red-500"
                      : "bg-amber-50 text-amber-500"
                  }`}
                >
                  <TriangleAlert size={13} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug text-stone-800">
                    {a.titulo}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-stone-500">
                    {a.detalhe}
                  </p>
                  <button
                    onClick={() => onFocarItem(a.itemId)}
                    className={`mt-1 ${linkClass}`}
                  >
                    Ver item <ArrowRight size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CARD 4 — Ações rápidas */}
      <section className={cardClass}>
        <h3 className={tituloClass}>Ações rápidas</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/eventos/${eventId}/fornecedores`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-2 py-2.5 text-[12px] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <Send size={14} className="text-stone-400" />
            Enviar lembrete
          </Link>
          <button
            onClick={onAtualizarStatus}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-2 py-2.5 text-[12px] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <RefreshCw size={14} className="text-stone-400" />
            Atualizar status
          </button>
          <Link
            href={`/eventos/${eventId}/comunicacao`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-2 py-2.5 text-[12px] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <MessageSquare size={14} className="text-stone-400" />
            Ver comunicação
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-2 py-2.5 text-[12px] font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
          >
            <Printer size={14} className="text-stone-400" />
            Imprimir
          </button>
        </div>
      </section>
    </div>
  );
}
