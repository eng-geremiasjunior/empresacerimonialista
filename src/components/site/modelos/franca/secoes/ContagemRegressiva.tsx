"use client";

// 8 · Contagem, fundo dark: "Compte à rebours", as 4 colunas (dias, horas,
// minutos, segundos) com as divisórias de ouro a .3, os números na fonte
// dos títulos (clamp(40px,8.5vw,112px), tabulares) e "Para o nosso grande
// dia.". Os dias sem zero à esquerda. Só o textContent muda; a troca
// anima 700ms (some e desce de −.25em, sem blur). O protótipo parava em
// zero; aqui, no dia, "Hoje é o dia!" e, depois, "Obrigado por celebrar
// com a gente.". Exportado para o T06.

import { ROTULOS_DA_CONTAGEM, useContagem, type UnidadeDaContagem } from "@/components/site/pecas/Contagem";
import type { PropsDaSecao } from "../comum";

const TROCA = {
  quadros: [
    { opacity: 0, transform: "translateY(-.25em)" },
    { opacity: 1, transform: "none" },
  ],
  duracao: 700,
};

const UNIDADES: UnidadeDaContagem[] = ["d", "h", "m", "s"];

export function ContagemRegressiva({ dados }: PropsDaSecao) {
  const { evento } = dados;
  const { fase, numero } = useContagem(evento.data, evento.hora, { animacao: TROCA });

  return (
    <section className="f-secao f-escuro f-contagem">
      <div data-revelar="up" className="f-contagem-miolo">
        <div className="f-eyebrow f-eyebrow--claro">Compte à rebours</div>
        {fase === "contando" ? (
          <>
            <div className="f-contagem-grade">
              {UNIDADES.map((u) => (
                <div key={u} className="f-contagem-un">
                  <span ref={numero[u]} className="sm-cd-n f-contagem-n" />
                  <span className="f-contagem-r">{ROTULOS_DA_CONTAGEM[u]}</span>
                </div>
              ))}
            </div>
            <div className="f-contagem-para">Para o nosso grande dia.</div>
          </>
        ) : (
          <div className="f-h2 f-contagem-final">
            {fase === "hoje" ? "Hoje é o dia!" : "Obrigado por celebrar com a gente."}
          </div>
        )}
      </div>
    </section>
  );
}
