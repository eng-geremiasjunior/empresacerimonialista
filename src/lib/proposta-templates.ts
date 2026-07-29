// Templates de proposta que a cerimonialista escolhe por orçamento.
//
// Hoje só debutante tem mais de um; casamento tem um só e nem aparece no
// seletor. O valor é gravado em orcamentos.template_proposta (059) e a
// página pública roteia por ele. null = padrão do tipo.

import type { EventType } from "@/lib/types";

export type TemplateProposta = "debutante_classico" | "debutante_glam";

// Opções mostradas no form de orçamento, por tipo de evento. Um tipo fora
// deste mapa não mostra seletor — usa o template único do seu tipo.
export const TEMPLATES_POR_TIPO: Partial<
  Record<EventType, { valor: TemplateProposta; nome: string; descricao: string }[]>
> = {
  debutante: [
    {
      valor: "debutante_classico",
      nome: "Clássico",
      descricao: "Creme e dourado, elegante e sóbrio",
    },
    {
      valor: "debutante_glam",
      nome: "Festa Glam",
      descricao: "Neon, alto contraste, foco na balada",
    },
  ],
};

// O que a página pública usa quando template_proposta vem null. Mantém o
// comportamento anterior à 059: debutante caía no clássico.
export const TEMPLATE_PADRAO_POR_TIPO: Partial<
  Record<EventType, TemplateProposta>
> = {
  debutante: "debutante_classico",
};
