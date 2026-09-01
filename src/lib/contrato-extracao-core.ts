// Extração de contrato — a parte PURA (sem I/O).
//
// Duas responsabilidades, as duas de segurança:
//
//   1. redigirParaExtracao(): o que pode sair do navegador dela. Reusa a
//      redação de contatos do assistente (e-mail, telefone, CPF, CNPJ) e
//      acrescenta o que contrato tem e conversa não: agência, conta,
//      chave PIX. O PDF em si nunca sai — só este texto, já redigido.
//
//   2. normalizarProposta(): o que pode ENTRAR vindo do modelo. A
//      resposta da IA é dado não confiável — a proposta é reconstruída
//      campo a campo por allowlist (chave desconhecida morre aqui),
//      com números finitos, datas e horas no formato certo e textos
//      aparados. Molde do validador da prestação (prestacao-core).
//
// A aplicação (o que vira lançamento/recurso/horário) é decisão DELA,
// item a item, na conferência — este módulo não escreve nada.

import { redigirContatos } from "@/lib/assistente-gate";

/* ------------------------------------------------------------------ */
/* 1) Redação — o que sai                                              */
/* ------------------------------------------------------------------ */

// Padrões que só fazem sentido em contrato/pagamento. Rodam DEPOIS da
// redação de contatos (que já cobre e-mail/telefone/CPF/CNPJ e a rede
// final de 10-11 dígitos corridos).
const PADROES_BANCARIOS: RegExp[] = [
  // agência 1234 / ag.: 1234-5
  /\bag(?:[eê]ncia|\.)?\s*:?\s*\d[\d.\- ]{0,8}\d/gi,
  // conta corrente: 12345-6 / conta 00.123-4
  /\bconta(?:\s+corrente|\s+poupan[cç]a)?\s*:?\s*\d[\d.\- ]{0,12}\d/gi,
  // chave PIX declarada (com separador; "pagamento via pix" fica em paz)
  /\bchave\s+pix\s*:?\s*\S+/gi,
  /\bpix\s*[:=]\s*\S+/gi,
  // banco 341 / banco: 001 (o número da instituição)
  /\bbanco\s*:?\s*\d{2,4}\b/gi,
];

export type RedacaoContrato = { texto: string; redigidos: number };

export function redigirParaExtracao(texto: string): RedacaoContrato {
  const contatos = redigirContatos(texto);
  let saida = contatos.texto;
  let redigidos = contatos.redigidos;
  for (const padrao of PADROES_BANCARIOS) {
    saida = saida.replace(padrao, () => {
      redigidos += 1;
      return "[dado bancário removido]";
    });
  }
  return { texto: saida, redigidos };
}

/* ------------------------------------------------------------------ */
/* 2) A proposta — o que entra                                         */
/* ------------------------------------------------------------------ */

export type ParcelaExtraida = {
  valor: number;
  /** YYYY-MM-DD, ou null quando o contrato não crava a data */
  vencimento: string | null;
  descricao: string | null;
  /** citação curta do contrato de onde o dado saiu */
  trecho: string | null;
};

export type QuantidadeExtraida = {
  nome: string;
  quantidade: number;
  unidade: string | null;
  trecho: string | null;
};

export type HorarioExtraido = {
  /** chegada | montagem | desmontagem | outro */
  titulo: string;
  /** HH:MM */
  hora: string;
  trecho: string | null;
};

/**
 * O que só o contrato do ESPAÇO diz: a borda do dia para os fornecedores.
 * Preenche o slot origem_horario='espaco' que a 112 previu e ninguém
 * produzia. Null quando o contrato não é de espaço (buffet, som…).
 */
export type EspacoExtraido = {
  /** HH:MM — a partir de quando os fornecedores podem entrar para montar */
  liberacao_montagem: string | null;
  /** HH:MM — horário limite do som */
  termino_som: string | null;
  /** HH:MM — até quando a desmontagem tem que terminar */
  desmontagem_ate: string | null;
  /** regras do espaço que afetam a operação (texto curto) */
  restricoes: string | null;
  trecho: string | null;
};

