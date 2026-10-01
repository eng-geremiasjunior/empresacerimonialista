// O "Adicionar à minha agenda" do site: um .ics de verdade.
//
// O do RsvpConvite punha DTSTART sem fuso (o celular lia no fuso dele) e
// sem fim nem lugar; o do protótipo tinha horário fixo em UTC. Aqui a
// data e a hora do evento são lidas em Brasília e convertidas para UTC
// (Z), que todo app de agenda entende igual; sem hora, vira evento de dia
// inteiro. RFC 5545: CRLF, texto escapado e linha dobrada em 75 octetos.

const FUSO = "America/Sao_Paulo";

/** A noite inteira, como no desenho: 16h30 → 01h00. */
const DURACAO_PADRAO_MIN = 510;

export type EventoDaAgenda = {
  titulo: string;
  /** YYYY-MM-DD */
  data: string;
  /** HH:MM (aceita HH:MM:SS do Postgres); null = dia inteiro */
  hora: string | null;
  duracaoMin?: number;
  local?: string | null;
  endereco?: string | null;
  url?: string | null;
};

const dois = (n: number) => String(n).padStart(2, "0");

/** Quantos minutos Brasília está à frente do UTC naquele instante
 *  (negativo: -180 hoje; o horário de verão antigo dava -120). */
function deslocamentoMin(instante: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const comoUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour") % 24, v("minute"), v("second"));
  return Math.round((comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60000);
}

/** A hora do relógio de Brasília naquele dia, como instante UTC. */
function instanteBR(a: number, m: number, d: number, h: number, min: number): Date {
  const ingenuo = Date.UTC(a, m - 1, d, h, min);
  // duas voltas acertam também a virada de um horário de verão antigo
  let t = ingenuo - deslocamentoMin(new Date(ingenuo)) * 60000;
  t = ingenuo - deslocamentoMin(new Date(t)) * 60000;
  return new Date(t);
}

function utc(t: Date): string {
  return (
    `${t.getUTCFullYear()}${dois(t.getUTCMonth() + 1)}${dois(t.getUTCDate())}` +
    `T${dois(t.getUTCHours())}${dois(t.getUTCMinutes())}${dois(t.getUTCSeconds())}Z`
  );
}

function diaSeguinte(a: number, m: number, d: number): string {
  const t = new Date(Date.UTC(a, m - 1, d + 1));
  return `${t.getUTCFullYear()}${dois(t.getUTCMonth() + 1)}${dois(t.getUTCDate())}`;
}

/** TEXT do RFC 5545: barra, ponto e vírgula, vírgula e quebra de linha. */
function escapar(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Dobra em 75 octetos (UTF-8), sem partir um caractere ao meio; a
 *  continuação começa com um espaço, que conta na linha seguinte. */
function dobrar(linha: string): string {
  const enc = new TextEncoder();
  if (enc.encode(linha).length <= 75) return linha;
  const partes: string[] = [];
  let atual = "";
  let bytes = 0;
  let limite = 75;
  for (const ch of Array.from(linha)) {
    const b = enc.encode(ch).length;
    if (bytes + b > limite) {
      partes.push(atual);
      atual = " ";
      bytes = 1;
      limite = 75;
    }
    atual += ch;
    bytes += b;
  }
  partes.push(atual);
  return partes.join("\r\n");
}

/** Um id estável para o mesmo evento: baixar de novo atualiza, não duplica. */
function uid(ev: EventoDaAgenda): string {
  let h = 0x811c9dc5;
  for (const ch of `${ev.titulo}|${ev.data}|${ev.hora ?? ""}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${ev.data}-${h.toString(16)}@eorganizei.com.br`;
}

/** As duas pontas do evento, para o .ics e para o link do Google. */
function pontas(ev: EventoDaAgenda): { inicio: string; fim: string; diaInteiro: boolean } | null {
  const md = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.data ?? "");
  if (!md) return null;
  const [a, m, d] = [Number(md[1]), Number(md[2]), Number(md[3])];
  const mh = ev.hora ? /^(\d{2}):(\d{2})/.exec(ev.hora) : null;
  if (!mh) return { inicio: `${md[1]}${md[2]}${md[3]}`, fim: diaSeguinte(a, m, d), diaInteiro: true };
  const ini = instanteBR(a, m, d, Number(mh[1]), Number(mh[2]));
  const dur = ev.duracaoMin && ev.duracaoMin > 0 ? ev.duracaoMin : DURACAO_PADRAO_MIN;
  return { inicio: utc(ini), fim: utc(new Date(ini.getTime() + dur * 60000)), diaInteiro: false };
}

function lugar(ev: EventoDaAgenda): string {
  return [ev.local, ev.endereco]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/** O conteúdo do .ics. Data inválida devolve "" (o botão não aparece). */
export function gerarIcs(ev: EventoDaAgenda): string {
  const p = pontas(ev);
  if (!p) return "";
  const onde = lugar(ev);
  const url = (ev.url ?? "").replace(/[\r\n]/g, "").trim();
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//eOrganizei//Site do evento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid(ev)}`,
    `DTSTAMP:${utc(new Date())}`,
    p.diaInteiro ? `DTSTART;VALUE=DATE:${p.inicio}` : `DTSTART:${p.inicio}`,
    p.diaInteiro ? `DTEND;VALUE=DATE:${p.fim}` : `DTEND:${p.fim}`,
    `SUMMARY:${escapar(ev.titulo.trim())}`,
    ...(onde ? [`LOCATION:${escapar(onde)}`] : []),
    ...(url ? [`URL:${url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

/** O mesmo evento no Google Agenda, para quem não abre .ics. */
export function linkGoogleAgenda(ev: EventoDaAgenda): string | null {
  const p = pontas(ev);
  if (!p) return null;
  const q = new URLSearchParams({ action: "TEMPLATE", text: ev.titulo.trim(), dates: `${p.inicio}/${p.fim}` });
  const onde = lugar(ev);
  if (onde) q.set("location", onde);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/**
 * Entrega o .ics. Só no navegador. No iPhone, o data: abre direto o
 * "Adicionar à agenda" (é o que o RsvpConvite fazia e funcionava); com
 * download e Blob o Safari mandaria o arquivo para a pasta Arquivos.
 */
export function baixarIcs(nomeArquivo: string, conteudo: string): void {
  if (typeof window === "undefined" || !conteudo) return;
  const nome = (nomeArquivo.replace(/[\\/:*?"<>|]+/g, "").trim() || "evento").replace(/(\.ics)?$/i, ".ics");
  const ios =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(conteudo)}`;
    return;
  }
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
