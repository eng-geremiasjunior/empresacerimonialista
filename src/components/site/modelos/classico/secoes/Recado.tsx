"use client";

// 14 · Recado ("Esperamos você"), fundo bg: a mensagem do casal (a que a
// noiva já escreve hoje) e os nomes na fonte dos nomes, cor accent.

import { NomesDoCasal, type PropsDaSecao } from "../comum";

export function temRecado({ dados }: Pick<PropsDaSecao, "dados">): boolean {
  return !!dados.site?.mensagem;
}

export function Recado({ dados, casal }: PropsDaSecao) {
  return (
    <section className="c-secao c-recado">
      <div className="c-recado-miolo">
        <h2 data-revelar="up" className="c-h2">
          Esperamos você
        </h2>
        <p data-revelar="up" data-atraso="120" className="c-recado-p">
          {dados.site?.mensagem}
        </p>
        {(casal.nome1 || casal.nome2) && (
          <div data-revelar="up" data-atraso="260" className="c-nome c-recado-nomes">
            <NomesDoCasal casal={casal} />
          </div>
        )}
      </div>
    </section>
  );
}
