"use client";

// A contagem regressiva sobe de 0 até o número em 700ms, UMA VEZ POR
// SESSÃO. É a informação mais emocional da tela e merece o único momento
// de espetáculo do portal — mas repetir a cada visita cansaria, então o
// alvo fica gravado em sessionStorage.
//
// tabular-nums é obrigatório: sem ele o número treme enquanto conta.

import { useEffect, useRef, useState } from "react";

export function Contagem({ dias }: { dias: number }) {
  const [valor, setValor] = useState(dias);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const chave = "vela-contagem";
    const reduzir = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduzir || window.sessionStorage.getItem(chave) === String(dias)) {
      setValor(dias);
      return;
    }

    const inicio = performance.now();
    const dur = 700;
    setValor(0);

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / dur);
      // desaceleração cúbica
      const eased = 1 - Math.pow(1 - t, 3);
      setValor(Math.round(dias * eased));
      if (t < 1) {
        raf.current = requestAnimationFrame(passo);
      } else {
        window.sessionStorage.setItem(chave, String(dias));
      }
    };

    raf.current = requestAnimationFrame(passo);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [dias]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      faltam {valor} dias
    </span>
  );
}
