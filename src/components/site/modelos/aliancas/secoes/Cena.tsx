"use client";

// 4 · A cena das alianças (#sim), fundo escuro, 320vh com o miolo
// sticky de 100vh: as alianças (min(720px,94vw), 2/1) se aproximam com a
// rolagem e as 3 frases se revezam — "Duas histórias," → "um encontro," →
// "um sim." —, e no fim aparece a data por extenso.
//
// No laço único (useCena), só pela rolagem:
//   p = −top/(altura−vh); e = clamp((p−.05)/.6); sep = 1 − e²(3−2e)
//   (as alianças seguem com lerp .12 por quadro);
//   frase i: centro c = .12 + i×.27, opacidade 1 − |p−c|/.13 (a última
//   fica em 1 depois do centro), anda (c−p)×60px e desfoca (1−o)×6px;
//   a data: opacidade clamp((p−.78)/.12).
// Frase com opacidade 0 leva visibility:hidden e filter:none.
//
// Prévia da família: o quadro final, numa tela só (alianças encaixadas,
// "um sim." e a data). Revisão do dono e reduced-motion: as 3 frases em
// lista, as alianças encaixadas e a data — o que no público fica atrás
// da rolagem aparece todo de uma vez.

import { useRef } from "react";
import { dataLonga } from "@/lib/rsvp-convite";
import { useCena } from "@/components/site/pecas/useCena";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { Aliancas } from "../Aliancas";

const FRASES = ["Duas histórias,", "um encontro,", "um sim."];

const limitar = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function Cena({ data, modo }: { data: string; modo: ModoDoSite }) {
  const secao = useRef<HTMLElement>(null);
  const frases = useRef<(HTMLDivElement | null)[]>([]);
  const dataEl = useRef<HTMLDivElement>(null);
  const sep = useRef(1);
  const ultimo = useRef(-1);

  useCena(secao, ({ progresso: p, final }) => {
    // sem a classe sm-js (o JS demorou e o ScriptRevelar desistiu) o CSS
    // desenha a cena parada, em lista: nada de estilo por cima
    if (final || !document.documentElement.classList.contains("sm-js")) {
      // o CSS de cada modo desenha o fim; aqui só se limpa
      sep.current = 0;
      frases.current.forEach((el) => el?.removeAttribute("style"));
      dataEl.current?.removeAttribute("style");
      return;
    }
    // o laço chama a cada quadro enquanto as alianças giram: só escreve
    // quando a rolagem mudou
    if (Math.abs(p - ultimo.current) < 0.0002) return;
    ultimo.current = p;
    const e = limitar((p - 0.05) / 0.6);
    sep.current = 1 - e * e * (3 - 2 * e);
    frases.current.forEach((el, i) => {
      if (!el) return;
      const c = 0.12 + i * 0.27;
      let o = 1 - Math.abs(p - c) / 0.13;
      if (i === FRASES.length - 1 && p > c) o = 1;
      o = limitar(o);
      const s = el.style;
      s.opacity = String(o);
      s.visibility = o > 0 ? "visible" : "hidden";
      s.transform = `translateY(${((c - p) * 60).toFixed(1)}px)`;
      s.filter = o > 0 && o < 1 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : "none";
    });
    const d = dataEl.current;
    if (d) {
      const o = limitar((p - 0.78) / 0.12);
      d.style.opacity = String(o);
      d.style.visibility = o > 0 ? "visible" : "hidden";
    }
  });

  const longa = dataLonga(data);

  return (
    <section id="sim" ref={secao} className="a-cena" data-modo={modo}>
      <div className="a-cena-sticky">
        <div className="a-cena-aneis">
          <Aliancas
            inicio={modo === "publico" ? 1 : 0}
            lerp={0.12}
            alvo={(final) => (final || !document.documentElement.classList.contains("sm-js") ? 0 : sep.current)}
          />
        </div>
        <div className="a-cena-frases">
          {FRASES.map((f, i) => (
            <div
              key={f}
              ref={(el) => {
                frases.current[i] = el;
              }}
              data-ph={i}
              className="a-cena-frase"
            >
              {f}
            </div>
          ))}
        </div>
        {longa && (
          <div ref={dataEl} className="a-cena-data">
            {longa}
          </div>
        )}
      </div>
    </section>
  );
}
