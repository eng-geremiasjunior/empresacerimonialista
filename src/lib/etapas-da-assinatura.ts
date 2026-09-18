// Até onde a pessoa chegou no caminho da assinatura — o "carrinho
// abandonado" do painel do dono (pedido dele, 17/09/2026: "quem chegou lá
// e não concluiu, só isso").
//
// A tela de assinatura é uma rota só com três etapas. O sinal de presença
// (123, seção 5) só conhecia a rota; agora a própria tela anuncia a etapa
// em que ela está, e o nome dela vira a área do sinal. O que sai do
// navegador continua sendo só o NOME da etapa: nada do que ela digitou.
//
// Parte pura: roda no navegador (o anúncio) e no servidor (o painel).

export type EtapaDaAssinatura =
  | "planos"
  | "dados"
  | "endereco"
  | "pagamento"
  | "nao_passou";

/** O nome de área que cada etapa manda no sinal de presença. */
export const AREA_DA_ETAPA: Record<EtapaDaAssinatura, string> = {
  planos: "Assinatura",
  dados: "Assinatura › Dados pessoais",
  endereco: "Assinatura › Endereço",
  pagamento: "Assinatura › Pagamento",
  nao_passou: "Assinatura › Pagamento não passou",
};

/** Como a etapa aparece no painel. */
export const ROTULO_DA_ETAPA: Record<EtapaDaAssinatura, string> = {
  planos: "viu os planos",
  dados: "dados pessoais",
  endereco: "endereço",
  pagamento: "pagamento",
  nao_passou: "pagamento não passou",
};

/** Da mais perto da porta à mais perto de assinar. */
const ORDEM: EtapaDaAssinatura[] = ["planos", "dados", "endereco", "pagamento", "nao_passou"];

const ETAPA_DA_AREA = new Map<string, EtapaDaAssinatura>(
  ORDEM.map((e) => [AREA_DA_ETAPA[e], e])
);

export function etapaDaArea(area: string | null | undefined): EtapaDaAssinatura | null {
  return area ? ETAPA_DA_AREA.get(area) ?? null : null;
}

/** Escolheu um plano: daqui em diante é checkout, não vitrine. */
export function entrouNoCheckout(etapa: EtapaDaAssinatura): boolean {
  return ORDEM.indexOf(etapa) >= ORDEM.indexOf("dados");
}

export type CheckoutDaConta = {
  /** a etapa mais adiante a que ela chegou */
  etapa: EtapaDaAssinatura;
  /** o dia (Brasília) em que chegou lá; se voltou depois, o mais recente */
  dia: string;
  /** o último sinal, quando a última tela aberta foi a assinatura */
  sinal: string | null;
};

/**
 * A etapa mais adiante entre os dias de uso. Empate de etapa: vale o dia
 * mais recente — "parou no pagamento ontem" diz mais que "anteontem".
 */
export function checkoutDasLinhas(
  linhas: { dia: string; area: string }[],
  presenca: { area: string; visto_em: string } | null
): CheckoutDaConta | null {
  let melhor: { etapa: EtapaDaAssinatura; dia: string } | null = null;
  for (const l of linhas) {
    const etapa = etapaDaArea(l.area);
    if (!etapa) continue;
    if (
      !melhor ||
      ORDEM.indexOf(etapa) > ORDEM.indexOf(melhor.etapa) ||
      (etapa === melhor.etapa && l.dia > melhor.dia)
    ) {
      melhor = { etapa, dia: l.dia };
    }
  }
  if (!melhor) return null;
  const naPresenca = etapaDaArea(presenca?.area);
  return {
    ...melhor,
    sinal: naPresenca && presenca ? presenca.visto_em : null,
  };
}
