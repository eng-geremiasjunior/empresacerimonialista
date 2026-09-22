// A API do Google Agenda, do jeito que o eOrganizei usa: uma agenda
// secundária chamada "eOrganizei" na conta dela, itens gravados com id
// DETERMINÍSTICO (o uuid do evento ou do compromisso), e a leitura dos
// horários ocupados da agenda principal.
//
// O id determinístico é o que dispensa uma tabela de vínculo: gravar é
// sempre um PUT no mesmo endereço, apagar é um DELETE nele, e gravar de
// novo depois de apagado "desapaga". O Google aceita ids em base32hex
// (a-v, 0-9); o hexadecimal do uuid cabe nisso.
//
// O QUE NUNCA SAI DAQUI: valor, CPF, observação interna. O item leva só
// título, data, hora, local e o link de volta para o sistema.

import "server-only";

const BASE = "https://www.googleapis.com/calendar/v3";
export const FUSO = "America/Sao_Paulo";
export const NOME_DA_AGENDA = "eOrganizei";

export class ErroGoogle extends Error {
  constructor(
    public readonly status: number,
    public readonly motivo: string,
    mensagem: string
  ) {
    super(mensagem);
  }
  /** a chave de acesso não vale mais (ou o escopo foi tirado): reconectar */
  get deToken(): boolean {
    return this.status === 401 || (this.status === 403 && /insufficient|forbidden|accessNotConfigured/i.test(this.motivo));
  }
  /** vale tentar de novo daqui a pouco */
  get passageiro(): boolean {
    return this.status >= 500 || this.status === 429 || (this.status === 403 && /rate|quota/i.test(this.motivo));
  }
}

async function chamar<T>(
  token: string,
  metodo: "GET" | "POST" | "PUT" | "DELETE",
  caminho: string,
  corpo?: unknown
): Promise<{ status: number; dados: T | null }> {
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  if (r.status === 204) return { status: 204, dados: null };
  const texto = await r.text();
  let dados: T | null = null;
  try {
    dados = texto ? (JSON.parse(texto) as T) : null;
  } catch {
    dados = null;
  }
  if (!r.ok) {
    const erro = (dados as { error?: { errors?: { reason?: string }[]; message?: string } } | null)?.error;
    const motivo = erro?.errors?.[0]?.reason ?? erro?.message ?? `http_${r.status}`;
    // nada do corpo vai para o log: só status e motivo
    throw new ErroGoogle(r.status, String(motivo).slice(0, 80), `Google ${metodo} ${caminho.split("/").slice(0, 3).join("/")}: ${r.status} ${motivo}`);
  }
  return { status: r.status, dados };
}

/** Cria a agenda secundária "eOrganizei" na conta dela e devolve o id. */
export async function criarAgenda(token: string): Promise<string> {
  const { dados } = await chamar<{ id: string }>(token, "POST", "/calendars", {
    summary: NOME_DA_AGENDA,
    description:
      "Eventos e compromissos do eOrganizei. Esta agenda é mantida pelo sistema: o que você mudar aqui não volta para ele.",
    timeZone: FUSO,
  });
  if (!dados?.id) throw new ErroGoogle(500, "semId", "Google não devolveu o id da agenda");
  return dados.id;
}

/** A agenda ainda existe na conta dela? (ela pode ter apagado à mão) */
export async function agendaExiste(token: string, calendarioId: string): Promise<boolean> {
  try {
    await chamar(token, "GET", `/calendars/${encodeURIComponent(calendarioId)}`);
    return true;
  } catch (e) {
    if (e instanceof ErroGoogle && (e.status === 404 || e.status === 410)) return false;
    throw e;
  }
}

/** Apaga a agenda secundária inteira (ao desconectar). 404 = já não existia. */
export async function apagarAgenda(token: string, calendarioId: string): Promise<void> {
  try {
    await chamar(token, "DELETE", `/calendars/${encodeURIComponent(calendarioId)}`);
  } catch (e) {
    if (e instanceof ErroGoogle && (e.status === 404 || e.status === 410)) return;
    throw e;
  }
}

export type ItemDaAgenda = {
  id: string;
  titulo: string;
  descricao: string;
  local: string | null;
  /** YYYY-MM-DD */
  data: string;
  /** HH:MM; null = dia inteiro */
  hora: string | null;
  duracaoMin: number;
};

