"use client";

// O reveal ao rolar dos 6 modelos. Cada modelo diz como o elemento entra
// (quadros, duração e curva do protótipo, por variante: "up", "img",
// "dev"...); aqui fica o gatilho, igual para todos:
//
//   · IntersectionObserver com rootMargin 0 0 -8% 0, como pede o README
//     (o Clássico passa -10%, como no protótipo dele);
//   · o reforço no scroll: a cada rolagem, quem ainda está oculto e já
//     passou de 95% da tela é revelado. Sem isso cards ficavam invisíveis
//     (pulo por âncora, rolagem rápida) — foi um bug real do protótipo;
//   · elementos que chegam depois (RSVP respondido, seção que aparece)
//     entram pelo MutationObserver.
//
// Marcação: data-revelar="<variante>" e, se quiser, data-atraso="ms" (o
// data-delay do protótipo também vale). Na variante com `alvo` (o "img",
// que anima a camada [data-zoom]), o quadro fica e só a camada anima.
//
// Prévia, revisão, reduced-motion ou página sem a classe sm-js: tudo
// aparece direto, sem animação.

import { useEffect, useRef, type RefObject } from "react";
import { useModoDoSite } from "./contexto";

export type Revelacao = {
  quadros: Keyframe[];
  duracao: number;
  curva?: string;
  /** seletor da camada interna que anima (ex.: "[data-zoom]") */
  alvo?: string;
};

export type RevelacoesDoModelo = Record<string, Revelacao>;

/** A curva-base dos 6 protótipos. */
export const CURVA_E = "cubic-bezier(.2,.7,.2,1)";

/** a dos T02–T06; o T01 usa "0px 0px -10% 0px" */
export const MARGEM_PADRAO = "0px 0px -8% 0px";
const DOBRA = 0.95;

export function movimentoReduzido(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function atrasoDe(el: HTMLElement): number {
  const v = Number(el.dataset.atraso ?? el.dataset.delay ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function useRevelar(
  raiz: RefObject<HTMLElement | null>,
  revelacoes: RevelacoesDoModelo,
  opcoes?: { margem?: string }
): void {
  const margem = opcoes?.margem ?? MARGEM_PADRAO;
  const { modo } = useModoDoSite();
  // o objeto costuma nascer a cada render; o efeito lê sempre o último
  const rev = useRef(revelacoes);
  rev.current = revelacoes;

  useEffect(() => {
    const casca = raiz.current;
    if (!casca) return;
    const html = document.documentElement;
    // avisa o ScriptRevelar que o JS chegou: a classe sm-js pode ficar
    html.setAttribute("data-sm-revelar", "");

    const direto =
      modo !== "publico" ||
      movimentoReduzido() ||
      !html.classList.contains("sm-js") ||
      typeof IntersectionObserver === "undefined";

    const pendentes = new Set<HTMLElement>();
    const animacoes = new Set<Animation>();

    function revelar(el: HTMLElement, animar: boolean) {
      if (!pendentes.delete(el)) return;
      olho?.unobserve(el);
      el.setAttribute("data-revelado", "");
      if (!animar) return;
      const r = rev.current[el.dataset.revelar || "up"] ?? rev.current.up;
      if (!r) return;
      const quem = r.alvo ? el.querySelector<HTMLElement>(r.alvo) : el;
      if (!quem || typeof quem.animate !== "function") return;
      const a = quem.animate(r.quadros, {
        duration: r.duracao,
        delay: atrasoDe(el),
        easing: r.curva ?? CURVA_E,
        fill: "both",
      });
      animacoes.add(a);
      // o último quadro é o estado natural: soltar libera o transform
      // para o hover do modelo e a camada do compositor
      a.onfinish = () => {
        animacoes.delete(a);
        a.cancel();
      };
    }

    const olho = direto
      ? null
      : new IntersectionObserver(
          (es) => es.forEach((e) => e.isIntersecting && revelar(e.target as HTMLElement, true)),
          { rootMargin: margem, threshold: 0.01 }
        );

    function varrer() {
      casca!.querySelectorAll<HTMLElement>("[data-revelar]:not([data-revelado])").forEach((el) => {
        if (pendentes.has(el)) return;
        if (direto) {
          el.setAttribute("data-revelado", "");
          return;
        }
        pendentes.add(el);
        olho!.observe(el);
      });
    }

    // o reforço: o que já passou da dobra e o IO não pegou
    function reforco() {
      const vh = window.innerHeight;
      pendentes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * DOBRA) revelar(el, r.bottom > 0);
      });
    }

    let pedido = 0;
    const aoRolar = () => {
      if (!pedido)
        pedido = requestAnimationFrame(() => {
          pedido = 0;
          reforco();
        });
    };

    let pedidoDeVarredura = 0;
    const mutacao = new MutationObserver(() => {
      if (!pedidoDeVarredura)
        pedidoDeVarredura = requestAnimationFrame(() => {
          pedidoDeVarredura = 0;
          varrer();
          if (!direto) reforco();
        });
    });

    varrer();
    mutacao.observe(casca, { childList: true, subtree: true });
    let tempo = 0;
    if (!direto) {
      window.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar);
      reforco();
      // fontes e fotos mudam a altura logo depois da montagem
      tempo = window.setTimeout(reforco, 500);
    }

    return () => {
      olho?.disconnect();
      mutacao.disconnect();
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      if (pedido) cancelAnimationFrame(pedido);
      if (pedidoDeVarredura) cancelAnimationFrame(pedidoDeVarredura);
      clearTimeout(tempo);
      // sem marcar os pendentes como revelados: no Strict Mode o efeito
      // roda de novo logo em seguida e precisa encontrá-los ocultos
      animacoes.forEach((a) => a.cancel());
    };
  }, [raiz, modo, margem]);
}
