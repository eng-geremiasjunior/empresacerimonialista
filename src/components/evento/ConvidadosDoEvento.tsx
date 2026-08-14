"use client";

// A lista de convidados como a cerimonialista precisa dela: os números
// que ela leva ao buffet, quem ainda não respondeu, e as restrições
// alimentares reunidas — que é o que o fornecedor de alimentação vai
// perguntar.
//
// Ela também lança confirmação à mão: sempre tem quem responda por
// telefone.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone, X } from "lucide-react";
import type { Convidado, ResumoConvidados } from "@/lib/portal-pessoas-shared";
import { lancarConfirmacao } from "@/app/(portal)/portal/[eventoId]/convidados/actions";

const ESTADO: Record<Convidado["confirmacao"], { rotulo: string; classe: string }> = {
  confirmado: { rotulo: "Confirmado", classe: "text-emerald-700 bg-emerald-50" },
  aguardando: { rotulo: "Aguardando", classe: "text-gray-600 bg-gray-100" },
  nao_vai: { rotulo: "Não vai", classe: "text-gray-500 bg-gray-50" },
};

export function ConvidadosDoEvento({
  eventId,
  convidados,
  resumo,
}: {
  eventId: string;
  convidados: Convidado[];
  resumo: ResumoConvidados;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [filtro, setFiltro] = useState<"todos" | Convidado["confirmacao"]>("todos");

  const lista =
    filtro === "todos" ? convidados : convidados.filter((c) => c.confirmacao === filtro);
  const restricoes = convidados.filter(
    (c) => c.confirmacao === "confirmado" && c.restricaoAlimentar?.trim()
  );

  function marcar(id: string, valor: Convidado["confirmacao"]) {
    iniciar(async () => {
      await lancarConfirmacao(eventId, id, valor);
      router.refresh();
    });
  }

  if (convidados.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Convidados</h3>
        <p className="mt-1 text-sm text-gray-500">
          A cliente ainda não começou a lista. Quando ela montar, os números
          aparecem aqui.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Convidados</h3>
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{resumo.pessoasNaFesta}</span>{" "}
          pessoas na festa · {resumo.aguardando} sem resposta
        </p>
      </div>

      {restricoes.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-900">
            {restricoes.length} restrição(ões) alimentar(es) para passar ao buffet
          </p>
          <ul className="mt-1 space-y-0.5">
            {restricoes.map((c) => (
              <li key={c.id} className="text-xs text-amber-800">
                {c.nome}: {c.restricaoAlimentar}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        {(["todos", "aguardando", "confirmado", "nao_vai"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
              filtro === f
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f === "todos" ? "Todos" : ESTADO[f].rotulo}
          </button>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-gray-100">
        {lista.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-900">{c.nome}</p>
              <p className="text-xs text-gray-500">
                {[
                  c.lado === "noiva" ? "Noiva" : c.lado === "noivo" ? "Noivo" : null,
                  c.grupo,
                  c.mesa ? `mesa ${c.mesa}` : null,
                  c.confirmacao === "confirmado" && c.acompanhantes + c.criancas > 0
                    ? `+${c.acompanhantes + c.criancas}`
                    : null,
                  c.confirmadoVia === "manual" ? "por telefone" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "sem grupo"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO[c.confirmacao].classe}`}
              >
                {ESTADO[c.confirmacao].rotulo}
              </span>
              {c.confirmacao !== "confirmado" && (
                <button
                  type="button"
                  title="Confirmou por telefone"
                  onClick={() => marcar(c.id, "confirmado")}
                  disabled={pendente}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              )}
              {c.confirmacao !== "nao_vai" && (
                <button
                  type="button"
                  title="Avisou que não vai"
                  onClick={() => marcar(c.id, "nao_vai")}
                  disabled={pendente}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-gray-400 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <Phone size={12} />
        Quem responde por telefone você marca aqui; o resto confirma pelo link.
      </p>
    </section>
  );
}
