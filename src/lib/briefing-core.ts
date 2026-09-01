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

export type PropostaBriefing = {
  schema: 1;
  nome_cliente: string | null;
  /** pode chegar como marcador [TELEFONE_n] — restaurar() resolve local */
  telefone: string | null;
  email: string | null;
  tipo: (typeof TIPOS_EVENTO_BRIEFING)[number] | null;
  /** YYYY-MM-DD */
  data: string | null;
  /** HH:MM — a âncora (cerimônia/entrada) */
  hora: string | null;
  cidade: string | null;
  local: string | null;
  convidados: number | null;
  valor_contrato: number | null;
};

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const txt = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};
const num = (v: unknown, max: number): number | null => {
  const n = typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 100) / 100 : null;
};

/** Reconstrói por allowlist. Campo inválido morre; chave estranha não atravessa. */
export function normalizarBriefing(bruto: unknown): PropostaBriefing {
  const b = (bruto ?? {}) as Record<string, unknown>;
  const dataStr = txt(b.data, 10);
  const horaStr = txt(b.hora, 5);
  const tipoStr = txt(b.tipo, 20);
  return {
    schema: 1,
    nome_cliente: txt(b.nome_cliente, 80),
    telefone: txt(b.telefone, 40),
    email: txt(b.email, 80),
    tipo: (TIPOS_EVENTO_BRIEFING as readonly string[]).includes(tipoStr ?? "")
      ? (tipoStr as PropostaBriefing["tipo"])
      : null,
    data: dataStr && RE_DATA.test(dataStr) ? dataStr : null,
    hora: horaStr && RE_HORA.test(horaStr) ? horaStr : null,
    cidade: txt(b.cidade, 60),
    local: txt(b.local, 80),
    convidados: num(b.convidados, 5000) ? Math.round(num(b.convidados, 5000)!) : null,
    valor_contrato: num(b.valor_contrato, 10_000_000),
  };
}

/** A proposta trouxe alguma coisa aproveitável? */
export function briefingVazio(p: PropostaBriefing): boolean {
  return (
    !p.nome_cliente &&
    !p.tipo &&
    !p.data &&
    !p.cidade &&
    !p.local &&
    p.convidados === null &&
    p.valor_contrato === null
  );
}
