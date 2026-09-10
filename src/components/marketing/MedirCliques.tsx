"use client";

// Mede o clique em TODA chamada para a ação da página de vendas.
//
// Um ouvinte só, na página, em vez de um `onClick` por botão. Três
// motivos, nesta ordem:
//
//  1. os botões são renderizados no servidor — pôr `onClick` em cada um
//     obrigaria a transformar a página inteira em componente de cliente;
//  2. são dezenove âncoras hoje, entre cabeçalho, hero, três faixas,
//     demonstração, grade de planos, fecho, barra do celular e o botão
//     flutuante. Marcar uma a uma é garantia de esquecer alguma;
//  3. chamada nova nasce medida sozinha. É o oposto do que aconteceu com
//     a origem do clique, que ficou dois dias escrevendo `utm_source`
//     nulo porque uma tela nova não sabia que precisava chamar a função.
//
// Fase de captura para o ouvinte pegar o clique antes de qualquer
// `preventDefault`, e `closest("a")` porque o alvo real costuma ser o
// texto dentro do botão, não a âncora.

import { useEffect } from "react";
import { cliqueNaChamada } from "@/lib/marketing";

export function MedirCliques() {
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      // só clique comum: com ctrl/cmd/meio a pessoa abre noutra aba, e
      // isso não é a mesma intenção
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) {
        return;
      }
      const alvo = e.target as HTMLElement | null;
      const ancora = alvo?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!ancora) return;
      const href = ancora.getAttribute("href") ?? "";
      if (!href) return;
      cliqueNaChamada(href, ancora.textContent);
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  return null;
}
