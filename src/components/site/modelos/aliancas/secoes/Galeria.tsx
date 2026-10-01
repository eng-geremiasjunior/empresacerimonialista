"use client";

// 13 · Galeria: a grade de 12 colunas do desenho — um ARCO grande 4/5 (7
// colunas) e, à direita e mais abaixo (clamp(40px,10vw,140px)), um
// CÍRCULO e um retângulo 4/3 (raio 16; 5 colunas); a frase em itálico no
// meio e a panorâmica 16/8 (raio 16) na largura toda. Com mais fotos (até
// 12) o ritmo se repete de 4 em 4. As fotos se revelam como papel
// fotográfico ("dev"); no hover crescem 1.06 (1.04 na panorâmica) em
// 1.8s E.
//
// Só as fotos que existem: um grupo com uma foto vira panorâmica; com
// duas, arco e círculo. Sem foto nenhuma, a seção some no público; na
// prévia da família, os 4 espaços do desenho convidam a foto. Sem frase
// do casal, a do desenho.
//
// No celular (≤640px) a grade empilha: o arco na largura toda e o
// círculo e o retângulo lado a lado embaixo, sem o degrau.

import { Fragment, type ReactNode } from "react";
import { lerGaleria } from "@/lib/site-conteudo";
import { Quadro, type PropsDaSecao } from "../comum";

const FRASE_DO_DESENHO = "Alguns momentos merecem ser lembrados para sempre.";

export function fotosDaGaleria(caminhos: string[], modo: string, resolver: (c: string) => string | null): (string | null)[] {
  if (modo === "previa") {
    const n = Math.max(4, caminhos.length);
    return Array.from({ length: n }, (_, i) => caminhos[i] ?? null);
  }
  return caminhos.filter((c) => !!resolver(c));
}

function grupos<T>(lista: T[], n: number): T[][] {
  const g: T[][] = [];
  for (let i = 0; i < lista.length; i += n) g.push(lista.slice(i, i + n));
  return g;
}

export function Galeria({ bloco, fotos }: PropsDaSecao & { fotos: (string | null)[] }) {
  const { frase } = lerGaleria(bloco.conteudo);
  const texto = frase || FRASE_DO_DESENHO;
  const frasePronta = (
    <p data-revelar="up" className="a-galeria-frase">
      {texto}
    </p>
  );
  let fraseUsada = false;

  const blocos: ReactNode[] = grupos(fotos, 4).map((g, k) => {
    const partes: ReactNode[] = [];
    if (g.length === 1) {
      // sozinha: a panorâmica
      partes.push(<Panoramica key="p" caminho={g[0]} />);
    } else {
      partes.push(
        <Quadro
          key="arco"
          caminho={g[0]}
          forma="arco"
          proporcao="4/5"
          revelar="dev"
          hover="normal"
          className="a-galeria-arco"
        />
      );
      partes.push(
        <div key="direita" className="a-galeria-direita">
          <Quadro caminho={g[1]} forma="circulo" proporcao="1/1" revelar="dev" hover="normal" />
          {g[2] !== undefined && (
            <Quadro caminho={g[2]} forma="retangulo" proporcao="4/3" revelar="dev" hover="normal" atraso={160} className="a-galeria-ret" />
          )}
        </div>
      );
      // a frase entre o primeiro trio e a primeira panorâmica
      if (k === 0 && g.length === 4) {
        partes.push(<Fragment key="frase">{frasePronta}</Fragment>);
        fraseUsada = true;
      }
      if (g[3] !== undefined) partes.push(<Panoramica key="p" caminho={g[3]} />);
    }
    return <Fragment key={k}>{partes}</Fragment>;
  });

  return (
    <section className="a-secao a-galeria">
      <div className="a-galeria-grade">
        {blocos}
        {!fraseUsada && frasePronta}
      </div>
    </section>
  );
}

function Panoramica({ caminho }: { caminho: string | null }) {
  return (
    <Quadro
      caminho={caminho}
      forma="retangulo"
      proporcao="16/8"
      revelar="dev"
      hover="suave"
      className="a-galeria-pano"
    />
  );
}
