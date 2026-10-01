"use client";

// Padrinhos (#padrinhos, T03 e T04), cartão de raio 32: "Padrinhos", "Ao
// nosso lado" (headSizeSm) e a grade auto-fit (mínimo 220px) de pílulas
// soft de raio 22, cada uma com a foto redonda de 64px e o par em
// headFont 21px. Os pares e as fotos são da noiva (bloco "Convidados
// especiais"); desligar é o olho do bloco. O desenho tem uma foto por
// par: vale a primeira; sem foto, a pílula fica só com os nomes.

import { lerEspeciais } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { Rotulo, useTemFoto, type PropsDaSecao } from "../comum";

export function temPadrinhos({ bloco }: Pick<PropsDaSecao, "bloco">): boolean {
  return lerEspeciais(bloco.conteudo).pares.length > 0;
}

export function Padrinhos({ bloco, ancora }: PropsDaSecao) {
  const pares = lerEspeciais(bloco.conteudo).pares;
  const temFoto = useTemFoto();
  return (
    <section id={ancora} data-sec={ancora} data-revelar="up" className="k-cartao k-padrinhos">
      <div className="k-padrinhos-topo">
        <Rotulo className="k-rotulo--acento">Padrinhos</Rotulo>
        <h2 className="k-h2 k-h2--sm">Ao nosso lado</h2>
      </div>
      <div className="k-padrinhos-grade">
        {pares.map((par, i) => (
          <div key={i} className="k-par">
            {temFoto(par.fotos[0]) && (
              <EspacoDeFoto caminho={par.fotos[0] ?? null} forma="circulo" proporcao="1/1" className="k-par-foto" />
            )}
            <span className="k-par-nomes">{par.nomes}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
