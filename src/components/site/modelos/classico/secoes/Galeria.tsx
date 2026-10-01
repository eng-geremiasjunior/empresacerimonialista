"use client";

// 12 · Galeria: uma foto 16/9 na largura toda, duas 4/5 lado a lado (a
// segunda desce clamp(40px,8vw,120px) e entra 180ms depois), a frase em
// itálico no meio e outra 16/9. Com mais fotos (até 12), o ritmo se
// repete: larga, par, larga, par… No hover a foto cresce 1.05 em 1.8s.
//
// Só as fotos que existem: a grade se recompõe (uma 4/5 sozinha no fim
// vira larga). Sem foto nenhuma, a seção some no público; na prévia da
// família, os 4 espaços do desenho convidam a foto. Sem frase do casal,
// a do desenho.

import { Fragment } from "react";
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

type Peca = { caminho: string | null; larga: boolean; desce: boolean };

/** larga, par, par, larga, par, par…; a 4/5 sem parceira vira larga. */
function montar(fotos: (string | null)[]): Peca[] {
  return fotos.map((caminho, k) => {
    const lugar = k % 3;
    const sozinha = lugar === 1 && k === fotos.length - 1;
    return { caminho, larga: lugar === 0 || sozinha, desce: lugar === 2 };
  });
}

export function Galeria({ bloco, fotos, colada }: PropsDaSecao & { fotos: (string | null)[]; colada: boolean }) {
  const { frase } = lerGaleria(bloco.conteudo);
  const pecas = montar(fotos);
  // a frase entra depois do primeiro trio (ou no fim, com menos fotos)
  const fraseDepois = Math.min(2, pecas.length - 1);

  return (
    <section className={`c-secao c-galeria ${colada ? "c-galeria--colada" : ""}`}>
      <div className="c-galeria-grade">
        {pecas.map((p, i) => (
          <Fragment key={i}>
            <Quadro
              caminho={p.caminho}
              proporcao={p.larga ? "16/9" : "4/5"}
              className={`${p.larga ? "c-galeria-larga" : ""} ${p.desce ? "c-galeria-desce" : ""}`}
              atraso={p.desce ? 180 : undefined}
              hover
            />
            {i === fraseDepois && (
              <p data-revelar="up" className="c-galeria-frase">
                {frase || FRASE_DO_DESENHO}
              </p>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
