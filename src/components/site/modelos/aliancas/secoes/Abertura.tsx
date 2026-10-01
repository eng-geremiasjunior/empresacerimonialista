"use client";

// 1 · Abertura, tela cheia fixa no fundo escuro: "O casamento de", os
// nomes na forma escolhida, as alianças SEPARADAS (min(560px,88vw), 2/1)
// e "Toque nas alianças". Um toque (em qualquer lugar) encaixa as
// alianças (lerp .045) e solta o estouro dourado (50 partículas, 900ms,
// alcance 300px); aos 1900ms a camada some (opacidade 1.1s ease) e
// cresce para 1.08 (1.4s E) — pelo transition-delay do CSS, sem relógio
// aqui. O hero começa aos 2300ms e a camada sai aos 3100ms (useAbertura).
//
// O protótipo mostrava sempre "Marina & João"; aqui vale a forma do nome
// da noiva: nomes, iniciais ou iniciais com os nomes embaixo. Sem JS
// (classe sm-js ausente) a camada nem aparece.

import { useRef, type KeyboardEvent } from "react";
import type { EstadoDaAbertura } from "@/components/site/pecas/useAbertura";
import { Estouro } from "@/components/site/pecas/Estouro";
import { Aliancas } from "../Aliancas";
import { NomesDoCasal, type CasalDoSite } from "../comum";

export function Abertura({
  casal,
  estado,
  abrir,
}: {
  casal: CasalDoSite;
  estado: EstadoDaAbertura;
  abrir: () => void;
}) {
  const abrindo = estado === "abrindo";
  const juntar = useRef(false);
  juntar.current = abrindo;

  if (estado === "aberta") return null;

  const tecla = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };

  return (
    <div
      className="a-abertura"
      data-abrindo={abrindo ? "" : undefined}
      role="button"
      tabIndex={0}
      aria-label="Abrir o convite"
      onClick={abrir}
      onKeyDown={tecla}
    >
      <div className="a-abertura-rotulo">O casamento de</div>
      {casal.forma === "nomes" ? (
        <div className="a-nome a-abertura-nomes">
          <NomesDoCasal casal={casal} />
        </div>
      ) : (
        <div className="a-abertura-monograma">
          <div className="a-nome a-abertura-iniciais" aria-hidden>
            {casal.i1}
            {casal.dois && (
              <>
                {" "}
                <span className="sm-amp">&amp;</span>{" "}
              </>
            )}
            {casal.i2}
          </div>
          {casal.forma === "iniciais-nomes" && (
            <div className="a-nome a-abertura-nomes-xs">
              <NomesDoCasal casal={casal} />
            </div>
          )}
        </div>
      )}
      <div className="a-abertura-aneis">
        <Aliancas inicio={1} lerp={0.045} alvo={(final) => (final || juntar.current ? 0 : 1)} />
        {abrindo && <Estouro quantidade={50} atraso={900} alcance={300} />}
      </div>
      <div className="a-abertura-toque">Toque nas alianças</div>
    </div>
  );
}
