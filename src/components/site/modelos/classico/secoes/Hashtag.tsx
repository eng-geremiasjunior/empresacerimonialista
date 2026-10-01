"use client";

// 15 · Hashtag, fundo alt: "Compartilhe esse momento com a gente" e
// '#' + nome1 + 'E' + nome2, sem acento e sem espaço. Fica presa logo
// antes do rodapé, como no desenho; sem nome, some.

import type { CasalDoSite } from "../comum";

export function Hashtag({ casal }: { casal: CasalDoSite }) {
  if (!casal.hashtag) return null;
  return (
    <section className="c-secao c-alt c-hashtag">
      <div data-revelar="up" className="c-hashtag-miolo">
        <div className="c-eyebrow">Compartilhe esse momento com a gente</div>
        <div className="c-hashtag-tag">{casal.hashtag}</div>
      </div>
    </section>
  );
}
