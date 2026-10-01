"use client";

// 3 · Hero (#inicio), 100svh com o pó dourado: o rótulo em accent, a foto
// em ARCO (3/4, altura min(48vh,100vw)) com o contorno em arco a −12px, os
// nomes com as alianças no lugar do "&" (nas 3 formas), a data
// "31 · 10 · 2026", "Villa Toscana — São Paulo" e "Role devagar" com a
// linha que pulsa.
//
// O rótulo é a frase da capa quando a noiva escreve uma; sem ela, a do
// desenho. A foto é a que o casal subiu na capa; sem ela, a capa do
// evento; sem nenhuma, o arco some no público (na prévia, o espaço vazio).
//
// Entrada (pausada até a abertura sair ou a fonte do nome chegar): a foto
// sobe com clip-path inset(100%)→0 em 1800ms cubic-bezier(.77,0,.18,1) e
// a camada interna sai de 1.3 em 4200ms E; o contorno vai a .55 subindo
// 20px (1800ms, 900ms de atraso); os itens entram com blur 14px e 16px,
// atrasos 300/1100/1900/2400ms e 1300ms (2200ms nos nomes). A linha do
// "Role devagar" cresce de cima e some por baixo em 2400ms, sem fim, a
// partir dos 2800ms.

import { useEffect, useRef } from "react";
import { lerCapa } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { Aliancas } from "../Aliancas";
import { dataCurta, NomesDoCasal, useUrlDaFoto, type CasalDoSite, type PropsDaSecao } from "../comum";
import { Po } from "./Po";

const ENTRADA: Keyframe[] = [
  { opacity: 0, filter: "blur(14px)", transform: "translateY(16px)" },
  { opacity: 1, filter: "blur(0)", transform: "none" },
];
const ATRASOS = [300, 1100, 1900, 2400];
const ROTULO_DO_DESENHO = "Com todo o amor, convidamos você para o nosso casamento";

/** As alianças compactas, encaixadas, no lugar do "&". */
export function AneisNoLugarDoE({ className }: { className: string }) {
  return (
    <span className={className} aria-hidden>
      <Aliancas compacta brilho={false} faiscas={false} inicio={0} alvo={() => 0} />
    </span>
  );
}

function NomesDoHero({ casal }: { casal: CasalDoSite }) {
  const leitor = [casal.nome1, casal.nome2].filter(Boolean).join(" e ");
  const iniciais = (classe: string) => (
    <div className={`a-nome a-hero-iniciais ${classe}`} aria-hidden>
      {casal.i1 && <span>{casal.i1}</span>}
      {casal.dois && <AneisNoLugarDoE className="a-hero-aneis-i" />}
      {casal.i2 && <span>{casal.i2}</span>}
    </div>
  );

  if (casal.forma === "nomes") {
    return (
      <h1 className="a-nome a-hero-h1">
        {casal.nome1 && <span>{casal.nome1}</span>}
        {casal.dois && (
          <>
            <AneisNoLugarDoE className="a-hero-aneis" />
            <span className="a-so-leitor"> e </span>
          </>
        )}
        {casal.nome2 && <span>{casal.nome2}</span>}
      </h1>
    );
  }
  return (
    <>
      <h1 className="a-so-leitor">{leitor}</h1>
      {iniciais(casal.forma === "iniciais" ? "" : "a-hero-iniciais--sm")}
      {casal.forma === "iniciais-nomes" && (
        <div className="a-nome a-hero-nomes-xs" aria-hidden>
          <NomesDoCasal casal={casal} />
        </div>
      )}
    </>
  );
}

export function Hero({
  dados,
  bloco,
  casal,
  heroLiberado,
  animar,
  comCena,
}: PropsDaSecao & {
  heroLiberado: boolean;
  animar: boolean;
  /** "Role devagar" leva à cena das alianças (sem data, ela não existe) */
  comCena: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const { modo } = useModoDoSite();
  const capa = lerCapa(bloco.conteudo);
  const resolver = useUrlDaFoto();
  const foto = resolver(capa.foto) || dados.evento.capa_url || null;
  const { evento } = dados;
  const onde = [evento.local, evento.cidade].filter(Boolean).join(" — ");
  const comArco = !!foto || modo === "previa";

  useEffect(() => {
    const el = ref.current;
    if (!el || !heroLiberado) return;
    if (!animar || movimentoReduzido() || typeof el.animate !== "function") {
      el.setAttribute("data-pronto", "");
      return;
    }
    const A: Animation[] = [];
    const q = (s: string) => el.querySelector<HTMLElement>(s);
    const ph = q("[data-hero-foto]");
    const z = q("[data-hero-zoom]");
    const ln = q("[data-hero-linha]");
    const cue = q("[data-cue]");
    if (ph)
      A.push(
        ph.animate([{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }], {
          duration: 1800,
          easing: "cubic-bezier(.77,0,.18,1)",
          fill: "both",
        })
      );
    if (z)
      A.push(z.animate([{ transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 4200, easing: CURVA_E, fill: "both" }));
    if (ln)
      A.push(
        ln.animate([{ opacity: 0, transform: "translateY(20px)" }, { opacity: 0.55, transform: "none" }], {
          duration: 1800,
          delay: 900,
          easing: CURVA_E,
          fill: "both",
        })
      );
    el.querySelectorAll<HTMLElement>("[data-hero]").forEach((h) => {
      const i = Number(h.dataset.hero);
      A.push(h.animate(ENTRADA, { duration: i === 1 ? 2200 : 1300, delay: ATRASOS[i] ?? 0, easing: CURVA_E, fill: "both" }));
    });
    if (cue)
      A.push(
        cue.animate(
          [
            { transform: "scaleY(0)", transformOrigin: "top" },
            { transform: "scaleY(1)", transformOrigin: "top", offset: 0.5 },
            { transform: "scaleY(1)", transformOrigin: "bottom", offset: 0.51 },
            { transform: "scaleY(0)", transformOrigin: "bottom" },
          ],
          { duration: 2400, delay: 2800, iterations: Infinity, easing: "ease-in-out" }
        )
      );
    // o primeiro quadro (opacidade 0) já vale durante o atraso: a classe
    // que segurava o oculto pode sair
    el.setAttribute("data-pronto", "");
    return () => A.forEach((a) => a.cancel());
  }, [heroLiberado, animar]);

  return (
    <section id="inicio" ref={ref} className="a-hero">
      <Po />
      <div data-hero="0" className="a-hero-rotulo">
        {capa.frase || ROTULO_DO_DESENHO}
      </div>
      {comArco && (
        <div className="a-hero-arco">
          <div data-hero-linha="" className="a-hero-contorno" />
          <div data-hero-foto="" className="a-hero-foto">
            <div data-hero-zoom="" className="a-hero-zoom">
              <EspacoDeFoto url={foto} forma="arco" proporcao="tela" carregar="eager" className="a-hero-img" />
            </div>
          </div>
        </div>
      )}
      <div data-hero="1" className="a-hero-nomes">
        <NomesDoHero casal={casal} />
      </div>
      <div data-hero="2" className="a-hero-quando">
        <span className="a-hero-data">{dataCurta(evento.data, " · ")}</span>
        {onde && <span className="a-hero-onde">{onde}</span>}
      </div>
      {comCena && (
        <a data-hero="3" href="#sim" className="a-hero-role">
          Role devagar
          <span data-cue="" className="a-hero-cue" aria-hidden />
        </a>
      )}
    </section>
  );
}
