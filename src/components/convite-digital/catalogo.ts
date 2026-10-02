// O catálogo dos convites animados (design_handoff_convites, 02/10/2026):
// só dados — nome, fonte padrão, paletas e os campos que cada modelo tem.
// A marcação e a lógica de cada um carregam sob demanda (carregar.ts), para
// a página de um convite não baixar os outros oito.
//
// Convite ≠ site: o convite é o que o convidado recebe pelo WhatsApp e abre
// no celular, com um botão só, que leva ao site do casal. A confirmação de
// presença fica no site.

import type { ParDeFonte } from "@/lib/site-pares";
import type { PaletaDoConvite } from "./motor/modelo";
import * as P01 from "./modelos/c01/paletas";
import * as P02 from "./modelos/c02/paletas";
import * as P03 from "./modelos/c03/paletas";
import * as P04 from "./modelos/c04/paletas";
import * as P05 from "./modelos/c05/paletas";
import * as P06 from "./modelos/c06/paletas";
import * as P07 from "./modelos/c07/paletas";
import * as P08 from "./modelos/c08/paletas";
import * as P09 from "./modelos/c09/paletas";

export type IdDoConvite = "c01" | "c02" | "c03" | "c04" | "c05" | "c06" | "c07" | "c08" | "c09";

export type ModeloDeConvite = {
  id: IdDoConvite;
  numero: string;
  nome: string;
  /** o efeito, em poucas palavras, para o seletor */
  resumo: string;
  fontePadrao: ParDeFonte;
  /** papel → hex do desenho */
  original: Record<string, string>;
  /** a primeira é sempre a do desenho */
  paletas: PaletaDoConvite[];
  /** os papéis que a amostra de cada paleta mostra */
  amostra: readonly string[];
  /** nomes dos pais dos noivos (só o 09) */
  pais: boolean;
  /** cerimônia e recepção em blocos separados (só o 09) */
  recepcao: boolean;
  /** o formato da abertura (só o 01) */
  formas: readonly string[] | null;
};

type Paletas = { ORIGINAL: Record<string, string>; PALETAS: PaletaDoConvite<never>[] | PaletaDoConvite<string>[]; AMOSTRA: readonly string[] };

function modelo(
  id: IdDoConvite,
  nome: string,
  resumo: string,
  fontePadrao: ParDeFonte,
  p: Paletas,
  extras: Partial<Pick<ModeloDeConvite, "pais" | "recepcao" | "formas">> = {}
): ModeloDeConvite {
  return {
    id,
    numero: id.slice(1),
    nome,
    resumo,
    fontePadrao,
    original: p.ORIGINAL,
    paletas: p.PALETAS as PaletaDoConvite[],
    amostra: p.AMOSTRA,
    pais: extras.pais ?? false,
    recepcao: extras.recepcao ?? false,
    formas: extras.formas ?? null,
  };
}

export const CONVITES: Record<IdDoConvite, ModeloDeConvite> = {
  c01: modelo("c01", "Violino", "Cordas e arco; abre no formato do violino", "caligrafia", P01, {
    formas: ["Violino", "Nota musical"],
  }),
  c02: modelo("c02", "Praiano", "A maré traz cada cena; pôr do sol no final", "bilhete", P02),
  c03: modelo("c03", "Conto de fadas", "Portões que se abrem, castelo e céu estrelado", "caligrafia", P03),
  c04: modelo("c04", "Folha que se abre", "Cartão marfim dobrado, que vira como página", "atelier", P04),
  c05: modelo("c05", "Livro envelhecido", "Capa de couro, chave de bronze e páginas antigas", "relicario", P05),
  c06: modelo("c06", "Veneza · Máscara", "A máscara de baile revela o convite", "caligrafia", P06),
  c07: modelo("c07", "Veneza · Lacre", "Envelope marmorizado e lacre de cera", "caligrafia", P07),
  c08: modelo("c08", "Veneza · Cortina", "Lustre aceso e cortinas de veludo", "caligrafia", P08),
  c09: modelo("c09", "Tradicional de luxo", "Caixa preta laqueada, laço de cetim e papel vegetal", "maison", P09, {
    pais: true,
    recepcao: true,
  }),
};

export const ORDEM_DOS_CONVITES: IdDoConvite[] = ["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09"];

export function ehIdDeConvite(x: unknown): x is IdDoConvite {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(CONVITES, x);
}

/** A paleta pedida, ou a do desenho quando o id não existe no modelo. */
export function paletaDoConvite(modelo: IdDoConvite, id: string | null | undefined): PaletaDoConvite {
  const m = CONVITES[modelo];
  return m.paletas.find((p) => p.id === id) ?? m.paletas[0];
}

/** O valor que a prop `fonte` do desenho espera ("04 Caligrafia"). */
export const ROTULO_DA_FONTE: Record<ParDeFonte, string> = {
  essencial: "01 Essencial",
  maison: "02 Maison",
  atelier: "03 Atelier",
  caligrafia: "04 Caligrafia",
  riviera: "05 Riviera",
  bilhete: "06 Bilhete",
  soiree: "07 Soirée",
  relicario: "08 Relicário",
};

/** Como os nomes aparecem (a prop `modoNome` do desenho). */
export const MODOS_DO_NOME = ["Nomes", "Iniciais", "Iniciais + nomes"] as const;
export type ModoDoNome = (typeof MODOS_DO_NOME)[number];
