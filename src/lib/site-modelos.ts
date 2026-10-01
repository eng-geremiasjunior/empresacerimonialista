// Os 6 modelos de site de casamento (desenho do dono, 30/09/2026).
//
// Só dados, sem React: o renderizador escolhe o desenho por aqui, o editor
// da noiva mostra só os blocos que o modelo desenha e convida a foto na
// forma certa de cada espaço. Os valores vêm dos protótipos do handoff
// (.claude/plans/modelos-de-site/handoff) — não arredondar.
//
// "convite" é o site de hoje (ConviteCompleto): é o padrão dos sites já
// aprovados e dos outros tipos de evento. Tema sem modelo cai nele, para
// nada publicado mudar de cara sem passar pela revisão do dono.

import type { TipoBloco } from "@/lib/site-blocos";
import type { ParDeFonte } from "@/lib/site-pares";

export type ModeloNovo = "classico" | "aliancas" | "cartoes" | "monograma" | "franca" | "violino";
export type ModeloId = "convite" | ModeloNovo;

/** Os tipos que entram com a migração 191 ainda não estão em
 *  TIPOS_DE_BLOCO; até lá, ficam como strings ao lado. */
export type TipoDeBlocoDoModelo = TipoBloco | "cenas" | "jeito";

export type FormaDoEspaco = "retangulo" | "arco" | "circulo" | "oval";

/** Proporção de um espaço que ocupa a tela: retrato no celular, paisagem
 *  no computador. Não cabe numa razão fixa, então o editor pede cover com
 *  ponto de foco no meio. */
export const PROPORCAO_TELA = "tela";

export type EspacoDeFoto = {
  forma: FormaDoEspaco;
  /** razão do CSS ("4/5", "3/4.4") ou PROPORCAO_TELA */
  proporcao: string;
  /** quantas vezes o espaço se repete; ausente = 1 */
  quantos?: number;
  /** o espaço é de cada item da lista (marco, presente, par, cena), não
   *  uma posição fixa; quantos = quantos o desenho mostra */
  porItem?: boolean;
};

export type DefinicaoDoModelo = {
  nome: string;
  /** o número do desenho ("01"…"06") */
  numero: string;
  tiposDeEvento: string[];
  parPadrao: ParDeFonte;
  paletas: string[];
  paletaPadrao: string;
  /** os tipos de bloco que o modelo desenha, na ordem do desenho */
  desenha: TipoDeBlocoDoModelo[];
  /** cada espaço de foto de cada bloco, na ordem em que aparece */
  espacos: Record<string, EspacoDeFoto[]>;
};

// Os blocos que funcionam e o handoff não desenhou: entram em todos os
// modelos no estilo de cada um (BlocosNoEstilo), para trocar de modelo
// nunca esconder o que a família já usa.
const SEM_DESENHO_NO_HANDOFF: TipoDeBlocoDoModelo[] = ["hospedagem", "album", "playlist", "mural", "texto"];

const CASAL = ["casamento", "bodas"];

// T03 e T04: o mesmo esqueleto (dock, cartões, onda, galeria, presentes).
const ESPACOS_CARTOES: Record<string, EspacoDeFoto[]> = {
  capa: [{ forma: "retangulo", proporcao: PROPORCAO_TELA }],
  historia: [{ forma: "retangulo", proporcao: "16/10", quantos: 5, porItem: true }],
  // meia largura do container × min-height 460px (~590×460 em 1440)
  local: [{ forma: "retangulo", proporcao: "59/46" }],
  presentes: [{ forma: "retangulo", proporcao: "4/3", quantos: 6, porItem: true }],
  // grade de 4 colunas, linhas de clamp(120px,15vw,210px): 2×2, 1×1, 1×2,
  // 1×1, 2×1, 2×1 — proporções medidas em 1440
  galeria: [
    { forma: "retangulo", proporcao: "4/3" },
    { forma: "retangulo", proporcao: "4/3" },
    { forma: "retangulo", proporcao: "2/3" },
    { forma: "retangulo", proporcao: "4/3" },
    { forma: "retangulo", proporcao: "11/4" },
    { forma: "retangulo", proporcao: "11/4" },
  ],
  especiais: [{ forma: "circulo", proporcao: "1/1", quantos: 3, porItem: true }],
};

