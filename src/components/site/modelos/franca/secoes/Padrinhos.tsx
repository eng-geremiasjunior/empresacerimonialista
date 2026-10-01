"use client";

// 11 · Nos témoins ("Ao nosso lado", o bloco "Convidados especiais"),
// fundo bg: cada par com o retrato oval de 150×196 no aro de ouro de 6px
// (anel de papel de 4px) e os nomes na fonte dos títulos. O desenho tem
// uma foto por par: vale a primeira. Foto que falta some e o par fica só
// com os nomes; desligar é o olho de esconder do bloco.

import { lerEspeciais } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { mostraFoto, useUrlDaFoto, type PropsDaSecao } from "../comum";

export function temPadrinhos({ bloco }: Pick<PropsDaSecao, "bloco">): boolean {
  return lerEspeciais(bloco.conteudo).pares.length > 0;
}

export function Padrinhos({ bloco, modo }: PropsDaSecao) {
  const pares = lerEspeciais(bloco.conteudo).pares;
  const resolver = useUrlDaFoto();
  return (
    <section className="f-secao f-padrinhos">
      <div className="f-padrinhos-miolo">
        <div className="f-cabeca">
          <div data-revelar="up" className="f-eyebrow">
            Nos témoins
          </div>
          <h2 data-revelar="up" data-atraso="120" className="f-h2">
            Ao nosso lado
          </h2>
        </div>
        <div className="f-padrinhos-grade">
          {pares.map((par, i) => {
            const url = resolver(par.fotos.find((f) => !!resolver(f)) ?? par.fotos[0] ?? null);
            return (
              <div key={i} data-revelar="up" data-atraso={i * 140 || undefined} className="f-par">
                {mostraFoto(url, modo) && (
                  <div className="f-par-aro">
                    <div className="f-par-oval">
                      <EspacoDeFoto url={url} forma="oval" proporcao="tela" />
                    </div>
                  </div>
                )}
                <div className="f-par-nomes">{par.nomes}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
