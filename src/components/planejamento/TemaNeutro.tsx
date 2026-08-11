"use client";

// Liga o tema neutro (handoff Celebra Pro) enquanto a tela de Planejamento
// está montada. O atributo vive no <body> para alcançar o canvas e o chrome
// do evento (header + stepper + abas), que trocam de cor via tokens --ev-*.
// A sidebar global fica fora de propósito — fronteira a avaliar no browser.

import { useEffect } from "react";

export function TemaNeutro() {
  useEffect(() => {
    document.body.dataset.tema = "neutro";
    return () => {
      delete document.body.dataset.tema;
    };
  }, []);
  return null;
}
