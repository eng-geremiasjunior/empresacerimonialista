"use client";

// Painel lateral da aba Cronograma (4 cards). Relógio ao vivo (atualiza
// a cada minuto) alimenta a contagem regressiva dos próximos itens e os
// alertas de atraso. Alertas e progresso são calculados client-side a
// partir do estado real dos itens (regras reais, sem IA).

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
    <div className="space-y-4">
      {/* CARD 1 — Progresso do dia */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-stone-700">Progresso do dia</h3>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-stone-100"
              />
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (circ * progresso.pct) / 100}
                className="text-emerald-500 transition-all"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-800">
              {progresso.pct}%
            </span>
          </div>
          <div className="text-sm text-stone-600">
            {progresso.concluidos} de {progresso.total} itens concluídos
          </div>
        </div>
        <Link
          href={`/eventos/${eventId}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"
        >
          Ver análise completa <ArrowRight size={13} />
        </Link>
      </section>

      {/* CARD 2 — Próximos itens */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-stone-700">Próximos itens</h3>
        {proximos.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">Nada planejado à frente.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {proximos.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onFocarItem(item.id)}
                  className="flex w-full items-baseline gap-2 text-left"
                >
                  <span className="font-mono text-sm font-semibold text-stone-600">
                    {(item.time ?? "").slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-700">
                    {item.title}
                  </span>
                  {eventoHoje && mounted && (
                    <span className="shrink-0 text-xs text-stone-400">
                      {contagemRegressiva(item.time, nowMinutes)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CARD 3 — Alertas do Copiloto */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-700">
            <Bell size={15} className="text-stone-400" />
            Alertas do Copiloto
          </h3>
          {alertas.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
              {alertas.length}
            </span>
          )}
        </div>
        {alertas.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            Tudo tranquilo por aqui 🎉
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {alertas.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <TriangleAlert
                  size={15}
                  className={`mt-0.5 shrink-0 ${
                    a.tipo === "problema" ? "text-red-500" : "text-amber-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-stone-800">
                    {a.titulo}
                  </p>
                  <p className="text-xs text-stone-500">{a.detalhe}</p>
                  <button
                    onClick={() => onFocarItem(a.itemId)}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"
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
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-stone-700">Ações rápidas</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/eventos/${eventId}/fornecedores`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          >
            <Send size={14} className="text-stone-400" />
            Enviar lembrete
          </Link>
          <button
            onClick={onAtualizarStatus}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          >
            <RefreshCw size={14} className="text-stone-400" />
            Atualizar status
          </button>
          <Link
            href={`/eventos/${eventId}/comunicacao`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          >
            <MessageSquare size={14} className="text-stone-400" />
            Ver comunicação
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2.5 text-xs font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          >
            <Printer size={14} className="text-stone-400" />
            Imprimir
          </button>
        </div>
      </section>
    </div>
  );
}
