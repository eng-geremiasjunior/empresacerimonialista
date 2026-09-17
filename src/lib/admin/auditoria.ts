// A auditoria do painel em palavras. Puro.

export const ACOES_DA_AUDITORIA: Record<string, string> = {
  assinatura_alterada: "alterou a assinatura",
  teste_prorrogado: "prorrogou o teste",
  conta_suspensa: "suspendeu a conta",
  conta_reativada: "reativou a conta",
  conta_da_casa: "moveu para as contas da casa",
  conta_de_cliente: "voltou a conta para clientes",
  portao_do_teste: "mudou o portão do teste grátis",
  gasto_marketing: "informou o gasto de marketing",
  suporte_respondido: "respondeu no suporte",
  suporte_avisado_por_email: "avisou a resposta por e-mail",
  nota_da_conta: "escreveu uma nota",
  ficha_aberta: "abriu a ficha (e-mail e WhatsApp à vista)",
  custo_lancado: "lançou ou alterou um custo",
  custo_apagado: "apagou um custo",
  custos_copiados: "copiou os custos recorrentes",
  caixa_informado: "informou o saldo de caixa",
  ajuste_alterado: "mudou os ajustes do painel",
  plano_catalogo_insert: "criou um plano no catálogo",
  plano_catalogo_update: "mudou um plano do catálogo",
  plano_catalogo_delete: "apagou um plano do catálogo",
  plano_promocao_insert: "criou um degrau de promoção",
  plano_promocao_update: "mudou um degrau de promoção",
  plano_promocao_delete: "apagou um degrau de promoção",
};

export function acaoEmPalavras(acao: string): string {
  return ACOES_DA_AUDITORIA[acao] ?? acao.replace(/_/g, " ");
}

const NOMES: Record<string, string> = {
  valor_mensal: "valor",
  teste_termina_em: "fim do teste",
  logins_afetados: "logins afetados",
  aviso_por_email: "aviso por e-mail",
  historico: "histórico",
  aberto: "aberto",
  dias: "dias",
};

function valorEmTexto(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vazio";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/");
    return v.length > 60 ? `${v.slice(0, 60)}…` : v;
  }
  return JSON.stringify(v).slice(0, 60);
}

/**
 * "status: trial → ativa · valor: 0 → 59,9". Só o que mudou; sem "antes",
 * lista o que ficou. Campos longos e técnicos (datas de criação, ids) não
 * entram.
 */
export function mudancaEmTexto(antes: unknown, depois: unknown): string {
  const a = antes && typeof antes === "object" ? (antes as Record<string, unknown>) : null;
  const d = depois && typeof depois === "object" ? (depois as Record<string, unknown>) : null;
  if (!a && !d) return "";
  const ignorar = new Set(["id", "created_at", "updated_at", "codigo_interno"]);
  const chaves = [...new Set([...Object.keys(a ?? {}), ...Object.keys(d ?? {})])].filter((k) => !ignorar.has(k));
  const partes: string[] = [];
  for (const k of chaves) {
    const va = a?.[k];
    const vd = d?.[k];
    const nome = NOMES[k] ?? k.replace(/_/g, " ");
    if (a && d) {
      if (JSON.stringify(va) === JSON.stringify(vd)) continue;
      partes.push(`${nome}: ${valorEmTexto(va)} → ${valorEmTexto(vd)}`);
    } else if (d) {
      partes.push(`${nome}: ${valorEmTexto(vd)}`);
    } else {
      partes.push(`${nome}: ${valorEmTexto(va)}`);
    }
  }
  return partes.slice(0, 8).join(" · ");
}
