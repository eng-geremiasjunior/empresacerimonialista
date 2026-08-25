"use client";

// Stepper da jornada: PLANEJAMENTO → ORGANIZAÇÃO → EXECUÇÃO.
// Refinamento visual sobre o handoff (vela-fases-evento.html).
//
// Duas leituras ao mesmo tempo, como no mockup:
//   * o anel parcial de cada nó diz quanto daquela FASE já andou;
//   * a linha-guia contínua diz quanto da JORNADA INTEIRA já andou.
//
// A linha é uma só (não um traço por trecho): ancorada do centro do
// primeiro nó ao centro do último — daí os 16.667% de cada lado, que é
// metade de um terço. O preenchimento é a média dos trechos, então
// 100% + 60% param exatamente a 60% do segundo trecho.
//
// Clicável: a fase vai na query string, o link é compartilhável e o botão
// voltar funciona. Navegação livre — dá para voltar ao Planejamento a
// qualquer momento.

import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import type { Saude } from "@/lib/saude-evento";
import type {
  FaseId,
  FaseProgresso,
  FasesEvento,
} from "@/lib/supabase/resumo-evento";
import { saudeEmPalavras } from "@/lib/saude-evento";

// Tokens do chrome do evento: no tema padrão é o teal de hoje; no tema
// neutro do Planejamento vira a ameixa (um único destaque).
const TEAL = "var(--ev-accent, #0f9b84)";
const TRACK = "var(--ev-track, #e8e8e4)";

function No({
  fase,
  indice,
  ativa,
  onClick,
}: {
  fase: FaseProgresso;
  indice: number;
  ativa: boolean;
  onClick: () => void;
}) {
  const concluida = fase.pct >= 100;
  const iniciada = fase.pct > 0;

  return (
    <button
      onClick={onClick}
      aria-current={ativa ? "step" : undefined}
      className="flex flex-1 flex-col items-center gap-2 px-1.5 pb-1.5 text-center"
    >
      {/* Anel: sólido quando concluída, conic parcial quando em andamento,
          cinza quando não começou. Ring branco separa do trilho atrás. */}
      <div
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full"
        style={{
          background: concluida
            ? TEAL
            : iniciada
              ? `conic-gradient(${TEAL} 0% ${fase.pct}%, ${TRACK} ${fase.pct}% 100%)`
              : TRACK,
          boxShadow: "0 0 0 4px #fff",
        }}
      >
        {concluida ? (
          <Check size={15} strokeWidth={2.5} className="text-white" />
        ) : (
          <span
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-xs font-bold"
            style={{ color: iniciada ? TEAL : "var(--ev-text-faint, #a2a6ad)" }}
          >
            {indice}
          </span>
        )}
      </div>

      <div className="flex items-center gap-[7px]">
        <span
          className={`text-sm ${ativa ? "font-bold text-[color:var(--ev-text-strong)]" : "font-semibold text-[color:var(--ev-text-muted)]"}`}
        >
          {fase.rotulo}
        </span>
        {iniciada ? (
          <span className="text-xs font-bold" style={{ color: TEAL }}>
            {fase.pct}%
          </span>
        ) : (
          <span className="text-[11.5px] font-semibold text-[color:var(--ev-text-faint)]">
            A iniciar
          </span>
        )}
      </div>

      <span className="text-[11.5px] font-semibold text-[color:var(--ev-text-muted)]">
        {fase.contagem}
      </span>

      {/* barra que marca a fase aberta */}
      <span
        className="mt-0.5 h-[3px] w-16 rounded-full transition-colors"
        style={{ background: ativa ? TEAL : "transparent" }}
      />
    </button>
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
  const ativa =
    faseAtiva ?? (params.get("fase") as FaseId | null) ?? fases.sugerida;

  // Preenchimento da jornada: média dos trechos. Com 3 fases há 2 trechos,
  // conduzidos pelas duas primeiras — a última não puxa linha nenhuma.
  const trechos = fases.lista.slice(0, -1);
  const preenchimento = trechos.length
    ? Math.round(trechos.reduce((s, f) => s + f.pct, 0) / trechos.length)
    : 0;

  const cor =
    saude.score >= 80
      ? "var(--ev-ok, #059669)"
      : saude.score >= 50
        ? "var(--ev-warn, #d97706)"
        : "var(--ev-late, #dc2626)";

  function abrir(id: FaseId) {
    const q = new URLSearchParams(Array.from(params.entries()));
    q.set("fase", id);
    router.replace(`?${q.toString()}`, { scroll: false });
  }

  return (
    <div className="grid gap-6 rounded-2xl border border-[color:var(--ev-card-border-soft)] bg-[color:var(--ev-card-bg)] p-6 shadow-sm sm:grid-cols-[auto,1fr] sm:items-center">
      <div className="sm:border-r sm:border-[color:var(--ev-card-border-soft)] sm:pr-6">
        <p className="text-sm text-[color:var(--ev-text-muted)]">Progresso geral</p>
        {/* Era "{score}%" em 4xl: num evento recém-criado dizia 100% e
            "Todo em dia" — sem tarefa, sem fornecedor e sem cronograma. A
            frase carrega o mesmo dado sem prometer prontidão, e o CLAUDE.md
            veta o "100%" de qualquer jeito. */}
        <p
          className="text-2xl font-semibold tracking-tight"
          style={{ color: cor }}
        >
          {saudeEmPalavras(saude)}
        </p>
        <p className="mt-0.5 text-sm text-[color:var(--ev-text-muted)]">
          {saude.alertas.length > 0
            ? `${saude.alertas.length} ${saude.alertas.length === 1 ? "ponto" : "pontos"} de atenção`
            : "Nada pendente"}
        </p>
      </div>

      <div>
        <div className="relative pt-1">
          {/* linha-guia contínua, de centro a centro dos nós extremos */}
          <div
            className="absolute top-[18px] h-[3px] overflow-hidden rounded-full"
            style={{ left: "16.667%", right: "16.667%", background: TRACK }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${preenchimento}%`, background: TEAL }}
            />
          </div>

          <div className="relative flex">
            {fases.lista.map((fase, i) => (
              <No
                key={fase.id}
                fase={fase}
                indice={i + 1}
                ativa={ativa === fase.id}
                onClick={() => abrir(fase.id)}
              />
            ))}
          </div>
        </div>

        <p className="mt-2 px-0.5 text-[11.5px] text-[color:var(--ev-text-faint)]">
          Clique em uma fase para navegar — você pode voltar ao Planejamento a
          qualquer momento sem perder o contexto.
        </p>
      </div>
    </div>
  );
}
