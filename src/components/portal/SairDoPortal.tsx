"use client";

// O Sair do portal — o mesmo nos dois modos e na escolha de evento.
//
// É um <form> com a server action, como o Sair da área profissional
// (AppShell): a sessão morre no servidor, sem JavaScript para apagar
// cookie. Sem confirmação — sair é reversível, ela entra de novo.
//
// Duas caras: "menu" parece um item de navegação (sidebar e gaveta);
// "texto" é uma linha discreta para a tela em que não há menu nenhum.

import { sairDoPortal } from "@/app/(portal)/portal/actions";
import * as Icones from "./icones";

export function SairDoPortal({
  variante = "menu",
}: {
  variante?: "menu" | "texto";
}) {
  return (
    <form action={sairDoPortal}>
      <button
        type="submit"
        className={
          variante === "menu"
            ? "portal-nav-item portal-nav-item--botao"
            : "portal-sair-texto"
        }
      >
        <Icones.LogOut size={Icones.TAMANHO} strokeWidth={Icones.TRACO} />
        Sair
      </button>
    </form>
  );
}
