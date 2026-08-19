"use client";

// O relógio da validade da proposta — um só, para todos os templates.
// A conta mora em proposta.ts (pura, testável); aqui é só o tique.
//
// Hidratação: o servidor e o primeiro render do cliente NÃO podem olhar
// o relógio — Date.now() difere entre os dois e o React descarta o HTML
// inteiro (erros #418/#423/#425, vistos em produção). Então o primeiro
// render devolve zeros estáveis e o relógio real só entra no efeito,
// já montado no cliente.

import { useEffect, useState } from "react";
import { tempoRestante, type TempoRestante } from "@/lib/proposta";

export function useCountdownValidade(dataValidade: string | null): TempoRestante {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (!dataValidade) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0, acabou: true };
  }
  if (agora === null) {
    // antes de montar: estado neutro, idêntico no servidor e no cliente
    return { dias: 0, horas: 0, minutos: 0, segundos: 0, acabou: false };
  }
  return tempoRestante(dataValidade, agora);
}
