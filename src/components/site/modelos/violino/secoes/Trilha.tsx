"use client";

// 5 · Nossa história (#historia), fundo alt: a trilha horizontal de
// cartões-postais presos num varal, com o arco de violino na ponta.
//
// A seção prende um quadro sticky de 100vh (padding 72px 0 24px, gap
// clamp(24px,4vh,48px)) com o cabeçalho ("Notre histoire", o título e
// "Cada cartão-postal guarda um capítulo. Toque para virar.") e a faixa:
// os postais do T05 (clamp(230px,23vw,290px), gap clamp(28px,3vw,44px),
// padding 18px clamp(24px,8vw,120px) 30px, giros −2.5/1.8/−1.2/2.4/−1.8/
// 1.4/−2.2/1.6deg). A altura da seção é run + vh, com
// run = (largura da faixa − largura da tela) × .55, e a faixa anda
// translate3d(−p × dist): a rolagem vertical vira deslocamento lateral.
//
// O varal: um path pelo topo-centro de cada cartão, com a queda
// sag = min(46, |dx|×.16) entre eles. Embaixo o trilho tracejado "2 7" em
// lineStrong (1.2px); em cima a linha gold de 1.8px revelada por
// stroke-dashoffset até o ponto do path em x = 62% da tela (busca binária
// de 16 passos com getPointAtLength). Os alfinetes (11px, fundo alt, borda
// lineStrong) ganham o miolo gold de 5px com mola quando a linha passa. O
// arco (vara #6b4a2b 2.4px, crina #f3ead6 1.2px, talão #3b2a1c com olho
// goldLight, ponto de luz) segue a ponta, girado pela tangente − 8°, e
// balança sin(t/90)×6°×volume enquanto o violino toca. Sem drop-shadow.
//
// O conserto do protótipo: com poucos cartões numa tela larga, dist = 0
// deixava o progresso em 0 e a linha parada em 62% para sempre. Aqui:
//   · sem curso lateral, a faixa centraliza e a seção ganha uma pausa de
//     meia tela (sticky), em que a linha corre do primeiro ao último
//     alfinete (nasce no primeiro quando a seção prende);
//   · com curso, o alvo fica nos 62% do desenho e só a partir de 85% do
//     progresso ganha um acréscimo suave (smoothstep), para a linha chegar
//     ao último alfinete junto com o fim — sem o salto para 100% no último
//     quadro.
//
// Reduced-motion: a faixa e a linha seguem a rolagem (é navegação), sem
// balanço do arco; a mola dos alfinetes e o giro saem pelo CSS.
// Prévia e revisão: sem sticky; os cartões quebram em linhas e o varal é
// um fio só: corre cada linha e, na quebra, contorna o último cartão pela
// direita e volta pelo vão até a linha de baixo, com todos os alfinetes
// acesos (o quadro final) — mesmo com um cartão por linha, no celular.
//
// Teclado (público): o foco num cartão fora da tela rola a página até a
// posição em que a faixa o mostra.
// A revisão ainda põe o verso ao lado da frente (o Postal do T05).
//
// Sem marcos: a história de hoje (título, texto e a foto do casal), no
// desenho do T05.

import { useEffect, useRef, type FocusEvent } from "react";
import { lerHistoria } from "@/lib/site-conteudo";
import { useCena } from "@/components/site/pecas/useCena";
import { Historia, Postal } from "../../franca/secoes/Postais";
import { mostraFoto, useUrlDaFoto, type PropsDaSecao } from "../../franca/comum";
import type { MotorDoSom } from "../som";

/** As inclinações do desenho do T06, em ciclo. */
export const GIROS_DA_TRILHA = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.4, -2.2, 1.6];

/** Sem curso lateral, a pausa sticky para a linha correr (× altura da tela). */
const PAUSA_SEM_CURSO = 0.5;
/** O alvo da linha: 62% da largura da tela. */
const ALVO = 0.62;
/** Daqui em diante (progresso) o alvo acelera até o último alfinete. */
const FIM_DO_ACRESCIMO = 0.85;

