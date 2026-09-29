// O estoque da empresa — as regras, sem tela e sem banco (184).
//
// Acervo (cadeira, taça, toalha: volta do evento) e consumível (água,
// vela: não volta). O saldo é a soma dos movimentos; a reserva desconta
// do disponível, não do saldo. Este módulo é puro: a tela e o servidor
// importam daqui, e a conta pode ser testada sem banco.

export type CategoriaEstoque = {
  id: string;
  nome: string;
  reutilizavel: boolean;
  ordem: number;
  itens: number;
};

export type ItemEstoque = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  categoriaId: string | null;
  categoriaNome: string | null;
  reutilizavel: boolean;
  minimo: number | null;
  custoUnitario: number | null;
  validade: string | null;
  observacao: string | null;
  ativo: boolean;
  saldo: number;
  entradas: number;
  reservado: number;
  /** separado para um evento e ainda não voltou */
  fora: number;
  disponivelHoje: number;
  minimoEfetivo: number;
  abaixoDoMinimo: boolean;
  reservasAbertas: number;
};

export const UNIDADES = [
  "unidades",
  "kg",
  "litros",
  "garrafas",
  "latas",
  "caixas",
  "pacotes",
  "metros",
  "jogos",
  "pares",
] as const;

/** O que a família e a cerimonialista nunca veem: só a equipe. */
export const CARGOS_QUE_ESCREVEM = ["proprietaria", "coordenadora", "cerimonialista"] as const;

/**
 * A chave estável do item — a MESMA normalização de criarRecurso (Operação):
 * "Cadeira Tiffany" tem o mesmo código na planilha, no método e no
 * acervo, senão nada casa com nada.
 */
export function codigoDoItem(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "item"
  );
}

/** Dias de hoje até a data (negativo = já passou). */
export function diasAte(iso: string, hojeIso: string): number {
  const a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const b = Date.UTC(+hojeIso.slice(0, 4), +hojeIso.slice(5, 7) - 1, +hojeIso.slice(8, 10));
  return Math.round((a - b) / 86_400_000);
}

export function valorEmEstoque(i: Pick<ItemEstoque, "saldo" | "custoUnitario">): number | null {
  if (i.custoUnitario == null) return null;
  return Math.max(0, i.saldo) * i.custoUnitario;
}

/**
 * O estado do item numa frase, ou null quando não há o que dizer.
 * Falar em tempo e em fato, nunca em cor.
 */
export function estadoDoItem(i: ItemEstoque, hojeIso: string): string | null {
  const partes: string[] = [];
  if (i.abaixoDoMinimo) partes.push("abaixo do mínimo");
  if (i.validade) {
    const d = diasAte(i.validade, hojeIso);
    if (d < 0) partes.push("venceu");
    else if (d <= 30) partes.push(d === 0 ? "vence hoje" : `vence em ${d} ${d === 1 ? "dia" : "dias"}`);
  }
  if (i.fora > 0) partes.push(`${numero(i.fora)} fora do depósito`);
  else if (i.reservado > 0) partes.push(`${numero(i.reservado)} ${i.reservado === 1 ? "reservada" : "reservadas"}`);
  return partes.length ? partes.join(" · ") : null;
}

export type ResumoDoEstoque = {
  itens: number;
  valor: number | null;
  abaixoDoMinimo: number;
  vencendo: number;
  semCusto: number;
};

export function resumoDoEstoque(itens: ItemEstoque[], hojeIso: string): ResumoDoEstoque {
  let valor: number | null = null;
  let abaixo = 0;
  let vencendo = 0;
  let semCusto = 0;
  for (const i of itens) {
    if (!i.ativo) continue;
    const v = valorEmEstoque(i);
    if (v != null) valor = (valor ?? 0) + v;
    else if (i.saldo > 0) semCusto++;
    if (i.abaixoDoMinimo) abaixo++;
    if (i.validade) {
      const d = diasAte(i.validade, hojeIso);
      if (d <= 30) vencendo++;
    }
  }
  return { itens: itens.filter((i) => i.ativo).length, valor, abaixoDoMinimo: abaixo, vencendo, semCusto };
}

/** Número curto: sem casas quando é inteiro, até três quando não é. */
export function numero(v: number | null | undefined): string {
  if (v == null) return "—";
  const inteiro = Math.abs(v % 1) < 0.0005;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: inteiro ? 0 : 3,
  });
}

