// Os atalhos da Visão geral (desenho v4, README §6.2; protótipo, template
// 169–178 e lógica 1127–1132): número em Marcellus, barra que cresce e o
// que pede atenção, e o toque leva à tela. Só os que têm dado: a cota da
// lua de mel entra quando o sistema de presentes existir; sem ela, a
// grade mostra os que existem.

import Link from "next/link";
import { Icone } from "../../primitivas";
import type { Atalho } from "./montar";

export function Atalhos({ atalhos }: { atalhos: Atalho[] }) {
  if (atalhos.length === 0) return null;
  return (
    <div className={`pn-visao-geral-atalhos n${Math.min(3, atalhos.length)}`}>
      {atalhos.map((a) => (
        <Link key={a.chave} href={a.href} className="pn-visao-geral-atalho">
          <div className="pn-visao-geral-atalho-topo">
            <div className="pn-visao-geral-atalho-rotulo">
              <Icone nome={a.icone} tamanho={22} cor="#1b2a23" />
              {a.rotulo}
            </div>
            <Icone nome="arrow_forward" tamanho={20} cor="#9a5a34" />
          </div>
          <div className="pn-t pn-visao-geral-atalho-grande">{a.grande}</div>
          <div className="pn-visao-geral-atalho-barra">
            <span style={{ width: `${Math.max(0, Math.min(100, a.pct))}%` }} />
          </div>
          <div className="pn-visao-geral-atalho-sub">{a.sub}</div>
        </Link>
      ))}
    </div>
  );
}
