"use client";

// 12 · Nosso jeito, fundo alt: "Pequenas coisas que fazem a gente ser a
// gente" e um cartão de papel por frase, levemente girado (−2/1.5/−1/2deg,
// na ordem), numerado (01, 02…) em accent, com a frase em itálico na
// fonte dos títulos. No hover o cartão endireita, sobe 8px e cresce 1.03
// (.7s E).

import type { CSSProperties } from "react";
import { lerJeito } from "@/lib/site-conteudo";
import type { PropsDaSecao } from "../comum";

const GIROS = ["-2deg", "1.5deg", "-1deg", "2deg"];

export function temJeito({ bloco }: Pick<PropsDaSecao, "bloco">): boolean {
  return lerJeito(bloco.conteudo).frases.length > 0;
}

export function Jeito({ bloco }: PropsDaSecao) {
  const frases = lerJeito(bloco.conteudo).frases;
  return (
    <section className="a-secao a-alt a-jeito">
      <div className="a-jeito-miolo">
        <h2 data-revelar="up" className="a-h2 a-h2--balance a-jeito-h2">
          Pequenas coisas que fazem a gente ser a gente
        </h2>
        <div className="a-jeito-grade">
          {frases.map((f, i) => (
            <div key={i} data-revelar="up" data-atraso={i * 110 || undefined}>
              <div className="a-jeito-cartao" style={{ "--a-giro": GIROS[i % 4] } as CSSProperties}>
                <span className="a-jeito-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="a-jeito-txt">{f}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