// T05 e T06: postais, janela do château, molduras de ouro, boutique.
const ESPACOS_FRANCA_GALERIA: EspacoDeFoto[] = [
  { forma: "retangulo", proporcao: "4/5" },
  { forma: "oval", proporcao: "3/4" },
  { forma: "retangulo", proporcao: "1/1" },
  { forma: "retangulo", proporcao: "16/10" },
  { forma: "oval", proporcao: "3/4" },
];

export const MODELOS: Record<ModeloNovo, DefinicaoDoModelo> = {
  classico: {
    nome: "Clássico",
    numero: "01",
    tiposDeEvento: CASAL,
    parPadrao: "caligrafia",
    paletas: ["marfim", "salvia", "rose", "azul", "noite"],
    paletaPadrao: "marfim",
    desenha: [
      "capa",
      "historia",
      "momentos",
      "contagem",
      "local",
      "dress_code",
      "rsvp",
      "presentes",
      "jeito",
      "galeria",
      "especiais",
      "mensagem",
      ...SEM_DESENHO_NO_HANDOFF,
      "rodape",
    ],
    espacos: {
      capa: [{ forma: "retangulo", proporcao: PROPORCAO_TELA }],
      // a foto do casal da história (foto_casal_path); os marcos do T01
      // são só ano e título
      historia: [{ forma: "retangulo", proporcao: "4/5" }],
      local: [{ forma: "retangulo", proporcao: "16/8" }],
      dress_code: [
        { forma: "retangulo", proporcao: "3/4" },
        { forma: "retangulo", proporcao: "3/4.6" },
        { forma: "retangulo", proporcao: "3/4" },
      ],
      presentes: [{ forma: "retangulo", proporcao: "4/3", quantos: 4, porItem: true }],
      galeria: [
        { forma: "retangulo", proporcao: "16/9" },
        { forma: "retangulo", proporcao: "4/5" },
        { forma: "retangulo", proporcao: "4/5" },
        { forma: "retangulo", proporcao: "16/9" },
      ],
      // duas fotos por par, sobrepostas
      especiais: [{ forma: "circulo", proporcao: "1/1", quantos: 2, porItem: true }],
    },
  },
  aliancas: {
    nome: "Alianças",
    numero: "02",
    tiposDeEvento: CASAL,
    parPadrao: "caligrafia",
    paletas: ["ouro"],
    paletaPadrao: "ouro",
    desenha: [
      "capa",
      "historia",
      "momentos",
      "contagem",
      "local",
      "dress_code",
      "rsvp",
      "presentes",
      "jeito",
      "galeria",
      "especiais",
      "mensagem",
      ...SEM_DESENHO_NO_HANDOFF,
      "rodape",
    ],
    espacos: {
      capa: [{ forma: "arco", proporcao: "3/4" }],
      // polaroids da história horizontal
      historia: [{ forma: "retangulo", proporcao: "4/5", quantos: 4, porItem: true }],
      local: [{ forma: "circulo", proporcao: "1/1" }],
      dress_code: [
        { forma: "arco", proporcao: "3/4.4" },
        { forma: "arco", proporcao: "3/5" },
        { forma: "arco", proporcao: "3/4.4" },
      ],
      presentes: [{ forma: "retangulo", proporcao: "1/1", quantos: 4, porItem: true }],
      galeria: [
        { forma: "arco", proporcao: "4/5" },
        { forma: "circulo", proporcao: "1/1" },
        { forma: "retangulo", proporcao: "4/3" },
        { forma: "retangulo", proporcao: "16/8" },
      ],
      // cápsula 150×200 (raio 999px): o mais perto das 4 formas é o oval
      especiais: [{ forma: "oval", proporcao: "3/4", quantos: 3, porItem: true }],
    },
  },
  cartoes: {
    nome: "Cartões",
    numero: "03",
    tiposDeEvento: CASAL,
    parPadrao: "atelier",
    paletas: ["pessego"],
    paletaPadrao: "pessego",
    desenha: [
      "capa",
      "contagem",
      "rsvp",
      "historia",
      "momentos",
      "local",
      "playlist",
      "presentes",
      "galeria",
      "dress_code",
      "especiais",
      "mensagem",
      ...SEM_DESENHO_NO_HANDOFF.filter((t) => t !== "playlist"),
      "rodape",
    ],
    espacos: ESPACOS_CARTOES,
  },
  monograma: {
    nome: "Monograma",
    numero: "04",
    tiposDeEvento: CASAL,
    parPadrao: "maison",
    paletas: ["pessego"],
    paletaPadrao: "pessego",
    desenha: [
      "capa",
      "contagem",
      "rsvp",
      "cenas",
      "historia",
      "momentos",
      "local",
      "playlist",
      "presentes",
      "galeria",
      "dress_code",
      "especiais",
      "mensagem",
      ...SEM_DESENHO_NO_HANDOFF.filter((t) => t !== "playlist"),
      "rodape",
    ],
    espacos: {
      ...ESPACOS_CARTOES,
      // o card sticky dos "Nossos momentos": quase a tela inteira
      cenas: [{ forma: "retangulo", proporcao: PROPORCAO_TELA, quantos: 5, porItem: true }],
    },
  },
  franca: {
    nome: "França",
    numero: "05",
    tiposDeEvento: CASAL,
    parPadrao: "riviera",
    paletas: ["marinho"],
    paletaPadrao: "marinho",
    desenha: [
      "capa",
      "mensagem",
      "historia",
      "local",
      "momentos",
      "dress_code",
      "contagem",
      "galeria",
      "presentes",
      "especiais",
      "rsvp",
      ...SEM_DESENHO_NO_HANDOFF,
      "rodape",
    ],
    espacos: {
      capa: [{ forma: "retangulo", proporcao: PROPORCAO_TELA }],
      // a foto do postal 3/4.3 menos margens e legenda: perto de 3/4
      historia: [{ forma: "retangulo", proporcao: "3/4", quantos: 4, porItem: true }],
      // a janela em arco que abre até a tela cheia
      local: [{ forma: "retangulo", proporcao: PROPORCAO_TELA }],
      galeria: ESPACOS_FRANCA_GALERIA,
      presentes: [{ forma: "retangulo", proporcao: "4/4.4", quantos: 6, porItem: true }],
      especiais: [{ forma: "oval", proporcao: "150/196", quantos: 3, porItem: true }],
    },
  },
  violino: {
    nome: "Violino",
    numero: "06",
    tiposDeEvento: CASAL,
    parPadrao: "caligrafia",
    paletas: ["marinho"],
    paletaPadrao: "marinho",
    desenha: [
      "capa",
      "mensagem",
      "historia",
      "local",
      "momentos",
      "dress_code",
      "contagem",
      "galeria",
      "presentes",
      "especiais",
      "rsvp",
      ...SEM_DESENHO_NO_HANDOFF,
      "rodape",
    ],
    espacos: {
      capa: [{ forma: "retangulo", proporcao: PROPORCAO_TELA }],
      // a trilha do varal: 8 a 10 cartões, foto perto de 4/5
      historia: [{ forma: "retangulo", proporcao: "4/5", quantos: 8, porItem: true }],
      local: [{ forma: "retangulo", proporcao: PROPORCAO_TELA }],
      galeria: ESPACOS_FRANCA_GALERIA,
      presentes: [{ forma: "retangulo", proporcao: "4/4.4", quantos: 6, porItem: true }],
      especiais: [{ forma: "oval", proporcao: "150/196", quantos: 3, porItem: true }],
    },
  },
};

