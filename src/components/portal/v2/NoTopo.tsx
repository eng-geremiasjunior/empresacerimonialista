"use client";

// Folhas e telas cheias do portal v2 saem da camada do conteúdo (que tem
// z-index próprio e ficava por baixo da barra do celular) e vão para a
// raiz .pv2 — onde as cores da festa continuam valendo.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function NoTopo({ children }: { children: ReactNode }) {
  const [alvo, setAlvo] = useState<Element | null>(null);
  useEffect(() => setAlvo(document.querySelector(".pv2") ?? document.body), []);
  return alvo ? createPortal(children, alvo) : null;
}
