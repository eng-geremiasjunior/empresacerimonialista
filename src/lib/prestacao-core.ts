// A prestação de contas do casal — o payload, sua montagem e o guarda.
//
// Módulo PURO (sem I/O), como recursos-core e croqui-core: as contas que
// vão para um documento financeiro nominal precisam ser testáveis sem
// banco.
//
// As três regras do documento:
//   - pendência aparece como pendência (parcela em aberto é dita em
//     aberto, nunca omitida);
//   - estimado nunca se veste de realizado ("valor contratado (não
//     conferido)" enquanto a conferência pós-evento não existir);
//   - o que é DELA não entra: o validador no fim deste arquivo recusa
//     qualquer chave fora da allowlist — receita_assessoria, custos,
//     lucro, notes e afins não têm como passar despercebidos.

export type FornecedorPrestacao = {
  nome: string;
  estimado: number | null;
  contratado: number;
  pago: number;
  em_aberto: number;
  /** v1: sempre false — a conferência pós-evento é a v2 */
  conferido: boolean;
};

export type ParcelaPrestacao = {
  fornecedor: string | null;
  descricao: string | null;
  valor: number;
  vencimento: string;
  paga: boolean;
  paga_em: string | null;
};

export type ItemDiaPrestacao = {
  titulo: string;
  previsto: string | null;
  /** "era HH:MM" quando o horário foi empurrado no dia */
  previsto_original: string | null;
  realizado_inicio: string | null;
  variacao: "antecipado" | "no_horario" | "atrasado" | "sem_dado";
};

export type PrestacaoPayload = {
  schema: 1;
  evento: {
    nome: string;
    data: string;
    local: string | null;
  };
  resumo: {
    verba: number | null;
    contratado: number;
    pago: number;
    em_aberto: number;
    economia: number;
    fornecedores_com_estimativa: number;
  };
  fornecedores: FornecedorPrestacao[];
  parcelas: ParcelaPrestacao[];
  dia: {
    itens: ItemDiaPrestacao[];
    concluidos: number;
    total: number;
  };
  convidados: {
    confirmados: number;
    /** de onde veio o número — o rótulo honesto da tela */
    origem: "confirmados" | "estimados";
  };
  pendencias: {
    parcelas_abertas: number;
    valor_em_aberto: number;
    valores_nao_conferidos: boolean;
  };
  notas: Record<string, string>;
};

/** As seções que aceitam observação dela. */
export const SECOES_NOTA = [
  "resumo",
  "fornecedores",
  "parcelas",
  "dia",
  "geral",
] as const;

export type SecaoNota = (typeof SECOES_NOTA)[number];

/* ------------------------------------------------------------------ */
/* O guarda: allowlist de CHAVES, recursiva                            */
/* ------------------------------------------------------------------ */

// Por que chaves e não texto: as observações são autoria dela — ela pode
// escrever "assessoria" ou "lucro" numa frase e isso não é vazamento.
// Vazamento é um CAMPO estruturado fora do contrato do documento. Toda
// chave que aparecer no payload precisa estar aqui; chave desconhecida
// derruba a entrega. (Molde da conferência da 126: "motivo_interno
// continua fora" — só que executável em runtime.)
const CHAVES_PERMITIDAS = new Set([
  "schema",
  "evento", "nome", "data", "local",
  "resumo", "verba", "contratado", "pago", "em_aberto", "economia",
  "fornecedores_com_estimativa",
  "fornecedores", "estimado", "conferido",
  "parcelas", "fornecedor", "descricao", "valor", "vencimento",
  "paga", "paga_em",
  "dia", "itens", "titulo", "previsto", "previsto_original",
  "realizado_inicio", "variacao", "concluidos", "total",
  "convidados", "confirmados", "origem",
  "pendencias", "parcelas_abertas", "valor_em_aberto",
  "valores_nao_conferidos",
  "notas", ...SECOES_NOTA,
]);

