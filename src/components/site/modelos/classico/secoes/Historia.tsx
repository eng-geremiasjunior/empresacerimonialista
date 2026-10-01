"use client";

// 4 · Nossa história (#historia): a foto do casal 4/5 com parallax
// (−0.07 do deslocamento do centro) ao lado do rótulo, do título e do
// texto dela; embaixo, a linha do tempo dos marcos (ano · ponto · título),
// com o fio de acento crescendo com a rolagem e cada ponto preenchido
// quando passa de 62% da tela.
//
// Sem marcos, fica só o texto de hoje (título e história). A foto é a
// foto do casal da história (foto_casal_path).

import { useRef } from "react";
import { lerHistoria } from "@/lib/site-conteudo";
import { useCena } from "@/components/site/pecas/useCena";
import { Quadro, type PropsDaSecao } from "../comum";

export function temHistoria(p: Pick<PropsDaSecao, "dados" | "bloco">): boolean {
  const s = p.dados.site;
  return !!(s?.historia || s?.historia_titulo || lerHistoria(p.bloco.conteudo).marcos.length);
}

export function Historia({ dados, bloco, ancora, modo, fotoCasalUrl }: PropsDaSecao & { fotoCasalUrl: string | null }) {
  const site = dados.site;
  const marcos = lerHistoria(bloco.conteudo).marcos;
  const casca = useRef<HTMLDivElement>(null);
  const camada = useRef<HTMLDivElement>(null);
  const linhaDoTempo = useRef<HTMLDivElement>(null);
  const fio = useRef<HTMLDivElement>(null);

  useCena(casca, ({ rect, vh, final }) => {
    const el = camada.current;
    if (!el) return;
    el.style.transform = final ? "" : `translate3d(0,${(rect.top + rect.height / 2 - vh / 2) * -0.07}px,0)`;
  });

  useCena(
    linhaDoTempo,
    ({ rect, vh, final }) => {
      const tl = linhaDoTempo.current;
      if (!tl) return;
      const corte = vh * 0.62;
      const p = final ? 1 : Math.min(1, Math.max(0, (corte - rect.top) / rect.height));
      if (fio.current) fio.current.style.transform = `scaleY(${p})`;
      tl.querySelectorAll<HTMLElement>("[data-tl-ponto]").forEach((d) => {
        const on = final || d.getBoundingClientRect().top < corte;
        if (on !== d.hasAttribute("data-on")) d.toggleAttribute("data-on", on);
      });
    },
    // o protótipo segue a rolagem mesmo com reduced-motion: não é animação
    { reduzido: "segue", ligado: marcos.length > 0 }
  );

  return (
    <section id={ancora} className="c-secao c-historia">
      <div className="c-historia-grade">
        {(fotoCasalUrl || modo === "previa") && (
          <div ref={casca} className="c-historia-foto">
            <Quadro url={fotoCasalUrl} proporcao="4/5" parallax={{ ref: camada }} />
          </div>
        )}
        <div className="c-historia-texto">
          <div data-revelar="up" className="c-eyebrow">
            Nossa história
          </div>
          {site?.historia_titulo && (
            <h2 data-revelar="up" data-atraso="120" className="c-h2 c-h2--balance">
              {site.historia_titulo}
            </h2>
          )}
          {site?.historia && (
            <p data-revelar="up" data-atraso="240" className="c-historia-p">
              {site.historia}
            </p>
          )}
        </div>
      </div>

      {marcos.length > 0 && (
        <div ref={linhaDoTempo} className="c-tl">
          <div className="c-tl-fundo" />
          <div ref={fio} className="c-tl-fio" />
          {marcos.map((m, i) => (
            <div key={i} data-revelar="up" className="c-tl-marco">
              <div className="c-tl-ano">{m.ano}</div>
              <div className="c-tl-meio">
                <span data-tl-ponto="" className="c-tl-ponto" />
              </div>
              <div className="c-tl-titulo">{m.titulo || m.texto}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