const limitar = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

type PropsDaTrilha = PropsDaSecao & { fotoCasalUrl: string | null; motor: MotorDoSom };

export function Trilha(p: PropsDaTrilha) {
  if (lerHistoria(p.bloco.conteudo).marcos.length === 0) return <Historia {...p} />;
  return <TrilhaDeCartoes {...p} />;
}

function TrilhaDeCartoes({ dados, bloco, casal, ancora, modo, motor }: PropsDaTrilha) {
  const site = dados.site;
  const marcos = lerHistoria(bloco.conteudo).marcos;
  const resolver = useUrlDaFoto();
  const comFrente = marcos.map((m) => mostraFoto(resolver(m.foto), modo));
  // quantos cartões saem (na revisão, o marco com foto vira frente e verso)
  const nCartoes = comFrente.reduce((n, f) => n + (f && modo === "revisao" ? 2 : 1), 0);
  const primeiroAno = marcos.find((m) => m.ano)?.ano;
  const titulo = site?.historia_titulo || (primeiroAno ? `Tudo começou em ${primeiroAno}...` : "");
  const parada = modo !== "publico";

  const secao = useRef<HTMLElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const trilho = useRef<SVGPathElement>(null);
  const linha = useRef<SVGPathElement>(null);
  const cabeca = useRef<SVGGElement>(null);
  const pinos = useRef<(SVGGElement | null)[]>([]);
  const memo = useRef({ d: "", L: 1 });

  function desenhar(top: number, vh: number, final: boolean, balanco: boolean, agora: number) {
    const sec = secao.current;
    const q = quadro.current;
    const w = faixa.current;
    const ln = linha.current;
    const tr = trilho.current;
    const hd = cabeca.current;
    if (!sec || !q || !w || !ln || !tr || !hd) return;

    // o curso lateral e a altura da seção (só no público)
    let hp = 1;
    let dist = 0;
    if (!final) {
      // offsetWidth, não scrollWidth: o giro dos cartões não mexe no curso
      dist = Math.max(0, w.offsetWidth - q.clientWidth);
      const run = dist >= 1 ? dist * 0.55 : vh * PAUSA_SEM_CURSO;
      const quer = Math.round(run + vh);
      if (Math.abs(sec.offsetHeight - quer) > 2) sec.style.height = `${quer}px`;
      hp = limitar(-top / run);
      w.style.transform = dist >= 1 ? `translate3d(${(-hp * dist).toFixed(1)}px,0,0)` : "";
    }

    const cartoes = w.querySelectorAll<HTMLElement>(".f-postal");
    if (!cartoes.length) return;
    if (!sec.hasAttribute("data-medida")) sec.setAttribute("data-medida", "");
    const wr = w.getBoundingClientRect();
    // a prévia pode estar em escala: as medidas voltam ao espaço do SVG
    const k = w.offsetWidth > 0 ? wr.width / w.offsetWidth || 1 : 1;
    const meias: number[] = [];
    const pts: [number, number][] = Array.from(cartoes, (c) => {
      const r = c.getBoundingClientRect();
      meias.push(r.width / 2 / k);
      return [(r.left + r.width / 2 - wr.left) / k, (r.top - wr.top) / k + 4];
    });
    const largura = w.offsetWidth;

    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const dx = x1 - x0;
      // na prévia, o cartão que quebrou de linha: o varal contorna o
      // último cartão pela direita, desce pela lateral e volta pelo vão
      // entre as linhas até o primeiro alfinete da linha de baixo — um fio
      // só, mesmo com um cartão por linha
      if (dx <= 0 || Math.abs(y1 - y0) > 40) {
        const xs = Math.min(largura - 2, x0 + meias[i - 1] + 16);
        const vao = y1 - 24;
        d += ` C${(x0 + (xs - x0) * 0.6).toFixed(1)} ${(y0 + 6).toFixed(1)} ${xs.toFixed(1)} ${(y0 + 24).toFixed(1)} ${xs.toFixed(1)} ${(y0 + 60).toFixed(1)}`;
        d += ` L${xs.toFixed(1)} ${vao.toFixed(1)}`;
        d += ` C${xs.toFixed(1)} ${(y1 - 14).toFixed(1)} ${(x1 + (xs - x1) * 0.4).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
        continue;
      }
      const sag = Math.min(46, Math.abs(dx) * 0.16);
      d += ` C${(x0 + dx * 0.3).toFixed(1)} ${(y0 + sag).toFixed(1)} ${(x1 - dx * 0.3).toFixed(1)} ${(y1 + sag).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    const m = memo.current;
    if (m.d !== d) {
      tr.setAttribute("d", d);
      ln.setAttribute("d", d);
      m.d = d;
      m.L = ln.getTotalLength() || 1;
    }
    const L = m.L;

    // até onde a linha vai
    let len = L;
    if (!final && hp < 0.999) {
      const ultimo = pts[pts.length - 1][0];
      let tx: number;
      if (dist < 1) {
        // sem curso: a pausa leva a linha do primeiro ao último alfinete
        tx = pts[0][0] + hp * (ultimo - pts[0][0]);
      } else {
        // com curso: o alvo de 62% do desenho; só no trecho final ganha um
        // acréscimo suave, para chegar ao último alfinete junto com o fim
        const base = q.getBoundingClientRect().left + q.clientWidth * ALVO - wr.left;
        const noFim = base + (1 - hp) * dist;
        const s = limitar((hp - FIM_DO_ACRESCIMO) / (1 - FIM_DO_ACRESCIMO));
        tx = base + s * s * (3 - 2 * s) * Math.max(0, ultimo - noFim);
      }
      if (tx <= pts[0][0]) len = 0;
      else {
        let lo = 0;
        let hi = L;
        for (let i = 0; i < 16; i++) {
          const meio = (lo + hi) / 2;
          if (ln.getPointAtLength(meio).x < tx) lo = meio;
          else hi = meio;
        }
        len = lo;
      }
    }
    ln.style.strokeDasharray = `${L} ${L}`;
    ln.style.strokeDashoffset = (L - len).toFixed(1);

    // o arco na ponta, pela tangente
    const ponta = ln.getPointAtLength(len);
    const atras = ln.getPointAtLength(Math.max(0, len - 6));
    const ang = (Math.atan2(ponta.y - atras.y, ponta.x - atras.x) * 180) / Math.PI;
    const balanca = balanco ? Math.sin(agora / 90) * 6 * Math.min(1, motor.volume()) : 0;
    hd.setAttribute("transform", `translate(${ponta.x.toFixed(1)} ${ponta.y.toFixed(1)}) rotate(${(ang - 8 + balanca).toFixed(1)})`);
    const comArco = len > 0 && len < L;
    hd.style.opacity = comArco ? "1" : "0";
    hd.style.visibility = comArco ? "visible" : "hidden";

    // os alfinetes por onde a linha já passou
    const hx = len >= L ? Infinity : ponta.x;
    pinos.current.forEach((g, i) => {
      if (!g || !pts[i]) return;
      g.setAttribute("transform", `translate(${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)})`);
      const miolo = g.lastElementChild as SVGElement | null;
      if (miolo) miolo.style.transform = (len > 0 || (i === 0 && hp > 0)) && pts[i][0] <= hx + 1 ? "scale(1)" : "scale(0)";
    });
  }

  const ultimo = useRef({ top: 0, vh: 800 });
  useCena(
    secao,
    ({ rect, vh, final, reduzido, agora }) => {
      ultimo.current = { top: rect.top, vh };
      desenhar(rect.top, vh, final, !reduzido, agora);
    },
    { reduzido: "segue" }
  );

  // fontes, fotos e a largura da tela mudam o lugar dos cartões. No
  // público a medida sai já na montagem, mesmo longe da tela: a altura da
  // seção precisa estar certa antes de um pulo por âncora passar por ela.
  const redesenhar = useRef<() => void>(() => {});
  redesenhar.current = () => {
    const sec = secao.current;
    if (!sec) return;
    if (parada) desenhar(0, ultimo.current.vh, true, false, performance.now());
    else desenhar(sec.getBoundingClientRect().top, window.innerHeight, false, false, performance.now());
  };
  // no público, o foco do teclado num cartão fora da tela leva a rolagem
  // até a posição em que a faixa o mostra (o quadro é clip: o navegador
  // não rola de lado sozinho)
  function aoFocar(e: FocusEvent<HTMLDivElement>) {
    if (parada) return;
    const sec = secao.current;
    const q = quadro.current;
    const w = faixa.current;
    const cartao = (e.target as HTMLElement).closest?.(".f-postal") as HTMLElement | null;
    if (!sec || !q || !w || !cartao) return;
    const qr = q.getBoundingClientRect();
    const cr = cartao.getBoundingClientRect();
    const dist = Math.max(0, w.offsetWidth - q.clientWidth);
    const preso = sec.getBoundingClientRect().top <= 1 && sec.getBoundingClientRect().bottom >= qr.height - 1;
    if (preso && cr.left >= qr.left && cr.right <= qr.right) return;
    const run = dist >= 1 ? dist * 0.55 : window.innerHeight * PAUSA_SEM_CURSO;
    // o centro do cartão em coordenadas da faixa (sem o translate atual)
    const centro = cr.left + cr.width / 2 - w.getBoundingClientRect().left;
    const hp = dist >= 1 ? limitar((centro - q.clientWidth / 2) / dist) : 0;
    const alvo = sec.getBoundingClientRect().top + window.scrollY + hp * run;
    requestAnimationFrame(() => window.scrollTo({ top: alvo, behavior: "auto" }));
  }

  useEffect(() => {
    const w = faixa.current;
    if (!w || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redesenhar.current());
    ro.observe(w);
    return () => ro.disconnect();
  }, []);

  return (
    <section id={ancora} ref={secao} className={`f-alt v-trilha ${parada ? "v-trilha--parada" : ""}`}>
      <div ref={quadro} className="v-trilha-quadro">
        <div className="v-trilha-cabeca">
          <div className="f-cabeca">
            <div data-revelar="up" className="f-eyebrow">
              Notre histoire
            </div>
            {titulo && (
              <h2 data-revelar="up" data-atraso="120" className="f-h2 f-h2--balance">
                {titulo}
              </h2>
            )}
            {comFrente.some(Boolean) && modo !== "revisao" && (
              <p data-revelar="up" data-atraso="200" className="f-cabeca-p">
                Cada cartão-postal guarda um capítulo. Toque para virar.
              </p>
            )}
          </div>
        </div>

        <div ref={faixa} className="v-faixa" onFocusCapture={aoFocar}>
          <svg className="v-varal" aria-hidden>
            <path ref={trilho} className="v-varal-trilho" d="" />
            <path ref={linha} className="v-varal-linha" d="" />
            {Array.from({ length: nCartoes }, (_, i) => (
              <g
                key={i}
                ref={(el) => {
                  pinos.current[i] = el;
                }}
                className="v-pino"
              >
                <circle r="11" className="v-pino-aro" />
                <circle r="5" className="v-pino-miolo" />
              </g>
            ))}
            <g ref={cabeca} className="v-varal-cabeca">
              <g>
                <path d="M-118 -7 Q-60 -10 0 -3" className="v-arco-vara" />
                <path d="M-112 -2 L-2 0" className="v-arco-crina" />
                <rect x="-124" y="-9" width="12" height="9" rx="2" className="v-arco-talao" />
                <circle cx="-118" cy="-4.5" r="1.6" className="v-arco-olho" />
                <path d="M0 -3 L3 -8" className="v-arco-ponta" />
              </g>
              <circle r="6" className="v-arco-luz" />
              <circle r="3" className="v-arco-brilho" />
            </g>
          </svg>
          {marcos.map((m, i) => (
            <Postal key={i} marco={m} n={i + 1} casal={casal} giro={GIROS_DA_TRILHA[i % GIROS_DA_TRILHA.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