export type PropostaExtracao = {
  schema: 1;
  valor_total: number | null;
  trecho_valor: string | null;
  parcelas: ParcelaExtraida[];
  quantidades: QuantidadeExtraida[];
  horarios: HorarioExtraido[];
  /** ausente em propostas anteriores à aposta 2 */
  espaco?: EspacoExtraido | null;
};

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const txt = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/**
 * Reconstrói a proposta por allowlist. Item inválido é descartado em
 * silêncio (a proposta é sugestão, não verdade); estrutura de fora do
 * contrato simplesmente não atravessa.
 */
export function normalizarProposta(bruto: unknown): PropostaExtracao {
  const b = (bruto ?? {}) as Record<string, unknown>;

  const parcelas: ParcelaExtraida[] = [];
  if (Array.isArray(b.parcelas)) {
    for (const p of b.parcelas.slice(0, 36)) {
      const o = (p ?? {}) as Record<string, unknown>;
      const valor = num(o.valor);
      if (valor === null) continue;
      const venc = txt(o.vencimento, 10);
      parcelas.push({
        valor,
        vencimento: venc && RE_DATA.test(venc) ? venc : null,
        descricao: txt(o.descricao, 120),
        trecho: txt(o.trecho, 300),
      });
    }
  }

  const quantidades: QuantidadeExtraida[] = [];
  if (Array.isArray(b.quantidades)) {
    for (const q of b.quantidades.slice(0, 40)) {
      const o = (q ?? {}) as Record<string, unknown>;
      const nome = txt(o.nome, 80);
      const quantidade = num(o.quantidade);
      if (!nome || quantidade === null) continue;
      quantidades.push({
        nome,
        quantidade,
        unidade: txt(o.unidade, 20),
        trecho: txt(o.trecho, 300),
      });
    }
  }

  const horarios: HorarioExtraido[] = [];
  if (Array.isArray(b.horarios)) {
    for (const h of b.horarios.slice(0, 10)) {
      const o = (h ?? {}) as Record<string, unknown>;
      const hora = txt(o.hora, 5);
      if (!hora || !RE_HORA.test(hora)) continue;
      horarios.push({
        titulo: txt(o.titulo, 40) ?? "horário",
        hora,
        trecho: txt(o.trecho, 300),
      });
    }
  }

  // o bloco do espaço só existe se ao menos um campo válido veio
  let espaco: EspacoExtraido | null = null;
  if (b.espaco && typeof b.espaco === "object") {
    const e = b.espaco as Record<string, unknown>;
    const hora = (v: unknown) => {
      const h = txt(v, 5);
      return h && RE_HORA.test(h) ? h : null;
    };
    const candidato: EspacoExtraido = {
      liberacao_montagem: hora(e.liberacao_montagem),
      termino_som: hora(e.termino_som),
      desmontagem_ate: hora(e.desmontagem_ate),
      restricoes: txt(e.restricoes, 500),
      trecho: txt(e.trecho, 300),
    };
    if (
      candidato.liberacao_montagem ||
      candidato.termino_som ||
      candidato.desmontagem_ate ||
      candidato.restricoes
    ) {
      espaco = candidato;
    }
  }

  return {
    schema: 1,
    valor_total: num(b.valor_total),
    trecho_valor: txt(b.trecho_valor, 300),
    parcelas,
    quantidades,
    horarios,
    espaco,
  };
}

/** A proposta tem alguma coisa aproveitável? */
export function propostaVazia(p: PropostaExtracao): boolean {
  return (
    p.valor_total === null &&
    p.parcelas.length === 0 &&
    p.quantidades.length === 0 &&
    p.horarios.length === 0 &&
    !p.espaco
  );
}
