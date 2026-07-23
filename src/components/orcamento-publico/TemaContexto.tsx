"use client";

// Contexto do tema da landing. Existe só para as poucas diferenças de
// ARRANJO entre os templates (hero dividido, seções em cartão, pílula do
// menu). Cor e fonte não passam por aqui — vão por CSS variables.
//
// Sem isto, `tema` viraria prop repassada por seis níveis de componente
// só para acender um booleano.

import { createContext, useContext } from "react";
import { TEMAS, TEMA_PADRAO, type TemaOrcamento } from "@/lib/orcamento-temas";

const Ctx = createContext<TemaOrcamento>(TEMA_PADRAO);

export function TemaProvider({
  tema,
  children,
}: {
  tema: TemaOrcamento;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={tema}>{children}</Ctx.Provider>;
}

export function useTema() {
  return TEMAS[useContext(Ctx)];
}
