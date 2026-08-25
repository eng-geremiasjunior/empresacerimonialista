// Que dia é hoje, e que horas são — em Brasília, sempre.
//
// Este arquivo existe porque a resposta óbvia está errada no servidor. Na
// Vercel o processo roda em UTC, então `new Date()` às 21h de Brasília já
// é o dia seguinte. Tudo que depende de "hoje" herda o erro:
//
//   · parcela que vence hoje passa a dizer que venceu
//   · tarefa de hoje vira "atrasada"
//   · o evento que está acontecendo AGORA sai dos alertas e o cartão dele
//     diz "Evento realizado" — durante a festa
//   · a saudação do dashboard diz "Boa noite" às 15h
//
// E não adianta trocar por `hojeLocalISO` de lib/format.ts: aquele usa
// getFullYear/getMonth/getDate, que também é o fuso do runtime. No
// navegador dá certo por acidente (o aparelho dela está em Brasília); no
// servidor dá o mesmo UTC.
//
// A cerimonialista trabalha em horário de Brasília. O sistema também.

const FUSO = "America/Sao_Paulo";

/** Hoje em Brasília, `yyyy-MM-dd`. Funciona no servidor e no navegador. */
export function hojeBR(agora: Date = new Date()): string {
  // en-CA porque é o único locale que formata como yyyy-MM-dd nativamente
  return agora.toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** A hora cheia em Brasília, 0–23. É o que decide a saudação. */
export function horaBR(agora: Date = new Date()): number {
  const h = Number(
    agora.toLocaleString("en-GB", {
      timeZone: FUSO,
      hour: "2-digit",
      hour12: false,
    })
  );
  // alguns motores devolvem 24 à meia-noite
  return Number.isFinite(h) ? h % 24 : 0;
}

/**
 * Meia-noite de hoje, como Date, para comparar com datas montadas a partir
 * de `yyyy-MM-dd`. Substitui `new Date(new Date().toDateString())`, que
 * usava o fuso do runtime.
 *
 * Os dois lados da comparação ficam no mesmo fuso do JS porque ambos
 * nascem de `T00:00:00` — o que importa é qual DIA, e esse vem de Brasília.
 */
export function inicioDoDiaBR(agora: Date = new Date()): Date {
  return new Date(`${hojeBR(agora)}T00:00:00`);
}

/** Uma data ISO deslocada em N dias, sem fuso no meio. Aceita negativo. */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  t.setUTCDate(t.getUTCDate() + dias);
  return t.toISOString().slice(0, 10);
}

/** Atalho de leitura para quem só quer "daqui a N dias" a partir de hoje. */
export function emDiasBR(dias: number, agora: Date = new Date()): string {
  return somarDias(hojeBR(agora), dias);
}

/** Primeiro dia do mês corrente em Brasília, `yyyy-MM-01`. */
export function inicioDoMesBR(agora: Date = new Date()): string {
  return `${hojeBR(agora).slice(0, 7)}-01`;
}

/**
 * Primeiro dia do mês seguinte. Existe porque o jeito antigo era
 * `startOfMonth(addDays(startOfMonth(new Date()), 40))` — que funciona,
 * mas ninguém lê como "mês que vem".
 */
export function proximoMesBR(agora: Date = new Date()): string {
  const [a, m] = hojeBR(agora).split("-").map(Number);
  return m === 12
    ? `${a + 1}-01-01`
    : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Último dia do mês corrente em Brasília. */
export function fimDoMesBR(agora: Date = new Date()): string {
  return somarDias(proximoMesBR(agora), -1);
}
