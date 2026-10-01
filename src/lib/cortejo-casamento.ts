// O cortejo do casamento como ele acontece (192, 01/10/2026): UMA sequência
// de entradas, na ordem em que entram, e não listas soltas por grupo. Cada
// entrada é uma pessoa ou um par ("Ana e Pedro"), com o lado (do noivo ou
// da noiva), a música e o que leva. O pedido do dono: "esse cortejo nosso
// ficou bem preguiçoso", e quem monta é a cerimonialista.
//
// Módulo puro (servidor e navegador). As listas antigas por grupo continuam
// valendo para a formatura e o 15 anos (portal-pessoas-shared.ts).

export type LadoDoCortejo = "noivo" | "noiva";

export type PapelDoCortejo = {
  papel: string;
  /** como aparece na entrada ("Padrinhos", "Noiva") */
  rotulo: string;
  /** a entrada costuma ter duas pessoas */
  comPar: boolean;
  /** a dica do segundo campo ("com quem entra") */
  parDica?: string;
  /** o lado faz sentido nesta entrada */
  comLado?: boolean;
};

/** Os papéis do casamento, na ordem em que costumam entrar. */
export const PAPEIS_DO_CORTEJO: PapelDoCortejo[] = [
  { papel: "celebrante", rotulo: "Celebrante", comPar: false },
  { papel: "noivo", rotulo: "Noivo", comPar: true, parDica: "Entra com (a mãe, por exemplo)" },
  { papel: "pais", rotulo: "Pais", comPar: true, comLado: true },
  { papel: "avos", rotulo: "Avós", comPar: true, comLado: true },
  { papel: "padrinho", rotulo: "Padrinhos", comPar: true, comLado: true },
  { papel: "madrinha", rotulo: "Madrinha", comPar: false, comLado: true },
  { papel: "testemunha", rotulo: "Testemunhas", comPar: true, comLado: true },
  { papel: "florista", rotulo: "Pétalas", comPar: true },
  { papel: "dama", rotulo: "Daminhas", comPar: true },
  { papel: "pajem", rotulo: "Pajens", comPar: true },
  { papel: "porta_alianca", rotulo: "Alianças", comPar: true },
  { papel: "noiva", rotulo: "Noiva", comPar: true, parDica: "Entra com (o pai, por exemplo)" },
  { papel: "outro", rotulo: "Outra entrada", comPar: true, comLado: true },
];

const POR_PAPEL = new Map(PAPEIS_DO_CORTEJO.map((p) => [p.papel, p]));

export function papelDoCortejo(papel: string): PapelDoCortejo {
  return POR_PAPEL.get(papel) ?? { papel, rotulo: papel.replace(/_/g, " "), comPar: true, comLado: true };
}

export const ehPapelDoCortejo = (papel: string) => POR_PAPEL.has(papel);

/** A posição do papel na ordem típica de entrada (desconhecido = antes da noiva). */
export function posicaoDoPapel(papel: string): number {
  const i = PAPEIS_DO_CORTEJO.findIndex((p) => p.papel === papel);
  return i >= 0 ? i : PAPEIS_DO_CORTEJO.length - 2;
}

export const ROTULO_DO_LADO: Record<LadoDoCortejo, string> = {
  noivo: "lado do noivo",
  noiva: "lado da noiva",
};

export type EntradaDoCortejo = {
  id: string;
  papel: string;
  nome: string;
  par: string | null;
  lado: LadoDoCortejo | null;
  musica: string | null;
  oQueLeva: string | null;
  ordem: number;
};

/** A sequência: pela ordem gravada; empate (lista antiga) pela ordem típica. */
export function emSequencia<T extends { papel: string; ordem: number; nome: string }>(lista: T[]): T[] {
  return lista
    .slice()
    .sort((a, b) => a.ordem - b.ordem || posicaoDoPapel(a.papel) - posicaoDoPapel(b.papel) || a.nome.localeCompare(b.nome));
}

/** "Ana e Pedro", "Ana & Pedro", "Ana / Pedro" → ["Ana", "Pedro"]. */
export function separarPar(linha: string): { nome: string; par: string | null } {
  const partes = linha.split(/\s+(?:e|&|\/|com)\s+|\s*[&/]\s*/i).map((s) => s.trim()).filter(Boolean);
  if (partes.length < 2) return { nome: linha.trim(), par: null };
  return { nome: partes[0], par: partes.slice(1).join(" e ") };
}

/** Quem entra, para ler na tela e na folha ("Ana e Pedro"). */
export function quemEntra(e: { nome: string; par: string | null }): string {
  return [e.nome.trim(), (e.par ?? "").trim()].filter(Boolean).join(" e ");
}

/**
 * O cortejo tradicional, para começar sem página em branco. Noivo e noiva
 * já com o nome do casal; o resto fica "a definir" para ela preencher ou
 * tirar. A ordem é a mais comum no Brasil e muda de casamento para
 * casamento: tudo se arrasta depois.
 */
export function cortejoTradicional(noiva: string, noivo: string) {
  return [
    { papel: "celebrante", nome: "", par: null, lado: null },
    { papel: "noivo", nome: noivo, par: "", lado: null },
    { papel: "pais", nome: "", par: "", lado: "noivo" },
    { papel: "pais", nome: "", par: "", lado: "noiva" },
    { papel: "padrinho", nome: "", par: "", lado: "noivo" },
    { papel: "padrinho", nome: "", par: "", lado: "noiva" },
    { papel: "dama", nome: "", par: null, lado: null },
    { papel: "porta_alianca", nome: "", par: null, lado: null },
    { papel: "noiva", nome: noiva, par: "", lado: null },
  ] as { papel: string; nome: string; par: string | null; lado: LadoDoCortejo | null }[];
}
