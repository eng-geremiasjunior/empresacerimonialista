"use client";

// 15 · Recado ("Esperamos você"): a mensagem do casal (a que a noiva já
// escreve hoje), os nomes na fonte dos nomes em accent e, quando o recado
// é o último bloco antes do rodapé, "Compartilhe esse momento com a
// gente" e a hashtag logo embaixo, como no desenho. Se o recado não está
// ali (escondido, sem texto ou movido para cima), a hashtag fica sozinha
// antes do rodapé (<Hashtag>), no mesmo desenho.

import type { CasalDoSite, PropsDaSecao } from "../comum";
import { NomesDoCasal } from "../comum";

export function temRecado({ dados }: Pick<PropsDaSecao, "dados">): boolean {
  return !!dados.site?.mensagem;
}

function LinhaDaHashtag({ casal }: { casal: CasalDoSite }) {
  return (
    <div data-revelar="up" data-atraso="360" className="a-hashtag">
      <span className="a-hashtag-rotulo">Compartilhe esse momento com a gente</span>
      <span className="a-hashtag-tag">{casal.hashtag}</span>
    </div>
  );
}

export function Recado({ dados, casal, comHashtag }: PropsDaSecao & { comHashtag: boolean }) {
  return (
    <section className="a-secao a-recado">
      <div className="a-recado-miolo">
        <h2 data-revelar="up" className="a-h2">
          Esperamos você
        </h2>
        <p data-revelar="up" data-atraso="120" className="a-recado-p">
          {dados.site?.mensagem}
        </p>
        {(casal.nome1 || casal.nome2) && (
          <div data-revelar="up" data-atraso="260" className="a-nome a-recado-nomes">
            <NomesDoCasal casal={casal} />
          </div>
        )}
        {comHashtag && casal.hashtag && <LinhaDaHashtag casal={casal} />}
      </div>
    </section>
  );
}

/** A hashtag sozinha, antes do rodapé; sem nome, some. */
export function Hashtag({ casal }: { casal: CasalDoSite }) {
  if (!casal.hashtag) return null;
  return (
    <section className="a-secao a-recado a-recado--so-hashtag">
      <div className="a-recado-miolo">
        <LinhaDaHashtag casal={casal} />
      </div>
    </section>
  );
}
