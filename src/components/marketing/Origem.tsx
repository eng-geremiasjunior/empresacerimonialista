"use client";

// Guarda a origem do clique na PRIMEIRA tela, não só no formulário.
//
// O anúncio entrega em `/planos?utm_source=…&fbclid=…`. Se a origem só
// fosse gravada no cadastro, dois ou três cliques depois, a URL já não
// carregaria nada e toda conta chegaria à Meta e ao Google sem dizer de
// qual anúncio veio — que é a única pergunta que se faz ao olhar o
// painel de campanha.
//
// Não desenha nada e não depende de haver pixel configurado: a
// atribuição é do negócio, não do script de terceiro.

import { useEffect } from "react";
import { guardarOrigemDoClique } from "@/lib/marketing";

export function Origem() {
  useEffect(() => {
    guardarOrigemDoClique();
  }, []);
  return null;
}
