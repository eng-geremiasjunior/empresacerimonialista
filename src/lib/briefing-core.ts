// Briefing colado → campos do evento — a parte PURA (sem I/O).
//
// A conversa de WhatsApp da noiva ("15/03, Fazenda Santa Clara, uns 180
// convidados, até 45 mil") era retransformada em ~9 campos à mão no
// wizard. Aqui ela vira PROPOSTA de campos — e o wizard inteiro é a
// conferência: cada passo nasce preenchido e ela caminha confirmando.
//
// A régua de dados, com um refinamento sobre o molde do contrato: no
// briefing, o TELEFONE da cliente é um dos alvos da extração — apagar
// (como na extração de contrato) inutilizaria o campo. A resposta é
// PSEUDONIMIZAÇÃO REVERSÍVEL: telefones, e-mails e documentos viram
// marcadores numerados ([TELEFONE_1]) ANTES de sair; o modelo devolve o
// marcador; e o valor real volta ao campo AQUI, localmente — o número
// nunca viajou. Nomes passam (são o único dado pessoal necessário em
// claro), e a prévia mostra exatamente o que sai.

import { redigirContatos } from "@/lib/assistente-gate";
import {
  CATEGORIAS_APOIO,
  CATEGORIAS_OPERACIONAIS,
} from "@/lib/fornecedores-shared";

/* ------------------------------------------------------------------ */
/* 1) Pseudonimização reversível — o que sai                           */
/* ------------------------------------------------------------------ */

export type MapaPseudonimos = Record<string, string>;

// mesma família de padrões do gate do assistente, mas com CAPTURA:
// o valor real fica no mapa local, o marcador viaja
const PADROES: { tipo: "EMAIL" | "DOCUMENTO" | "TELEFONE"; re: RegExp }[] = [
  // termina em caractere de palavra: o ponto final da FRASE não entra
  // no e-mail (senão o valor restaurado viria "gmail.com.")
  { tipo: "EMAIL", re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { tipo: "DOCUMENTO", re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g },
  { tipo: "DOCUMENTO", re: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g },
  { tipo: "TELEFONE", re: /\(\d{2}\)\s?9?\d{4}[-\s]?\d{4}\b/g },
  { tipo: "TELEFONE", re: /\b(?:\+?55\s?)?\d{0,2}\s?9\d{4}-\d{4}\b/g },
  { tipo: "TELEFONE", re: /\b\d{10,11}\b/g },
];

export function pseudonimizar(texto: string): {
  texto: string;
  mapa: MapaPseudonimos;
} {
  const mapa: MapaPseudonimos = {};
  const contador: Record<string, number> = {};
  let saida = texto;
  for (const { tipo, re } of PADROES) {
    saida = saida.replace(re, (real) => {
      // o mesmo valor repetido ganha o mesmo marcador
      const existente = Object.entries(mapa).find(([, v]) => v === real);
      if (existente) return existente[0];
      contador[tipo] = (contador[tipo] ?? 0) + 1;
      const marcador = `[${tipo}_${contador[tipo]}]`;
      mapa[marcador] = real;
      return marcador;
    });
  }
  return { texto: saida, mapa };
}

/** Troca marcadores pelo valor real — roda LOCALMENTE, nunca no provedor. */
export function restaurar(
  valor: string | null,
  mapa: MapaPseudonimos
): string | null {
  if (!valor) return valor;
  let v = valor;
  for (const [marcador, real] of Object.entries(mapa)) {
    v = v.split(marcador).join(real);
  }
  // marcador que não conhecemos (o modelo inventou) não vira dado
  return /\[(?:TELEFONE|EMAIL|DOCUMENTO)_\d+\]/.test(v) ? null : v;
}

/* ------------------------------------------------------------------ */
/* 2) A proposta — o que entra (resposta do modelo é dado não confiável) */
/* ------------------------------------------------------------------ */

export const TIPOS_EVENTO_BRIEFING = [
  "casamento",
  "debutante",
  "formatura",
  "aniversario",
  "corporativo",
  "cha_revelacao",
  "batizado",
  "bodas",
] as const;

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const txt = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};
// O ponto é separador de MILHAR em português e de DECIMAL em JSON, e o
// modelo devolve os dois. Apagar todo ponto transformava "32500.00" em
// 3.250.000 — cem vezes o valor do contrato, sem nada na tela denunciando.
// A vírgula decide: onde ela existe, o ponto é milhar. Sem vírgula, só
// é milhar quando os grupos têm exatamente três dígitos ("32.500").
const paraNumero = (s: string): number => {
  const t = s.replace(/[R$\s ]/gi, "");
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Number(t);
};

