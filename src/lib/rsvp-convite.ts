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

// O que as consultas públicas (092, 094, 095, 128, 129) põem no lugar do
// nome quando o evento não tem nome. Não é nome de ninguém.
const SEM_NOME = new Set(["os noivos", "os anfitriões"]);

/** O evento tem nome de verdade (e não o "sem nome" das consultas)? */
export function temNome(anfitrioes: string | null | undefined): boolean {
  const n = anfitrioes?.trim().toLowerCase();
  return Boolean(n) && !SEM_NOME.has(n!);
}

/**
 * A frase do convite com o nome: "o casamento de Camila e Rodrigo". Sem
 * nome, a frase para antes do "de" ("o casamento") — nunca "o casamento
 * de os noivos". Serve às duas vozes: "o casamento de" das páginas e "no
 * casamento de" dos e-mails.
 */
export function conviteCom(convite: string, anfitrioes: string | null | undefined): string {
  return temNome(anfitrioes) ? `${convite} ${anfitrioes!.trim()}` : convite.replace(/ de$/, "");
}

/** Para título e assunto: o nome, ou a frase sem nome com maiúscula. */
export function nomeOuConvite(convite: string, anfitrioes: string | null | undefined): string {
  if (temNome(anfitrioes)) return anfitrioes!.trim();
  const frase = conviteCom(convite, null);
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

/** Data e hora numa linha só, do jeito que se lê num convite. */
export function quandoLegivel(data: string, hora: string | null): string {
  return dataLonga(data) + (hora ? ` · ${hora.slice(0, 5)}` : "");
}
