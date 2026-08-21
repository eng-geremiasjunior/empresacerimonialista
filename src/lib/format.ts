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
