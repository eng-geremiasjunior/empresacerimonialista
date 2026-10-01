"use client";

// Um laço de rAF para todo o site: parallax, cenas sticky (château,
// alianças, "Nossos momentos"), linha do tempo, varal e cordas. Cada
// efeito assina com o elemento dele; o laço mede todos primeiro e só
// depois chama quem desenha (ler e escrever misturados força layout a
// cada efeito). Quem está fora da tela não é chamado.
//
// O laço só gira quando alguém pede: rolagem, resize, ou um efeito que
// devolve true ("quero o próximo quadro" — as alianças e as cordas, que
// mexem com o tempo). Nada pedindo, ele para.
//
// Prévia e revisão: uma chamada só, no quadro final (progresso 1), sem
// rAF. Reduced-motion: o mesmo, a não ser que o efeito diga que acompanha
// a rolagem mesmo assim (o arco do château do T05), e aí sem pedir
// quadros pelo tempo.

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useModoDoSite } from "./contexto";
import { movimentoReduzido } from "./useRevelar";

export type QuadroDaCena = {
  /** cena sticky: −top / (altura − vh), de 0 a 1 */
  progresso: number;
  rect: DOMRect;
  vh: number;
  vw: number;
  /** performance.now() do quadro */
  agora: number;
  /** true na prévia, na revisão e no reduced-motion "final" */
  final: boolean;
  reduzido: boolean;
};

/** true = quero o próximo quadro mesmo sem rolagem */
export type DesenhoDaCena = (q: QuadroDaCena) => boolean | void;

export type OpcoesDaCena = {
  /** reduced-motion: "final" (padrão) desenha o fim e para; "segue"
   *  continua acompanhando a rolagem, sem nada pelo tempo */
  reduzido?: "final" | "segue";
  /** false desliga a assinatura (efeito ainda sem conteúdo) */
  ligado?: boolean;
};

type Assinante = {
  el: HTMLElement;
  desenho: { current: DesenhoDaCena };
  visivel: boolean;
  reduzido: boolean;
  quer: boolean;
};

const assinantes = new Set<Assinante>();
let pedido = 0;
let olho: IntersectionObserver | null = null;
const porElemento = new Map<Element, Set<Assinante>>();

const limitar = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function progressoDe(r: DOMRect, vh: number): number {
  const curso = r.height - vh;
  if (curso <= 0) return r.top <= 0 ? 1 : 0;
  return limitar(-r.top / curso);
}

function pedir() {
  if (!pedido && assinantes.size) pedido = requestAnimationFrame(quadro);
}

function quadro(agora: number) {
  pedido = 0;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  // primeiro todas as leituras, depois todos os desenhos
  const medidas: [Assinante, DOMRect][] = [];
  assinantes.forEach((a) => {
    if (a.visivel) medidas.push([a, a.el.getBoundingClientRect()]);
  });
  let mais = false;
  for (const [a, rect] of medidas) {
    const quer = a.desenho.current({
      progresso: progressoDe(rect, vh),
      rect,
      vh,
      vw,
      agora,
      final: false,
      reduzido: a.reduzido,
    });
    a.quer = quer === true && !a.reduzido;
    if (a.quer) mais = true;
  }
  if (mais) pedir();
}

function ligarJanela() {
  window.addEventListener("scroll", pedir, { passive: true });
  window.addEventListener("resize", pedir);
  olho = new IntersectionObserver(
    (es) => {
      let acordou = false;
      es.forEach((e) => {
        porElemento.get(e.target)?.forEach((a) => {
          a.visivel = e.isIntersecting;
          if (a.visivel) acordou = true;
        });
      });
      if (acordou) pedir();
    },
    // uma folga para a cena já estar no lugar quando entra
    { rootMargin: "15% 0px 15% 0px" }
  );
}

function desligarJanela() {
  window.removeEventListener("scroll", pedir);
  window.removeEventListener("resize", pedir);
  olho?.disconnect();
  olho = null;
  if (pedido) cancelAnimationFrame(pedido);
  pedido = 0;
}

function assinar(a: Assinante): () => void {
  if (!assinantes.size) ligarJanela();
  assinantes.add(a);
  let doEl = porElemento.get(a.el);
  if (!doEl) {
    porElemento.set(a.el, (doEl = new Set()));
    doEl.add(a);
    olho!.observe(a.el);
  } else {
    // o elemento já é observado: observe() de novo não dispara a entrada,
    // então o novo herda o visível de quem já está lá
    const irmao = doEl.values().next().value as Assinante | undefined;
    doEl.add(a);
    if (irmao?.visivel) {
      a.visivel = true;
      pedir();
    }
  }
  return () => {
    assinantes.delete(a);
    doEl!.delete(a);
    if (!doEl!.size) {
      porElemento.delete(a.el);
      olho?.unobserve(a.el);
    }
    if (!assinantes.size) desligarJanela();
  };
}

/**
 * Liga um efeito ao laço. Devolve `acordar()`, para pedir quadros de fora
 * da rolagem (o áudio do violino começando, por exemplo).
 */
export function useCena<T extends HTMLElement>(
  ref: RefObject<T | null>,
  desenho: DesenhoDaCena,
  opcoes: OpcoesDaCena = {}
): () => void {
  const { modo } = useModoDoSite();
  const atual = useRef(desenho);
  atual.current = desenho;
  const assinante = useRef<Assinante | null>(null);
  const { reduzido = "final", ligado = true } = opcoes;

  useEffect(() => {
    const el = ref.current;
    if (!el || !ligado) return;
    const reduz = movimentoReduzido();
    if (modo !== "publico" || (reduz && reduzido === "final") || typeof IntersectionObserver === "undefined") {
      const rect = el.getBoundingClientRect();
      atual.current({
        progresso: 1,
        rect,
        vh: window.innerHeight,
        vw: window.innerWidth,
        agora: performance.now(),
        final: true,
        reduzido: reduz,
      });
      return;
    }
    const a: Assinante = { el, desenho: atual, visivel: false, reduzido: reduz, quer: false };
    assinante.current = a;
    const sair = assinar(a);
    return () => {
      assinante.current = null;
      sair();
    };
  }, [ref, modo, reduzido, ligado]);

  return useCallback(() => {
    if (assinante.current) pedir();
  }, []);
}