/** Chaves que jamais podem existir — nem por acidente de refatoração. */
const CHAVES_PROIBIDAS = new Set([
  "receita_assessoria", "a_receber_assessoria", "custos_diretos",
  "lucro", "margem", "assessoria",
  "notes", "nota_interna", "motivo_interno", "observacao_interna",
  "pronuncia", "restricao_alimentar", "sensibilidade",
  "telefone", "whatsapp", "email", "cpf", "cnpj", "documento",
  "supplier_id", "historico",
]);

export type Violacao = { caminho: string; motivo: string };

export function validarPayloadCasal(payload: unknown): Violacao[] {
  const violacoes: Violacao[] = [];
  const visitar = (v: unknown, caminho: string) => {
    if (Array.isArray(v)) {
      v.forEach((item, i) => visitar(item, `${caminho}[${i}]`));
      return;
    }
    if (v !== null && typeof v === "object") {
      for (const [chave, filho] of Object.entries(v)) {
        const aqui = caminho ? `${caminho}.${chave}` : chave;
        if (CHAVES_PROIBIDAS.has(chave)) {
          violacoes.push({ caminho: aqui, motivo: "chave proibida" });
        } else if (!CHAVES_PERMITIDAS.has(chave)) {
          violacoes.push({ caminho: aqui, motivo: "chave fora da allowlist" });
        }
        visitar(filho, aqui);
      }
    }
  };
  visitar(payload, "");
  return violacoes;
}

/* ------------------------------------------------------------------ */
/* A montagem (pura — recebe dados, devolve o documento)               */
/* ------------------------------------------------------------------ */

export type EntradaMontagem = {
  evento: { nome: string; data: string; local: string | null; verba: number | null };
  fornecedores: {
    nome: string;
    estimado: number | null;
    contratado: number;
    pago: number;
  }[];
  parcelas: ParcelaPrestacao[];
  dia: ItemDiaPrestacao[];
  diaConcluidos: number;
  convidados: { quantidade: number; origem: "confirmados" | "estimados" };
  economia: number;
  fornecedoresComEstimativa: number;
  notas: Record<string, string>;
};

export function montarPayloadCasal(e: EntradaMontagem): PrestacaoPayload {
  const contratado = soma(e.fornecedores.map((f) => f.contratado));
  const pago = soma(e.fornecedores.map((f) => f.pago));
  const parcelasAbertas = e.parcelas.filter((p) => !p.paga);

  // só as notas de seções conhecidas e não vazias entram na fotografia
  const notas: Record<string, string> = {};
  for (const secao of SECOES_NOTA) {
    const texto = (e.notas[secao] ?? "").trim();
    if (texto) notas[secao] = texto.slice(0, 2000);
  }

  return {
    schema: 1,
    evento: { nome: e.evento.nome, data: e.evento.data, local: e.evento.local },
    resumo: {
      verba: e.evento.verba,
      contratado: arred(contratado),
      pago: arred(pago),
      em_aberto: arred(Math.max(0, contratado - pago)),
      economia: arred(e.economia),
      fornecedores_com_estimativa: e.fornecedoresComEstimativa,
    },
    fornecedores: e.fornecedores
      .map((f) => ({
        nome: f.nome,
        estimado: f.estimado,
        contratado: arred(f.contratado),
        pago: arred(f.pago),
        em_aberto: arred(Math.max(0, f.contratado - f.pago)),
        conferido: false, // v1: a conferência pós-evento ainda não existe
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    parcelas: [...e.parcelas].sort((a, b) =>
      a.vencimento.localeCompare(b.vencimento)
    ),
    dia: { itens: e.dia, concluidos: e.diaConcluidos, total: e.dia.length },
    convidados: {
      confirmados: e.convidados.quantidade,
      origem: e.convidados.origem,
    },
    pendencias: {
      parcelas_abertas: parcelasAbertas.length,
      valor_em_aberto: arred(soma(parcelasAbertas.map((p) => p.valor))),
      valores_nao_conferidos: true, // v1: sempre — e o documento diz isso
    },
    notas,
  };
}

function soma(ns: number[]): number {
  return ns.reduce((s, n) => s + n, 0);
}

function arred(n: number): number {
  return Math.round(n * 100) / 100;
}
