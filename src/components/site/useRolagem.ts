"use client";

// Quanto de uma seção já passou pela tela, de 0 (o topo dela chegando no
// pé da tela) a 1 (o fim dela saindo pelo topo). Uma leitura por quadro,
// só enquanto a seção está à vista.

import { useEffect, useRef, useState, type RefObject } from "react";

export function useRolagem<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let pedido = 0;
    let visivel = false;
    const medir = () => {
      pedido = 0;
      const r = el.getBoundingClientRect();
      const total = r.height + window.innerHeight;
      const andou = window.innerHeight - r.top;
      setP(Math.min(1, Math.max(0, andou / total)));
    };
    const pedir = () => {
      if (visivel && !pedido) pedido = requestAnimationFrame(medir);
    };
    const olho = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) pedir();
    });
    olho.observe(el);
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    medir();
    return () => {
      olho.disconnect();
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);
  return [ref, p];
}

/** Mapeia p de [a, b] para [0, 1], preso nas pontas. */
export const trecho = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
