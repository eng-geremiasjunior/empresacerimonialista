"use client";

// 2 · Barra do topo (T05 e T06): aparece quando a rolagem passa de 90% da
// altura da tela (opacidade .6s ease, desce de −100% em .6s E). À esquerda
// o monograma "H & R" (o & em goldText a .6em), que leva ao início; à
// direita só os links das seções que estão no site — História, O local
// (o desenho dizia "O château"; o lugar pode ser um sítio), Programa,
// Presentes — e "Confirmar presença". Abaixo de 820px só o botão fica.
//
// Prévia da família: não aparece (no site de verdade ela também não está
// na primeira tela). Revisão do dono: parada no alto, para ele ver quais
// links vão ao ar.

import { useEffect, useState } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { IniciaisDoCasal, type CasalDoSite } from "../comum";

export type LinksDaNav = {
  historia: boolean;
  local: boolean;
  dia: boolean;
  presentes: boolean;
  rsvp: boolean;
};

export function Nav({ casal, links, modo }: { casal: CasalDoSite; links: LinksDaNav; modo: ModoDoSite }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (modo !== "publico") return;
    let pedido = 0;
    const medir = () => {
      pedido = 0;
      setVisivel(window.scrollY > window.innerHeight * 0.9);
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
  }, [modo]);

  if (modo === "previa") return null;
  const estatica = modo === "revisao";
  const ativa = visivel || estatica;
  const tab = ativa ? undefined : -1;

  return (
    <nav
      className={`f-nav ${estatica ? "f-nav--estatica" : ""}`}
      data-visivel={ativa ? "" : undefined}
      aria-hidden={ativa ? undefined : true}
    >
      <a href="#inicio" className="f-nav-mono" tabIndex={tab}>
        <span aria-hidden>
          <IniciaisDoCasal casal={casal} />
        </span>
        <span className="f-so-leitor">Início</span>
      </a>
      <div className="f-nav-links">
        {links.historia && (
          <a href="#historia" className="f-nav-link" tabIndex={tab}>
            História
          </a>
        )}
        {links.local && (
          <a href="#local" className="f-nav-link" tabIndex={tab}>
            O local
          </a>
        )}
        {links.dia && (
          <a href="#dia" className="f-nav-link" tabIndex={tab}>
            Programa
          </a>
        )}
        {links.presentes && (
          <a href="#presentes" className="f-nav-link" tabIndex={tab}>
            Presentes
          </a>
        )}
        {links.rsvp && (
          <a href="#rsvp" className="f-nav-botao" tabIndex={tab}>
            Confirmar presença
          </a>
        )}
      </div>
    </nav>
  );
}
