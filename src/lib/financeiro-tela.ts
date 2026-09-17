// Financeiro do evento — os números da tela, num lugar só.
//
// A regra que este arquivo existe para cumprir: UM NOME, UMA CONTA. A
// tela antiga mostrava "A pagar R$ 0" no card e "a pagar R$ 17.225,75"
// no seletor, porque cada bloco somava do seu jeito. Aqui nenhum total é
// guardado: contratado, pago, a pagar, livre, em caixa, o que sai em 30
// dias, os grupos da agenda, os pontos do calendário e a lista "precisa
// de ação" são todos derivados dos mesmos lançamentos.
//
// Parte PURA: nada de next/headers, nada de fetch, nada de React. É o que
// permite conferir a regra sem browser.

import {
  diasAte,
  fmtData,
  money,
  type Lancamento,
  type Tone,
} from "./financeiro-core";

export const JANELA_PADRAO = 7;

/* ---------------- itens da agenda ---------------- */

export type Grupo = "atrasados" | "semana" | "depois" | "pagos";

export type ItemFinanceiro = Lancamento & {
  grupo: Grupo;
  tone: Tone;
  /** "atrasada · 38 d", "em 5 dias", "vence hoje", "12/10", "pago 10/07" */
  statusTexto: string;
  dataCurta: string;
  /** despesa da verba que não é de fornecedor nenhum */
  avulso: boolean;
};

function situacao(
  l: Lancamento,
  hoje: string,
  janela: number
): { grupo: Grupo; tone: Tone; statusTexto: string } {
  const recebimento = l.direcao === "entrada";
  if (l.pagoEm) {
    return {
      grupo: "pagos",
      tone: "ok",
      statusTexto:
        (recebimento ? "recebido " : "pago ") + fmtData(l.pagoEm).slice(0, 5),
    };
  }
  const n = diasAte(l.vencimento, hoje);
  if (n < 0) {
    return { grupo: "atrasados", tone: "late", statusTexto: `atrasada · ${-n} d` };
  }
  if (n === 0) {
    return { grupo: "semana", tone: "wait", statusTexto: "vence hoje" };
  }
  if (n <= janela) {
    return { grupo: "semana", tone: "wait", statusTexto: `em ${n} dias` };
  }
  return {
    grupo: "depois",
    tone: "neutral",
    statusTexto: fmtData(l.vencimento).slice(0, 5),
  };
}

