"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Clock, Sparkles } from "lucide-react";

// mesma frase que frasePrazos() devolve quando não há nada vencendo
const NADA_VENCENDO = "Nada vencendo hoje.";

// Card do Copiloto na sidebar.
// - Dentro de um evento específico (/eventos/{uuid}/...): contexto do
//   evento — relógio ao vivo + atalho para o cronograma.
// - Nas visões gerais: o que VENCE, por espécie.
//
// Antes esta linha dizia "N eventos precisam da sua atenção hoje", com N
// vindo de saúde abaixo de 80. Dois defeitos num número só: quatro dos
// nove eram "checklist 0%" de casamentos de 2027 (não é para hoje) e
// quatro eram eventos já realizados pedindo confirmação de fornecedor
// (não é para nunca mais). Um contador sem substantivo é alarme, não
// informação.
export function CopilotoSidebarCard({
  prazosFrase,
  esperaFrase,
}: {
  prazosFrase: string | null;
  esperaFrase: string | null;
}) {
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

      {/* A pergunta das onze da noite não some dentro do evento: a linha
          da espera aparece nas DUAS variantes. */}
      {esperaFrase && (
        <p
          className={`mt-1.5 text-xs leading-snug ${
            esperaFrase === "Fornecedores em dia."
              ? "text-stone-400"
              : "text-stone-300"
          }`}
        >
          {esperaFrase}
          {esperaFrase !== "Fornecedores em dia." &&
            esperaFrase !== "Não deu para checar os fornecedores agora." && (
              <Link
                href="/solicitacoes#espera"
                className="mt-0.5 flex items-center gap-1 font-medium text-indigo-300 hover:text-indigo-200"
              >
                Ver quem deve
                <ArrowRight size={12} />
              </Link>
            )}
        </p>
      )}

      {eventId ? (
        <ContextoEvento eventId={eventId} />
      ) : prazosFrase === null ? (
        <p className="mt-1.5 text-xs leading-snug text-stone-400">Não deu para checar os prazos agora.</p>
      ) : prazosFrase === NADA_VENCENDO ? (
        <p className="mt-1.5 text-xs leading-snug text-stone-400">
          {prazosFrase}
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-xs leading-snug text-stone-300">
            {prazosFrase}
          </p>
          {/* o destino é onde cada um destes está listado com o seu
              próprio link — e não mais o filtro ?saude=pendente, que não
              acendia chip nenhum e deixava a lista sem dizer por quê */}
          <Link
            href="/eventos/dashboard"
            className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            Ver o que vence
            <ArrowRight size={12} />
          </Link>
        </>
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
        Ver roteiro
        <ArrowRight size={12} />
      </Link>
    </>
  );
}
