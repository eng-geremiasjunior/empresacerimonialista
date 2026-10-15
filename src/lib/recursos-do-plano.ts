// O que cada plano tem (decisão do dono, 09/10/2026: os planos deixam de
// diferir só pela quantidade de eventos). Pura, sem banco: a mesma regra
// para o servidor (a trava) e para a tela (o aviso). O nível vem do banco
// (nivel_do_plano, 203); a matriz completa está em
// .claude/plans/planos-por-recurso.md.
//
// O que fica em TODOS os planos, inclusive no Gratuito, não aparece aqui:
// roteiro, planejamento, link do fornecedor, o dia do evento e o que faz
// dinheiro entrar pelo casal (lista de presentes, site, convite, portal).

export type NivelDoPlano = "familia" | "gratuito" | "essencial" | "profissional" | "master";
type NivelPago = "essencial" | "profissional" | "master";

export type Recurso =
  | "rsvp"
  | "proposta"
  | "impressao"
  | "financeiro_empresa"
  | "estoque"
  | "google_agenda"
  | "vitrine"
  | "relatorio"
  | "leitura_ia"
  | "ia"
  | "marca_propria";

/** o plano mínimo de cada recurso */
export const PLANO_MINIMO: Record<Recurso, NivelPago> = {
  rsvp: "essencial",
  proposta: "essencial",
  impressao: "essencial",
  financeiro_empresa: "essencial",
  estoque: "essencial",
  google_agenda: "essencial",
  vitrine: "essencial",
  relatorio: "profissional",
  // ler briefing, cortejo, checklist, contrato e nota por IA: pagos
  leitura_ia: "essencial",
  // o assistente do evento (e a leitura por foto, quando sair): Master
  ia: "master",
  marca_propria: "master",
};

const ORDEM: Record<Exclude<NivelDoPlano, "familia">, number> = { gratuito: 0, essencial: 1, profissional: 2, master: 3 };

export const NOME_DO_PLANO: Record<NivelPago, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  master: "Master",
};

/** como o recurso se chama no aviso ("Disponível no plano Essencial") */
export const NOME_DO_RECURSO: Record<Recurso, string> = {
  rsvp: "Confirmação de presença",
  proposta: "Envio de propostas",
  impressao: "Impressão das folhas",
  financeiro_empresa: "Financeiro da empresa",
  estoque: "Estoque",
  google_agenda: "Agenda do Google",
  vitrine: "Vitrine profissional",
  relatorio: "Relatório comercial",
  leitura_ia: "Leitura de arquivos por inteligência artificial",
  ia: "Inteligência do evento",
  marca_propria: "Marca própria",
};

/**
 * A conta pode usar o recurso? Nível desconhecido (leitura que falhou, a
 * 203 ainda não aplicada) NÃO tranca: falta de informação nunca vira
 * recurso bloqueado. A conta de família fica fora da matriz.
 */
export function pode(nivel: NivelDoPlano | null | undefined, recurso: Recurso): boolean {
  if (!nivel || nivel === "familia") return true;
  return ORDEM[nivel] >= ORDEM[PLANO_MINIMO[recurso]];
}

export const ehNivelDoPlano = (x: unknown): x is NivelDoPlano =>
  x === "familia" || x === "gratuito" || x === "essencial" || x === "profissional" || x === "master";
