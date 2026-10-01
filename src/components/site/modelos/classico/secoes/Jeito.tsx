"use client";

// 11 · Nosso jeito, fundo bg: "Pequenas coisas que fazem a gente ser a
// gente" e as frases do casal numeradas (01, 02…) em 2 colunas, cada uma
// com o fio de cima, o número em accent e o texto em itálico do título.

import { lerJeito } from "@/lib/site-conteudo";
import type { PropsDaSecao } from "../comum";

export function temJeito({ bloco }: Pick<PropsDaSecao, "bloco">): boolean {
  return lerJeito(bloco.conteudo).frases.length > 0;
}

export function Jeito({ bloco }: PropsDaSecao) {
  const frases = lerJeito(bloco.conteudo).frases;
  return (
    <section className="c-secao c-jeito">
      <div className="c-jeito-miolo">
        <h2 data-revelar="up" className="c-h2 c-h2--balance c-jeito-h2">
          Pequenas coisas que fazem a gente ser a gente
        </h2>
        <div className="c-jeito-lista">
          {frases.map((f, i) => (
            <div key={i} data-revelar="up" data-atraso={i * 110 || undefined} className="c-jeito-item">
              <span className="c-jeito-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="c-jeito-txt">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
