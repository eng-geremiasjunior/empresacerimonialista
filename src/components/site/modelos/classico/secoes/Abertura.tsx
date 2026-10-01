"use client";

// 1 · Abertura em portas: duas metades na cor alt (50.5% cada) e, no
// meio, o rótulo, o selo com as iniciais, os nomes e "Toque para abrir".
// Um toque em qualquer lugar abre: as portas saem para os lados em 1.7s
// cubic-bezier(.77,0,.18,1), o miolo some (.7s) e cresce para 1.06 (1s).
// Quem cuida do tempo (hero aos 450ms, saída e destrava aos 1800ms) é o
// useAbertura. Sem JS (classe sm-js ausente) a camada nem aparece.

import type { KeyboardEvent } from "react";
import type { EstadoDaAbertura } from "@/components/site/pecas/useAbertura";
import { Monograma, NomesDoCasal, type CasalDoSite } from "../comum";

export function Abertura({
  casal,
  estado,
  abrir,
}: {
  casal: CasalDoSite;
  estado: EstadoDaAbertura;
  abrir: () => void;
}) {
  if (estado === "aberta") return null;
  const abrindo = estado === "abrindo";
  const tecla = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };
  return (
    <div
      className="c-abertura"
      data-abrindo={abrindo ? "" : undefined}
      role="button"
      tabIndex={0}
      aria-label="Abrir o convite"
      onClick={abrir}
      onKeyDown={tecla}
    >
      <div className="c-porta c-porta--esq" />
      <div className="c-porta c-porta--dir" />
      <div className="c-abertura-miolo">
        <div className="c-abertura-rotulo">Você está convidado para o casamento de</div>
        <div className="c-selo">
          <Monograma casal={casal} className="c-selo-letras" fio={{ altura: "34px", opacidade: 0.6 }} />
        </div>
        <div className="c-nome c-abertura-nomes">
          <NomesDoCasal casal={casal} />
        </div>
        <div className="c-abertura-toque">Toque para abrir</div>
      </div>
    </div>
  );
}
