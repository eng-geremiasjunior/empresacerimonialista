// O que cada convite (modelos/cNN/modelo.ts) entrega ao motor, e as duas
// ferramentas que os modelos usam: trocar() — texto fixo do desenho vira
// campo, declarado e conferido — e mapaDaPaleta() — a paleta escolhida
// vira o mapa de cores do motor/ajuste.ts.

import type { ClasseDoConvite } from "./dc-logic";

export type DefinicaoDoConvite = {
  /** a marcação do desenho com as trocas declaradas */
  marcacao: string;
  /** o <style> do <helmet> do desenho */
  estiloGlobal: string;
  Logica: ClasseDoConvite;
  /** as props padrão do desenho (data-props) que valem num convite de verdade: modo do nome, frase… */
  padroes: Record<string, unknown>;
  /**
   * O texto de mentira do desenho (local, endereço, pais…): só no exemplo.
   * No convite de verdade, campo que a noiva não preencheu sai vazio —
   * nunca "Espaço Villa Toscana" no convite dela.
   */
  exemplo: Record<string, string>;
  /**
   * Valores que o modelo calcula das props (depois de montadas), para um
   * texto fixo do desenho que só vale em certos casos — ex.: o ", ao
   * entardecer" do 02 só com a hora no fim da tarde.
   */
  derivar?: (props: Record<string, unknown>) => Record<string, unknown>;
};

/** A hora (0–23) de um dataISO "2027-06-12T17:00:00"; sem hora, null. */
export function horaDoISO(v: unknown): number | null {
  const m = /T(\d{2}):/.exec(typeof v === "string" ? v : "");
  return m ? Number(m[1]) : null;
}

/**
 * Troca cada trecho fixo do desenho por um campo ("{{ local }}"). O trecho
 * precisa aparecer exatamente `vezes` vezes (padrão 1): se o desenho mudar e
 * a troca não casar, o erro aparece na hora, não no convite da noiva.
 */
export function trocar(marcacao: string, trocas: ReadonlyArray<readonly [string, string, number?]>): string {
  let r = marcacao;
  for (const [de, para, vezes = 1] of trocas) {
    const achadas = r.split(de).length - 1;
    if (achadas !== vezes) throw new Error(`convite: "${de}" aparece ${achadas} vez(es), esperado ${vezes}`);
    r = r.split(de).join(para);
  }
  return r;
}

/** Os padrões das props do desenho (dados.ts) como objeto simples. */
export function padroesDo(desenho: Record<string, { padrao: unknown }>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(desenho).map(([k, v]) => [k, v.padrao]));
}

/**
 * Uma paleta do convite: o nome que a noiva vê e a cor de cada papel. Os
 * papéis são os do desenho (paletas.ts de cada modelo guarda o ORIGINAL,
 * papel → hex do desenho); a paleta dá o hex novo de cada papel.
 */
export type PaletaDoConvite<P extends string = string> = {
  id: string;
  nome: string;
  cores: Record<P, string>;
};

/** Papel a papel: hex do desenho → hex da paleta (só o que muda). */
export function mapaDaPaleta<P extends string>(
  original: Record<P, string>,
  paleta: PaletaDoConvite<P> | null | undefined
): Record<string, string> {
  const mapa: Record<string, string> = {};
  if (!paleta) return mapa;
  for (const papel of Object.keys(original) as P[]) {
    const de = original[papel].toLowerCase();
    const para = (paleta.cores[papel] || de).toLowerCase();
    if (de !== para) mapa[de] = para;
  }
  return mapa;
}
