// Datas na voz do portal (handoff §8): "12 de setembro de 2026",
// "Paga · 02 de março", "02 abr". Puras — importáveis por client e
// server. Sempre UTC: a data do evento é um dia de calendário, não um
// instante.

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function partes(iso: string): { dia: number; mes: number; ano: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** "2026-09-12" → "12 de setembro de 2026" */
export function dataLonga(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${p.dia} de ${MESES[p.mes - 1]} de ${p.ano}`;
}

/** "2026-03-02" → "02 de março" (parcelas: "Paga · 02 de março") */
export function diaEMes(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${String(p.dia).padStart(2, "0")} de ${MESES[p.mes - 1]}`;
}

/** "2026-04-02" → "02 abr" (linha do tempo) */
export function dataCurta(iso: string): string {
  const p = partes(iso);
  if (!p) return iso;
  return `${String(p.dia).padStart(2, "0")} ${MESES[p.mes - 1].slice(0, 3)}`;
}

/**
 * O prazo na voz do portal. REGRA: a cliente nunca vê tempo negativo nem
 * vocabulário de cobrança.
 *
 * Atraso é informação para a profissional — e o método comprime prazos
 * quando o casamento é mais curto que o método pede, então uma noiva que
 * entra pela primeira vez encontraria metade da lista "vencida ontem"
 * sem ter feito nada de errado. Aqui, tudo que já passou vira "para
 * agora"; só o futuro conta dias.
 *
 * (A tela da cerimonialista continua usando prazoRelativo, que diz
 * "venceu há 3 dias" — lá isso é exatamente o que ela precisa saber.)
 */
export function prazoPortal(iso: string | null): string | null {
  if (!iso) return null;
  const hoje = new Date(new Date().toDateString()).getTime();
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const dias = Math.round((alvo - hoje) / 86_400_000);
  if (dias <= 0) return "para agora";
  if (dias === 1) return "para amanhã";
  if (dias <= 30) return `faltam ${dias} dias`;
  return `faltam ${dias} dias`;
}
