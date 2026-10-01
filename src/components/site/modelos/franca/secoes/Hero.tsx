"use client";

// 3 · Capa (#inicio): 100svh (mínimo 620px) no fundo dark, a foto em tela
// cheia sob o véu (rgba(20,27,44,.3) → 0 aos 30% → .15 aos 55% → .78),
// as duas molduras de ouro e, embaixo, "Bienvenue ao nosso casamento",
// os nomes na forma escolhida, o ornamento, a data e o local.
//
// A foto é a que o casal subiu na capa; sem ela, a capa do evento (que
// vem da equipe); sem nenhuma, o fundo escuro com as molduras. O vídeo do
// desenho (Torre Eiffel) fica para depois: não há arquivo licenciado.
// A frase da capa, quando a noiva escreve, entra embaixo do local.
//
// Entrada (pausada até o envelope abrir ou a fonte do nome chegar): a
// foto 0→1 até 35% com scale 1.14→1 em 5000ms; as molduras de 1.03 em
// 1800ms (delays 600/800ms); os itens sobem 18px e desfocam 10px, em
// 2000ms nos nomes e 1300ms nos outros, com delays 700/1000/1700/1950ms.
// Parallax da foto: scrollY × .3 enquanto a rolagem não passa de 1.3 tela.

import { useEffect, useRef, type ReactNode } from "react";
import { lerCapa } from "@/lib/site-conteudo";
import { dataLonga } from "@/lib/rsvp-convite";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useCena } from "@/components/site/pecas/useCena";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { IniciaisDoCasal, NomesDoCasal, Ornamento, useUrlDaFoto, type PropsDaSecao } from "../comum";

const ATRASOS = [700, 1000, 1700, 1950];

export function Hero({
  dados,
  bloco,
  casal,
  heroLiberado,
  animar,
  children,
}: PropsDaSecao & {
  heroLiberado: boolean;
  animar: boolean;
  /** o que o T06 põe embaixo do local (a pílula do som) */
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const camada = useRef<HTMLDivElement>(null);
  const capa = lerCapa(bloco.conteudo);
  const resolver = useUrlDaFoto();
  const foto = resolver(capa.foto) || dados.evento.capa_url || null;
  const { evento } = dados;
  const onde = [evento.local, evento.cidade].filter(Boolean).join(", ");

  useCena(ref, ({ rect, vh, final }) => {
    const el = camada.current;
    if (!el) return;
    const y = -rect.top;
    if (final || y < 0) el.style.transform = "";
    else if (y < vh * 1.3) el.style.transform = `translate3d(0,${(y * 0.3).toFixed(1)}px,0)`;
  });

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
            { opacity: 0, transform: "scale(1.14)" },
            { opacity: 1, offset: 0.35 },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 5000, easing: CURVA_E, fill: "both" }
        )
      );
    el.querySelectorAll<HTMLElement>("[data-moldura]").forEach((m, i) =>
      A.push(
        m.animate(
          [
            { opacity: 0, transform: "scale(1.03)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 1800, delay: 600 + i * 200, easing: CURVA_E, fill: "both" }
        )
      )
    );
    el.querySelectorAll<HTMLElement>("[data-hero]").forEach((h) => {
      const i = Number(h.dataset.hero);
      A.push(
        h.animate(
          [
            { opacity: 0, transform: "translateY(18px)", filter: "blur(10px)" },
            { opacity: 1, transform: "none", filter: "blur(0)" },
          ],
          { duration: i === 1 ? 2000 : 1300, delay: ATRASOS[i] ?? 0, easing: CURVA_E, fill: "both" }
        )
      );
    });
    // o primeiro quadro já vale durante o delay: a classe que segurava o
    // oculto pode sair
    el.setAttribute("data-pronto", "");
    return () => A.forEach((a) => a.cancel());
  }, [heroLiberado, animar]);

  return (
    <section id="inicio" ref={ref} className="f-hero">
      <div className="f-hero-foto" data-hero-foto="">
        <div className="f-hero-par" ref={camada}>
          {foto && <EspacoDeFoto url={foto} forma="retangulo" proporcao="tela" carregar="eager" />}
        </div>
      </div>
      <div className="f-hero-veu" />
      <div className="f-hero-moldura f-hero-moldura--1" data-moldura="" />
      <div className="f-hero-moldura f-hero-moldura--2" data-moldura="" />
      <div className="f-hero-miolo">
        <div data-hero="0" className="f-hero-rotulo">
          Bienvenue ao nosso casamento
        </div>
        {casal.forma === "nomes" && (
          <h1 data-hero="1" className="f-nome f-hero-h1">
            <NomesDoCasal casal={casal} />
          </h1>
        )}
        {casal.forma === "iniciais" && (
          <div data-hero="1" className="f-hero-inic">
            <span aria-hidden>
              <IniciaisDoCasal casal={casal} />
            </span>
            <h1 className="f-so-leitor">
              <NomesDoCasal casal={casal} />
            </h1>
          </div>
        )}
        {casal.forma === "iniciais-nomes" && (
          <div data-hero="1" className="f-hero-ambos">
            <span className="f-hero-inic f-hero-inic--sm" aria-hidden>
              <IniciaisDoCasal casal={casal} />
            </span>
            <h1 className="f-nome f-hero-nomes-sm">
              <NomesDoCasal casal={casal} />
            </h1>
          </div>
        )}
        <Ornamento className="f-orn--hero" data-hero="2" />
        <div data-hero="3" className="f-hero-quando">
          <span className="f-hero-data">{dataLonga(evento.data)}</span>
          {onde && <span className="f-hero-onde">{onde}</span>}
          {capa.frase && <span className="f-hero-frase">{capa.frase}</span>}
        </div>
        {children && <div className="f-hero-extra">{children}</div>}
      </div>
    </section>
  );
}
