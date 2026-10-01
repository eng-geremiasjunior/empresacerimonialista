"use client";

// Galeria (#galeria, T03 e T04): o mosaico sem título, 4 colunas fixas
// (também no celular), linhas de clamp(120px,15vw,210px), vão de
// clamp(10px,1.4vw,18px) e raio 28. Cada foto entra com opacidade 0,
// scale 1.18 e blur 8px em 1800ms (delay (i%3)×120) e cresce 1.06 no
// hover.
//
// Quantidade variável (até 12): blocos de 6 com os spans do desenho
// [2×2, 1×1, 1×2, 1×1, 2×1, 2×1], que fecham 3 linhas inteiras; o resto
// fecha as linhas dele — 1: 4×2; 2: 2×2 + 2×2; 3: 2×2 + 2×1 + 2×1;
// 4: 2×2 + 1×1 + 1×2 + 1×1; 5: esses 4 + 4×1. Nunca sobra buraco.
//
// Só as fotos que existem; sem nenhuma, a seção some no público. Na
// prévia da família, os 6 espaços do desenho convidam a foto. A frase da
// noiva (se houver) fica embaixo, pequena.

import type { CSSProperties } from "react";
import { lerGaleria } from "@/lib/site-conteudo";
import { FotoDoCartao, type PropsDaSecao } from "../comum";

type Span = readonly [number, number];

const BLOCO: Span[] = [
  [2, 2],
  [1, 1],
  [1, 2],
  [1, 1],
  [2, 1],
  [2, 1],
];

const RESTO: Record<number, Span[]> = {
  1: [[4, 2]],
  2: [
    [2, 2],
    [2, 2],
  ],
  3: [
    [2, 2],
    [2, 1],
    [2, 1],
  ],
  4: BLOCO.slice(0, 4),
  5: [...BLOCO.slice(0, 4), [4, 1]],
};

export function spansDaGaleria(n: number): Span[] {
  const s: Span[] = [];
  for (let i = 0; i + 6 <= n; i += 6) s.push(...BLOCO);
  const r = n % 6;
  if (r) s.push(...RESTO[r]);
  return s;
}

export function fotosDaGaleria(caminhos: string[], modo: string, resolver: (c: string) => string | null): (string | null)[] {
  if (modo === "previa") {
    const n = Math.max(6, caminhos.length);
    return Array.from({ length: n }, (_, i) => caminhos[i] ?? null);
  }
  return caminhos.filter((c) => !!resolver(c));
}

export function Galeria({ bloco, ancora, fotos }: PropsDaSecao & { fotos: (string | null)[] }) {
  const { frase } = lerGaleria(bloco.conteudo);
  const spans = spansDaGaleria(fotos.length);
  return (
    <section id={ancora} data-sec={ancora} className="k-galeria-casca">
      <div className="k-galeria">
        {fotos.map((f, i) => (
          <div
            key={i}
            data-revelar="img"
            data-atraso={(i % 3) * 120 || undefined}
            className="k-galeria-item"
            style={{ gridColumn: `span ${spans[i][0]}`, gridRow: `span ${spans[i][1]}` } as CSSProperties}
          >
            <div data-zoom="" className="k-galeria-zoom">
              <div className="k-galeria-hover">
                <FotoDoCartao caminho={f} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {frase && (
        <p data-revelar="up" className="k-galeria-frase">
          {frase}
        </p>
      )}
    </section>
  );
}
