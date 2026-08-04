"use client";

// Resumo da fase aberta — a primeira coisa visível ao entrar numa fase,
// para nenhuma delas começar vazia.
//
// Reaproveita os alertas do Copiloto que já existem (calcularSaudeEvento):
// aqui eles só são filtrados para o que pertence à fase e promovidos ao
// topo. Nada de texto estático — se não houver alerta da fase, o painel
// diz isso e aponta para onde agir.
//
// É client porque a fase vem da query string, e layout do App Router não
// recebe searchParams.

import Link from "next/link";
import { AlertTriangle, ArrowRight, Circle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { SAUDE_UI, type Saude, type SaudeAba } from "@/lib/saude-evento";
import type { FaseId, FasesEvento } from "@/lib/supabase/resumo-evento";

const ABA_HREF: Record<SaudeAba, string> = {
  tarefas: "tarefas",
  fornecedores: "fornecedores",
  financeiro: "financeiro",
  roteiro: "roteiro",
};

// Que abas pertencem a cada fase da jornada. Determinístico, sem IA:
// é a mesma divisão que o cálculo de progresso usa.
const ABAS_DA_FASE: Record<FaseId, SaudeAba[]> = {
  planejamento: ["tarefas"],
  organizacao: ["fornecedores", "financeiro"],
  execucao: ["roteiro"],
};

// Para onde a fase leva quando está tudo em dia.
const ATALHO_DA_FASE: Record<FaseId, { rotulo: string; seg: string }> = {
  planejamento: { rotulo: "Abrir tarefas", seg: "tarefas" },
  organizacao: { rotulo: "Abrir fornecedores", seg: "fornecedores" },
  execucao: { rotulo: "Abrir execução do evento", seg: "roteiro" },
};

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
  const ui = SAUDE_UI[saude.nivel];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Circle size={8} className={`${ui.dot} fill-current`} aria-hidden />
          <h2 className="text-sm font-medium text-gray-700">
            Resumo · {fase.rotulo}
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900 tabular-nums">
            {fase.pct}%
          </span>{" "}
          · {fase.contagem}
        </p>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${fase.pct}%` }}
        />
      </div>

      {alertas.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          Nada pendente nesta fase.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {alertas.map((alerta, i) => (
            <li key={i}>
              <Link
                href={`/eventos/${eventId}/${ABA_HREF[alerta.aba]}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <AlertTriangle size={14} className="shrink-0 text-gray-400" />
                {alerta.texto}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/eventos/${eventId}/${atalho.seg}`}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {atalho.rotulo}
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
