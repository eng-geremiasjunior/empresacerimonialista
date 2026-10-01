// As telas que o desenho v4 manda MANTER (README §22: Guia de estilo,
// Escolhas do casal, Convite, Cortejo — e "A sua cerimonialista", da
// conta de família): o cabeçalho no padrão das telas do desenho (eyebrow,
// título em Marcellus, subtítulo) e, embaixo, o conteúdo atual do sistema
// como está, dentro do <Legado> (o CSS do portal antigo com as variáveis
// apontando para os tokens novos). Sem estado: serve ao servidor.

import type { ReactNode } from "react";
import { Legado } from "../../Legado";
import { Eyebrow } from "../../primitivas";
import "./mantidas.css";

export function TelaMantida({
  eyebrow,
  titulo,
  sub,
  children,
}: {
  eyebrow: string;
  titulo: string;
  sub?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="pn-mantida">
      <header className="pn-mantida-cabeca">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="pn-t pn-mantida-titulo">{titulo}</h1>
        {sub && <p className="pn-mantida-sub">{sub}</p>}
      </header>
      <Legado>
        <div className="portal-tela">{children}</div>
      </Legado>
    </div>
  );
}
