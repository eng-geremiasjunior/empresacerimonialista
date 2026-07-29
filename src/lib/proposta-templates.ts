// Templates de proposta que a cerimonialista escolhe por orçamento.
//
// Hoje só debutante tem mais de um; casamento tem um só e nem aparece no
// seletor. O valor é gravado em orcamentos.template_proposta (059) e a
// página pública roteia por ele. null = padrão do tipo.

import type { EventType } from "@/lib/types";

export type TemplateProposta =
  | "debutante_classico"
  | "debutante_glam"
  | "casamento_v2"
  | "casamento_maison";

// Opções mostradas no form de orçamento, por tipo de evento. Um tipo fora
// deste mapa não mostra seletor — usa o template único do seu tipo.
export const TEMPLATES_POR_TIPO: Partial<
  Record<EventType, { valor: TemplateProposta; nome: string; descricao: string }[]>
> = {
  casamento: [
    {
      valor: "casamento_v2",
      nome: "Clássico",
      descricao: "Creme e dourado, com calculadora de pacotes",
    },
    {
      valor: "casamento_maison",
      nome: "Maison Lumière",
      descricao: "Alta-costura, sóbrio, valor único sem pacotes",
    },
  ],
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
// comportamento anterior: casamento caía no V2, debutante no clássico —
// então nenhuma proposta já enviada muda de aparência.
export const TEMPLATE_PADRAO_POR_TIPO: Partial<
  Record<EventType, TemplateProposta>
> = {
  casamento: "casamento_v2",
  debutante: "debutante_classico",
};
