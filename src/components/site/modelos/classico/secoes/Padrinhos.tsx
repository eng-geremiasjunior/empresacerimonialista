"use client";

// 13 · Padrinhos ("Ao nosso lado"), fundo alt: cada par com as duas
// fotos redondas de 112px sobrepostas (−24px, anel de 4px na cor alt) e
// os nomes no título. Os pares e as fotos são da noiva (bloco "Convidados
// especiais"); desligar é o olho de esconder do bloco. Foto que falta
// some; par sem foto fica só com os nomes.

import { lerEspeciais } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useUrlDaFoto, type PropsDaSecao } from "../comum";

export function temPadrinhos({ bloco }: Pick<PropsDaSecao, "bloco">): boolean {
  return lerEspeciais(bloco.conteudo).pares.length > 0;
}

export function Padrinhos({ bloco, modo }: PropsDaSecao) {
  const pares = lerEspeciais(bloco.conteudo).pares;
  const resolver = useUrlDaFoto();
  return (
    <section className="c-secao c-alt c-padrinhos">
      <div className="c-padrinhos-miolo">
        <h2 data-revelar="up" className="c-h2">
          Ao nosso lado
        </h2>
        <div className="c-padrinhos-grade">
          {pares.map((par, i) => {
            // na prévia, os 2 espaços do desenho; fora dela, só as fotos que existem
            const fotos =
              modo === "previa" ? [par.fotos[0] ?? null, par.fotos[1] ?? null] : par.fotos.filter((f) => !!resolver(f));
            return (
              <div key={i} data-revelar="up" data-atraso={i * 140 || undefined} className="c-par">
                {fotos.length > 0 && (
                  <div className="c-par-fotos">
                    {fotos.map((f, j) => (
                      <EspacoDeFoto
                        key={j}
                        caminho={f}
                        forma="circulo"
                        proporcao="1/1"
                        className={`c-par-foto ${j > 0 ? "c-par-foto--segunda" : ""}`}
                      />
                    ))}
                  </div>
                )}
                <div className="c-par-nomes">{par.nomes}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
