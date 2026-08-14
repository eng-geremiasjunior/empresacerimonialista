// A voz do convite, compartilhada pelas duas portas do convidado: o link
// individual e o link único do evento.

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function dataLonga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

// O convite fala a língua do evento: nem todo convidado vai a casamento.
// Os oito tipos que o sistema usa hoje; o que não estiver aqui cai no
// genérico, que funciona para qualquer coisa.
const CONVITE_PARA: Record<string, string> = {
  casamento: "o casamento de",
  debutante: "os 15 anos de",
  aniversario: "o aniversário de",
  bodas: "as bodas de",
  formatura: "a formatura de",
  batizado: "o batizado de",
  cha_revelacao: "o chá revelação de",
  corporativo: "o evento de",
};

export function convitePara(tipo: string): string {
  return CONVITE_PARA[tipo] ?? "o evento de";
}

/** Data e hora numa linha só, do jeito que se lê num convite. */
export function quandoLegivel(data: string, hora: string | null): string {
  return dataLonga(data) + (hora ? ` · ${hora.slice(0, 5)}` : "");
}
