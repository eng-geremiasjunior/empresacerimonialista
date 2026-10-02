// A troca de aparência entre a versão no ar e a pendente, dita em
// palavras: "Modelo: Clássico → França". Só dados, sem React. Lê o tema
// como o site lê (modelo, par e paleta desconhecidos caem no padrão), para
// a frase dizer o que o convidado vai ver, não o que está gravado.

import type { TemaDoSite } from "@/lib/site-blocos";
import { MODELOS, modeloDoTema, nomeDoModelo } from "@/lib/site-modelos";
import { PARES_DE_FONTE, PAR_PADRAO, ehParDeFonte } from "@/lib/site-pares";
import { paletaDoModelo } from "@/lib/site-paletas";

const FORMA_DO_NOME: Record<string, string> = {
  nomes: "Nomes",
  iniciais: "Iniciais",
  "iniciais-nomes": "Iniciais e nomes",
};

type Lido = {
  modelo: string;
  fontes: string | null;
  paleta: string | null;
  nome: string | null;
  abertura: string | null;
  cores: string | null;
};

/** As cores livres do modelo de sempre ('convite'), num texto comparável (ordem fixa). */
function chaveDasCores(tema: TemaDoSite | null | undefined): string | null {
  const c = tema?.cores;
  if (!c || typeof c !== "object") return null;
  const partes = (["fundo", "superficie", "tinta", "suave", "acento"] as const)
    .map((p) => (typeof c[p] === "string" ? `${p}:${String(c[p]).toLowerCase()}` : ""))
    .filter(Boolean);
  return partes.length ? partes.join(",") : null;
}

function ler(tema: TemaDoSite | null | undefined, tipoDeEvento?: string | null): Lido {
  const m = modeloDoTema(tema);
  if (m === "convite") {
    return {
      modelo: nomeDoModelo(m, tipoDeEvento),
      fontes: null,
      paleta: null,
      nome: null,
      abertura: null,
      cores: chaveDasCores(tema),
    };
  }
  const pedido = tema?.fontes;
  const par = ehParDeFonte(pedido) ? pedido : PAR_PADRAO[m];
  const forma = typeof tema?.nome === "string" ? tema.nome : "nomes";
  return {
    modelo: nomeDoModelo(m, tipoDeEvento),
    fontes: PARES_DE_FONTE[par].nome,
    paleta: MODELOS[m].paletas.length > 1 ? paletaDoModelo(m, tema).nome : null,
    nome: FORMA_DO_NOME[forma] ?? FORMA_DO_NOME.nomes,
    // ausente = ligada, como o editor da noiva mostra (o portal grava a
    // chave ao nascer e ao trocar de modelo)
    abertura: tema?.abertura !== false ? "ligada" : "desligada",
    cores: null,
  };
}

const ROTULOS: [keyof Omit<Lido, "cores">, string][] = [
  ["modelo", "Modelo"],
  ["fontes", "Fontes"],
  ["paleta", "Paleta"],
  ["nome", "Nome"],
  ["abertura", "Abertura"],
];

/**
 * As linhas da troca. Sem versão no ar, a aparência pendente inteira, sem
 * seta. Com versão no ar, só o que mudou ("Modelo: Clássico → França");
 * nada mudou = lista vazia.
 */
export function trocasDeAparencia(
  pendente: TemaDoSite | null | undefined,
  noAr: TemaDoSite | null | undefined,
  temNoAr: boolean,
  tipoDeEvento?: string | null
): string[] {
  const depois = ler(pendente, tipoDeEvento);
  if (!temNoAr) {
    return ROTULOS.filter(([k]) => depois[k] !== null).map(([k, r]) => `${r}: ${depois[k]}`);
  }
  const antes = ler(noAr, tipoDeEvento);
  const linhas: string[] = [];
  for (const [k, r] of ROTULOS) {
    const a = antes[k];
    const d = depois[k];
    if (d === null || a === d) continue;
    linhas.push(a === null ? `${r}: ${d}` : `${r}: ${a} → ${d}`);
  }
  // pelo id gravado, não pelo nome que aparece (o nome mudou em 02/10/2026)
  if (modeloDoTema(pendente) === "convite" && modeloDoTema(noAr) === "convite" && antes.cores !== depois.cores) {
    linhas.push(depois.cores ? "Cores: trocadas" : "Cores: voltaram ao padrão");
  }
  return linhas;
}
