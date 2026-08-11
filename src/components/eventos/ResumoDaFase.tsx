"use client";

// Aba Resumo — visão da fase aberta. O primeiro bloco é sempre o "Resumo
// do Copiloto", para nenhuma fase abrir vazia (handoff: vela-fases-evento).
//
// Copiloto por regras, não IA: cada selo ✔/⚠ é contagem determinística
// sobre tarefas, fornecedores, parcelas e roteiro — calculada em
// resumo-evento.ts, ao lado do percentual da fase. Nada de texto genérico.
//
// É client porque a fase vem da query string, e layout do App Router não
// recebe searchParams.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { Saude, SaudeAba } from "@/lib/saude-evento";
import type { FaseId, FasesEvento } from "@/lib/supabase/resumo-evento";

// Tokens do chrome do evento (default = cores de hoje; tema neutro remapeia).
const TEAL = "var(--ev-accent, #0f9b84)";
const TEAL_TINT = "var(--ev-accent-tint, #e7f4f1)";
const AMBER = "var(--ev-warn, #b07514)";
const AMBER_TINT = "var(--ev-warn-tint, #f8efdd)";

const ABA_HREF: Record<SaudeAba, string> = {
  tarefas: "organizacao",
  fornecedores: "fornecedores",
  financeiro: "financeiro",
  roteiro: "roteiro",
};

// Que abas pertencem a cada fase. Determinístico, e é a mesma divisão que
// o cálculo de progresso usa.
const ABAS_DA_FASE: Record<FaseId, SaudeAba[]> = {
  planejamento: ["tarefas"],
  organizacao: ["fornecedores", "financeiro"],
  execucao: ["roteiro"],
};

// Para onde a fase leva — o próximo passo concreto dela.
const ATALHO_DA_FASE: Record<FaseId, { rotulo: string; seg: string }> = {
  planejamento: { rotulo: "Abrir tarefas", seg: "organizacao" },
  organizacao: { rotulo: "Abrir fornecedores", seg: "fornecedores" },
  execucao: { rotulo: "Abrir execução do evento", seg: "roteiro" },
};

function IconeSelo({ tipo }: { tipo: "ok" | "warn" }) {
  const ok = tipo === "ok";
  return (
    <span
      aria-hidden
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{ background: ok ? TEAL_TINT : AMBER_TINT }}
    >
      {ok ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M4 8.2 6.6 10.8 12 5"
            style={{ stroke: TEAL }}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 3.6 13 12H3z"
            style={{ stroke: AMBER }}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8 7v1.8M8 10.3h.01"
            style={{ stroke: AMBER }}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

export function ResumoDaFase({
  saude,
  fases,
  eventId,
}: {
  saude: Saude;
  fases: FasesEvento;
  eventId: string;
}) {
  const params = useSearchParams();
  const ativa = (params.get("fase") as FaseId | null) ?? fases.sugerida;
  const fase = fases.lista.find((f) => f.id === ativa) ?? fases.lista[0];

  const abas = ABAS_DA_FASE[fase.id];
  const alertas = saude.alertas.filter((a) => abas.includes(a.aba));
  const atalho = ATALHO_DA_FASE[fase.id];

  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--ev-card-border-soft)] bg-[color:var(--ev-card-bg)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--ev-card-border-soft)] px-[18px] py-4">
        <div className="flex items-center gap-[9px]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: TEAL }}
            aria-hidden
          />
          <h2 className="text-[15px] font-bold text-[color:var(--ev-text-strong)]">
            Resumo do Copiloto
          </h2>
          <span className="text-[13px] text-[color:var(--ev-text-muted)]">{fase.rotulo}</span>
        </div>
        <span className="text-[11.5px] text-[color:var(--ev-text-faint)]">
          cálculo por regras · {fase.pct}% · {fase.contagem}
        </span>
      </div>

      <div className="flex flex-col gap-[11px] px-[18px] py-4">
        {fase.selos.map((selo, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 text-[12.5px] text-[color:var(--ev-text-body)]"
          >
            <IconeSelo tipo={selo.tipo} />
            {selo.texto}
          </div>
        ))}

        {/* Alertas do Copiloto que pertencem a esta fase — clicáveis, levam
            direto para onde resolver. */}
        {alertas.map((alerta, i) => (
          <Link
            key={`a-${i}`}
            href={`/eventos/${eventId}/${ABA_HREF[alerta.aba]}`}
            className="flex items-center gap-2.5 text-[12.5px] text-[color:var(--ev-text-body)] hover:text-[color:var(--ev-text-strong)]"
          >
            <IconeSelo tipo="warn" />
            {alerta.texto}
          </Link>
        ))}
      </div>

      <div className="border-t border-[color:var(--ev-card-border-soft)] px-[18px] py-3">
        <Link
          href={`/eventos/${eventId}/${atalho.seg}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ev-text-body)] hover:text-[color:var(--ev-text-strong)]"
        >
          {atalho.rotulo}
          <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
