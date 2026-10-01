"use client";

// Dress code (#traje, T03 e T04): o cartão horizontal de raio 32 — o
// cabide de 64px em sage, "Como se vestir", "Traje: Social"
// (clamp(28px,3vw,38px)) e o texto que a noiva já escreve hoje. As fotos
// de referência do bloco (até 3), que o desenho do T03 não tem, entram à
// direita em miniaturas 3/4 de raio 18, para trocar de modelo não perder
// o que ela subiu. Foto que falta some.

import { lerDressCode } from "@/lib/site-conteudo";
import { FotoDoCartao, Icone, Rotulo, useUrlDaFoto, type PropsDaSecao } from "../comum";
import { nomeDoTraje } from "./Destaques";

export function fotosDoTraje(caminhos: string[], modo: string, resolver: (c: string) => string | null): (string | null)[] {
  if (modo === "previa") return caminhos.length ? caminhos : [];
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

export function Traje({ dados, bloco, modo, ancora }: PropsDaSecao) {
  const s = dados.site;
  const resolver = useUrlDaFoto();
  const fotos = fotosDoTraje(lerDressCode(bloco.conteudo).fotos, modo, (c) => resolver(c));
  return (
    <section id={ancora} data-revelar="up" className="k-cartao k-traje">
      <span className="k-selo-icone" aria-hidden>
        <Icone nome="cabide" className="k-icone--28" />
      </span>
      <div className="k-traje-textos">
        <Rotulo className="k-rotulo--acento">Como se vestir</Rotulo>
        {s?.dress_code_titulo && <div className="k-traje-titulo">Traje: {nomeDoTraje(s.dress_code_titulo)}</div>}
        {s?.dress_code && <div className="k-mudo k-traje-p">{s.dress_code}</div>}
      </div>
      {fotos.length > 0 && (
        <div className="k-traje-fotos">
          {fotos.map((f, i) => (
            <div key={i} className="k-traje-foto">
              <FotoDoCartao caminho={f} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
