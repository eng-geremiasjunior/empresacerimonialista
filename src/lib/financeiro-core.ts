// Financeiro do evento — as regras, sem tela.
//
// Porta fiel do `financeiro.js` do handoff. A UI não decide status,
// total nem ordem: pergunta aqui. Isso é o que permite testar a regra
// sem browser, e é por isso que a tela pode ser reescrita sem medo.
//
// Parte PURA: nada de next/headers, nada de fetch. Componentes "use
// client" importam daqui à vontade.

export const HOJE_PADRAO = "2026-08-14";

/* ---------------- formatação ---------------- */

export const money = (n: number): string =>
  "R$ " +
  Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const moneyCentavos = (n: number): string =>
  "R$ " +
  Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** '1.234,56' | 'R$ 1.234,56' -> 1234.56 */
export function parseBRL(s: string | number): number {
  if (typeof s === "number") return s;
  return Number(
    String(s)
      .replace(/[^0-9,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".")
  );
}

export const fmtData = (iso: string): string =>
  iso.slice(0, 10).split("-").reverse().join("/");

export function diasAte(iso: string, hoje: string = HOJE_PADRAO): number {
  return Math.round(
    (new Date(iso.slice(0, 10) + "T00:00:00").getTime() -
      new Date(hoje.slice(0, 10) + "T00:00:00").getTime()) /
      86400000
  );
}

/* ---------------- modelo ---------------- */

export type Direcao = "entrada" | "saida";
export type TipoLancamento = "sinal" | "parcela" | "saldo" | "extra" | "entrada";
export type OrigemPagamento = "cliente_direto" | "caixa";
export type Tone = "ok" | "late" | "wait" | "neutral";

export type Lancamento = {
  id: string;
  direcao: Direcao;
  categoria: string;
  /** fornecedor (saída) ou cliente (entrada) */
  fornecedor: string;
  titulo: string;
  valor: number;
  vencimento: string;
  pagoEm: string | null;
  tipo: TipoLancamento;
  origem: OrigemPagamento;
  supplierId: string | null;
  objetivoId: string | null;
  comprovante: { nome: string; path: string } | null;
  formaPagamento: string | null;
};

/**
 * A categoria de verba é o OBJETIVO do Planejamento — "Buffet e bebidas",
 * "Foto e vídeo". Elas já nascem preenchidas com o método, e é nelas que
 * a verba foi distribuída.
 *
 * Três valores, como todo orçamento de casamento sério:
 *   previsto   — o que se planejou gastar (a distribuição da verba)
 *   contratado — o que foi de fato fechado com fornecedor
 *   pago       — o que já saiu
 */
export type CategoriaVerba = {
  id: string;
  nome: string;
  previsto: number;
  /** os fornecedores fechados dentro desta categoria */
  itens: {
    id: string;
    nome: string;
    fornecedor: string | null;
    contratado: number;
    estimado: number | null;
  }[];
  lancamentos: Lancamento[];
};

/* ---------------- status ---------------- */

export type Status = { status: string; tone: Tone; dias: number | null };

export function statusDe(
  l: Lancamento,
  hoje: string = HOJE_PADRAO,
  alertaDias = 7
): Status {
  if (l.pagoEm) {
    return {
      status: l.direcao === "entrada" ? "Recebido" : "Pago",
      tone: "ok",
      dias: null,
    };
  }
  const d = diasAte(l.vencimento, hoje);
  // extra ainda longe não é compromisso firmado: é conversa a ter
  if (l.tipo === "extra" && d > alertaDias) {
    return { status: "A cobrar", tone: "neutral", dias: d };
  }
  if (d < 0) return { status: "Atrasada", tone: "late", dias: d };
  if (d === 0) return { status: "Vence hoje", tone: "late", dias: 0 };
  if (d === 1) return { status: "Vence amanhã", tone: "wait", dias: 1 };
  if (d <= alertaDias) return { status: `Em ${d} dias`, tone: "wait", dias: d };
  return {
    status: l.direcao === "entrada" ? "A receber" : "Agendada",
    tone: "neutral",
    dias: d,
  };
}

/** A divisão das duas telas mora AQUI — nada mais no app decide isso. */
export const lancamentosDaTela = (
  lancamentos: Lancamento[],
  screen: "assessoria" | "fornecedores"
): Lancamento[] =>
  lancamentos.filter(
    (l) => (l.direcao === "entrada") === (screen === "assessoria")
  );

/* ---------------- alertas ---------------- */

export type Alerta = {
  kind: "late" | "soon" | "digest" | "clear" | "capital";
  tone: Tone;
  title: string;
  meta: string;
  lancamentos: Lancamento[];
};

export function buildAlertas(
  lancamentos: Lancamento[],
  hoje: string = HOJE_PADRAO,
  opts: {
    alertaDias?: number;
    resumoSemanal?: boolean;
    screen?: "assessoria" | "fornecedores";
    /** saldo em caixa; quando informado, gera a chamada de capital */
    saldoCaixa?: { emMaos: number; compromissado30d: number } | null;
  } = {}
): Alerta[] {
  const {
    alertaDias = 7,
    resumoSemanal = true,
    screen = "fornecedores",
    saldoCaixa = null,
  } = opts;

  const abertos = lancamentos.filter((l) => !l.pagoEm);
  const atrasados = abertos.filter((l) => diasAte(l.vencimento, hoje) < 0);
  const proximos = abertos.filter((l) => {
    const d = diasAte(l.vencimento, hoje);
    return d >= 0 && d <= alertaDias;
  });
  const soma = (xs: Lancamento[]) => xs.reduce((t, l) => t + l.valor, 0);
  const verbo = screen === "assessoria" ? "a receber" : "a pagar";
  const out: Alerta[] = [];

  if (atrasados.length) {
    const pior = Math.min(...atrasados.map((l) => diasAte(l.vencimento, hoje)));
    out.push({
      kind: "late",
      tone: "late",
      title:
        atrasados.length +
        (screen === "assessoria" ? " recebimento" : " pagamento") +
        (atrasados.length > 1 ? "s atrasados" : " atrasado") +
        ` há ${Math.abs(pior)} dias`,
      meta: atrasados
        .map(
          (l) =>
            `${l.categoria} · ${l.fornecedor} · ${money(l.valor)} · venceu ${fmtData(l.vencimento)}`
        )
        .join(" | "),
      lancamentos: atrasados,
    });
  }

  if (proximos.length) {
    out.push({
      kind: "soon",
      tone: "wait",
      title: `${proximos.length} vencem nos próximos ${alertaDias} dias`,
      meta:
        money(soma(proximos)) +
        " · " +
        proximos
          .map(
            (l) => l.categoria.toLowerCase() + " " + fmtData(l.vencimento).slice(0, 5)
          )
          .join(" · "),
      lancamentos: proximos,
    });
  }

  /**
   * Chamada de capital: quando o que vai sair do caixa dela nos próximos
   * 30 dias é maior que o que ela tem em mãos, a ação certa não é "pague
   * o fornecedor" — é "peça à cliente". O dinheiro trava aqui, não lá.
   */
  if (saldoCaixa && screen === "fornecedores") {
    const falta = saldoCaixa.compromissado30d - saldoCaixa.emMaos;
    if (falta > 0) {
      out.unshift({
        kind: "capital",
        tone: "late",
        title: `Peça ${money(falta)} à cliente`,
        meta: `você tem ${money(saldoCaixa.emMaos)} em caixa e ${money(saldoCaixa.compromissado30d)} sai nos próximos 30 dias`,
        lancamentos: [],
      });
    }
  }

  if (resumoSemanal) {
    out.push({
      kind: "digest",
      tone: "neutral",
      title: "Resumo semanal ativo",
      meta: "segunda 09:00 · via WhatsApp",
      lancamentos: [],
    });
  }

  if (!atrasados.length && !proximos.length) {
    out.unshift({
      kind: "clear",
      tone: "ok",
      title: `Nada ${verbo} nos próximos ${alertaDias} dias`,
      meta: "próximo vencimento fora da janela de alerta",
      lancamentos: [],
    });
  }

  return out;
}

/* ---------------- calendário (seg → dom) ---------------- */

export type ChipCalendario = {
  id: string;
  valor: string;
  label: string;
  late: boolean;
  direcao: Direcao;
};

export type CelulaCalendario = {
  day: number;
  fora: boolean;
  hoje: boolean;
  items: ChipCalendario[];
};

const chipDe = (l: Lancamento, hoje: string): ChipCalendario => ({
  id: l.id,
  valor:
    (l.direcao === "entrada" ? "+ " : "− ") + money(l.valor).replace("R$ ", ""),
  label: l.categoria,
  late: !l.pagoEm && diasAte(l.vencimento, hoje) < 0,
  direcao: l.direcao,
});

export function buildCalendario(
  lancamentos: Lancamento[],
  mesISO: string,
  hoje: string = HOJE_PADRAO
): CelulaCalendario[] {
  const [ano, mes] = mesISO.split("-").map(Number);
  const primeiro = new Date(ano, mes - 1, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const offset = (primeiro.getDay() + 6) % 7; // 0 = segunda

  const porDia: Record<number, Lancamento[]> = {};
  lancamentos.forEach((l) => {
    const [a, m, d] = l.vencimento.slice(0, 10).split("-").map(Number);
    if (a === ano && m === mes) (porDia[d] = porDia[d] || []).push(l);
  });

  const cells: CelulaCalendario[] = [];
  const anterior = new Date(ano, mes - 1, 0).getDate();
  for (let i = offset; i > 0; i--) {
    cells.push({ day: anterior - i + 1, fora: true, hoje: false, items: [] });
  }
  for (let d = 1; d <= diasNoMes; d++) {
    const iso = [ano, String(mes).padStart(2, "0"), String(d).padStart(2, "0")].join("-");
    cells.push({
      day: d,
      fora: false,
      hoje: iso === hoje.slice(0, 10),
      items: (porDia[d] || []).map((l) => chipDe(l, hoje)),
    });
  }
  let extra = 1;
  while (cells.length % 7) {
    cells.push({ day: extra++, fora: true, hoje: false, items: [] });
  }
  return cells;
}

/* ---------------- fila ---------------- */

export type LinhaFila = Lancamento & Status;

/** Atrasados primeiro, depois por vencimento. Pagos no fim. */
export const buildFila = (
  lancamentos: Lancamento[],
  hoje: string = HOJE_PADRAO,
  alertaDias = 7
): LinhaFila[] =>
  lancamentos
    .map((l) => ({ ...l, ...statusDe(l, hoje, alertaDias) }))
    .sort(
      (a, b) =>
        (a.pagoEm ? 1 : 0) - (b.pagoEm ? 1 : 0) ||
        a.vencimento.localeCompare(b.vencimento)
    );

/* ---------------- verba por categoria ---------------- */

export type LinhaCategoria = {
  id: string;
  nome: string;
  /** quem já está fechado nesta categoria, para a linha de apoio */
  fornecedores: string[];
  previsto: number;
  contratado: number;
  pago: number;
  aPagar: number;
  /** quanto do previsto já foi comprometido; > 100 estourou o planejado */
  pctDoPrevisto: number;
  /** quanto do contratado já foi pago — é o andamento da barra */
  pct: number;
  /** contratado acima do previsto: alerta, não bloqueio */
  estourou: boolean;
  prox: string;
  proxTone: Tone;
  proxLancamento: Lancamento | null;
  itens: CategoriaVerba["itens"];
};

export function buildCategorias(
  categorias: CategoriaVerba[],
  hoje: string = HOJE_PADRAO
): {
  linhas: LinhaCategoria[];
  totais: {
    previsto: number;
    contratado: number;
    pago: number;
    aPagar: number;
  };
} {
  const linhas = categorias.map((c) => {
    const contratado = c.itens.reduce((t, i) => t + i.contratado, 0);
    const pago = c.lancamentos
      .filter((l) => l.pagoEm)
      .reduce((t, l) => t + l.valor, 0);
    const prox = c.lancamentos
      .filter((l) => !l.pagoEm)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
    return {
      id: c.id,
      nome: c.nome,
      fornecedores: c.itens
        .map((i) => i.fornecedor)
        .filter((f): f is string => Boolean(f)),
      previsto: c.previsto,
      contratado,
      pago,
      // a pagar sai do CONTRATADO, não do previsto: dívida é o que se
      // fechou, não o que se planejou
      aPagar: Math.max(0, contratado - pago),
      pctDoPrevisto: c.previsto ? Math.round((contratado / c.previsto) * 100) : 0,
      pct: contratado ? Math.round((pago / contratado) * 100) : 0,
      estourou: c.previsto > 0 && contratado > c.previsto,
      prox: prox ? fmtData(prox.vencimento).slice(0, 5) : "—",
      proxTone: prox ? statusDe(prox, hoje).tone : ("neutral" as Tone),
      proxLancamento: prox || null,
      itens: c.itens,
    };
  });
  const t = (k: "previsto" | "contratado" | "pago" | "aPagar") =>
    linhas.reduce((s, l) => s + l[k], 0);
  return {
    linhas,
    totais: {
      previsto: t("previsto"),
      contratado: t("contratado"),
      pago: t("pago"),
      aPagar: t("aPagar"),
    },
  };
}

/* ---------------- resumo ---------------- */

export type LinhaResumo = { label: string; meta: string; valor: string };

export function buildResumo(
  dados: {
    lancamentos: Lancamento[];
    categorias: CategoriaVerba[];
    verbaTotal: number | null;
    contrato: { valor: number; parcelas: number; extras: number };
  },
  screen: "assessoria" | "fornecedores"
): LinhaResumo[] {
  if (screen === "assessoria") {
    const entradas = dados.lancamentos.filter((l) => l.direcao === "entrada");
    const recebidas = entradas.filter((l) => l.pagoEm);
    const recebido = recebidas.reduce((t, l) => t + l.valor, 0);
    const ultimo = entradas[entradas.length - 1];
    return [
      {
        label: "Contrato de assessoria",
        meta:
          dados.contrato.parcelas > 1
            ? `valor fechado · entrada + ${dados.contrato.parcelas - 1} parcelas`
            : "valor fechado",
        valor: money(dados.contrato.valor),
      },
      {
        label: "Extras aprovados",
        meta: dados.contrato.extras > 0 ? "somados ao contrato" : "nenhum",
        valor: money(dados.contrato.extras),
      },
      {
        label: "Recebido até hoje",
        meta: `${recebidas.length} de ${entradas.length} lançamentos`,
        valor: money(recebido),
      },
      {
        label: "A receber",
        meta: ultimo ? `último em ${fmtData(ultimo.vencimento)}` : "nada em aberto",
        valor: money(
          dados.contrato.valor + dados.contrato.extras - recebido
        ),
      },
    ];
  }

  const { totais } = buildCategorias(dados.categorias);
  return [
    {
      label: "Verba do evento",
      meta: dados.verbaTotal ? "definida com a cliente" : "ainda não definida",
      valor: dados.verbaTotal ? money(dados.verbaTotal) : "—",
    },
    {
      label: `Previsto em ${dados.categorias.length} ${dados.categorias.length === 1 ? "categoria" : "categorias"}`,
      meta: dados.verbaTotal
        ? `livre ${money(dados.verbaTotal - totais.previsto)}`
        : "sem teto definido",
      valor: money(totais.previsto),
    },
    {
      label: "Contratado",
      meta:
        totais.previsto > 0
          ? `${Math.round((totais.contratado / totais.previsto) * 100)}% do previsto`
          : "fornecedores fechados",
      valor: money(totais.contratado),
    },
    {
      label: "Pago aos fornecedores",
      meta: "comprovantes anexados",
      valor: money(totais.pago),
    },
    {
      label: "A pagar",
      meta: "ver fila de vencimentos",
      valor: money(totais.aPagar),
    },
  ];
}

/* ---------------- comprovante ---------------- */

export type ComprovanteLido = {
  arquivo: string | null;
  valor: number | null;
  data: string | null;
  hora: string | null;
  tipo: string;
  txId: string | null;
  destinatario: string | null;
  cnpj: string | null;
  confianca: Record<string, number>;
};

/** Saída bruta (OCR ou digitada por ela) → campos tipados. */
export function normalizarComprovante(
  bruto: Partial<ComprovanteLido> & { texto?: string }
): ComprovanteLido {
  const texto = bruto.texto || "";
  const pega = (re: RegExp) => (texto.match(re) || [])[1] || null;
  return {
    arquivo: bruto.arquivo || null,
    valor:
      bruto.valor != null
        ? parseBRL(bruto.valor)
        : parseBRL(pega(/R\$\s*([\d.,]+)/) ?? "0") || null,
    data: bruto.data || pega(/(\d{2}\/\d{2}\/\d{4})/),
    hora: bruto.hora || pega(/(\d{2}:\d{2})/),
    tipo: /pix/i.test(texto)
      ? "PIX"
      : /ted|transfer/i.test(texto)
        ? "TED"
        : bruto.tipo || "Transferência",
    txId: bruto.txId || pega(/\b(E\d{8,})\b/),
    destinatario:
      bruto.destinatario ||
      pega(/(?:recebedor|destinat[áa]rio|favorecido)[:\s]+([A-ZÀ-Ú .&-]{4,})/i),
    cnpj: bruto.cnpj || pega(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/),
    confianca: bruto.confianca || {},
  };
}

export type Conferencia = {
  diferenca: number;
  dataISO: string | null;
  tone: Tone;
  confere: boolean;
  pagoParcial: boolean;
  pagoAMais: boolean;
  dentroDoPrazo: boolean | null;
  fornecedorConfere: boolean;
  precisaAtencao: boolean;
  mensagem: string;
};

/** Confere o que foi lido contra a parcela. NUNCA grava nada. */
export function conferir(
  lido: ComprovanteLido,
  lancamento: Lancamento & { cnpj?: string | null }
): Conferencia {
  const diferenca = Number(((lido.valor || 0) - lancamento.valor).toFixed(2));
  const dataISO = lido.data ? lido.data.split("/").reverse().join("-") : null;
  const baixa = Object.values(lido.confianca || {}).some((v) => v < 0.8);
  const tone: Tone = diferenca === 0 ? "ok" : diferenca < 0 ? "late" : "wait";
  return {
    diferenca,
    dataISO,
    tone,
    confere: diferenca === 0,
    pagoParcial: diferenca < 0,
    pagoAMais: diferenca > 0,
    dentroDoPrazo: dataISO ? diasAte(lancamento.vencimento, dataISO) >= 0 : null,
    fornecedorConfere: Boolean(
      lido.cnpj && lancamento.cnpj && lido.cnpj === lancamento.cnpj
    ),
    precisaAtencao: baixa || diferenca !== 0,
    mensagem:
      diferenca === 0
        ? moneyCentavos(0) + " — valor idêntico à parcela"
        : diferenca < 0
          ? `faltam ${moneyCentavos(Math.abs(diferenca))} para fechar a parcela`
          : `${moneyCentavos(diferenca)} acima do previsto`,
  };
}

export type CampoExtraido = {
  label: string;
  value: string;
  note: string | null;
  destaque?: boolean;
};

/** As linhas da tabela do passo 'review'. */
export function camposExtraidos(
  lido: ComprovanteLido,
  lancamento: Lancamento & { cnpj?: string | null },
  conf: Conferencia = conferir(lido, lancamento)
): CampoExtraido[] {
  const entrada = lancamento.direcao === "entrada";
  const nota = (k: string) =>
    lido.confianca && lido.confianca[k] < 0.8 ? "confira este campo" : null;
  return [
    {
      label: "Valor lido",
      value: moneyCentavos(lido.valor ?? 0),
      note: nota("valor") || (conf.confere ? "confere com a parcela" : conf.mensagem),
      destaque: true,
    },
    {
      label: "Data",
      value: (lido.data ?? "—") + (lido.hora ? ` · ${lido.hora}` : ""),
      note:
        nota("data") ||
        (conf.dentroDoPrazo === null
          ? null
          : conf.dentroDoPrazo
            ? "antes do vencimento"
            : "após o vencimento"),
    },
    {
      label: entrada ? "Pagador" : "Destinatário",
      value: lido.destinatario ?? "—",
      note:
        nota("destinatario") ||
        (conf.fornecedorConfere
          ? entrada
            ? "cliente vinculada"
            : "fornecedor vinculado"
          : "não confere com o cadastro"),
    },
    {
      label: "CNPJ",
      value: lido.cnpj ?? "—",
      note: conf.fornecedorConfere ? "igual ao cadastro" : "diferente do cadastro",
    },
    {
      label: "Tipo",
      value: lido.tipo + (lido.txId ? ` · ${lido.txId}` : ""),
      note: "id da transação",
    },
  ];
}

/* ---------------- resumo semanal ---------------- */

/** Texto do disparo de segunda 09:00. */
export function resumoSemanal(
  lancamentos: Lancamento[],
  hoje: string = HOJE_PADRAO
): string {
  const abertos = lancamentos.filter((l) => !l.pagoEm);
  const atras = abertos.filter((l) => diasAte(l.vencimento, hoje) < 0);
  const semana = abertos.filter((l) => {
    const d = diasAte(l.vencimento, hoje);
    return d >= 0 && d <= 7;
  });
  const soma = (xs: Lancamento[]) =>
    money(xs.reduce((t, l) => t + l.valor, 0));
  return [
    atras.length ? `${atras.length} atrasado(s) · ${soma(atras)}` : "nenhum atrasado",
    semana.length
      ? `${semana.length} vence(m) nesta semana · ${soma(semana)}`
      : "nada vence nesta semana",
  ].join(" · ");
}
