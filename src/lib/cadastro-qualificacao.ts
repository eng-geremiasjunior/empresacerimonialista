// As perguntas do cadastro que dizem QUEM chegou (16/09/2026).
//
// Até aqui o cadastro pedia nome, negócio, e-mail e senha — e das sete
// primeiras contas de anúncio nenhuma deixou um jeito de ser encontrada
// fora do sistema, nem disse se trabalhava com evento marcado. Três
// perguntas entraram, copiadas do que a concorrente pergunta, e só as que
// mudam o que o dono faz em seguida:
//
//   · WhatsApp — o canal que esse público responde;
//   · quantos eventos nos próximos três meses — separa quem trabalha de
//     quem está só olhando, e dá o assunto da primeira conversa;
//   · o @ do Instagram, opcional — é onde se vê quem ela é.
//
// Isomórfico: o formulário, a action e o painel do dono leem daqui.

export const EVENTOS_3_MESES = [
  { valor: "nenhum", rotulo: "Nenhum ainda" },
  { valor: "1-2", rotulo: "1 ou 2" },
  { valor: "3-5", rotulo: "3 a 5" },
  { valor: "6+", rotulo: "6 ou mais" },
] as const;

export type Eventos3Meses = (typeof EVENTOS_3_MESES)[number]["valor"];

export function ehEventos3Meses(v: unknown): v is Eventos3Meses {
  return EVENTOS_3_MESES.some((o) => o.valor === v);
}

/** "3 a 5 eventos nos próximos 3 meses" — como o painel mostra. */
export function descreverEventos3Meses(v: string | null | undefined): string | null {
  const o = EVENTOS_3_MESES.find((x) => x.valor === v);
  if (!o) return null;
  if (o.valor === "nenhum") return "nenhum evento nos próximos 3 meses";
  return `${o.rotulo} eventos nos próximos 3 meses`;
}

/**
 * O @ do Instagram como ela digitar — "@ateliê.x", "instagram.com/x/",
 * "x" — vira só o nome de usuário. Fora das regras do Instagram (letras,
 * números, ponto e sublinhado, até 30), devolve null: melhor sem @ do que
 * um link para um perfil que não existe.
 */
export function normalizarInstagram(texto: string | null | undefined): string | null {
  let t = (texto ?? "").trim();
  if (!t) return null;
  t = t.replace(/^https?:\/\//i, "").replace(/^(www\.)?instagram\.com\//i, "");
  t = t.split(/[/?#\s]/)[0] ?? "";
  t = t.replace(/^@+/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(t) ? t : null;
}
