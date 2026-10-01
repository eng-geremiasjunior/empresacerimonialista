import type { ReactNode } from "react";

/**
 * As telas que o desenho v4 manda MANTER com o conteúdo atual (Guia de
 * estilo, Escolhas do casal, Convite, Cortejo): o CSS do portal antigo
 * continua valendo aqui dentro, com as variáveis apontando para os tokens
 * do desenho novo (noivos.css, .pn-legado).
 */
export function Legado({ children }: { children: ReactNode }) {
  return <div className="portal-raiz pn-legado">{children}</div>;
}
