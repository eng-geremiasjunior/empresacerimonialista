"use client";

// A jornada do evento como NAVEGAÇÃO, não como enfeite.
//
// Antes, Planejamento → Organização → Execução apareciam duas vezes na
// mesma tela: no stepper redondo do topo e, de novo, como três abas
// anônimas no meio de outras sete. Duas aparições com pesos diferentes,
// e nenhuma virando comando — daí a sensação de que os três motores de
// trabalho não tinham destaque nenhum.
//
// Aqui as duas peças viram uma só: o cartão da fase É o link, e carrega
// o progresso que o stepper mostrava. As abas de consulta ficam abaixo,
// separadas por um divisor — sem rótulo explicando o óbvio.
//
// Indução sem tutorial: a ordem está na leitura da esquerda para a
// direita, e cada fase diz em uma linha o que falta nela (frase vinda de
// query real, calculada em resumo-evento.ts). Quem está aprendendo lê a
// linha; quem tem anos de casa ignora e clica direto.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FaseId, FasesEvento } from "@/lib/supabase/resumo-evento";

const SEGMENTO: Record<FaseId, string> = {
  planejamento: "planejamento",
  organizacao: "organizacao",
  execucao: "roteiro",
};

const ROTULO: Record<FaseId, string> = {
  planejamento: "Planejamento",
  organizacao: "Organização",
  execucao: "Roteiro do dia",
};

export function FasesDoEvento({
  eventId,
  fases,
  respostasDaCliente = 0,
}: {
  eventId: string;
  fases: FasesEvento;
  /** blocos do Planejamento com resposta da cliente sem conferir (091) */
  respostasDaCliente?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Fases do evento"
      className="grid overflow-hidden rounded-xl border border-[color:var(--ev-card-border-soft)] bg-[color:var(--ev-card-bg)] sm:grid-cols-3"
    >
      {fases.lista.map((fase, i) => {
        const href = `/eventos/${eventId}/${SEGMENTO[fase.id]}`;
        const ativa = pathname.startsWith(href);
        const pct = Math.max(0, Math.min(100, fase.pct));

        return (
          <Link
            key={fase.id}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={`flex flex-col gap-1 px-4 pb-3 pt-3.5 transition-colors ${
              i > 0
                ? "border-t border-[color:var(--ev-card-border-soft)] sm:border-l sm:border-t-0"
                : ""
            } ${
              ativa
                ? "bg-[color:var(--ev-accent-tint)]"
                : "hover:bg-[color:var(--ev-card-border-soft)]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-sm ${
                  ativa
                    ? "font-semibold text-[color:var(--ev-text-strong)]"
                    : "font-medium text-[color:var(--ev-text-body)]"
                }`}
              >
                {ROTULO[fase.id]}
              </span>
              <span
                aria-hidden
                className="shrink-0 font-mono text-[11px] tabular-nums text-[color:var(--ev-text-faint)]"
              >
                {pct}%
              </span>
            </div>

            <span className="text-xs leading-snug text-[color:var(--ev-text-muted)]">
              {fase.contagem}
            </span>

            {/* a resposta da cliente vale mais que a contagem da fase:
                é a única coisa aqui que espera ação de OUTRA pessoa */}
            {fase.id === 'planejamento' && respostasDaCliente > 0 && (
              <span className="mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
                style={{
                  borderColor: 'var(--ev-warn, #b07514)',
                  background: 'var(--ev-warn-tint, #f8efdd)',
                  color: 'var(--ev-warn, #b07514)',
                }}
              >
                <span aria-hidden className="h-1 w-1 rounded-full" style={{ background: 'currentColor' }} />
                {respostasDaCliente === 1
                  ? "1 resposta da cliente para conferir"
                  : respostasDaCliente + " respostas da cliente para conferir"}
              </span>
            )}

            {/* trilho fino: o avanço de cada fase mora na própria fase */}
            <span
              aria-hidden
              className="mt-1.5 block h-[3px] w-full overflow-hidden rounded-full bg-[color:var(--ev-track,#e8e8e4)]"
            >
              <span
                className="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                style={{
                  width: `${pct}%`,
                  background: ativa
                    ? "var(--ev-accent, #0f9b84)"
                    : "var(--ev-text-faint, #a2a6ad)",
                }}
              />
            </span>

            <span className="sr-only">{`${pct}% concluído. ${fase.contagem}`}</span>
          </Link>
        );
      })}
    </nav>
  );
}
