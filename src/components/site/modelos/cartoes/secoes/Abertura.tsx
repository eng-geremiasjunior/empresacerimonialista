"use client";

// Abertura do T03: a foto em tela cheia sobre #1a1f1b, o véu, as iniciais
// enormes (o "&" em pêssego a .55em), "{n1} e {n2} · 31 de outubro de
// 2026" e, no pé, "Toque na foto para entrar" com a linha de 56px.
//
// Entrada: as iniciais vêm de scale .94 e blur 14px em 2200ms (delay
// 300ms); as duas linhas, de translateY 12px e blur 14px em 1300ms
// (delays 1000 e 1700ms). Ao tocar, a camada some em 1.2s e a foto cresce
// para 1.12 em 1.6s; o hero e o fim (500 e 1300ms) são do useAbertura.
// Sem JS (classe sm-js ausente) a camada nem aparece.

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { dataLonga } from "@/lib/rsvp-convite";
import { estiloDaMascara } from "@/lib/site-conteudo";
import type { EstadoDaAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E } from "@/components/site/pecas/useRevelar";
import { FotoDoCartao, type CasalDoSite } from "../comum";

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Abertura({
  casal,
  data,
  foto,
  mascara,
  estado,
  abrir,
  animar,
}: {
  casal: CasalDoSite;
  data: string;
  /** a foto da capa (caminho ou URL pronta) */
  foto: { caminho?: string | null; url?: string | null };
  /** a máscara da capa (0 a 80): a mesma foto, o mesmo escuro do hero */
  mascara: number;
  estado: EstadoDaAbertura;
  abrir: () => void;
  animar: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutNoCliente(() => {
    const el = ref.current;
    if (!el) return;
    const A: Animation[] = [];
    if (animar && typeof el.animate === "function") {
      el.querySelectorAll<HTMLElement>("[data-intro-i]").forEach((x) => {
        const i = Number(x.dataset.introI);
        A.push(
          x.animate(
            [
              { opacity: 0, transform: i === 0 ? "scale(.94)" : "translateY(12px)", filter: "blur(14px)" },
              { opacity: 1, transform: "none", filter: "blur(0)" },
            ],
            { duration: i === 0 ? 2200 : 1300, delay: 300 + i * 700, easing: CURVA_E, fill: "both" }
          )
        );
      });
    }
    el.setAttribute("data-pronto", "");
    return () => A.forEach((a) => a.cancel());
  }, [animar]);

  if (estado === "aberta") return null;
  const tecla = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };
  const quando = dataLonga(data);
  const nomes = [casal.nome1, casal.nome2].filter(Boolean).join(" e ");

  return (
    <div
      ref={ref}
      className="k-abertura"
      data-abrindo={estado === "abrindo" ? "" : undefined}
      role="button"
      tabIndex={0}
      aria-label="Entrar no site"
      onClick={abrir}
      onKeyDown={tecla}
    >
      <div className="k-abertura-foto">
        <FotoDoCartao caminho={foto.caminho} url={foto.url} carregar="eager" />
      </div>
      <div className="k-abertura-veu" style={estiloDaMascara(mascara)} />
      <div className="k-abertura-miolo">
        <div data-intro-i="0" className="k-abertura-iniciais" aria-hidden>
          {casal.i1 && <span>{casal.i1}</span>}
          {casal.dois && <span className="k-abertura-amp">&amp;</span>}
          {casal.i2 && <span>{casal.i2}</span>}
        </div>
        <div data-intro-i="1" className="k-abertura-linha">
          {[nomes, quando].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div data-intro-i="2" className="k-abertura-pe">
        <span className="k-abertura-toque">Toque na foto para entrar</span>
        <span className="k-abertura-fio" />
      </div>
    </div>
  );
}
