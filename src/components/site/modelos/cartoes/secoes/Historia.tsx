"use client";

// Nossa história (T03 e T04), cartão de raio 32: "O caminho até o altar"
// (ou o título que a noiva escreveu), a legenda e a ONDA — SVG 1000×300
// sem proporção fixa, altura 300, largura mínima de 760px com rolagem
// horizontal no celular. Cada marco é um botão (ícone, ano em headFont
// 26px e o rótulo curto de 12.5px, acima se y < 50% e abaixo se não).
// Embaixo, o capítulo do marco escolhido sobre soft: "Capítulo N · ano",
// o título, o texto e a foto 16/10.
//
// A onda: um caminho Bézier (controles a dx/2) tracejado 3 8 em
// lineStrong por baixo; por cima, o mesmo caminho em pêssego de 3px,
// revelado até o marco escolhido por clip-path em 1.1s. Ativo: 60px, ink
// e halo; passados: 46px em #f6dccb; futuros: 46px em card com borda.
// Trocar de marco faz o capítulo entrar (opacidade, translateY 14px e
// blur 4px em 800ms).
//
// Quantidade variável: os 5 do desenho caem nas posições dele (x 6/28/50/
// 72/94%, y 66/30/70/28/58%); com outra quantidade, x se reparte entre 6
// e 94% e y segue a mesma alternância. Com mais de 5, a onda alarga
// (152px por marco) e rola. O primeiro escolhido é o penúltimo (no
// desenho, o 4º: o pedido, antes do grande dia).
//
// Sem marcos: o título, o texto de hoje e a foto do casal. Com marcos, o
// texto e a foto do casal vêm entre o título e a onda (trocar de modelo
// não perde conteúdo). Revisão do dono: todos os capítulos abertos, um
// embaixo do outro.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { lerHistoria, type IconeDoMarco, type Marco } from "@/lib/site-conteudo";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { FotoDoCartao, ICONE_DO_MARCO, Icone, Rotulo, useTemFoto, type PropsDaSecao } from "../comum";

const TITULO_DO_DESENHO = "O caminho até o altar";
const X_DO_DESENHO = [6, 28, 50, 72, 94];
const Y_DO_DESENHO = [66, 30, 70, 28, 58, 34, 68, 30, 64, 32];
const ICONES_EM_ORDEM: IconeDoMarco[] = ["cafe", "aviao", "casa", "anel", "coracao"];

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function temHistoria(p: Pick<PropsDaSecao, "dados" | "bloco">): boolean {
  const s = p.dados.site;
  return !!(s?.historia || s?.historia_titulo || lerHistoria(p.bloco.conteudo).marcos.length);
}

type Ponto = { x: number; y: number };

function pontosDaOnda(n: number): Ponto[] {
  if (n === 5) return X_DO_DESENHO.map((x, i) => ({ x, y: Y_DO_DESENHO[i] }));
  return Array.from({ length: n }, (_, i) => ({
    x: n === 1 ? 50 : 6 + (i * 88) / (n - 1),
    y: Y_DO_DESENHO[i % Y_DO_DESENHO.length],
  }));
}

/** O caminho do protótipo: M no primeiro, C com controles a dx/2. */
function caminhoDaOnda(pts: Ponto[]): string {
  if (pts.length < 2) return "";
  const p = pts.map((q) => [q.x * 10, q.y * 3]);
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const dx = (x1 - x0) / 2;
    d += ` C${x0 + dx} ${y0} ${x1 - dx} ${y1} ${x1} ${y1}`;
  }
  return d;
}

function iconeDe(m: Marco, i: number, n: number) {
  return ICONE_DO_MARCO[m.icone ?? (i === n - 1 ? "coracao" : ICONES_EM_ORDEM[i % ICONES_EM_ORDEM.length])];
}

export function Historia({ dados, bloco, ancora, modo, fotoCasalUrl }: PropsDaSecao & { fotoCasalUrl: string | null }) {
  const site = dados.site;
  const marcos = lerHistoria(bloco.conteudo).marcos;
  const titulo = site?.historia_titulo || TITULO_DO_DESENHO;
  const temFoto = useTemFoto();

  return (
    <section id={ancora} data-sec={ancora} data-revelar="up" className="k-cartao k-historia">
      <Rotulo className="k-rotulo--acento">Nossa história</Rotulo>
      {marcos.length === 0 ? (
        <div className="k-historia-texto">
          <h2 className="k-h2">{titulo}</h2>
          {site?.historia && <p className="k-historia-p">{site.historia}</p>}
          {temFoto(null, fotoCasalUrl) && (
            <div className="k-capitulo-foto">
              <FotoDoCartao url={fotoCasalUrl} />
            </div>
          )}
        </div>
      ) : (
        <Onda
          marcos={marcos}
          titulo={titulo}
          espalhar={modo === "revisao"}
          abertura={
            (site?.historia || temFoto(null, fotoCasalUrl)) && (
              <div className={`k-historia-abre ${site?.historia ? "" : "k-historia-abre--so-foto"}`}>
                {site?.historia && <p className="k-historia-p">{site.historia}</p>}
                {temFoto(null, fotoCasalUrl) && (
                  <div className="k-capitulo-foto">
                    <FotoDoCartao url={fotoCasalUrl} />
                  </div>
                )}
              </div>
            )
          }
        />
      )}
    </section>
  );
}