/** Os lançamentos da conta, já com grupo, tom e texto de status. */
export function montarItens(
  lancamentos: Lancamento[],
  hoje: string,
  janela = JANELA_PADRAO
): ItemFinanceiro[] {
  return lancamentos
    .map((l) => ({
      ...l,
      ...situacao(l, hoje, janela),
      dataCurta: fmtData(l.vencimento).slice(0, 5),
      avulso: l.supplierId == null,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/** O que a agenda mostra: as saídas da verba. O repasse do casal é caixa. */
export const daAgenda = (itens: ItemFinanceiro[]): ItemFinanceiro[] =>
  itens.filter((i) => i.direcao === "saida");

export const entradasDoCaixa = (itens: ItemFinanceiro[]): ItemFinanceiro[] =>
  itens.filter((i) => i.direcao === "entrada");

export const soma = (itens: { valor: number }[]): number =>
  itens.reduce((t, i) => t + i.valor, 0);

/* ---------------- contratos ---------------- */

export type ContratoFornecedor = {
  id: string;
  supplierId: string;
  fornecedor: string;
  categoria: string | null;
  objetivoId: string | null;
  /** null = veio do Planejamento sem contrato fechado (083) */
  valor: number | null;
  assinadoEm: string | null;
};

/* ---------------- a faixa de números ---------------- */

export type NumerosDaVerba = {
  verba: number | null;
  contratado: number;
  fornecedores: number;
  pago: number;
  aPagar: number;
  atrasado: number;
  /** verba − contratado − despesas avulsas; null sem verba definida */
  livre: number | null;
  /** quanto do total já foi pago, para a terceira linha do card */
  pctPago: number | null;
};

export function numerosDaVerba(
  contratos: ContratoFornecedor[],
  agenda: ItemFinanceiro[],
  verba: number | null
): NumerosDaVerba {
  const contratado = contratos.reduce((t, c) => t + (c.valor ?? 0), 0);
  const pago = soma(agenda.filter((i) => i.pagoEm));
  const aPagar = soma(agenda.filter((i) => !i.pagoEm));
  const atrasado = soma(agenda.filter((i) => i.grupo === "atrasados"));
  // O avulso não está em contrato nenhum: se não entrasse aqui, a folga
  // apareceria maior do que é.
  const avulsas = soma(agenda.filter((i) => i.avulso));
  return {
    verba,
    contratado,
    fornecedores: contratos.filter((c) => c.valor != null).length,
    pago,
    aPagar,
    atrasado,
    livre: verba == null ? null : verba - contratado - avulsas,
    pctPago: verba ? Math.round((pago / verba) * 100) : null,
  };
}

/* ---------------- caixa do evento ---------------- */

export type CaixaDoEvento = {
  /** ela opera com caixa neste evento? sem repasse e sem saída do caixa, não */
  existe: boolean;
  recebido: number;
  pagoDoCaixa: number;
  emCaixa: number;
  sai30: number;
  ate: string;
  pedir: number;
};

/**
 * "Eu tenho dinheiro para pagar o que vence?"
 *
 * Só conta o que passa pela mão dela: `origem = caixa`. Quando a cliente
 * paga o fornecedor direto, o dinheiro não saiu do caixa — contar aquilo
 * aqui mostraria um saldo negativo que não existe.
 */
export function caixaDoEvento(
  entradas: ItemFinanceiro[],
  agenda: ItemFinanceiro[],
  hoje: string
): CaixaDoEvento {
  const recebido = soma(entradas.filter((e) => e.pagoEm));
  const doCaixa = agenda.filter((i) => i.origem === "caixa");
  const pagoDoCaixa = soma(doCaixa.filter((i) => i.pagoEm));
  const emCaixa = recebido - pagoDoCaixa;
  const ate = somarDiasISO(hoje, 30);
  const sai30 = soma(
    doCaixa.filter((i) => !i.pagoEm && i.vencimento <= ate)
  );
  return {
    existe: recebido > 0 || doCaixa.length > 0,
    recebido,
    pagoDoCaixa,
    emCaixa,
    sai30,
    ate,
    pedir: Math.max(0, sai30 - emCaixa),
  };
}

export function somarDiasISO(iso: string, dias: number): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/* ---------------- linhas de fornecedor ---------------- */

export type LinhaDeFornecedor = {
  id: string;
  supplierId: string;
  nome: string;
  categoria: string | null;
  objetivoId: string | null;
  contrato: number | null;
  assinadoEm: string | null;
  parcelas: ItemFinanceiro[];
  pago: number;
  aPagar: number;
  /** contrato − parcelas lançadas: o que ainda não virou vencimento */
  faltaLancar: number;
  proximoTexto: string;
  proximoTone: Tone;
  semParcelas: boolean;
};

export function linhasDeFornecedor(
  contratos: ContratoFornecedor[],
  agenda: ItemFinanceiro[]
): LinhaDeFornecedor[] {
  /*
   * Fornecedor com parcela e sem contrato lançado existe, e é comum: a
   * parcela nasceu no Planejamento ou numa pendência antes de alguém
   * abrir o contrato. Se ele ficasse de fora da lista, o total do card
   * mostraria uma dívida que nenhuma linha explica — que é exatamente o
   * tipo de buraco que esta tela existe para fechar.
   */
  const comContrato = new Set(contratos.map((c) => c.supplierId));
  const avulsos: ContratoFornecedor[] = [];
  for (const i of agenda) {
    if (!i.supplierId || comContrato.has(i.supplierId)) continue;
    comContrato.add(i.supplierId);
    avulsos.push({
      id: "sem-contrato-" + i.supplierId,
      supplierId: i.supplierId,
      fornecedor: i.fornecedor,
      categoria: null,
      objetivoId: i.objetivoId,
      valor: null,
      assinadoEm: null,
    });
  }

  return [...contratos, ...avulsos]
    .map((c) => {
      const parcelas = agenda.filter((i) => i.supplierId === c.supplierId);
      const pago = soma(parcelas.filter((p) => p.pagoEm));
      const aPagar = soma(parcelas.filter((p) => !p.pagoEm));
      const lancado = soma(parcelas);
      const abertas = parcelas.filter((p) => !p.pagoEm);
      const prox = abertas[0] ?? null;
      return {
        id: c.id,
        supplierId: c.supplierId,
        nome: c.fornecedor,
        categoria: c.categoria,
        objetivoId: c.objetivoId,
        contrato: c.valor,
        assinadoEm: c.assinadoEm,
        parcelas,
        pago,
        aPagar,
        faltaLancar: Math.max(0, (c.valor ?? 0) - lancado),
        proximoTexto: prox
          ? prox.grupo === "atrasados"
            ? `venceu ${prox.dataCurta}`
            : prox.statusTexto
          : parcelas.length
            ? "quitado"
            : "sem parcelas",
        proximoTone: prox
          ? prox.tone
          : parcelas.length
            ? ("ok" as Tone)
            : ("neutral" as Tone),
        semParcelas: parcelas.length === 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/* ---------------- filtro e grupos ---------------- */

export type Filtro = "aberto" | "pagos" | "todos";

export function filtrarItens(
  itens: ItemFinanceiro[],
  opcoes: { filtro?: Filtro; dia?: string | null; busca?: string }
): ItemFinanceiro[] {
  const q = (opcoes.busca ?? "").trim().toLowerCase();
  return itens.filter((i) => {
    if (opcoes.dia && i.vencimento !== opcoes.dia) return false;
    if (opcoes.filtro === "aberto" && i.pagoEm) return false;
    if (opcoes.filtro === "pagos" && !i.pagoEm) return false;
    if (!q) return true;
    return [i.titulo, i.fornecedor, i.categoria, String(i.valor)]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

export type GrupoDaAgenda = {
  chave: Grupo;
  rotulo: string;
  itens: ItemFinanceiro[];
  total: number;
};

const ROTULO: Record<Grupo, string> = {
  atrasados: "Atrasados",
  semana: "Próximos {n} dias",
  depois: "Depois",
  pagos: "Pagos",
};

export function agrupar(
  itens: ItemFinanceiro[],
  janela = JANELA_PADRAO
): GrupoDaAgenda[] {
  const ordem: Grupo[] = ["atrasados", "semana", "depois", "pagos"];
  return ordem
    .map((chave) => {
      const doGrupo = itens.filter((i) => i.grupo === chave);
      return {
        chave,
        rotulo: ROTULO[chave].replace("{n}", String(janela)),
        itens: doGrupo,
        total: soma(doGrupo),
      };
    })
    .filter((g) => g.itens.length > 0);
}

/* ---------------- precisa de ação ---------------- */

export type AcaoNecessaria = {
  chave: string;
  tone: Tone;
  pill: string;
  titulo: string;
  meta: string;
  /** para onde o clique leva */
  destino:
    | { tipo: "agenda"; filtro: Filtro }
    | { tipo: "fornecedor"; id: string }
    | { tipo: "contrato"; objetivoId: string | null; nome: string }
    | { tipo: "pendencia"; id: string };
};

export type PendenciaAberta = {
  id: string;
  titulo: string;
  valorSugerido: number | null;
};

/**
 * Itens DERIVADOS — nunca digitados. Cada um diz o fato e leva ao lugar
 * exato onde se resolve, nunca a outra tela.
 */
export function precisaDeAcao(
  agenda: ItemFinanceiro[],
  fornecedores: LinhaDeFornecedor[],
  categoriasSemFornecedor: { id: string; nome: string; previsto: number }[],
  pendencias: PendenciaAberta[],
  janela = JANELA_PADRAO
): AcaoNecessaria[] {
  const out: AcaoNecessaria[] = [];
  const nomes = (itens: ItemFinanceiro[]) =>
    [...new Set(itens.map((i) => (i.avulso ? i.titulo : i.fornecedor)))]
      .slice(0, 4)
      .join(", ");

  const atrasadas = agenda.filter((i) => i.grupo === "atrasados");
  if (atrasadas.length) {
    out.push({
      chave: "atrasadas",
      tone: "late",
      pill: `${atrasadas.length} atrasada${atrasadas.length > 1 ? "s" : ""}`,
      titulo: money(soma(atrasadas)),
      meta: nomes(atrasadas),
      destino: { tipo: "agenda", filtro: "aberto" },
    });
  }

  const daSemana = agenda.filter((i) => i.grupo === "semana");
  if (daSemana.length) {
    out.push({
      chave: "semana",
      tone: "wait",
      pill: `${daSemana.length} vence${daSemana.length > 1 ? "m" : ""} em ${janela} dias`,
      titulo: money(soma(daSemana)),
      meta: nomes(daSemana),
      destino: { tipo: "agenda", filtro: "aberto" },
    });
  }

  for (const p of pendencias) {
    out.push({
      chave: "pendencia-" + p.id,
      tone: "neutral",
      pill: "Pendência",
      titulo: p.titulo,
      meta:
        p.valorSugerido != null
          ? `${money(p.valorSugerido)} · lançar na verba`
          : "lançar na verba",
      destino: { tipo: "pendencia", id: p.id },
    });
  }

  for (const f of fornecedores) {
    if (f.semParcelas && f.contrato) {
      out.push({
        chave: "sem-parcelas-" + f.id,
        tone: "neutral",
        pill: "Sem parcelas",
        titulo: f.nome,
        meta: `contrato ${money(f.contrato)} sem vencimentos`,
        destino: { tipo: "fornecedor", id: f.id },
      });
    }
  }

  const semComprovante = agenda.filter((i) => i.pagoEm && !i.comprovante);
  if (semComprovante.length) {
    out.push({
      chave: "sem-comprovante",
      tone: "neutral",
      pill: `${semComprovante.length} sem comprovante`,
      titulo: nomes(semComprovante),
      meta: "pago, mas sem anexo para a prestação de contas",
      destino: { tipo: "agenda", filtro: "pagos" },
    });
  }

  // No começo do evento quase toda categoria está sem fornecedor: listar
  // dez apaga o que é urgente. Entram as duas de maior verba prevista.
  const maiores = [...categoriasSemFornecedor]
    .sort((a, b) => b.previsto - a.previsto)
    .slice(0, 2);
  for (const c of maiores) {
    out.push({
      chave: "categoria-" + c.id,
      tone: "neutral",
      pill: "Pendência",
      titulo: `${c.nome} sem fornecedor`,
      meta:
        `${money(c.previsto)} previstos e nada contratado` +
        (categoriasSemFornecedor.length > maiores.length
          ? ` · e mais ${categoriasSemFornecedor.length - maiores.length}`
          : ""),
      destino: { tipo: "contrato", objetivoId: c.id, nome: c.nome },
    });
  }

  return out;
}

/* ---------------- mini-calendário ---------------- */

export type CelulaDoMes = {
  dia: number | null;
  iso: string | null;
  /** cor do pior status do dia; null = nada vence */
  status: "atrasado" | "semana" | "aberto" | "quitado" | null;
  hoje: boolean;
};

export function miniCalendario(
  itens: ItemFinanceiro[],
  ano: number,
  mes: number,
  hoje: string
): CelulaDoMes[] {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1));
  const offset = (primeiro.getUTCDay() + 6) % 7; // 0 = segunda
  const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const porDia = new Map<string, ItemFinanceiro[]>();
  for (const i of itens) {
    const lista = porDia.get(i.vencimento) ?? [];
    lista.push(i);
    porDia.set(i.vencimento, lista);
  }

  const celulas: CelulaDoMes[] = [];
  for (let i = 0; i < offset; i++) {
    celulas.push({ dia: null, iso: null, status: null, hoje: false });
  }
  for (let d = 1; d <= dias; d++) {
    const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const doDia = porDia.get(iso) ?? [];
    const abertos = doDia.filter((i) => !i.pagoEm);
    celulas.push({
      dia: d,
      iso,
      status: abertos.some((i) => i.grupo === "atrasados")
        ? "atrasado"
        : abertos.some((i) => i.grupo === "semana")
          ? "semana"
          : abertos.length
            ? "aberto"
            : doDia.length
              ? "quitado"
              : null,
      hoje: iso === hoje.slice(0, 10),
    });
  }
  return celulas;
}

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "outubro · 2 pgto · R$ 6.000" — os dois meses seguintes. */
export function resumoDosProximosMeses(
  itens: ItemFinanceiro[],
  ano: number,
  mes: number
): { nome: string; resumo: string }[] {
  return [1, 2].map((k) => {
    const m = ((mes - 1 + k) % 12) + 1;
    const a = ano + Math.floor((mes - 1 + k) / 12);
    const prefixo = `${a}-${String(m).padStart(2, "0")}`;
    const doMes = itens.filter(
      (i) => !i.pagoEm && i.vencimento.startsWith(prefixo)
    );
    return {
      nome: MESES[m - 1],
      resumo: doMes.length
        ? `${doMes.length} pgto · ${money(soma(doMes))}`
        : "nada",
    };
  });
}

/* ---------------- histórico ---------------- */

export type RegistroFinanceiro = {
  id: string;
  em: string;
  autor: string;
  tipo: string;
  texto: string;
  detalhe: string | null;
  transactionId: string | null;
};

/**
 * Quem registrou cada lançamento — a coluna "registrado por" do CSV.
 * Vale o registro mais recente daquele lançamento: se ela lançou e a
 * sócia pagou, quem aparece na linha paga é quem pagou.
 */
export function autorPorLancamento(
  registros: RegistroFinanceiro[]
): Map<string, string> {
  const mapa = new Map<string, string>();
  // os registros chegam do mais novo para o mais velho
  for (const r of registros) {
    if (r.transactionId && !mapa.has(r.transactionId)) {
      mapa.set(r.transactionId, r.autor);
    }
  }
  return mapa;
}

/* ---------------- extrato em CSV ---------------- */

const COLUNAS_EXTRATO = [
  "tipo",
  "fornecedor/descrição",
  "categoria",
  "vencimento",
  "valor",
  "status",
  "pago em",
  "comprovante",
  "registrado por",
];

/**
 * Campo que começa com = + - @ é executado como FÓRMULA pelo Excel, pelo
 * LibreOffice e pelo Sheets. Nome de fornecedor vem de digitação livre.
 */
function campo(bruto: string): string {
  const v = /^[=+\-@\t\r]/.test(bruto) ? "'" + bruto : bruto;
  return /[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Valor como a planilha brasileira espera: vírgula decimal, sem R$. */
const numeroCsv = (v: number) => v.toFixed(2).replace(".", ",");

export function gerarCsvDoExtrato(
  itens: ItemFinanceiro[],
  entradas: ItemFinanceiro[],
  autores: Map<string, string>
): string {
  const linha = (i: ItemFinanceiro, tipo: string) =>
    [
      tipo,
      i.avulso && i.direcao === "saida" ? i.titulo : i.fornecedor,
      i.categoria,
      fmtData(i.vencimento),
      numeroCsv(i.valor),
      i.pagoEm ? (i.direcao === "entrada" ? "recebido" : "pago") : i.statusTexto,
      i.pagoEm ? fmtData(i.pagoEm) : "",
      i.comprovante?.nome ?? "",
      autores.get(i.id) ?? "",
    ].map(campo).join(";");

  const corpo = [
    ...entradas.map((e) => linha(e, "Entrada do casal")),
    ...itens.map((i) => linha(i, i.avulso ? "Despesa avulsa" : "Parcela")),
  ];

  return (
    "﻿" +
    [COLUNAS_EXTRATO.map(campo).join(";"), ...corpo].join("\r\n")
  );
}
