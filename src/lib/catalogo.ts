// Catálogo: o conteúdo da proposta separado por tipo de evento.
//
// Até a migração 057 pacotes, textos, fotos e imagens eram únicos por
// empresa — mexer em qualquer um mudava toda proposta enviada. Agora cada
// tipo tem o seu, e este módulo é a lista canônica que a navegação, as
// server actions e o storage usam para falar do mesmo conjunto.

import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

// Mesma ordem na navegação e no índice. Casamento e debutante primeiro
// porque são o foco do produto; o resto segue por proximidade de uso.
export const TIPOS_CATALOGO: EventType[] = [
  "casamento",
  "debutante",
  "formatura",
  "aniversario",
  "bodas",
  "cha_revelacao",
  "batizado",
  "corporativo",
  "outro",
];

export const TIPO_PADRAO: EventType = "casamento";

// Uma linha em cada card do índice, para a tela não ser só uma lista de
// substantivos soltos.
export const TIPO_DESCRICAO: Record<EventType, string> = {
  casamento: "Pacotes de assessoria, cerimônia e festa",
  debutante: "Festa de 15 anos, valsa e produção",
  formatura: "Colação, baile e turma",
  aniversario: "Festas de aniversário em geral",
  bodas: "Renovação de votos e comemorações de casamento",
  cha_revelacao: "Chá revelação e chá de bebê",
  batizado: "Batizado e celebrações religiosas",
  corporativo: "Confraternizações e eventos de empresa",
  outro: "Para o que não se encaixa nos demais",
};

export const TIPO_EMOJI: Record<EventType, string> = {
  casamento: "💍",
  debutante: "👑",
  formatura: "🎓",
  aniversario: "🎂",
  bodas: "💐",
  cha_revelacao: "🎈",
  batizado: "🕊️",
  corporativo: "🏢",
  outro: "✨",
};

// Um tipo de evento que ela nunca abriu não tem linha em
// empresa_conteudo_institucional — os formulários precisam de algo para
// mostrar. Estes são os mesmos defaults das migrações 045 e 056, então a
// tela em branco já vem com valores coerentes com o que o banco gravaria.
export const CONTEUDO_PADRAO = {
  sobre_nos_texto: null,
  // 101 — citação em itálico do topo da proposta (null = padrão do template)
  citacao_hero: null as string | null,
  stat_anos_experiencia: null,
  stat_eventos_realizados: null,
  stat_dedicacao_percentual: 100,
  stat_equipe_texto: "Equipe Especializada",
  condicao_entrada_percentual: 30,
  condicao_parcelas_maximo: 7,
  condicao_desconto_a_vista_percentual: 5,
  condicao_prazo_parcelas_texto: "até 5 dias antes do evento",
  whatsapp_contato: null,
  email_contato: null,
  convidados_inclusos: 150,
  valor_por_convidado_extra: 12,
  convidados_min: 50,
  convidados_max: 300,
  hero_imagem_url: null,
  no_dia_evento_imagem_url: null,
  video_url: null as string | null,
};

// A rota é /catalogo/[tipo]; qualquer coisa fora da lista vira 404 em vez
// de gravar um tipo_evento que o check da 057 recusaria.
export function tipoValido(valor: string | undefined): EventType | null {
  return TIPOS_CATALOGO.includes(valor as EventType)
    ? (valor as EventType)
    : null;
}

export function rotuloTipo(tipo: EventType): string {
  return EVENT_TYPE_LABELS[tipo] ?? tipo;
}
