"use client";

import { createContext, useContext } from "react";

/**
 * Quem sabe se as explicações estão ligadas, e quem sabe desligá-las.
 *
 * O "?" nasceu na barra lateral, onde o AppShell tinha o estado na mão.
 * Ele foi para dentro do evento também (fases e abas), e essas telas
 * estão dez níveis abaixo do layout — passar `explicacoes` de prop em
 * prop por dez componentes seria o efeito cascata que o dono não quer.
 *
 * O padrão é DESLIGADO de propósito: um "?" renderizado fora do provedor
 * seria um botão que ninguém consegue desligar. Melhor não aparecer.
 */
type Valor = {
  ligadas: boolean;
  desativar: () => void;
};

const Contexto = createContext<Valor>({ ligadas: false, desativar: () => {} });

export function ProvedorDasExplicacoes({
  valor,
  children,
}: {
  valor: Valor;
  children: React.ReactNode;
}) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useExplicacoes(): Valor {
  return useContext(Contexto);
}
