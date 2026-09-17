// Formatos do painel do dono. Puro, e igual no servidor e no navegador:
// toda data sai no fuso de Brasília, nunca no do computador que mostra.

const FUSO = "America/Sao_Paulo";

/** "17/09/2026" (data sem hora é mostrada como está). */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (iso.length <= 10) {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** "17/09" */
export function diaMesBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  if (iso.length <= 10) {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });
}

/** "17/09 às 10:58" */
export function diaEHoraBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
  return `${dia} às ${hora}`;
}

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "quinta, 17 de setembro" a partir de "2026-09-17" */
export function diaPorExtenso(yyyyMmDd: string): string {
  const [a, m, d] = yyyyMmDd.split("-").map(Number);
  const sem = SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${sem}, ${d} de ${MESES[m - 1]}`;
}

/** "setembro de 2026" a partir de "2026-09" */
export function mesPorExtenso(yyyyMm: string): string {
  const [a, m] = yyyyMm.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

/** "R$ 1.234,50" (centavos só quando existem) */
export function reais(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `R$ ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "1 h 20 min", "35 min" */
export function minutosEmTexto(min: number): string {
  if (!min || min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** "45 MB", "1,2 GB" */
export function bytesEmTexto(b: number | null | undefined): string {
  if (b === null || b === undefined || !Number.isFinite(b)) return "—";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 ** 3) return `${Math.round(b / 1024 / 1024)} MB`;
  return `${(b / 1024 ** 3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
}

/** "38%" (sem base, "—") */
export function porcento(parte: number, todo: number): string {
  if (!todo) return "—";
  return `${Math.round((parte / todo) * 100)}%`;
}

export function plural(n: number, um: string, varios: string): string {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
}

/** A mediana, ou null sem dados. */
export function mediana(numeros: number[]): number | null {
  if (numeros.length === 0) return null;
  const o = [...numeros].sort((a, b) => a - b);
  const meio = Math.floor(o.length / 2);
  return o.length % 2 ? o[meio] : (o[meio - 1] + o[meio]) / 2;
}
