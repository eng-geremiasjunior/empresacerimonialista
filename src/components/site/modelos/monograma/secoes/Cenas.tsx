"use client";

// "Nossos momentos" (bloco "cenas", só do T04): uma seção alta com o
// cartão preso (top 136px, altura calc(100svh − 156px), mínimo 420px,
// raio 32, fundo #1a1f1b). As fotos ficam empilhadas e cada nova sobe
// cobrindo a anterior; as frases trocam no centro; no topo "Nossos
// momentos  01 / 05" e, embaixo, uma barra de 3px por cena.
//
// O desenho tem 5 cenas em 520vh; a noiva põe de 3 a 8, e a altura acompanha
// (100vh por cena + 20vh, o mesmo curso por cena do desenho).
//
//   L = clamp((136 − top) / (altura − alturaDoCartão)) × n      (0 → n)
//   camada i>0: er = smoothstep(clamp((L − (i − .35)) / .35)),
//               clip-path inset((1 − er)×100% 0 0 0), hidden com er ≤ 0;
//               imagem scale(1.1 − .1·er + .06·clamp(L − i))
//   frase i:    c = i + .3; o = clamp(1 − |L − c| / .34) (a 1ª fica antes
//               do centro e a última depois), translateY((c − L)×40px),
//               blur((1 − o)×8px) só com 0<o<1; hidden e filter none em 0
//   barras:     scaleX(clamp(L − i));  contador: min(n, floor(L + .35) + 1)
//
// Reduced-motion: as fotos e as frases continuam trocando com a rolagem
// (é posição, não animação), sem zoom, sem deslize e sem desfoque.
// Prévia: o quadro final, sem prender. Revisão: as cenas espalhadas, uma
// embaixo da outra, cada frase sobre a foto dela.
//
// No público, foto que falta some (a cena fica com a foto anterior ou o
// fundo escuro) e cena sem frase nem foto não entra.

import { useEffect, useRef, type CSSProperties } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { lerCenas, type Cena } from "@/lib/site-conteudo";
import { useCena } from "@/components/site/pecas/useCena";
import { FotoDoCartao, useUrlDaFoto, type PropsDaSecao } from "@/components/site/modelos/cartoes/comum";

/** As cenas que aparecem: com frase, ou com foto (a vaga só na prévia). */
export function cenasDoSite(
  conteudo: unknown,
  modo: ModoDoSite,
  resolver: (caminho: string) => string | null
): Cena[] {
  return lerCenas(conteudo).itens.filter((c) => !!c.frase || (!!c.foto && (modo === "previa" || !!resolver(c.foto))));
}

const TOPO = 136;
const limitar = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (x: number) => x * x * (3 - 2 * x);
const dois = (x: number) => String(x).padStart(2, "0");

type Quadro = {
  camadas: { clip: string; visivel: boolean; escala: string }[];
  frases: { opacidade: number; desloca: string; filtro: string }[];
  barras: string[];
  contador: string;
};

/** O quadro da cena para um L de 0 a n (o mesmo no SSR e no laço). */
function quadroDe(L: number, n: number, reduzido: boolean): Quadro {
  const camadas = Array.from({ length: n }, (_, i) => {
    const er = i === 0 ? 1 : suave(limitar((L - (i - 0.35)) / 0.35));
    return {
      clip: i === 0 ? "none" : `inset(${((1 - er) * 100).toFixed(2)}% 0 0 0)`,
      visivel: i === 0 || er > 0,
      escala: reduzido ? "none" : `scale(${(1.1 - 0.1 * er + 0.06 * limitar(L - i)).toFixed(4)})`,
    };
  });
  const frases = Array.from({ length: n }, (_, i) => {
    const c = i + 0.3;
    let o = limitar(1 - Math.abs(L - c) / 0.34);
    if ((i === 0 && L < c) || (i === n - 1 && L > c)) o = 1;
    return {
      opacidade: o,
      desloca: reduzido ? "none" : `translateY(${((c - L) * 40).toFixed(1)}px)`,
      filtro: !reduzido && o > 0 && o < 1 ? `blur(${((1 - o) * 8).toFixed(2)}px)` : "none",
    };
  });
  const barras = Array.from({ length: n }, (_, i) => `scaleX(${limitar(L - i).toFixed(3)})`);
  return { camadas, frases, barras, contador: dois(Math.min(n, Math.floor(L + 0.35) + 1)) };
}

export function Cenas({ bloco, modo }: PropsDaSecao) {
  const resolver = useUrlDaFoto();
  const itens = cenasDoSite(bloco.conteudo, modo, (c) => resolver(c));
  const n = itens.length;

  if (n === 0) return null;
  if (modo === "revisao") return <CenasEspalhadas itens={itens} />;
  return <CenasPresas itens={itens} final={modo !== "publico"} />;
}