function Onda({
  marcos,
  titulo,
  espalhar,
  abertura,
}: {
  marcos: Marco[];
  titulo: string;
  espalhar: boolean;
  abertura: ReactNode;
}) {
  const n = marcos.length;
  const [sel, setSel] = useState(Math.max(0, n - 2));
  const pts = pontosDaOnda(n);
  const d = caminhoDaOnda(pts);
  const escolhido = Math.min(sel, n - 1);

  return (
    <>
      <div className="k-historia-topo">
        <div className="k-historia-titulos">
          <h2 className="k-h2">{titulo}</h2>
          {n > 1 && !espalhar && <div className="k-mudo">Toque em um ano para ver o que aconteceu nele.</div>}
        </div>
        {n > 1 && (
          <div className="k-legenda">
            <span className="k-legenda-item">
              <span className="k-ponto" aria-hidden />o que já vivemos
            </span>
            <span className="k-legenda-item">
              <span className="k-ponto k-ponto--forte" aria-hidden />o que vem pela frente
            </span>
          </div>
        )}
      </div>

      {abertura}

      <div className="k-onda-rolagem">
        <div className="k-onda" style={{ minWidth: `${Math.max(760, n * 152)}px` } as CSSProperties}>
          {d && (
            <>
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="k-onda-svg" aria-hidden>
                <path d={d} className="k-onda-tracejada" />
              </svg>
              <div
                className="k-onda-corte"
                style={{ clipPath: `inset(-20px ${100 - pts[escolhido].x}% -20px -20px)` }}
                aria-hidden
              >
                <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="k-onda-svg">
                  <path d={d} className="k-onda-cheia" />
                </svg>
              </div>
            </>
          )}
          {marcos.map((m, i) => {
            const estado = i === escolhido ? "ativo" : i < escolhido ? "passado" : "futuro";
            return (
              <button
                key={i}
                type="button"
                className="k-marco"
                data-estado={estado}
                style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }}
                aria-pressed={i === escolhido}
                aria-label={[m.ano, m.curto || m.titulo].filter(Boolean).join(" · ") || `Capítulo ${i + 1}`}
                onClick={() => setSel(i)}
              >
                <span className="k-marco-bola">
                  <Icone nome={iconeDe(m, i, n)} className="k-marco-icone" />
                </span>
                <span className={`k-marco-legenda ${pts[i].y < 50 ? "k-marco-legenda--acima" : ""}`} aria-hidden>
                  {m.ano && <span className="k-marco-ano">{m.ano}</span>}
                  {m.curto && <span className="k-marco-curto">{m.curto}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {espalhar ? (
        marcos.map((m, i) => <Capitulo key={i} marco={m} n={i + 1} animar={false} />)
      ) : (
        <Capitulo marco={marcos[escolhido]} n={escolhido + 1} animar />
      )}
    </>
  );
}

function Capitulo({ marco, n, animar }: { marco: Marco; n: number; animar: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  const { modo } = useModoDoSite();
  const temFoto = useTemFoto();
  const comFoto = temFoto(marco.foto);

  // a entrada só na troca (não na montagem: aí é o reveal do cartão)
  useLayoutNoCliente(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const el = ref.current;
    if (!el || !animar || modo !== "publico" || movimentoReduzido() || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { opacity: 0, transform: "translateY(14px)", filter: "blur(4px)" },
        { opacity: 1, transform: "none", filter: "blur(0)" },
      ],
      { duration: 800, easing: CURVA_E }
    );
    return () => a.cancel();
  }, [n, animar, modo]);

  return (
    <div ref={ref} className={`k-capitulo ${comFoto ? "" : "k-capitulo--sem-foto"}`} aria-live="polite">
      <div className="k-capitulo-texto">
        <Rotulo className="k-rotulo--acento">
          Capítulo {n}
          {marco.ano ? ` · ${marco.ano}` : ""}
        </Rotulo>
        {marco.titulo && <div className="k-capitulo-titulo">{marco.titulo}</div>}
        {marco.texto && <p className="k-capitulo-p">{marco.texto}</p>}
      </div>
      {comFoto && (
        <div className="k-capitulo-foto">
          <FotoDoCartao caminho={marco.foto} />
        </div>
      )}
    </div>
  );
}
