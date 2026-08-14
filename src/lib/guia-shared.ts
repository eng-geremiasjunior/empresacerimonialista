// Guia de estilo — parte PURA (sem next/headers), importável por
// componentes "use client".

export type SituacaoGuia = "montagem" | "aguardando" | "aprovado" | "alterado";

export type PapelCor = "principal" | "apoio" | "neutro" | "acento";

export const PAPEL_COR_ROTULO: Record<PapelCor, string> = {
  principal: "principal",
  apoio: "apoio",
  neutro: "neutro",
  acento: "acento",
};

export type CorDoGuia = {
  id: string;
  nome: string;
  papel: PapelCor;
  hex: string;
  nota: string | null;
  fotoPath: string | null;
  fotoUrl: string | null;
  ordem: number;
};

export type FlorDoGuia = {
  id: string;
  nome: string;
  epoca: string | null;
  nota: string | null;
  fotoPath: string | null;
  fotoUrl: string | null;
  vetada: boolean;
  /** o motivo que a EQUIPE lê — pode citar alergia; nunca sai do sistema */
  motivoInterno: string | null;
  /** o motivo que vai para quem executa */
  motivoFornecedor: string | null;
  sensibilidade: "normal" | "alergia";
  ordem: number;
};

export type MaterialDoGuia = {
  id: string;
  nome: string;
  nota: string | null;
  fotoPath: string | null;
  fotoUrl: string | null;
  ordem: number;
};

export type TrajeDoGuia = {
  id: string;
  papel: "madrinhas" | "padrinhos";
  hex: string | null;
  descricao: string | null;
};

export type ReferenciaDoGuia = {
  id: string;
  assunto: string;
  /** o "o que agradou": a frase de quem escolheu a imagem */
  agradou: string | null;
  autor: string | null;
  fotoUrl: string | null;
  storagePath: string;
  origem: "cliente" | "equipe";
};

export type EventoHistorico = {
  id: string;
  tipo: "montado" | "enviado" | "aprovado" | "ajuste_pedido" | "alterado";
  texto: string;
  quando: string;
};

export type GuiaDeEstilo = {
  id: string;
  eventId: string;
  decisaoId: string | null;
  nome: string;
  sensacao: string | null;
  situacao: SituacaoGuia;
  aprovadoEm: string | null;
  aprovadoNome: string | null;
  papelaria: {
    fontes: string | null;
    nomeCasal: string | null;
    data: string | null;
    local: string | null;
    nota: string | null;
  };
  cores: CorDoGuia[];
  flores: FlorDoGuia[];
  materiais: MaterialDoGuia[];
  trajes: TrajeDoGuia[];
  referencias: ReferenciaDoGuia[];
  historico: EventoHistorico[];
};

export type PaletaDaBiblioteca = {
  id: string;
  nome: string;
  sensacao: string | null;
  /** true = acervo do sistema, legível por todas e editável por ninguém */
  doSistema: boolean;
  cores: { id: string; nome: string; papel: PapelCor; hex: string; ordem: number }[];
};

/** As seções que podem ser compartilhadas com um fornecedor, uma a uma. */
export const SECOES_GUIA = [
  "cores",
  "flores",
  "materiais",
  "trajes",
  "papelaria",
  "referencias",
] as const;

export type SecaoGuia = (typeof SECOES_GUIA)[number];

export const SECAO_ROTULO: Record<SecaoGuia, string> = {
  cores: "As cores",
  flores: "As flores",
  materiais: "Materiais e texturas",
  trajes: "Trajes",
  papelaria: "Papelaria",
  referencias: "Referências",
};

/**
 * O que cada tipo de fornecedor costuma precisar. É só uma sugestão de
 * marcação inicial na tela — a cerimonialista marca o que quiser, e é a
 * marcação dela que vale.
 */
export const SECOES_SUGERIDAS: Record<string, SecaoGuia[]> = {
  decoracao: ["cores", "flores", "materiais", "referencias"],
  flores: ["cores", "flores"],
  floricultura: ["cores", "flores"],
  papelaria: ["cores", "papelaria"],
  buffet: ["cores", "materiais"],
  fotografia: ["cores", "referencias"],
  traje: ["cores", "trajes"],
};

/** Só quatro situações, e cada uma tem uma frase — não um selo técnico. */
export const SITUACAO: Record<
  SituacaoGuia,
  { rotulo: string; frase: string; icone: string }
> = {
  montagem: {
    rotulo: "Em montagem",
    frase:
      "Sua cerimonialista está montando o guia. Algumas partes ainda vão aparecer.",
    icone: "Loader",
  },
  aguardando: {
    rotulo: "Para vocês verem",
    frase: "O guia está pronto. Deem uma olhada com calma.",
    icone: "Clock",
  },
  aprovado: {
    rotulo: "Aprovado",
    frase: "É esta a referência que vai para os fornecedores.",
    icone: "CheckCircle2",
  },
  alterado: {
    rotulo: "Mudou depois de aprovado",
    frase: "Algumas coisas mudaram desde a aprovação de vocês.",
    icone: "AlertCircle",
  },
};

/** Faixas da paleta: a cor principal é a mais alta e a mais larga. */
export const FAIXA_ALTURA = [190, 164, 142, 124, 110];
export const FAIXA_FLEX = [1.5, 1.15, 1, 0.85, 0.7];
export const FAIXA_LARGURA_MOBILE = ["46%", "34%", "30%", "26%", "24%"];
