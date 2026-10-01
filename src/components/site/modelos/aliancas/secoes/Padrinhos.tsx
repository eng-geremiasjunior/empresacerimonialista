"use client";

// 14 · Padrinhos ("Ao nosso lado"), fundo alt: cada par com a foto em
// cápsula 150×200 e o anel duplo (1px accent, 8px alt, 1px line) e os
// nomes em itálico do título. Os pares e as fotos são da noiva (bloco
// "Convidados especiais"); desligar é o olho de esconder do bloco. O
// desenho tem uma foto por par: vale a primeira que existe. Par sem foto
// fica só com os nomes.

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
    <section className="a-secao a-alt a-padrinhos">
      <div className="a-padrinhos-miolo">
        <h2 data-revelar="up" className="a-h2">
          Ao nosso lado
        </h2>
        <div className="a-padrinhos-grade">
          {pares.map((par, i) => {
            const foto = par.fotos.find((f) => !!resolver(f)) ?? null;
            const mostra = !!foto || modo === "previa";
            return (
              <div key={i} data-revelar="up" data-atraso={i * 140 || undefined} className="a-par">
                {mostra && (
                  <EspacoDeFoto caminho={foto} forma="oval" proporcao="3/4" className="a-par-capsula" />
                )}
                <div className="a-par-nomes">{par.nomes}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