const num = (v: unknown, max: number): number | null => {
  const n = typeof v === "string" ? paraNumero(v) : Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 100) / 100 : null;
};

// A v1 (dez escalares sem sujeito, com valor_contrato solto) foi
// removida quando o wizard migrou: era ela que deixava o valor do
// fornecedor cair no honorário da assessoria.

/* ------------------------------------------------------------------ */
/* 3) v2 — a proposta com SUJEITO e MODALIDADE                         */
/* ------------------------------------------------------------------ */

// A v1 eram 10 escalares sem dono: "o buffet fechou por 32.500" caía em
// events.contract_value — que é o HONORÁRIO dela, somado como
// faturamento — e "220, talvez 240" virava um número escolhido em
// silêncio (e esse número define a escala do método). A v2 dá a cada
// afirmação um SUJEITO (de quem é o dinheiro, de quem é o desejo), uma
// MODALIDADE (confirmado / estimado / desejado / pendente) e o TRECHO
// de onde saiu: sem citação não há atribuição verificável — e sem
// atribuição explícita à cerimonialista, dinheiro nunca vira honorário.

export const STATUS_AFIRMACAO = [
  "confirmado",
  "estimado",
  "desejado",
  "pendente",
] as const;
export type StatusAfirmacao = (typeof STATUS_AFIRMACAO)[number];

export type Afirmacao<T = string | number> = {
  valor: T | null;
  /** default 'pendente' — nunca inferido por omissão */
  status: StatusAfirmacao;
  /** fixado aqui, nunca lido do modelo */
  fonte: "briefing_colado";
  /** citação curta (≤300), redigida antes de persistir, NUNCA restaurada */
  trecho: string | null;
};

export const ESTADOS_FORNECEDOR = [
  "contratado",
  "em_conversa",
  "pendente",
  "nao_teremos",
] as const;
export type EstadoFornecedor = (typeof ESTADOS_FORNECEDOR)[number];

export type TipoEventoBriefing = (typeof TIPOS_EVENTO_BRIEFING)[number];

/** Lista fechada: categoria fora daqui não vira item (não há onde aplicar). */
// "outro" entra de propósito: o ESPAÇO é o caso comum que não tem
// categoria própria no cadastro ("já fechamos a fazenda por 12 mil").
// Sem ele o item morria na allowlist e o valor se perdia — e perder
// dinheiro que a cliente disse é exatamente o defeito que estamos
// consertando. Na conferência ela vincula ao fornecedor certo.
export const CATEGORIAS_BRIEFING: readonly string[] = Object.keys({
  ...CATEGORIAS_OPERACIONAIS,
  ...CATEGORIAS_APOIO,
  outro: "Outro",
});

export const ESTILOS_BRIEFING = [
  "classico",
  "rustico",
  "boho",
  "moderno",
  "minimalista",
  "tropical",
] as const;

export const CLIMAS_BRIEFING = ["intimo", "equilibrado", "grandioso"] as const;

export type FornecedorBriefing = {
  categoria: string;
  nome: string | null;
  estado: EstadoFornecedor;
  valor: Afirmacao<number> | null;
};

/** A oferta do fornecedor e o desejo da cliente coexistem — não se somam. */
export type QuantidadeBriefing = {
  item: string;
  ofertado: number | null;
  desejado: number | null;
  unidade: string | null;
  trecho: string | null;
};

export type EstiloBriefing = {
  estilo: string | null;
  cores: string[];
  vetos: string[];
  clima: string | null;
  trecho: string | null;
};