export function reais(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ------------------------------------------------------------------ */
/* Categoria sugerida — pelo nome, sem IA                              */
/* ------------------------------------------------------------------ */

const PISTAS: [RegExp, string][] = [
  [/\bmesa/i, "Mesas"],
  [/cadeira|banqueta|poltrona|sof[aá]|pufe/i, "Cadeiras"],
  [/ta[çc]a|copo de vidro|prato|talher|garfo|faca|colher|lou[çc]a|x[ií]cara|jarra|bandeja/i, "Louça e taças"],
  [/toalha|guardanapo de tecido|tecido|forro|capa de cadeira|la[çc]o|cortina|tapete|passadeira/i, "Toalhas e tecidos"],
  [/[áa]gua|refri|cerveja|vinho|espumante|suco|energ[ée]tico|destilado|vodka|whisk|gelo/i, "Bebidas"],
  [/descart|copo pl[áa]stico|guardanapo de papel|canudo|sacola|pl[áa]stico|papel toalha/i, "Descartáveis"],
  [/vela|arranjo|flor|vaso|centro de mesa|painel|bal[ãa]o|lumin[áa]ria|led|castical|casti[çc]al|cilindro|bandeja decor/i, "Decoração"],
];

/** O id da categoria que o nome sugere, ou null. */
export function categoriaSugerida(
  nome: string,
  categorias: { id: string; nome: string }[]
): string | null {
  const alvo = PISTAS.find(([re]) => re.test(nome))?.[1];
  if (!alvo) return null;
  const cat = categorias.find((c) => codigoDoItem(c.nome) === codigoDoItem(alvo));
  return cat?.id ?? null;
}

/* ------------------------------------------------------------------ */
/* Planilha e CSV — o controle que ela já tem, sem redigitar           */
/* ------------------------------------------------------------------ */

export type LinhaLida = {
  nome: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number | null;
  categoriaNome: string | null;
};

const CAB_NOME = /^(item|nome|descri|produto|material|equipamento)/i;
const CAB_QTD = /^(qtd|quant|qde|estoque|saldo|total)/i;
const CAB_UNIDADE = /^(unid|un\.?$|medida)/i;
const CAB_CUSTO = /^(custo|valor|pre[çc]o|unit)/i;
const CAB_CATEGORIA = /^(categ|grupo|tipo|se[çc][ãa]o)/i;

function celula(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  return String(v).trim();
}

/** "1.250,50" → 1250.5 · "12" → 12 · "R$ 15,00" → 15 */
export function numeroBR(texto: string): number | null {
  const t = texto.replace(/[^\d,.-]/g, "");
  if (!t) return null;
  const semMilhar = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(semMilhar);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lê as linhas de uma planilha como itens de estoque. Reconhece o
 * cabeçalho pelas palavras usuais; sem cabeçalho, assume "nome |
 * quantidade | unidade | custo" na ordem das colunas e avisa.
 */
export function lerPlanilhaDeEstoque(linhas: unknown[][]): { itens: LinhaLida[]; semCabecalho: boolean } {
  const limpas = linhas
    .map((l) => (Array.isArray(l) ? l.map(celula) : []))
    .filter((l) => l.some((c) => c !== ""));
  if (limpas.length === 0) return { itens: [], semCabecalho: true };

  const cab = limpas[0];
  const col = {
    nome: cab.findIndex((c) => CAB_NOME.test(c)),
    qtd: cab.findIndex((c) => CAB_QTD.test(c)),
    unidade: cab.findIndex((c) => CAB_UNIDADE.test(c)),
    custo: cab.findIndex((c) => CAB_CUSTO.test(c)),
    categoria: cab.findIndex((c) => CAB_CATEGORIA.test(c)),
  };
  const temCabecalho = col.nome >= 0 && col.qtd >= 0;
  const corpo = temCabecalho ? limpas.slice(1) : limpas;
  if (!temCabecalho) {
    col.nome = 0;
    col.qtd = 1;
    col.unidade = 2;
    col.custo = 3;
    col.categoria = -1;
  }

  const itens: LinhaLida[] = [];
  for (const l of corpo) {
    const nome = (l[col.nome] ?? "").slice(0, 80);
    const quantidade = numeroBR(l[col.qtd] ?? "");
    if (!nome || quantidade == null || quantidade <= 0) continue;
    const unidade = (col.unidade >= 0 ? l[col.unidade] : "")?.toLowerCase().slice(0, 20) || "unidades";
    const custo = col.custo >= 0 ? numeroBR(l[col.custo] ?? "") : null;
    itens.push({
      nome,
      quantidade,
      unidade,
      custoUnitario: custo != null && custo >= 0 ? custo : null,
      categoriaNome: col.categoria >= 0 ? l[col.categoria] || null : null,
    });
  }
  return { itens, semCabecalho: !temCabecalho };
}

/** CSV com ; ou , e aspas simples de planilha. */
export function lerCsv(texto: string): string[][] {
  const sep = (texto.match(/;/g)?.length ?? 0) >= (texto.match(/,/g)?.length ?? 0) ? ";" : ",";
  return texto
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const cels: string[] = [];
      let atual = "";
      let aspas = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') {
          if (aspas && l[i + 1] === '"') {
            atual += '"';
            i++;
          } else aspas = !aspas;
        } else if (ch === sep && !aspas) {
          cels.push(atual);
          atual = "";
        } else atual += ch;
      }
      cels.push(atual);
      return cels;
    });
}

/* ------------------------------------------------------------------ */
/* O que vai para cada evento                                          */
/* ------------------------------------------------------------------ */

export type ReservaDoEvento = {
  id: string;
  itemId: string;
  itemNome: string;
  unidade: string;
  categoriaNome: string | null;
  categoriaOrdem: number;
  reutilizavel: boolean;
  quantidade: number;
  separadoEm: string | null;
  fechadoEm: string | null;
  devolvido: number | null;
  consumido: number | null;
  perdido: number | null;
  eventoRecursoId: string | null;
};

export type ConflitoDeEstoque = {
  itemId: string;
  itemNome: string;
  pedido: number;
  saldo: number;
  falta: number;
  comQuem: string | null;
};

/** "faltam 40 cadeiras Tiffany (disputa com Ana e Leo)" */
export function fraseDoConflito(c: ConflitoDeEstoque): string {
  const base = `faltam ${numero(c.falta)} de ${c.itemNome}`;
  return c.comQuem ? `${base} (disputa com ${c.comQuem})` : base;
}
