"use client";

// Recado do casal (T03 e T04). O desenho não tem a mensagem num lugar
// próprio; ela ganha um cartão no estilo dos outros: o ponto pêssego com
// "Esperamos você", a mensagem que a noiva já escreve hoje e os nomes na
// fonte dos nomes, com o "&" em pêssego.

import { NomesDoCasal, type PropsDaSecao } from "../comum";

export function temRecado({ dados }: Pick<PropsDaSecao, "dados">): boolean {
  return !!dados.site?.mensagem;
}

export function Recado({ dados, casal }: PropsDaSecao) {
  return (
    <section data-revelar="up" className="k-cartao k-recado">
      <div className="k-pedido-rotulo">
        <span className="k-ponto" aria-hidden />
        Esperamos você
      </div>
      <p className="k-recado-p">{dados.site?.mensagem}</p>
      {(casal.nome1 || casal.nome2) && (
        <div className="k-nome k-recado-nomes">
          <NomesDoCasal casal={casal} />
        </div>
      )}
    </section>
  );
}