export type PropostaBriefingV2 = {
  schema: 2;
  cliente: { nome: string | null; telefone: string | null; email: string | null };
  evento: {
    tipo: TipoEventoBriefing | null;
    /** YYYY-MM-DD */
    data: string | null;
    /** HH:MM — a âncora (cerimônia/entrada) */
    hora: string | null;
    cidade: string | null;
    local: Afirmacao<string> | null;
    convidados: { atual: number | null; ate: number | null; trecho: string | null };
  };
  /** SÓ com atribuição explícita à cerimonialista — e só com trecho */
  honorario: Afirmacao<number> | null;
  /** "até 45 mil" — o teto da cliente, não a receita dela */
  verba_total: Afirmacao<number> | null;
  fornecedores: FornecedorBriefing[];
  quantidades: QuantidadeBriefing[];
  estilo: EstiloBriefing;
};

const TETO_DINHEIRO = 10_000_000;
const TETO_CONVIDADOS = 5000;
// quantidade de item (doces, arranjos, garrafas): teto só para manter finito
const TETO_QUANTIDADE = 100_000;

const inteiro = (v: unknown, max: number): number | null => {
  const n = num(v, max);
  return n === null ? null : Math.round(n);
};

const umDe = <T extends string>(
  v: unknown,
  lista: readonly T[],
  padrao: T | null
): T | null => {
  const s = txt(v, 20);
  return (lista as readonly string[]).includes(s ?? "") ? (s as T) : padrao;
};

/**
 * Afirmação numérica. O modelo às vezes devolve o número cru em vez do
 * objeto — aceitamos, mas sem trecho (e sem trecho o honorário morre).
 * Valor nulo faz a afirmação inteira virar null: não há o que conferir.
 */
function afirmacaoNum(bruto: unknown, max: number): Afirmacao<number> | null {
  const o =
    bruto && typeof bruto === "object"
      ? (bruto as Record<string, unknown>)
      : { valor: bruto };
  const valor = num(o.valor, max);
  if (valor === null) return null;
  return {
    valor,
    status: umDe(o.status, STATUS_AFIRMACAO, "pendente")!,
    fonte: "briefing_colado",
    trecho: txt(o.trecho, 300),
  };
}

function afirmacaoTxt(bruto: unknown, max: number): Afirmacao<string> | null {
  const o =
    bruto && typeof bruto === "object"
      ? (bruto as Record<string, unknown>)
      : { valor: bruto };
  const valor = txt(o.valor, max);
  if (!valor) return null;
  return {
    valor,
    status: umDe(o.status, STATUS_AFIRMACAO, "pendente")!,
    fonte: "briefing_colado",
    trecho: txt(o.trecho, 300),
  };
}

const listaCurta = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  const saida: string[] = [];
  for (const item of v.slice(0, 8)) {
    const t = txt(item, 40);
    if (t) saida.push(t);
  }
  return saida;
};

