"use client";

// 2 · Barra do topo: aparece depois de 85% da altura da tela (opacidade
// .6s ease, desce de -100% em .6s E). Monograma à esquerda; à direita só
// os links das seções que estão no site e o "Confirmar presença". No
// celular (≤760px) só o botão fica.
//
// Prévia da família: não aparece (no site de verdade ela também não está
// na primeira tela). Revisão do dono: parada no alto, para ele ver quais
// links vão ao ar.

import { useEffect, useState } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { Monograma, type CasalDoSite } from "../comum";

export type LinksDaNav = {
  historia: boolean;
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
      setVisivel(window.scrollY > window.innerHeight * 0.85);
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

  return (
    <nav
      className={`c-nav ${estatica ? "c-nav--estatica" : ""}`}
      data-visivel={visivel || estatica ? "" : undefined}
      aria-hidden={!visivel && !estatica ? true : undefined}
    >
      <a href="#inicio" className="c-nav-mono" tabIndex={visivel || estatica ? undefined : -1}>
        <Monograma casal={casal} className="c-mono" fio={{ altura: "18px", opacidade: 0.5 }} />
        <span className="c-so-leitor">Início</span>
      </a>
      <div className="c-nav-links">
        {links.historia && (
          <a href="#historia" className="c-nav-link" tabIndex={visivel || estatica ? undefined : -1}>
            História
          </a>
        )}
        {links.dia && (
          <a href="#dia" className="c-nav-link" tabIndex={visivel || estatica ? undefined : -1}>
            O grande dia
          </a>
        )}
        {links.presentes && (
          <a href="#presentes" className="c-nav-link" tabIndex={visivel || estatica ? undefined : -1}>
            Presentes
          </a>
        )}
        {links.rsvp && (
          <a href="#rsvp" className="c-nav-botao" tabIndex={visivel || estatica ? undefined : -1}>
            Confirmar presença
          </a>
        )}
      </div>
    </nav>
  );
}
