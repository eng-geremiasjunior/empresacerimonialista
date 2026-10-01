"use client";

// 5 · Nossa história (#historia), rolagem horizontal em sticky: a coluna
// de abertura ("Nossa história", o título e o texto da noiva, "Continue
// rolando"), um polaroid por marco (ano + título, girados −3/2.5/−1.5/3deg
// e deslocados −10/24/−20/12px, na ordem) e "E o resto, a gente escreve
// juntos.".
//
// A altura da seção é scrollWidth − largura + vh (medida pelo
// ResizeObserver, fora do laço) e a trilha anda translate3d(−p×dist) no
// laço único (useCena). A foto do polaroid se revela como papel
// fotográfico ("dev": sepia(.9) blur(10px) brightness(1.25), opacidade
// .2 e scale 1.08 → normal, 2400ms E) quando ENTRA PELA DIREITA — o
// protótipo só olhava a vertical e revelava os 4 de uma vez. A posição de
// cada um sai da conta (offsetLeft − p×dist), sem medir no quadro.
//
// Sem marcos, não há o que rolar de lado: a abertura fica sozinha, sem
// sticky. Texto da história mais alto que a tela (aceita até 4000
// caracteres): o sticky cortaria o começo e o fim sem deixar ler, então a
// seção cai no layout em grade, no fluxo, como na prévia. Prévia, revisão e reduced-motion: os polaroids em grade, sem
// sticky e com as fotos reveladas (a revisão vê todos de uma vez).
// Polaroid sem foto fica só com o título e o ano.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { lerHistoria } from "@/lib/site-conteudo";
import { useCena } from "@/components/site/pecas/useCena";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useUrlDaFoto, type PropsDaSecao } from "../comum";

const GIROS = ["-3deg", "2.5deg", "-1.5deg", "3deg"];
const DESVIOS = ["-10px", "24px", "-20px", "12px"];

const REVELACAO: Keyframe[] = [
  { filter: "sepia(.9) blur(10px) brightness(1.25)", opacity: 0.2, transform: "scale(1.08)" },
  { filter: "sepia(0) blur(0) brightness(1)", opacity: 1, transform: "scale(1)" },
];

export function temHistoria(p: Pick<PropsDaSecao, "dados" | "bloco">): boolean {
  const s = p.dados.site;
  return !!(s?.historia || s?.historia_titulo || lerHistoria(p.bloco.conteudo).marcos.length);
}

