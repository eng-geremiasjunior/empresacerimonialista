"use client";

// Abrir as Oportunidades é ver o que chegou: os avisos do Comercial
// (pedido novo, proposta aceita, recusada ou comentada) passam a contar
// como vistos, e o número some do menu e do sino (19/10/2026).

import { useEffect } from "react";
import { marcarAvisosComerciaisComoVistos } from "@/hooks/useAvisosComerciais";

export function AvisosVistos() {
  useEffect(() => {
    void marcarAvisosComerciaisComoVistos();
  }, []);
  return null;
}