/** O uuid vira id do Google: só o hexadecimal, com um prefixo por espécie. */
export function idNoGoogle(especie: "evento" | "compromisso", uuid: string): string {
  return `${especie === "evento" ? "ev" : "cp"}${uuid.replace(/-/g, "").toLowerCase()}`;
}

function somarDiasIso(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

function corpoDoItem(item: ItemDaAgenda) {
  const comum = {
    id: item.id,
    summary: item.titulo,
    description: item.descricao,
    location: item.local ?? undefined,
    status: "confirmed",
    // a marca que diz "isto é do eOrganizei" sem aparecer para ela
    extendedProperties: { private: { eorganizei: "1" } },
    // ela não recebe e-mail do Google a cada gravação
    reminders: { useDefault: true },
  };
  if (!item.hora) {
    return { ...comum, start: { date: item.data }, end: { date: somarDiasIso(item.data, 1) } };
  }
  const [h, mi] = item.hora.split(":").map(Number);
  const inicio = new Date(Date.UTC(2000, 0, 1, h, mi));
  const fim = new Date(inicio.getTime() + Math.max(15, item.duracaoMin) * 60_000);
  const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:00`;
  // a reunião que atravessa a meia-noite termina no dia seguinte
  const diaFim = fim.getUTCDate() !== inicio.getUTCDate() ? somarDiasIso(item.data, 1) : item.data;
  return {
    ...comum,
    start: { dateTime: `${item.data}T${hhmm(inicio)}`, timeZone: FUSO },
    end: { dateTime: `${diaFim}T${hhmm(fim)}`, timeZone: FUSO },
  };
}

/**
 * Grava (cria ou atualiza) um item na agenda eOrganizei. PUT no id
 * determinístico; se o item ainda não existe o Google devolve 404 e
 * então é um POST com o mesmo id. Devolve false quando a AGENDA não
 * existe mais (quem chama recria e tenta de novo).
 */
export async function gravarItem(token: string, calendarioId: string, item: ItemDaAgenda): Promise<boolean> {
  const cal = encodeURIComponent(calendarioId);
  const corpo = corpoDoItem(item);
  try {
    await chamar(token, "PUT", `/calendars/${cal}/events/${item.id}`, corpo);
    return true;
  } catch (e) {
    if (!(e instanceof ErroGoogle) || e.status !== 404) throw e;
  }
  try {
    await chamar(token, "POST", `/calendars/${cal}/events`, corpo);
    return true;
  } catch (e) {
    if (e instanceof ErroGoogle && e.status === 404) return false; // a agenda sumiu
    if (e instanceof ErroGoogle && e.status === 409) {
      // nasceu entre o PUT e o POST (duas rotinas ao mesmo tempo): o PUT agora pega
      await chamar(token, "PUT", `/calendars/${cal}/events/${item.id}`, corpo);
      return true;
    }
    throw e;
  }
}

/** Apaga um item. Já apagado (404/410) conta como feito. */
export async function apagarItem(token: string, calendarioId: string, id: string): Promise<void> {
  try {
    await chamar(token, "DELETE", `/calendars/${encodeURIComponent(calendarioId)}/events/${id}`);
  } catch (e) {
    if (e instanceof ErroGoogle && (e.status === 404 || e.status === 410)) return;
    throw e;
  }
}

export type Ocupado = { inicio: string; fim: string };

/**
 * Os horários ocupados da agenda PRINCIPAL dela entre dois instantes.
 * Só início e fim de cada bloco — o Google não manda título nem nada
 * com este escopo, e é assim que tem de ser.
 */
export async function horariosOcupados(token: string, deIso: string, ateIso: string): Promise<Ocupado[]> {
  const { dados } = await chamar<{ calendars?: Record<string, { busy?: { start: string; end: string }[] }> }>(
    token,
    "POST",
    "/freeBusy",
    { timeMin: deIso, timeMax: ateIso, timeZone: FUSO, items: [{ id: "primary" }] }
  );
  const blocos = dados?.calendars?.primary?.busy ?? [];
  return blocos.map((b) => ({ inicio: b.start, fim: b.end }));
}
