"use client";

// A sombra do cabeçalho só existe depois que a página rola.
//
// Parada no topo, uma sombra fixa suja a aresta que a borda acabou de
// desenhar; rolando, ela é o que separa a barra do conteúdo que passa por
// baixo. Como CSS ainda não sabe perguntar "a página rolou?" de forma
// confiável nos navegadores que a cerimonialista usa, quem responde é
// este componente — e ele escreve UM atributo em <html>, não um estado de
// React: nada re-renderiza a cada pixel de rolagem.

import { useEffect } from "react";

export function SombraDoTopo() {
  useEffect(() => {
    const raiz = document.documentElement;
    let ligado = false;

    function conferir() {
      const passou = window.scrollY > 4;
      if (passou === ligado) return;
      ligado = passou;
      if (passou) raiz.dataset.rolou = "1";
      else delete raiz.dataset.rolou;
    }

    conferir();
    // passive: o listener não cancela a rolagem, e dizer isso ao
    // navegador evita que ele espere por nós a cada quadro
    window.addEventListener("scroll", conferir, { passive: true });
    return () => {
      window.removeEventListener("scroll", conferir);
      delete raiz.dataset.rolou;
    };
  }, []);

  return null;
}
