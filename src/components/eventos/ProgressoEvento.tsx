"use client";

// Stepper da jornada do evento: PLANEJAMENTO → ORGANIZAÇÃO → EXECUÇÃO.
//
// Os três nós são clicáveis e a navegação é livre — dá para voltar a
// Planejamento a qualquer momento. A fase escolhida vai na query string
// (?fase=), então o link é compartilhável e o botão voltar funciona.
//
// A linha entre dois nós é preenchida proporcionalmente ao progresso da
// fase à ESQUERDA: é o mesmo indicador parcial do círculo, só estendido
// para o trecho conector, como pedido.

import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import type { Saude } from "@/lib/saude-evento";
import type { FaseId, FaseProgresso, FasesEvento } from "@/lib/supabase/resumo-evento";

function No({
  fase,
  ativa,
  onClick,
}: {
  fase: FaseProgresso;
  ativa: boolean;
  onClick: () => void;
}) {
  const completa = fase.pct >= 100;
  return (
    <button
      onClick={onClick}
      aria-current={ativa ? "step" : undefined}
      className="group flex flex-1 flex-col items-center text-center"
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
          completa
            ? "bg-emerald-500 text-white"
            : fase.pct > 0
              ? "border-2 border-emerald-500 bg-white text-emerald-600"
              : "border-2 border-gray-200 bg-white text-gray-400"
        } ${ativa ? "ring-2 ring-gray-900 ring-offset-2" : ""}`}
      >
        {completa ? <Check size={15} strokeWidth={3} /> : `${fase.pct}%`}
      </div>
      <p
        className={`mt-2 text-sm ${
          ativa ? "font-semibold text-gray-900" : "font-medium text-gray-600 group-hover:text-gray-900"
        }`}
      >
        {fase.rotulo}
      </p>
      <p className="text-xs text-gray-400">{fase.contagem}</p>
    </button>
  );
}

// Trecho entre dois nós: trilho cinza com preenchimento proporcional.
function Conector({ pct }: { pct: number }) {
  return (
    <div className="mt-4 h-0.5 flex-1 self-start overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full bg-emerald-500 transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function ProgressoEvento({
  saude,
  fases,
  faseAtiva,
}: {
  saude: Saude;
  fases: FasesEvento;
  /** Fase aberta agora; sem isso cai na sugerida pelo cálculo. */
  faseAtiva?: FaseId;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const ativa = faseAtiva ?? (params.get("fase") as FaseId | null) ?? fases.sugerida;

  const cor =
    saude.score >= 80
      ? "text-emerald-600"
      : saude.score >= 50
        ? "text-amber-600"
        : "text-red-600";

  function abrir(id: FaseId) {
    const q = new URLSearchParams(Array.from(params.entries()));
    q.set("fase", id);
    router.replace(`?${q.toString()}`, { scroll: false });
  }

  return (
    <div className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-[auto,1fr] sm:items-center">
      <div className="sm:border-r sm:border-gray-100 sm:pr-6">
        <p className="text-sm text-gray-500">Progresso geral</p>
        <p className={`text-4xl font-semibold tracking-tight ${cor}`}>
          {saude.score}%
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {saude.score >= 100
            ? "Todo em dia"
            : saude.score >= 80
              ? "Sob controle"
              : saude.alertas.length > 0
                ? `${saude.alertas.length} ${saude.alertas.length === 1 ? "ponto" : "pontos"} de atenção`
                : "Em andamento"}
        </p>
      </div>

      <div className="flex items-start">
        {fases.lista.map((fase, i) => (
          <div key={fase.id} className="flex flex-1 items-start">
            {i > 0 && <Conector pct={fases.lista[i - 1].pct} />}
            <No fase={fase} ativa={ativa === fase.id} onClick={() => abrir(fase.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
