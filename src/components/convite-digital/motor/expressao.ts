// O avaliador das expressões {{ ... }} da marcação, o mesmo do runtime do
// desenho (support.js, src/expr.ts): literais (true, false, null, undefined,
// número, texto entre aspas), caminhos (a.b, a[0], a[b]), igualdade (==, !=,
// ===, !==), negação (!) e parênteses. Nada de eval: o que não for isso dá
// undefined.

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*/;
const NUMERO = /^-?\d+(\.\d+)?$/;

type Vals = Record<string, unknown> | null | undefined;

function parentesesEnvolvemTudo(expr: string): boolean {
  let fundo = 0;
  for (let i = 0; i < expr.length - 1; i++) {
    if (expr[i] === "(") fundo++;
    else if (expr[i] === ")") {
      fundo--;
      if (fundo === 0) return false;
    }
  }
  return true;
}

function igualdadeNoTopo(expr: string): { indice: number; op: string } | null {
  let fundo = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "[" || c === "(") fundo++;
    else if (c === "]" || c === ")") fundo--;
    else if (fundo === 0 && (c === "=" || c === "!") && expr[i + 1] === "=") {
      if (i > 0 && (expr[i - 1] === "=" || expr[i - 1] === "!")) continue;
      if (!expr.slice(0, i).trim()) continue;
      const op = expr[i + 2] === "=" ? c + "==" : c + "=";
      return { indice: i, op };
    }
  }
  return null;
}

function caminho(vals: Vals, expr: string): unknown {
  const cabeca = expr.match(IDENT);
  if (!cabeca) return undefined;
  let atual: unknown = vals == null ? undefined : (vals as Record<string, unknown>)[cabeca[0]];
  let i = cabeca[0].length;
  while (i < expr.length) {
    if (expr[i] === ".") {
      const m = expr.slice(i + 1).match(IDENT) || expr.slice(i + 1).match(/^\d+/);
      if (!m) return undefined;
      atual = atual == null ? undefined : (atual as Record<string, unknown>)[m[0]];
      i += 1 + m[0].length;
    } else if (expr[i] === "[") {
      let fundo = 1;
      let j = i + 1;
      while (j < expr.length && fundo > 0) {
        if (expr[j] === "[") fundo++;
        else if (expr[j] === "]") {
          fundo--;
          if (fundo === 0) break;
        }
        j++;
      }
      if (fundo !== 0) return undefined;
      const chave = avaliar(vals, expr.slice(i + 1, j));
      atual = atual == null ? undefined : (atual as Record<string, unknown>)[String(chave)];
      i = j + 1;
    } else {
      return undefined;
    }
  }
  return atual;
}

export function avaliar(vals: Vals, fonte: string): unknown {
  const expr = String(fonte).trim();
  if (!expr) return undefined;
  if (expr[0] === "(" && expr[expr.length - 1] === ")" && parentesesEnvolvemTudo(expr)) {
    return avaliar(vals, expr.slice(1, -1));
  }
  const eq = igualdadeNoTopo(expr);
  if (eq) {
    const a = avaliar(vals, expr.slice(0, eq.indice));
    const b = avaliar(vals, expr.slice(eq.indice + eq.op.length));
    switch (eq.op) {
      case "===":
        return a === b;
      case "!==":
        return a !== b;
      case "==":
        return a == b;
      default:
        return a != b;
    }
  }
  if (expr[0] === "!") return !avaliar(vals, expr.slice(1));
  if (expr === "true") return true;
  if (expr === "false") return false;
  if (expr === "null") return null;
  if (expr === "undefined") return undefined;
  if (NUMERO.test(expr)) return Number(expr);
  if (expr.length >= 2 && (expr[0] === '"' || expr[0] === "'") && expr[expr.length - 1] === expr[0]) {
    return expr.slice(1, -1);
  }
  return caminho(vals, expr);
}

const INTEIRA = /^\s*\{\{([\s\S]+?)\}\}\s*$/;
const PEDACOS = /\{\{([\s\S]+?)\}\}/g;

/** Como o compileAttr do runtime: "{{ x }}" sozinho devolve o valor cru; misturado com texto, junta em texto. */
export function compilarAtributo(bruto: string): (vals: Vals) => unknown {
  const inteira = bruto.match(INTEIRA);
  if (inteira) {
    const expr = inteira[1];
    return (vals) => avaliar(vals, expr);
  }
  if (bruto.includes("{{")) {
    const partes = bruto.split(PEDACOS);
    return (vals) => partes.map((s, i) => (i & 1 ? (avaliar(vals, s) ?? "") : s)).join("");
  }
  return () => bruto;
}

/** Divide um texto em pedaços fixos (pares) e expressões (ímpares). */
export function partesDoTexto(texto: string): string[] {
  return texto.split(PEDACOS);
}
