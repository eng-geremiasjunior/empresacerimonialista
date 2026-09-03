// O ciclo do recurso, em unidades. Módulo PURO (sem I/O) — o mesmo
// desenho de croqui-core e financeiro-core, para a conta poder ser
// testada sem banco.
//
// previsto → comprado → entrada → sobra, e consumido = entrada − sobra.
// É o mesmo ciclo que o dinheiro já tinha (previsto → alocado → pago);
// a diferença é que aqui se conta coisa.

export type RegraRecurso = "fixo" | "por_pessoa" | "por_unidade";

export type Recurso = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  regra: RegraRecurso;
  indice: number;
  baseQuantidade: number | null;
  baseOrigem: string | null;
  previsto: number | null;
  comprado: number | null;
  entrada: number | null;
  sobra: number | null;
  custoUnitario: number | null;
  acabouEm: string | null;
  supplierId: string | null;
  fornecedorNome: string | null;
  observacao: string | null;
  grupo: string | null;
  ordem: number;
};

/** Quanto realmente saiu. null enquanto a contagem do dia não fechou. */
export function consumido(r: Recurso): number | null {
  if (r.entrada == null || r.sobra == null) return null;
  return Math.max(0, r.entrada - r.sobra);
}

/** O que sobrou vale dinheiro — e é o número que dói. */
export function perda(r: Recurso): number | null {
  if (r.sobra == null || r.custoUnitario == null) return null;
  return r.sobra * r.custoUnitario;
}

/** O que se gastou de fato, em reais. */
export function custoConsumido(r: Recurso): number | null {
  const c = consumido(r);
  if (c == null || r.custoUnitario == null) return null;
  return c * r.custoUnitario;
}

/** O que a compra custou. */
export function custoComprado(r: Recurso): number | null {
  if (r.comprado == null || r.custoUnitario == null) return null;
  return r.comprado * r.custoUnitario;
}

/** O aprendizado deste evento: consumo por cabeça. */
export function consumoPorPessoa(r: Recurso): number | null {
  const c = consumido(r);
  if (c == null || !r.baseQuantidade) return null;
  return c / r.baseQuantidade;
}

export type Veredito =
  | { tipo: "aguardando" }
  | { tipo: "faltou"; hora: string | null }
  | { tipo: "sobrou"; quanto: number; perda: number | null }
  | { tipo: "certo" };

/**
 * O que aconteceu com este item. "Acabou" é pior que "sobrou": sobra é
 * dinheiro no lixo, ruptura é gente sem bebida no meio da festa — por
 * isso a hora aparece quando existe.
 */
export function veredito(r: Recurso, margemPct = 10): Veredito {
  if (r.acabouEm) return { tipo: "faltou", hora: r.acabouEm };
  const c = consumido(r);
  if (c == null) return { tipo: "aguardando" };
  if (r.sobra != null && r.entrada) {
    const pct = (r.sobra / r.entrada) * 100;
    if (pct > margemPct) {
      return { tipo: "sobrou", quanto: r.sobra, perda: perda(r) };
    }
  }
  return { tipo: "certo" };
}

/** A conta do dimensionamento, igual à do banco (132). */
export function calcularPrevisto(
  regra: RegraRecurso,
  indice: number,
  base: number
): number {
  if (regra === "fixo") return indice;
  return Math.round(indice * base * 100) / 100;
}

export type DefasagemPublico = {
  /** quantos itens por pessoa foram dimensionados por outro número */
  itens: number;
  /** a base antiga, quando todos os itens compartilham a mesma; null se divergem entre si */
  baseAntiga: number | null;
  publico: number;
};

/**
 * A defasagem: itens por pessoa cuja base não é o público de hoje.
 * Mesma régua da varredura do banco (137) — mudou lá, muda aqui.
 */
export function defasagemDoPublico(
  lista: Recurso[],
  publico: { quantidade: number } | null
): DefasagemPublico | null {
  if (!publico || publico.quantidade <= 0) return null;
  const defasados = lista.filter(
    (r) =>
      r.regra === "por_pessoa" &&
      r.baseQuantidade != null &&
      r.baseQuantidade !== publico.quantidade
  );
  if (defasados.length === 0) return null;
  const bases = new Set(defasados.map((r) => r.baseQuantidade));
  return {
    itens: defasados.length,
    baseAntiga: bases.size === 1 ? defasados[0].baseQuantidade : null,
    publico: publico.quantidade,
  };
}

/** "para 180 confirmados" / "para 200 estimados" / "12 mesas" */
export function textoDaBase(r: Recurso): string | null {
  // O número digitado como pedido da cliente não tem base: quem manda é
  // ela, e é por isso que o Recalcular não o toca (143). Vem antes das
  // outras portas porque item avulso é 'fixo' e não tem base_quantidade.
  // "à mão" e não "pedido pela cliente": base_origem='manual' marca os
  // dois caminhos — o desejo que veio do briefing e o ajuste que ela
  // mesma digitou na Operação. Atribuir à cliente um número que a
  // cerimonialista escolheu seria mentira em metade dos casos; quem
  // guarda a origem de verdade é a linha de proveniência.
  if (r.baseOrigem === "manual") return "definido à mão";
  if (r.regra === "fixo") return null;
  if (r.baseQuantidade == null) return null;
  if (r.regra === "por_unidade") return `${r.baseQuantidade} mesas`;
  return r.baseOrigem === "confirmados"
    ? `${r.baseQuantidade} confirmados`
    : `${r.baseQuantidade} estimados`;
}

/** Número curto: sem casas quando é inteiro, duas quando não é. */
export function numero(v: number | null | undefined): string {
  if (v == null) return "—";
  const inteiro = Math.abs(v % 1) < 0.005;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: inteiro ? 0 : 2,
    maximumFractionDigits: inteiro ? 0 : 2,
  });
}

export function reais(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type TotaisRecursos = {
  itens: number;
  aComprar: number;
  investido: number | null;
  perdaTotal: number | null;
  rupturas: number;
};

/** O resumo que abre a tela: o que ainda falta e quanto já se perdeu. */
export function totais(lista: Recurso[]): TotaisRecursos {
  let aComprar = 0;
  let investido: number | null = null;
  let perdaTotal: number | null = null;
  let rupturas = 0;

  for (const r of lista) {
    if ((r.previsto ?? 0) > 0 && (r.comprado ?? 0) < (r.previsto ?? 0)) aComprar++;
    const cc = custoComprado(r);
    if (cc != null) investido = (investido ?? 0) + cc;
    const p = perda(r);
    if (p != null) perdaTotal = (perdaTotal ?? 0) + p;
    if (r.acabouEm) rupturas++;
  }

  return { itens: lista.length, aComprar, investido, perdaTotal, rupturas };
}
