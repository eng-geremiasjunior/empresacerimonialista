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
