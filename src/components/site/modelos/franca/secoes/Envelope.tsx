"use client";

// 1 · Abertura: o envelope de cera (T05 e T06). Camada fixa sobre o fundo
// radial #2c3858 → #141b2c, "Une lettre pour vous", o envelope (corpo,
// carta com "Vous êtes invité", os nomes por extenso e a data, o bolso
// em V, a aba e o selo com as iniciais) e "Toque no selo para abrir". O
// toque em qualquer ponto da camada abre.
//
// A coreografia é a do protótipo, em WAAPI: o rótulo e a dica somem
// (400ms); o selo cresce a 1.14 e cai girando (700ms); a aba vira em
// rotateX (900ms, delay 450ms) e passa para trás aos 900ms; a carta sobe
// −56% (1100ms, delay 1250ms); o envelope cresce e some (1000ms, delay
// 2550ms); a camada some (1000ms, delay 2750ms). O useAbertura cuida do
// resto: o hero aos 2850ms, a saída e a rolagem destravada aos 3800ms.
// Sem JS (sm-js ausente) a camada nem aparece.

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { EstadoDaAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E } from "@/components/site/pecas/useRevelar";
import { dataCurta, NomesDoCasal, SeloDeCera, type CasalDoSite } from "../comum";

export function Envelope({
  casal,
  data,
  estado,
  abrir,
}: {
  casal: CasalDoSite;
  /** YYYY-MM-DD do evento */
  data: string;
  estado: EstadoDaAbertura;
  abrir: () => void;
}) {
  const camada = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ov = camada.current;
    if (estado !== "abrindo" || !ov || typeof ov.animate !== "function") return;
    const q = (s: string) => ov.querySelector<HTMLElement>(s);
    const A: Animation[] = [];
    const tempos: number[] = [];
    [q("[data-env-dica]"), q("[data-env-topo]")].forEach((el) => {
      if (el) A.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }));
    });
    const selo = q("[data-env-selo]");
    if (selo)
      A.push(
        selo.animate(
          [
            { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
            { transform: "translate(-50%,-50%) scale(1.14)", opacity: 1, offset: 0.35 },
            { transform: "translate(-50%,-25%) scale(.7) rotate(-20deg)", opacity: 0 },
          ],
          { duration: 700, easing: CURVA_E, fill: "forwards" }
        )
      );
    const aba = q("[data-env-aba]");
    if (aba) {
      A.push(
        aba.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }], {
          duration: 900,
          delay: 450,
          easing: "cubic-bezier(.5,0,.3,1)",
          fill: "forwards",
        })
      );
      tempos.push(window.setTimeout(() => (aba.style.zIndex = "0"), 900));
    }
    const carta = q("[data-env-carta]");
    if (carta)
      A.push(
        carta.animate([{ transform: "translateY(0)" }, { transform: "translateY(-56%)" }], {
          duration: 1100,
          delay: 1250,
          easing: CURVA_E,
          fill: "forwards",
        })
      );
    const env = q("[data-env]");
    if (env)
      A.push(
        env.animate(
          [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(1.35)", opacity: 0 },
          ],
          { duration: 1000, delay: 2550, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }
        )
      );
    A.push(ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, delay: 2750, easing: "ease", fill: "forwards" }));
    return () => {
      tempos.forEach((t) => clearTimeout(t));
      A.forEach((a) => a.cancel());
    };
  }, [estado]);

  if (estado === "aberta") return null;

  const tecla = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };

  return (
    <div
      ref={camada}
      className="f-envelope"
      role="button"
      tabIndex={0}
      aria-label="Abrir o convite"
      onClick={abrir}
      onKeyDown={tecla}
    >
      <div data-env-topo="" className="f-env-topo">
        Une lettre pour vous
      </div>
      <div data-env="" className="f-env">
        <div className="f-env-corpo" />
        <div data-env-carta="" className="f-env-carta">
          <div className="f-env-convidado">Vous êtes invité</div>
          {(casal.nome1 || casal.nome2) && (
            <div className="f-nome f-env-nomes">
              <NomesDoCasal casal={casal} />
            </div>
          )}
          <div className="f-env-data">{dataCurta(data, " · ")}</div>
        </div>
        <div className="f-env-bolso" />
        <div data-env-aba="" className="f-env-aba" />
        <SeloDeCera casal={casal} className="f-env-selo" data-env-selo="" />
      </div>
      <div data-env-dica="" className="f-env-dica">
        Toque no selo para abrir
      </div>
    </div>
  );
}
