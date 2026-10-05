// A chamada para criar a lista de presentes (pedido dele, 05/10/2026),
// acima do "Hoje, só uma coisa": o casal, enquanto a lista não está no ar
// (chamarParaALista decide). O cartão inteiro leva à tela de Presentes.

import Link from "next/link";
import { Icone } from "../../primitivas";

export function ChamadaDaLista({ href }: { href: string }) {
  return (
    <Link href={href} className="pn-visao-geral-lista">
      <span className="pn-visao-geral-lista-icone" aria-hidden="true">
        <Icone nome="redeem" cheio />
      </span>
      <span className="pn-visao-geral-lista-textos">
        <span className="pn-t pn-visao-geral-lista-titulo">Crie sua lista de presentes agora mesmo</span>
        <span className="pn-visao-geral-lista-sub">Os convidados presenteiam em Pix ou no cartão, em até 6x.</span>
      </span>
      <span className="pn-visao-geral-lista-botao">
        Criar a lista
        <Icone nome="arrow_forward" tamanho={20} />
      </span>
    </Link>
  );
}