/** Reconstrói por allowlist. Item inválido morre; chave estranha não atravessa. */
export function normalizarBriefingV2(bruto: unknown): PropostaBriefingV2 {
  const b = (bruto ?? {}) as Record<string, unknown>;
  const cli = (b.cliente ?? {}) as Record<string, unknown>;
  const ev = (b.evento ?? {}) as Record<string, unknown>;

  const dataStr = txt(ev.data, 10);
  const horaStr = txt(ev.hora, 5);

  const conv =
    ev.convidados && typeof ev.convidados === "object"
      ? (ev.convidados as Record<string, unknown>)
      : { atual: ev.convidados };
  const atual = inteiro(conv.atual, TETO_CONVIDADOS);
  let ate = inteiro(conv.ate, TETO_CONVIDADOS);
  // teto abaixo do número de hoje não é teto — é ruído
  if (ate !== null && atual !== null && ate < atual) ate = null;

  const fornecedores: FornecedorBriefing[] = [];
  if (Array.isArray(b.fornecedores)) {
    for (const f of b.fornecedores.slice(0, 20)) {
      const o = (f ?? {}) as Record<string, unknown>;
      const categoria = umDe(o.categoria, CATEGORIAS_BRIEFING, null);
      // sem categoria da lista não existe onde aplicar: o item morre
      if (!categoria) continue;
      fornecedores.push({
        categoria,
        nome: txt(o.nome, 80),
        estado: umDe(o.estado, ESTADOS_FORNECEDOR, "pendente")!,
        valor: afirmacaoNum(o.valor, TETO_DINHEIRO),
      });
    }
  }

  const quantidades: QuantidadeBriefing[] = [];
  if (Array.isArray(b.quantidades)) {
    for (const q of b.quantidades.slice(0, 20)) {
      const o = (q ?? {}) as Record<string, unknown>;
      const item = txt(o.item, 60);
      const ofertado = inteiro(o.ofertado, TETO_QUANTIDADE);
      const desejado = inteiro(o.desejado, TETO_QUANTIDADE);
      // sem item ou sem nenhum número não há recurso a escrever
      if (!item || (ofertado === null && desejado === null)) continue;
      quantidades.push({
        item,
        ofertado,
        desejado,
        unidade: txt(o.unidade, 20),
        trecho: txt(o.trecho, 300),
      });
    }
  }

  const est = (b.estilo ?? {}) as Record<string, unknown>;
  const honorario = afirmacaoNum(b.honorario, TETO_DINHEIRO);

  return {
    schema: 2,
    cliente: {
      nome: txt(cli.nome, 80),
      telefone: txt(cli.telefone, 40),
      email: txt(cli.email, 80),
    },
    evento: {
      tipo: umDe(ev.tipo, TIPOS_EVENTO_BRIEFING, null),
      data: dataStr && RE_DATA.test(dataStr) ? dataStr : null,
      hora: horaStr && RE_HORA.test(horaStr) ? horaStr : null,
      cidade: txt(ev.cidade, 60),
      local: afirmacaoTxt(ev.local, 80),
      convidados: { atual, ate, trecho: txt(conv.trecho, 300) },
    },
    // REGRA DURA: honorário sem citação não tem atribuição verificável —
    // e é exatamente por aí que o valor do buffet virava receita dela.
    honorario: honorario && honorario.trecho ? honorario : null,
    verba_total: afirmacaoNum(b.verba_total, TETO_DINHEIRO),
    fornecedores,
    quantidades,
    estilo: {
      estilo: umDe(est.estilo, ESTILOS_BRIEFING, null),
      cores: listaCurta(est.cores),
      vetos: listaCurta(est.vetos),
      clima: umDe(est.clima, CLIMAS_BRIEFING, null),
      trecho: txt(est.trecho, 300),
    },
  };
}

/** A proposta trouxe alguma coisa aproveitável? */
export function briefingV2Vazio(p: PropostaBriefingV2): boolean {
  const e = p.evento;
  return (
    !p.cliente.nome &&
    !p.cliente.telefone &&
    !p.cliente.email &&
    !e.tipo &&
    !e.data &&
    !e.hora &&
    !e.cidade &&
    !e.local &&
    e.convidados.atual === null &&
    e.convidados.ate === null &&
    !p.honorario &&
    !p.verba_total &&
    p.fornecedores.length === 0 &&
    p.quantidades.length === 0 &&
    !p.estilo.estilo &&
    p.estilo.cores.length === 0 &&
    p.estilo.vetos.length === 0 &&
    !p.estilo.clima
  );
}

const RE_MARCADOR = /\[(?:TELEFONE|EMAIL|DOCUMENTO)_\d+\]/;

/**
 * Campo que NÃO é contato: marcador ali é VAZAMENTO (o modelo pôs um
 * telefone no nome do local), nunca dado. Some em silêncio.
 */
export function restaurarParaNulo(valor: string | null): string | null {
  if (!valor) return valor;
  return RE_MARCADOR.test(valor) ? null : valor;
}

/**
 * Devolve os contatos reais — roda LOCALMENTE, no navegador dela.
 * Walker EXPLÍCITO caminho a caminho: só telefone e e-mail do cliente
 * restauram; os outros textos, se trouxerem marcador, viram nulo; e
 * NENHUM trecho restaura (a citação vai para o banco, redigida).
 */
