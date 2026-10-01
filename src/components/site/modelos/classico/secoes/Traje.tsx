"use client";

// 8 · Dress code, fundo alt: "Como se vestir", o título e o texto que a
// noiva já escreve hoje à esquerda; à direita até 3 fotos de referência
// alinhadas pela base, a do meio mais alta (3/4.6) e com as cortinas em
// 0, 150 e 300ms. Foto que falta some e a grade se ajusta.

import type { CSSProperties } from "react";
import { lerDressCode } from "@/lib/site-conteudo";
import { Quadro, useUrlDaFoto, type PropsDaSecao } from "../comum";

const POSICOES = [
  { proporcao: "3/4", atraso: 0 },
  { proporcao: "3/4.6", atraso: 150 },
  { proporcao: "3/4", atraso: 300 },
];

export function fotosDoTraje(caminhos: string[], modo: string, resolver: (c: string) => string | null) {
  // na prévia, os 3 espaços (os vazios convidam a foto); fora dela, só as que existem
  if (modo === "previa") return POSICOES.map((_, i) => caminhos[i] ?? null);
  return caminhos.filter((c) => !!resolver(c));
}

export function temTraje({ dados, bloco, modo, resolver }: Pick<PropsDaSecao, "dados" | "bloco" | "modo"> & { resolver: (c: string) => string | null }): boolean {
  const s = dados.site;
  return !!(s?.dress_code || s?.dress_code_titulo || fotosDoTraje(lerDressCode(bloco.conteudo).fotos, modo, resolver).length);
}

export function Traje({ dados, bloco, modo }: PropsDaSecao) {
  const s = dados.site;
  const resolver = useUrlDaFoto();
  const fotos = fotosDoTraje(lerDressCode(bloco.conteudo).fotos, modo, (c) => resolver(c));
  // a do meio é a mais alta só quando são 3
  const posicoes = fotos.length === 3 ? POSICOES : POSICOES.map((p, i) => ({ proporcao: "3/4", atraso: p.atraso * (i > 0 ? 1 : 0) }));

  return (
    <section className="c-secao c-alt c-traje">
      <div className="c-traje-grade">
        <div className="c-traje-texto">
          <div data-revelar="up" className="c-eyebrow">
            Como se vestir
          </div>
          {s?.dress_code_titulo && (
            <h2 data-revelar="up" data-atraso="120" className="c-h2">
              {s.dress_code_titulo}
            </h2>
          )}
          {s?.dress_code && (
            <p data-revelar="up" data-atraso="240" className="c-traje-p">
              {s.dress_code}
            </p>
          )}
        </div>
        {fotos.length > 0 && (
          <div className="c-traje-fotos" style={{ "--c-colunas": fotos.length } as CSSProperties}>
            {fotos.map((f, i) => (
              <Quadro key={i} caminho={f} proporcao={posicoes[i].proporcao} atraso={posicoes[i].atraso} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
