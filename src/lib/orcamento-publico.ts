// Tipos e helpers da página pública do orçamento. O shape vem da RPC
// consultar_orcamento_publico — a tabela nunca é exposta. A Etapa 9
// ampliou a RPC para trazer também o conteúdo institucional, o processo,
// o FAQ e o portfólio numa única chamada.

export type OrcamentoPublicoItem = {
  nome: string;
  descricao: string | null;
  valor: number;
  tipo_calculo: "fixo" | "por_convidado" | "manual";
  valor_unitario: number | null;
  quantidade_convidados: number | null;
  taxa_fixa: number | null;
  // Slug da categoria do modelo de precificação (pode ser null quando o
  // item foi digitado à mão). Usado só para escolher o ícone.
  categoria: string | null;
};

export type InstitucionalPublico = {
  sobre_nos_texto: string | null;
  stat_anos_experiencia: number | null;
  stat_eventos_realizados: number | null;
  stat_dedicacao_percentual: number;
  stat_equipe_texto: string;
  condicao_entrada_percentual: number;
  condicao_parcelas_maximo: number;
  condicao_desconto_a_vista_percentual: number;
  condicao_prazo_parcelas_texto: string;
  whatsapp_contato: string | null;
  email_contato: string | null;
  responsabilidades_dia_evento: string[];
  pos_evento_cards: { titulo: string; descricao: string }[];
};

export type EtapaPublica = { titulo: string; descricao: string | null };
export type FaqPublico = { pergunta: string; resposta: string };
export type FotoPublica = { url: string; legenda: string | null };
export type DepoimentoPublico = {
  texto: string;
  autor: string;
  contexto: string | null;
};

export type OrcamentoPublicoData = {
  nome_contato: string;
  tipo_evento: string;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  numero_convidados: number | null;
  valor_total: number;
  data_criacao: string;
  data_validade: string;
  validade_dias: number;
  dias_restantes: number;
  status: "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado";
  respondido_em: string | null;
  ficha_preenchida: boolean;
  logo_url: string | null;
  nome_empresa: string;
  // null = a landing usa o asset padrão do sistema (ver lib/landing-imagens).
  hero_imagem_url: string | null;
  no_dia_evento_imagem_url: string | null;
  template_orcamento: string | null;
  itens: OrcamentoPublicoItem[];
  // Podem vir nulos/vazios se a empresa ainda não rodou a migração 045.
  institucional: InstitucionalPublico | null;
  etapas: EtapaPublica[];
  faq: FaqPublico[];
  fotos: FotoPublica[];
  depoimentos: DepoimentoPublico[];
};

export function expirado(d: OrcamentoPublicoData): boolean {
  return (
    d.status === "expirado" ||
    (d.status === "enviado" &&
      d.data_validade < new Date().toISOString().slice(0, 10))
  );
}

// Data/hora legível de uma resposta (respondido_em vem em ISO).
export function dataResposta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ---------- Paleta da landing pública ----------
// Peça de marketing voltada ao cliente final: identidade própria, distinta
// do painel administrativo (que é roxo/cinza).
export const T = {
  fundo: "#FAF6F2",
  card: "#FFFFFF",
  destaque: "#F6E9E6",
  borda: "#ECE0DA",
  texto: "#2E2621",
  texto2: "#5B4A43",
  texto3: "#8A7B73",
  acento: "#A85950",
  dourado: "#A6824F",
} as const;

// Âncoras da navegação lateral, na ordem da página.
export const SECOES = [
  { id: "apresentacao", label: "Apresentação" },
  { id: "sobre-nos", label: "Sobre nós" },
  { id: "incluso", label: "O que está incluso" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "dia-evento", label: "No dia do evento" },
  { id: "pos-evento", label: "Pós-evento" },
  { id: "investimento", label: "Investimento" },
  { id: "faq", label: "Perguntas frequentes" },
  { id: "eventos", label: "Eventos realizados" },
  { id: "depoimentos", label: "Depoimentos" },
] as const;
