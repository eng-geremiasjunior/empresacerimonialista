"use client";

// O som do T06 na tela: o botão da capa e a pílula flutuante. Os dois só
// existem quando há faixa (FAIXA_DO_VIOLINO): sem arquivo, nada de botão
// que finge.
//
// Na capa, abaixo do local (data-hero="3": entra com a data, 1300ms
// @1950ms): a pílula "Clique aqui" (11px, MAIÚSC., goldLight) com "e sinta
// a experiência do nosso grande dia" (itálico dos títulos), o círculo de
// play goldLight de 40px, a borda rgba(220,195,147,.8), o fundo
// rgba(20,27,44,.55) (.8 e −2px no hover, .5s) e o anel FIXO em inset −6px
// a .35 — sem pulsar (o anel infinito travou a página no protótipo).
// Depois do clique: "Role para baixo e ouça" (entra em 900ms @350ms) com a
// linha de 1×38px que desce em loop (scaleY 0→1 pelo topo até 50%, 1→0
// pela base; 2200ms ease-in-out). Prévia e revisão: o botão aparece, mas
// não toca (o som nunca sai fora do site público).
//
// A pílula (canto inferior esquerdo, z 55): aparece com a experiência
// ligada e a rolagem além de 90% da tela (opacidade .6s ease, sobe 20px em
// .6s E). Papel com borda gold, o círculo ink de 38px com o furo em "f" do
// violino (curva em S, dois círculos nas pontas, dois entalhes), "Som
// ligado" / "Som desligado"; o toque alterna o mudo.

import { useEffect, useRef, useState } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { Entrada } from "../../franca/comum";
import type { SomDoViolino } from "../som";

export function SomNaCapa({ som, modo }: { som: SomDoViolino; modo: ModoDoSite }) {
  const deixa = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = deixa.current;
    if (!som.ativo || !el || movimentoReduzido() || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { transform: "scaleY(0)", transformOrigin: "top" },
        { transform: "scaleY(1)", transformOrigin: "top", offset: 0.5 },
        { transform: "scaleY(1)", transformOrigin: "bottom", offset: 0.51 },
        { transform: "scaleY(0)", transformOrigin: "bottom" },
      ],
      { duration: 2200, iterations: Infinity, easing: "ease-in-out" }
    );
    return () => a.cancel();
  }, [som.ativo]);

  return (
    <div data-hero="3" className="v-som-capa">
      {!som.ativo ? (
        <button
          type="button"
          className="v-som-botao"
          onClick={som.iniciar}
          disabled={modo !== "publico"}
        >
          <span className="v-som-anel" aria-hidden />
          <span className="v-som-play" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M8 5l12 7-12 7z" />
            </svg>
          </span>
          <span className="v-som-textos">
            <span className="v-som-clique">Clique aqui</span>
            <span className="v-som-frase">e sinta a experiência do nosso grande dia</span>
          </span>
        </button>
      ) : (
        <Entrada className="v-som-role">
          <span>Role para baixo e ouça</span>
          <span ref={deixa} className="v-som-deixa" aria-hidden />
        </Entrada>
      )}
    </div>
  );
}

export function PilulaDoSom({ som }: { som: SomDoViolino }) {
  const [passou, setPassou] = useState(false);
  const { motor } = som;

  useEffect(() => {
    if (!som.ativo) return;
    let pedido = 0;
    const medir = () => {
      pedido = 0;
      setPassou(window.scrollY > window.innerHeight * 0.9);
    };
    const aoRolar = () => {
      if (!pedido) pedido = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [som.ativo]);

  if (!som.disponivel || !som.ativo) return null;
  const visivel = passou;

  return (
    <div className="v-pilula" data-visivel={visivel ? "" : undefined} aria-hidden={visivel ? undefined : true}>
      <button
        type="button"
        className="v-pilula-botao"
        onClick={som.alternarMudo}
        aria-pressed={som.mudo}
        tabIndex={visivel ? undefined : -1}
      >
        <span className="v-pilula-circulo" aria-hidden>
          <svg
            ref={(el) => {
              motor.furo = el;
            }}
            viewBox="0 0 24 24"
            className="v-furo"
          >
            <path d="M14.6 4.2 C10.4 4.6 13.6 10.2 12 12 C10.4 13.8 13.6 19.4 9.4 19.8" />
            <circle cx="15" cy="4" r="1.4" />
            <circle cx="9" cy="20" r="1.4" />
            <path d="M9.6 11.2 L11 12 M13 12 L14.4 12.8" />
          </svg>
        </span>
        <span className="v-pilula-rotulo">{som.mudo ? "Som desligado" : "Som ligado"}</span>
      </button>
    </div>
  );
}
