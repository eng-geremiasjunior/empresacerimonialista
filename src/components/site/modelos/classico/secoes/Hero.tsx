"use client";

// 3 · Hero (#inicio): 100svh (mínimo 600px), fundo #2a2622, a foto em
// tela cheia sob o véu em gradiente e, no centro, em branco: os nomes na
// forma escolhida, o fio de 72px, a frase do casal, a data, o local e
// "Nossa história ↓".
//
// A foto é a que o casal subiu na capa; sem ela, a capa do evento (que
// vem da equipe); sem nenhuma, o fundo escuro do desenho.
//
// Entrada (pausada até as portas abrirem ou a fonte do nome chegar):
// foto 0→1 até 30% com scale 1.16→1 em 7000ms; nomes em 2400ms com
// delay 900ms; os outros itens em 1400ms com delay 1900 + i×380ms; o fio
// em scaleX 1600ms com delay 1800ms. Antes disso, com JS, tudo começa
// oculto (classe sm-js, ver classico.css); sem JS, aparece direto.

import { useEffect, useRef } from "react";
import { lerCapa } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { dataCurta, Monograma, NomesDoCasal, useUrlDaFoto, type PropsDaSecao } from "../comum";

const ENTRADA: Keyframe[] = [
  { opacity: 0, filter: "blur(18px)", transform: "translateY(14px) scale(1.02)" },
  { opacity: 1, filter: "blur(0)", transform: "none" },
];

export function Hero({
  dados,
  bloco,
  casal,
  heroLiberado,
  animar,
  comHistoria,
}: PropsDaSecao & {
  heroLiberado: boolean;
  animar: boolean;
  /** "Nossa história ↓" só se a história está no site */
  comHistoria: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const capa = lerCapa(bloco.conteudo);
  const resolver = useUrlDaFoto();
  const foto = resolver(capa.foto) || dados.evento.capa_url || null;
  const { evento } = dados;
  const onde = [evento.local, evento.cidade].filter(Boolean).join(" — ");

  useEffect(() => {
    const el = ref.current;
    if (!el || !heroLiberado) return;
    if (!animar || movimentoReduzido() || typeof el.animate !== "function") {
      el.setAttribute("data-pronto", "");
      return;
    }
    const A: Animation[] = [];
    const ph = el.querySelector<HTMLElement>("[data-hero-foto]");
    if (ph)
      A.push(
        ph.animate(
          [
            { opacity: 0, transform: "scale(1.16)" },
            { opacity: 1, offset: 0.3 },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 7000, easing: CURVA_E, fill: "both" }
        )
      );
    el.querySelectorAll<HTMLElement>("[data-hero]").forEach((h) => {
      const i = Number(h.dataset.hero);
      A.push(
        h.animate(ENTRADA, {
          duration: i === 0 ? 2400 : 1400,
          delay: i === 0 ? 900 : 1900 + i * 380,
          easing: CURVA_E,
          fill: "both",
        })
      );
    });
    const ln = el.querySelector<HTMLElement>("[data-hero-linha]");
    if (ln)
      A.push(
        ln.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
          duration: 1600,
          delay: 1800,
          easing: CURVA_E,
          fill: "both",
        })
      );
    // o primeiro quadro (opacidade 0) já vale durante o delay: a classe
    // que segurava o oculto pode sair
    el.setAttribute("data-pronto", "");
    return () => A.forEach((a) => a.cancel());
  }, [heroLiberado, animar]);

  return (
    <section id="inicio" ref={ref} className="c-hero">
      <div className="c-hero-foto" data-hero-foto="">
        {foto && (
          <EspacoDeFoto url={foto} forma="retangulo" proporcao="tela" carregar="eager" className="c-hero-img" />
        )}
      </div>
      <div className="c-hero-veu" />
      <div className="c-hero-miolo">
        <div data-hero="0" className="c-hero-nomes">
          {casal.mostraIniciais && (
            <Monograma
              casal={casal}
              className={`c-nome c-hero-iniciais ${casal.forma === "iniciais" ? "" : "c-hero-iniciais--sm"}`}
              fio={{ altura: ".8em", opacidade: 0.7 }}
            />
          )}
          {casal.mostraNomes ? (
            <h1 className={`c-nome c-hero-h1 ${casal.forma === "nomes" ? "" : "c-hero-h1--sm"}`}>
              <NomesDoCasal casal={casal} />
            </h1>
          ) : (
            <h1 className="c-so-leitor">
              <NomesDoCasal casal={casal} />
            </h1>
          )}
        </div>
        <div data-hero-linha="" className="c-hero-linha" />
        {capa.frase && (
          <p data-hero="1" className="c-hero-frase">
            {capa.frase}
          </p>
        )}
        <div data-hero="2" className="c-hero-quando">
          <span>{dataCurta(evento.data, " · ")}</span>
          {onde && <span className="c-hero-onde">{onde}</span>}
        </div>
        {comHistoria && (
          <a data-hero="3" href="#historia" className="c-hero-seta">
            Nossa história<span aria-hidden>↓</span>
          </a>
        )}
      </div>
    </section>
  );
}