export function Historia({ dados, bloco, ancora, modo }: PropsDaSecao) {
  const site = dados.site;
  const marcos = lerHistoria(bloco.conteudo).marcos;
  const resolver = useUrlDaFoto();
  const temMarcos = marcos.length > 0;
  // a abertura não cabe na altura da tela: sem sticky
  const [longa, setLonga] = useState(false);
  const rolar = temMarcos && !longa;

  const secao = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const trilha = useRef<HTMLDivElement>(null);
  const abertura = useRef<HTMLDivElement>(null);
  // mede a altura da tela do sticky (100 × --sm-vh) em qualquer layout
  const regua = useRef<HTMLDivElement>(null);
  const medidas = useRef({ dist: 0, largura: 0, posicoes: [] as number[] });
  const ultimo = useRef(-1);
  // as fotos ainda por revelar (só no público, com animação)
  const pendentes = useRef<Set<HTMLElement> | null>(null);
  const animacoes = useRef<Animation[]>([]);

  // a altura da seção e a posição de cada foto, quando o tamanho muda
  useEffect(() => {
    const s = secao.current;
    const st = sticky.current;
    const tr = trilha.current;
    const ab = abertura.current;
    const rg = regua.current;
    // o sticky só existe com a classe sm-js (ver aliancas.css)
    if (!s || !st || !tr || !ab || !rg || !temMarcos || modo !== "publico" || !document.documentElement.classList.contains("sm-js")) return;
    const medir = () => {
      // a largura da abertura é fixa, então a altura dela não depende do
      // layout: a decisão não oscila
      const naoCabe = ab.offsetHeight > rg.offsetHeight * 0.9;
      setLonga(naoCabe);
      if (naoCabe) {
        s.style.height = "";
        tr.style.transform = "";
        medidas.current = { dist: 0, largura: 0, posicoes: [] };
        return;
      }
      const largura = st.clientWidth;
      const dist = Math.max(0, tr.scrollWidth - largura);
      const fotos = Array.from(tr.querySelectorAll<HTMLElement>("[data-dev]"));
      medidas.current = {
        dist,
        largura,
        posicoes: fotos.map((f) => {
          let x = 0;
          for (let n: HTMLElement | null = f; n && n !== tr; n = n.offsetParent as HTMLElement | null) x += n.offsetLeft;
          return x;
        }),
      };
      const quer = dist + st.clientHeight;
      if (Math.abs(s.offsetHeight - quer) > 2) s.style.height = `${quer}px`;
      ultimo.current = -1;
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(tr);
    ro.observe(st);
    ro.observe(ab);
    ro.observe(rg);
    return () => {
      ro.disconnect();
      s.style.height = "";
      tr.style.transform = "";
    };
  }, [temMarcos, modo]);

  // quem revela por animação; fora disso, tudo à mostra
  useEffect(() => {
    const tr = trilha.current;
    if (!tr) return;
    const fotos = Array.from(tr.querySelectorAll<HTMLElement>("[data-dev]"));
    const anima =
      rolar &&
      modo === "publico" &&
      !movimentoReduzido() &&
      document.documentElement.classList.contains("sm-js") &&
      typeof tr.animate === "function";
    if (!anima) {
      fotos.forEach((f) => f.setAttribute("data-revelado", ""));
      pendentes.current = null;
      return;
    }
    pendentes.current = new Set(fotos);
    const A = animacoes.current;
    return () => {
      A.forEach((a) => a.cancel());
      animacoes.current = [];
    };
  }, [modo, marcos.length, rolar]);

  useCena(
    secao,
    ({ progresso: p, rect, vh, final }) => {
      const tr = trilha.current;
      if (!tr || final || !medidas.current.largura) return;
      const { dist, largura, posicoes } = medidas.current;
      const x = p * dist;
      // o laço chama a cada quadro enquanto algo gira na tela: só escreve
      // quando a rolagem mudou
      if (Math.abs(p - ultimo.current) >= 0.0002) {
        ultimo.current = p;
        tr.style.transform = `translate3d(${(-x).toFixed(1)}px,0,0)`;
      }

      const pend = pendentes.current;
      if (!pend || !pend.size || rect.top >= vh * 0.95) return;
      const fotos = tr.querySelectorAll<HTMLElement>("[data-dev]");
      fotos.forEach((f, i) => {
        if (!pend.has(f)) return;
        if ((posicoes[i] ?? 0) - x >= largura * 0.95) return;
        pend.delete(f);
        f.setAttribute("data-revelado", "");
        const z = f.querySelector<HTMLElement>("[data-zoom]");
        if (!z) return;
        const a = z.animate(REVELACAO, { duration: 2400, easing: CURVA_E, fill: "both" });
        animacoes.current.push(a);
        a.onfinish = () => a.cancel();
      });
    },
    { ligado: rolar, reduzido: "final" }
  );

  return (
    <section
      id={ancora}
      ref={secao}
      className={`a-hs ${temMarcos ? "" : "a-hs--so"} ${longa ? "a-hs--longa" : ""}`}
      data-modo={modo}
    >
      <div ref={regua} className="a-hs-regua" aria-hidden />
      <div ref={sticky} className="a-hs-sticky">
        <div ref={trilha} className="a-hs-trilha">
          <div ref={abertura} className="a-hs-abertura">
            <div className="a-eyebrow">Nossa história</div>
            {site?.historia_titulo && <h2 className="a-h2 a-h2--balance">{site.historia_titulo}</h2>}
            {site?.historia && <p className="a-hs-p">{site.historia}</p>}
            {rolar && (
              <div className="a-hs-continue">
                Continue rolando
                <span aria-hidden />
              </div>
            )}
          </div>
          {marcos.map((m, i) => {
            const url = resolver(m.foto);
            const comFoto = !!url || modo === "previa";
            return (
              <div
                key={i}
                className="a-polaroid"
                style={{ "--a-giro": GIROS[i % 4], "--a-desvio": DESVIOS[i % 4] } as CSSProperties}
              >
                {comFoto && (
                  <div data-dev="" className="a-polaroid-foto">
                    <div data-zoom="" className="a-polaroid-zoom">
                      <EspacoDeFoto url={url} forma="retangulo" proporcao="tela" />
                    </div>
                  </div>
                )}
                <div className="a-polaroid-legenda">
                  <span className="a-polaroid-titulo">{m.titulo || m.texto}</span>
                  {m.ano && <span className="a-polaroid-ano">{m.ano}</span>}
                </div>
              </div>
            );
          })}
          {temMarcos && <div className="a-hs-fim">E o resto, a gente escreve juntos.</div>}
        </div>
      </div>
    </section>
  );
}
