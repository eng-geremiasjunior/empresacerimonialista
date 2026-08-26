// "Hoje" no fuso do aparelho, como YYYY-MM-DD. toISOString() é UTC e no
// Brasil vira o dia às 21h locais — um guarda de data feito com ele
// desligava a detecção de atraso no pico da recepção.
export function hojeLocalISO(agora: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

// "16:00:00" (Postgres time) -> "16:00". Sem horário definido -> "A definir".
export function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : "A definir";
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/**
 * "1 tarefa" / "3 tarefas". Existia copiado em quatro arquivos, e a tela da
 * Organização não usava nenhum deles — escrevia "1 tarefas abertas", que é
 * o caso MAIS provável com uma testadora de poucos dados.
 */
export function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * Máscara de dinheiro ENQUANTO digita, no padrão brasileiro: pontos de
 * milhar entram sozinhos e a vírgula separa os centavos (até 2 casas).
 * "250000" vira "250.000"; "150000,5" vira "150.000,5".
 *
 * A pessoa digita o número inteiro como pensa nele — nada de "centavos
 * primeiro" de app de banco, que faria 250000 virar 2.500,00 num campo
 * onde ninguém digita centavo de verba.
 */
export function mascararDinheiro(bruto: string): string {
  const limpo = bruto.replace(/[^\d,]/g, "");
  const [inteiroCru = "", ...resto] = limpo.split(",");
  const inteiro = inteiroCru.replace(/^0+(?=\d)/, "");
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (resto.length === 0) return agrupado;
  const centavos = resto.join("").slice(0, 2);
  return `${agrupado},${centavos}`;
}

/** O número por trás da máscara. Vazio vira null; lixo vira null. */
export function desmascararDinheiro(mascarado: string): number | null {
  const limpo = mascarado.trim();
  if (!limpo) return null;
  const n = Number(limpo.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