export function restaurarProposta(
  p: PropostaBriefingV2,
  mapa: MapaPseudonimos
): PropostaBriefingV2 {
  const local = p.evento.local;
  const localValor = local ? restaurarParaNulo(local.valor) : null;
  return {
    schema: 2,
    cliente: {
      nome: restaurarParaNulo(p.cliente.nome),
      telefone: restaurar(p.cliente.telefone, mapa),
      email: restaurar(p.cliente.email, mapa),
    },
    evento: {
      tipo: p.evento.tipo,
      data: p.evento.data,
      hora: p.evento.hora,
      cidade: restaurarParaNulo(p.evento.cidade),
      local: local && localValor ? { ...local, valor: localValor } : null,
      convidados: { ...p.evento.convidados },
    },
    honorario: p.honorario ? { ...p.honorario } : null,
    verba_total: p.verba_total ? { ...p.verba_total } : null,
    fornecedores: p.fornecedores.map((f) => ({
      ...f,
      nome: restaurarParaNulo(f.nome),
      valor: f.valor ? { ...f.valor } : null,
    })),
    // item é obrigatório: marcador no nome do item derruba o item inteiro
    quantidades: p.quantidades
      .filter((q) => restaurarParaNulo(q.item) !== null)
      .map((q) => ({ ...q })),
    estilo: {
      estilo: restaurarParaNulo(p.estilo.estilo),
      cores: p.estilo.cores.filter((c) => restaurarParaNulo(c) !== null),
      vetos: p.estilo.vetos.filter((v) => restaurarParaNulo(v) !== null),
      clima: restaurarParaNulo(p.estilo.clima),
      trecho: p.estilo.trecho,
    },
  };
}

/** O que o wizard tem direito de preencher — identidade do evento e do cliente. */
export type IdentidadeBriefing = {
  tipo: TipoEventoBriefing | null;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  data: string | null;
  hora: string | null;
  cidade: string | null;
  local: string | null;
  convidados: number | null;
  guestsMax: number | null;
  /** honorário só existe com citação — o campo mostra o trecho como dica */
  honorario: { valor: number; trecho: string } | null;
};

export function identidadeDaProposta(p: PropostaBriefingV2): IdentidadeBriefing {
  const h = p.honorario;
  return {
    tipo: p.evento.tipo,
    nome: p.cliente.nome,
    telefone: p.cliente.telefone,
    email: p.cliente.email,
    data: p.evento.data,
    hora: p.evento.hora,
    cidade: p.evento.cidade,
    local: p.evento.local?.valor ?? null,
    convidados: p.evento.convidados.atual,
    guestsMax: p.evento.convidados.ate,
    // Dois portões, não um. O da CITAÇÃO responde "de quem é este
    // dinheiro?" — sem trecho o normalizador já matou. O da MODALIDADE
    // responde "isto é um preço ou um desejo?": "pra assessoria eu queria
    // gastar uns 5 mil" tem atribuição explícita e citação, e mesmo assim
    // não é honorário nenhum — é o teto que a cliente sonha. Entrando no
    // campo, viraria receita prevista dela na lista de eventos.
    honorario:
      h &&
      h.valor !== null &&
      h.valor > 0 &&
      h.trecho &&
      (h.status === "confirmado" || h.status === "estimado")
        ? { valor: h.valor, trecho: h.trecho }
        : null,
  };
}

const trechoSeguro = (t: string | null): string | null =>
  t ? redigirContatos(t).texto : null;

/**
 * O que sobra para a caixa de conferência: a proposta MENOS a identidade
 * (essa o wizard já gravou), com todo trecho redigido antes de virar
 * payload no banco. Convidados fica: o teto ainda é conferível.
 */
export function propostaParaConferencia(
  p: PropostaBriefingV2
): PropostaBriefingV2 {
  return {
    schema: 2,
    cliente: { nome: null, telefone: null, email: null },
    evento: {
      tipo: null,
      data: null,
      hora: null,
      cidade: null,
      local: null,
      // o wizard já gravou convidados e o teto: não sobra conferência
      convidados: { atual: null, ate: null, trecho: null },
    },
    honorario: null,
    verba_total: p.verba_total
      ? { ...p.verba_total, trecho: trechoSeguro(p.verba_total.trecho) }
      : null,
    fornecedores: p.fornecedores.map((f) => ({
      ...f,
      valor: f.valor
        ? { ...f.valor, trecho: trechoSeguro(f.valor.trecho) }
        : null,
    })),
    quantidades: p.quantidades.map((q) => ({
      ...q,
      trecho: trechoSeguro(q.trecho),
    })),
    estilo: { ...p.estilo, trecho: trechoSeguro(p.estilo.trecho) },
  };
}
