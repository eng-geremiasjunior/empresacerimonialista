"use client";

// 9 · La galerie, fundo bg: "La galerie", a frase do casal (sem ela, a do
// desenho) e as fotos em molduras de ouro (gradiente 135deg) com
// passe-partout de papel, num flex-wrap centralizado. O desenho tem 5
// formatos, que se repetem em ciclo com mais fotos (até 12):
//
//   4/5 reto (34%, até 420px) · 3/4 oval (26%, até 320px, desce 80px) ·
//   1/1 reto (30%, até 380px) · 16/10 reto (52%, até 640px) ·
//   3/4 oval (30%, até 360px)
//
// No hover a foto cresce 1.07 em 1.6s. Só as fotos que existem: sem
// nenhuma, a seção some no público; na prévia, os 5 espaços convidam a
// foto. Exportado para o T06.

import type { CSSProperties } from "react";
import { lerGaleria } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useUrlDaFoto, type PropsDaSecao } from "../comum";

const FRASE_DO_DESENHO = "Alguns momentos merecem ser lembrados para sempre.";

const MOLDURAS = [
  { base: "34%", max: "420px", ar: "4/5", oval: false, desce: false },
  { base: "26%", max: "320px", ar: "3/4", oval: true, desce: true },
  { base: "30%", max: "380px", ar: "1/1", oval: false, desce: false },
  { base: "52%", max: "640px", ar: "16/10", oval: false, desce: false },
  { base: "30%", max: "360px", ar: "3/4", oval: true, desce: false },
];

export function fotosDaGaleria(caminhos: string[], modo: string, resolver: (c: string) => string | null): (string | null)[] {
  if (modo === "previa") {
    const n = Math.max(MOLDURAS.length, caminhos.length);
    return Array.from({ length: n }, (_, i) => caminhos[i] ?? null);
  }
  return caminhos.filter((c) => !!resolver(c));
}

export function Galeria({ bloco, fotos, ancora }: PropsDaSecao & { fotos: (string | null)[] }) {
  const { frase } = lerGaleria(bloco.conteudo);
  const resolver = useUrlDaFoto();

  return (
    <section id={ancora} className="f-secao f-galeria">
      <div className="f-galeria-miolo">
        <div className="f-cabeca">
          <div data-revelar="up" className="f-eyebrow">
            La galerie
          </div>
          <h2 data-revelar="up" data-atraso="120" className="f-h2 f-h2--balance f-galeria-h2">
            {frase || FRASE_DO_DESENHO}
          </h2>
        </div>
        <div className="f-galeria-grade">
          {fotos.map((f, i) => {
            const m = MOLDURAS[i % MOLDURAS.length];
            return (
              <div
                key={i}
                data-revelar="up"
                data-atraso={(i % 3) * 120 || undefined}
                className={`f-galeria-item ${m.oval ? "f-galeria-item--oval" : ""} ${m.desce ? "f-galeria-item--desce" : ""}`}
                style={{ "--f-base": m.base, "--f-max": m.max } as CSSProperties}
              >
                <div className="f-moldura-ouro">
                  <div className="f-passe">
                    <div className="f-galeria-foto" style={{ aspectRatio: m.ar.replace("/", " / ") }}>
                      <div className="f-galeria-zoom">
                        <EspacoDeFoto url={resolver(f)} forma={m.oval ? "oval" : "retangulo"} proporcao="tela" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
