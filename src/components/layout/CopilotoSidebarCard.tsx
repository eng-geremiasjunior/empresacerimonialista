"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Clock, Sparkles } from "lucide-react";

// Card do Copiloto na sidebar.
// - Dentro de um evento específico (/eventos/{uuid}/...): contexto do
//   evento — relógio ao vivo + atalho para o cronograma.
// - Nas visões gerais (Dashboard, listagem): N real de eventos que
//   precisam de atenção.
export function CopilotoSidebarCard({ atencao }: { atencao: number }) {
  const pathname = usePathname();
  const match = pathname?.match(
    /^\/eventos\/([0-9a-fA-F-]{36})(?:\/|$)/
  );
  const eventId = match?.[1] ?? null;

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
        <Sparkles size={13} className="text-indigo-400" />
        Copiloto Vela
      </p>

      {eventId ? (
        <ContextoEvento eventId={eventId} />
      ) : atencao > 0 ? (
        <>
          <p className="mt-1.5 text-xs leading-snug text-stone-300">
            {atencao} evento{atencao === 1 ? "" : "s"}{" "}
            {atencao === 1 ? "precisa" : "precisam"} da sua atenção hoje.
          </p>
          <Link
            href="/eventos?saude=pendente"
            className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            Ver recomendações
            <ArrowRight size={12} />
          </Link>
        </>
      ) : (
        <p className="mt-1.5 text-xs leading-snug text-stone-400">
          Nenhum evento precisa de atenção hoje.
        </p>
      )}
    </div>
  );
}

function ContextoEvento({ eventId }: { eventId: string }) {
  const [agora, setAgora] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setAgora(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs leading-snug text-stone-300">
        <Clock size={12} className="text-stone-400" />
        Agora {agora}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-stone-400">
        Acompanhe o cronograma deste evento ao vivo.
      </p>
      <Link
        href={`/eventos/${eventId}/roteiro`}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
      >
        Ver cronograma
        <ArrowRight size={12} />
      </Link>
    </>
  );
}
