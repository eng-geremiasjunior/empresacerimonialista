"use client";

// Quem abriu a proposta — a metade que faltava da migração 155.
//
// POR QUE EXISTE. O dono viu a concorrente rastreando isso e pediu o
// mesmo: "eles rastreiam as pessoas que fecham os orçamentos da
// cerimonialista, podemos fazer isso também". A 155 criou as colunas e a
// função no banco em 10/09/2026 e ficou dois dias sem ninguém chamar —
// migração parada é pior que migração ausente, porque parece pronta.
//
// O QUE ELE CONTA, E O QUE NÃO CONTA. Conta abertura da peça, nada mais:
// não há cookie, não há identificação de quem abriu, não há rastro entre
// sites. A cerimonialista fica sabendo QUE a proposta foi vista e
// QUANDO, não quem é a pessoa do outro lado — que é exatamente o que ela
// precisa para decidir se liga hoje ou espera.
//
// UMA VEZ POR SESSÃO DA ABA. Sem trava, um F5 ou um voltar-e-avançar
// inflaria o número e "vista 14 vezes" viraria mentira. Com a marca em
// sessionStorage, cada aba conta uma vez — recarregar não soma, e abrir
// de novo amanhã soma de novo, que é o comportamento útil.
//
// A DONA NÃO CONTA. Quem decide isso é a página, no servidor, que sabe
// se a sessão é da empresa dona da proposta. Ela abre a própria proposta
// para conferir antes de mandar; contar isso estragaria o número logo no
// primeiro uso.

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function ContarVisita({ hash }: { hash: string }) {
  useEffect(() => {
    const marca = `visita:${hash}`;
    try {
      if (sessionStorage.getItem(marca)) return;
      sessionStorage.setItem(marca, "1");
    } catch {
      // navegador com armazenamento bloqueado: conta assim mesmo, é
      // melhor um número levemente alto do que nenhum número
    }

    // Falha em silêncio de propósito: a proposta da cliente não pode
    // piscar um erro porque uma contagem não subiu.
    void createClient()
      .rpc("registrar_visita_orcamento", { p_hash: hash })
      .then(() => undefined);
  }, [hash]);

  return null;
}
