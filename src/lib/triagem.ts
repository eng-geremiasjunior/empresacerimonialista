// A triagem do Planejamento (16/10/2026, migração 212). Quem cadastra o
// evento perto da data encontra itens que o método esperava resolvidos
// ANTES de ela chegar. Cada um vem com uma sugestão pela data — regra fixa,
// sem IA — e ela confirma ou troca: "Já resolvido", "Não se aplica" ou
// "Ainda falta". Módulo puro (servidor e navegador).

export type EscolhaDaTriagem = "ja_resolvido" | "nao_se_aplica" | "ainda_falta";

export const ROTULO_DA_ESCOLHA: Record<EscolhaDaTriagem, string> = {
  ja_resolvido: "Já resolvido",
  nao_se_aplica: "Não se aplica",
  ainda_falta: "Ainda falta",
};

export type ItemDaTriagem = {
  id: string;
  titulo: string;
  /** o assunto (objetivo do método) */
  grupo: string;
  ordemDoGrupo: number;
  /** quantos dias atrás o método esperava este item resolvido */
  vencidoHaDias: number;
  sugestao: EscolhaDaTriagem;
  /** as etapas (cotações, degustação…) que seguem a resposta da linha */
  etapas: string[];
};

export type GrupoDaTriagem = { nome: string; itens: ItemDaTriagem[] };

/** Só entra na triagem o que venceu há pelo menos isto antes do cadastro. */
export const FOLGA_DIAS = 15;
/** Venceu há tanto tempo que, num evento já marcado, quase certo está feito. */
const RESOLVIDO_DIAS = 60;

/**
 * A sugestão pela data:
 *  - item opcional do método (nasce desligado nos eventos novos) → não se aplica;
 *  - venceu há 60 dias ou mais → já resolvido (ex.: espaço e buffet de um
 *    casamento cadastrado a 26 dias da festa);
 *  - o resto → ainda falta.
 */
export function sugestaoPelaData(vencidoHaDias: number, opcional: boolean): EscolhaDaTriagem {
  if (opcional) return "nao_se_aplica";
  if (vencidoHaDias >= RESOLVIDO_DIAS) return "ja_resolvido";
  return "ainda_falta";
}

/** "venceu há 7 meses" / "venceu há 3 semanas" / "venceu há 20 dias" */
export function vencidoEmPalavras(dias: number): string {
  if (dias >= 60) return `venceu há ${Math.round(dias / 30)} meses`;
  if (dias >= 30) return "venceu há 1 mês";
  if (dias >= 14) return `venceu há ${Math.round(dias / 7)} semanas`;
  return `venceu há ${dias} dias`;
}

export function agruparTriagem(itens: ItemDaTriagem[]): GrupoDaTriagem[] {
  const m = new Map<string, GrupoDaTriagem & { ordem: number }>();
  for (const i of itens) {
    const g = m.get(i.grupo) ?? { nome: i.grupo, itens: [], ordem: i.ordemDoGrupo };
    g.itens.push(i);
    m.set(i.grupo, g);
  }
  return [...m.values()]
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ nome, itens: xs }) => ({ nome, itens: xs.sort((a, b) => b.vencidoHaDias - a.vencidoHaDias) }));
}

export function ehEscolha(v: unknown): v is EscolhaDaTriagem {
  return v === "ja_resolvido" || v === "nao_se_aplica" || v === "ainda_falta";
}
