"use client";

// O relógio da validade da proposta — um só, para todos os templates.
// A conta mora em proposta.ts (pura, testável); aqui é só o tique.

import { useEffect, useState } from "react";
import { tempoRestante, type TempoRestante } from "@/lib/proposta";

export function useCountdownValidade(dataValidade: string | null): TempoRestante {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  if (!dataValidade) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0, acabou: true };
  }
  return tempoRestante(dataValidade, agora);
}
