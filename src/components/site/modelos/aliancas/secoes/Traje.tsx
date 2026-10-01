"use client";

// 9 · Dress code, centrado: "Como se vestir", o título e o texto que a
// noiva já escreve hoje e até 3 fotos de referência em ARCO alinhadas
// pela base (a do meio mais alta, 3/5; as outras 3/4.4), numa largura de
// até 640px, com as cortinas em 0, 150 e 300ms. Foto que falta some e a
// grade se ajusta (sem a do meio, todas ficam 3/4.4).

import type { CSSProperties } from "react";
import { lerDressCode } from "@/lib/site-conteudo";
import { Quadro, useUrlDaFoto, type PropsDaSecao } from "../comum";

const ATRASOS = [0, 150, 300];

/** "Traje: Social", como no desenho, sem dobrar o "Traje" que a noiva às
 *  vezes já escreve. */
function tituloDoTraje(titulo: string): string {
  const nome = titulo.replace(/^\s*traje\s*:?\s*/i, "").trim();
  return nome ? `Traje: ${nome}` : titulo.trim();
}

export function fotosDoTraje(caminhos: string[], modo: string, resolver: (c: string) => string | null) {
  // na prévia, os 3 espaços (os vazios convidam a foto); fora dela, só as que existem
  if (modo === "previa") return ATRASOS.map((_, i) => caminhos[i] ?? null);
  return caminhos.filter((c) => !!resolver(c));
}

export function temTraje({
  dados,
  bloco,
  modo,
  resolver,
}: Pick<PropsDaSecao, "dados" | "bloco" | "modo"> & { resolver: (c: string) => string | null }): boolean {
  const s = dados.site;
  return !!(s?.dress_code || s?.dress_code_titulo || fotosDoTraje(lerDressCode(bloco.conteudo).fotos, modo, resolver).length);
}

export function Traje({ dados, bloco, modo }: PropsDaSecao) {
  const s = dados.site;
  const resolver = useUrlDaFoto();
  const fotos = fotosDoTraje(lerDressCode(bloco.conteudo).fotos, modo, (c) => resolver(c));

  return (
    <section className="a-secao a-traje">
      <div className="a-traje-miolo">
        <div data-revelar="up" className="a-eyebrow">
          Como se vestir
        </div>
        {s?.dress_code_titulo && (
          <h2 data-revelar="up" data-atraso="120" className="a-h2">
            {tituloDoTraje(s.dress_code_titulo)}
          </h2>
        )}
        {s?.dress_code && (
          <p data-revelar="up" data-atraso="200" className="a-traje-p">
            {s.dress_code}
          </p>
        )}
        {fotos.length > 0 && (
          <div className="a-traje-fotos" style={{ "--a-colunas": fotos.length } as CSSProperties}>
            {fotos.map((f, i) => (
              <Quadro
                key={i}
                caminho={f}
                forma="arco"
                proporcao={fotos.length === 3 && i === 1 ? "3/5" : "3/4.4"}
                atraso={ATRASOS[i]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