export const MODELOS_NOVOS = Object.keys(MODELOS) as ModeloNovo[];

export function eModeloNovo(v: unknown): v is ModeloNovo {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(MODELOS, v);
}

/** O modelo gravado no tema. Ausente, desconhecido ou lixo = 'convite':
 *  o site aprovado nunca muda de cara por um valor que não entendemos. */
export function modeloDoTema(tema: unknown): ModeloId {
  if (!tema || typeof tema !== "object") return "convite";
  const m = (tema as Record<string, unknown>).modelo;
  return eModeloNovo(m) ? m : "convite";
}

/** Os modelos que a família pode escolher. Fora de casamento e bodas, só
 *  o Convite; quem já está no Convite continua vendo essa opção. */
export function modelosParaTipo(tipoDeEvento: string): ModeloId[] {
  const novos = MODELOS_NOVOS.filter((id) => MODELOS[id].tiposDeEvento.includes(tipoDeEvento));
  return ["convite", ...novos];
}

/** O modelo desenha esse tipo de bloco? 'convite' desenha o catálogo de
 *  hoje inteiro (quem decide lá é BLOCOS_PRONTOS). */
export function modeloDesenha(modelo: ModeloId, tipo: string): boolean {
  if (modelo === "convite") return true;
  return (MODELOS[modelo].desenha as string[]).includes(tipo);
}
