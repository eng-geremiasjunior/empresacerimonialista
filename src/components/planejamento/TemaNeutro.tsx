"use client";

// Liga o tema neutro (handoff Celebra Pro) enquanto a tela de Planejamento
// está montada: o canvas recuado do <body>. O chrome do evento (cabeçalho e
// bloco de fases, Modelo A) NÃO muda de cor aqui — é o mesmo em toda aba.

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
