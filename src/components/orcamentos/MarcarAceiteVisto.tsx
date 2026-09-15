"use client";

// Chama `marcarAceiteVisto` uma vez, quando a tela do orçamento monta com
// um aceite que ninguém da equipe abriu ainda. Molde:
// src/components/orcamento-publico/ContarVisita.tsx.
//
// É um arquivo à parte, e não um subcomponente de AceiteDoOrcamento, de
// propósito: o cartão do aceite é componente de servidor porque carrega
// as assinaturas em data URI (dezenas de KB cada) — num componente de
// cliente elas iriam duas vezes ao navegador, no HTML e no payload de
// props.

import { useEffect } from "react";
import { marcarAceiteVisto } from "@/app/(app)/orcamentos/[id]/aceite-actions";

export function MarcarAceiteVisto({ orcamentoId }: { orcamentoId: string }) {
  useEffect(() => {
    // Falha em silêncio: a tela do orçamento não pode piscar um erro
    // porque a marca de "visto" não subiu.
    void marcarAceiteVisto(orcamentoId).catch(() => undefined);
  }, [orcamentoId]);

  return null;
}