function CenasPresas({ itens, final }: { itens: Cena[]; final: boolean }) {
  const n = itens.length;
  const secao = useRef<HTMLElement>(null);
  const cartao = useRef<HTMLDivElement>(null);
  const camadas = useRef<(HTMLDivElement | null)[]>([]);
  const imagens = useRef<(HTMLDivElement | null)[]>([]);
  const frases = useRef<(HTMLDivElement | null)[]>([]);
  const barras = useRef<(HTMLDivElement | null)[]>([]);
  const contador = useRef<HTMLSpanElement>(null);
  // a altura do cartão preso, medida fora do laço (ler no meio das
  // escritas forçaria layout a cada quadro)
  const alturaDoCartao = useRef(0);

  const acordar = useCena(
    secao,
    ({ rect, final: noFim, reduzido }) => {
      const L = noFim ? n : limitar((TOPO - rect.top) / Math.max(1, rect.height - alturaDoCartao.current)) * n;
      const q = quadroDe(L, n, reduzido);
      q.camadas.forEach((c, i) => {
        const el = camadas.current[i];
        if (el && i > 0) {
          el.style.clipPath = c.clip;
          el.style.visibility = c.visivel ? "visible" : "hidden";
        }
        const im = imagens.current[i];
        if (im) im.style.transform = c.escala;
      });
      q.frases.forEach((f, i) => {
        const el = frases.current[i];
        if (!el) return;
        el.style.visibility = f.opacidade <= 0 ? "hidden" : "visible";
        el.style.opacity = f.opacidade.toFixed(3);
        el.style.transform = f.desloca;
        el.style.filter = f.filtro;
      });
      q.barras.forEach((b, i) => {
        const el = barras.current[i];
        if (el) el.style.transform = b;
      });
      if (contador.current && contador.current.textContent !== q.contador) contador.current.textContent = q.contador;
    },
    { reduzido: "segue", ligado: !final }
  );

  useEffect(() => {
    const el = cartao.current;
    if (!el || final) return;
    alturaDoCartao.current = el.offsetHeight;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      alturaDoCartao.current = el.offsetHeight;
      acordar();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [final, acordar]);

  // o primeiro quadro já no HTML: o começo no público, o fim na prévia
  const q = quadroDe(final ? n : 0, n, false);

  return (
    <section
      ref={secao}
      aria-label="Nossos momentos"
      className={`m-cenas ${final ? "m-cenas--final" : ""}`}
      style={{ "--m-cenas-n": n } as CSSProperties}
    >
      <div ref={cartao} className="m-cenas-quadro">
        {itens.map((c, i) => (
          <div
            key={i}
            ref={(el) => {
              camadas.current[i] = el;
            }}
            className="m-cenas-camada"
            style={i > 0 ? { clipPath: q.camadas[i].clip, visibility: q.camadas[i].visivel ? "visible" : "hidden" } : undefined}
          >
            <div
              ref={(el) => {
                imagens.current[i] = el;
              }}
              className="m-cenas-img"
              style={{ transform: q.camadas[i].escala }}
            >
              <FotoDoCartao caminho={c.foto} />
            </div>
          </div>
        ))}
        <div className="m-cenas-veu" />
        {itens.map((c, i) => (
          <div
            key={i}
            ref={(el) => {
              frases.current[i] = el;
            }}
            className="m-cenas-frase-caixa"
            aria-hidden
            style={{
              opacity: q.frases[i].opacidade,
              visibility: q.frases[i].opacidade <= 0 ? "hidden" : "visible",
              transform: q.frases[i].desloca,
              filter: q.frases[i].filtro,
            }}
          >
            {c.frase && <p className="m-cenas-frase">{c.frase}</p>}
          </div>
        ))}
        <div className="m-cenas-topo" aria-hidden>
          <span>Nossos momentos</span>
          <span>
            <span ref={contador}>{q.contador}</span> / {dois(n)}
          </span>
        </div>
        <div className="m-cenas-barras" aria-hidden>
          {itens.map((_, i) => (
            <div key={i} className="m-cenas-barra">
              <div
                ref={(el) => {
                  barras.current[i] = el;
                }}
                className="m-cenas-barra-cheia"
                style={{ transform: q.barras[i] }}
              />
            </div>
          ))}
        </div>
        {/* quem lê a tela ouve as frases todas, na ordem */}
        {itens.some((c) => !!c.frase) && (
          <ol className="k-so-leitor">
            {itens.map((c, i) => (c.frase ? <li key={i}>{c.frase}</li> : null))}
          </ol>
        )}
      </div>
    </section>
  );
}

/** Revisão: cada cena num quadro parado, a frase sobre a foto dela. */
function CenasEspalhadas({ itens }: { itens: Cena[] }) {
  const n = itens.length;
  return (
    <section aria-label="Nossos momentos" className="m-cenas-lista">
      {itens.map((c, i) => (
        <div key={i} className="m-cenas-quadro">
          <div className="m-cenas-camada">
            <div className="m-cenas-img">
              <FotoDoCartao caminho={c.foto} />
            </div>
          </div>
          <div className="m-cenas-veu" />
          {c.frase && (
            <div className="m-cenas-frase-caixa">
              <p className="m-cenas-frase">{c.frase}</p>
            </div>
          )}
          <div className="m-cenas-topo">
            <span>Nossos momentos</span>
            <span>
              {dois(i + 1)} / {dois(n)}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
