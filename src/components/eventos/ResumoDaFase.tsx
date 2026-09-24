"use client";

// O bloco de atenção do evento — o ÚNICO. Fica no layout, logo abaixo dos
// cartões de fase, em todas as abas.
//
// Até 15/09/2026 os mesmos alertas de saúde apareciam três vezes (na linha
// do cartão de fase, aqui como "Resumo do Copiloto" e no "Requer atenção"
// da aba Resumo). Agora é um bloco só, e cada linha responde: o que
// aconteceu, por que importa agora e o que fazer (saude-evento.ts).
//
// Copiloto por regras, não IA: cada linha é contagem determinística sobre
// tarefas, fornecedores, parcelas e roteiro. Nada de texto genérico.
//
// É client porque a fase vem da query string (os selos e o próximo passo
// do estado "sob controle" são da fase aberta), e layout do App Router não
// recebe searchParams.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Saude } from "@/lib/saude-evento";
import type { FaseId, FasesEvento } from "@/lib/supabase/resumo-evento";

// Tokens do chrome do evento (default = cores de hoje; tema neutro remapeia).
const TEAL = "var(--ev-accent, #0f9b84)";
const TEAL_TINT = "var(--ev-accent-tint, #e7f4f1)";
const AMBER = "var(--ev-warn, #b07514)";
const AMBER_TINT = "var(--ev-warn-tint, #f8efdd)";

// Para onde a fase leva quando não há nada a resolver — o próximo passo.
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
  // O botão do alerta não aponta para a tela em que ela já está: dentro do
  // Planejamento, "Abrir o Planejamento" era um clique que não levava a
  // lugar nenhum (24/09/2026). O alerta fica; só o botão some.
  const pathname = usePathname() ?? "";
  const estaEm = (destino: string) => pathname.endsWith(`/${destino}`);
  const ativa = (params.get("fase") as FaseId | null) ?? fases.sugerida;
  const fase = fases.lista.find((f) => f.id === ativa) ?? fases.lista[0];
  const atalho = ATALHO_DA_FASE[fase.id];
  const alertas = saude.alertas;
  const sobControle = alertas.length === 0;
  const feitos = fase.selos.filter((s) => s.tipo === "ok");

  return (
    <section className="overflow-hidden rounded-xl border border-[color:var(--ev-card-border-soft)] bg-[color:var(--ev-card-bg)]">
      <div className="flex items-center gap-[9px] border-b border-[color:var(--ev-card-border-soft)] px-[18px] py-3.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: sobControle ? TEAL : AMBER }}
          aria-hidden
        />
        <h2 className="text-[15px] font-bold text-[color:var(--ev-text-strong)]">
          {sobControle ? "Sob controle" : "Requer atenção"}
        </h2>
        {!sobControle && (
          <span className="text-[13px] text-[color:var(--ev-text-muted)]">
            {alertas.length === 1 ? "1 ponto" : `${alertas.length} pontos`}
          </span>
        )}
      </div>

      {sobControle ? (
        <div className="flex flex-col gap-[11px] px-[18px] py-4">
          {feitos.length > 0 ? (
            feitos.map((selo, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-[12.5px] text-[color:var(--ev-text-body)]"
              >
                <IconeSelo tipo="ok" />
                {selo.texto}
              </div>
            ))
          ) : (
            <p className="text-[12.5px] text-[color:var(--ev-text-muted)]">
              Nada pendente neste evento por enquanto.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--ev-card-border-soft)]">
          {alertas.map((alerta, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-[18px] py-3"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="mt-0.5">
                  <IconeSelo tipo="warn" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[color:var(--ev-text-strong)]">
                    {alerta.texto}
                  </p>
                  {alerta.porque && (
                    <p className="text-[12px] text-[color:var(--ev-text-muted)]">
                      {alerta.porque}
                    </p>
                  )}
                </div>
              </div>
              {!estaEm(alerta.destino) && (
                <Link
                  href={`/eventos/${eventId}/${alerta.destino}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--ev-card-border)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--ev-text-body)] transition-colors hover:border-[color:var(--ev-text-faint)] hover:text-[color:var(--ev-text-strong)]"
                >
                  {alerta.acao}
                  <ArrowRight size={12} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {sobControle && (
        <div className="border-t border-[color:var(--ev-card-border-soft)] px-[18px] py-3">
          <Link
            href={`/eventos/${eventId}/${atalho.seg}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ev-text-body)] hover:text-[color:var(--ev-text-strong)]"
          >
            {atalho.rotulo}
            <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </section>
  );
}
