"use client";

// O que toda peça de um modelo precisa saber sem receber por prop: em que
// modo o site está desenhado (público, prévia da família, revisão do
// dono), qual modelo é e as URLs já assinadas das fotos do balde 'site'.
// Prévia e revisão desligam abertura, trava do scroll, áudio e reveal; a
// revisão ainda espalha o que no público fica atrás de um gesto.

import { createContext, useContext } from "react";
import type { ModeloId } from "@/lib/site-modelos";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";

export type ValorDoContextoDoSite = {
  modo: ModoDoSite;
  modelo: ModeloId;
  /** caminho no balde 'site' → URL assinada no servidor */
  urls: Record<string, string>;
};

// sem provedor, o caso mais seguro: o site público do convite de hoje
export const ContextoDoSite = createContext<ValorDoContextoDoSite>({
  modo: "publico",
  modelo: "convite",
  urls: {},
});

export function useModoDoSite(): ValorDoContextoDoSite {
  return useContext(ContextoDoSite);
}
