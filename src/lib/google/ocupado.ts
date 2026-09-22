// Os horários OCUPADOS da agenda principal dela, para o Secretário
// Executivo não oferecer ao fornecedor um horário em que ela tem médico.
//
// Só entra quando ela conectou o Google e deixou ler a disponibilidade.
// Qualquer falha (Google fora, chave morta, sem conexão) devolve vazio:
// a oferta de horários nunca depende do Google para existir — no pior
// caso ela oferece um horário que já tinha por fora, como sempre foi.

import "server-only";

import { decifrar } from "@/lib/google/cifra";
import { renovarAcesso } from "@/lib/google/oauth";
import { horariosOcupados } from "@/lib/google/agenda";
import { servicoGoogle } from "@/lib/google/servico";

export type BlocoOcupado = { data: string; ini: number; fim: number };

// Brasília não tem horário de verão desde 2019: UTC-3 fixo, a mesma
// conta que a porta da assinatura faz.
function emBrasilia(iso: string): { data: string; minuto: number } {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return { data: d.toISOString().slice(0, 10), minuto: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

function proximoDia(data: string): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * Blocos ocupados por dia (em minutos do dia, Brasília) entre duas datas
 * inclusivas. Um bloco que atravessa a meia-noite vira dois.
 */
export async function blocosOcupadosNoGoogle(userId: string, deData: string, ateData: string): Promise<BlocoOcupado[]> {
  try {
    const db = servicoGoogle();
    const { data } = await db
      .from("google_agenda_conexao")
      .select("refresh_token_cifrado, pode_ler_ocupado, falha")
      .eq("user_id", userId)
      .maybeSingle();
    const c = data as { refresh_token_cifrado: string; pode_ler_ocupado: boolean; falha: string | null } | null;
    if (!c || !c.pode_ler_ocupado || c.falha === "token") return [];

    const acesso = await renovarAcesso(decifrar(c.refresh_token_cifrado));
    if (!acesso.ok) return [];

    const blocos = await horariosOcupados(acesso.accessToken, `${deData}T00:00:00-03:00`, `${ateData}T23:59:59-03:00`);
    const saida: BlocoOcupado[] = [];
    for (const b of blocos) {
      let { data: dia, minuto: ini } = emBrasilia(b.inicio);
      const fimB = emBrasilia(b.fim);
      while (dia < fimB.data) {
        saida.push({ data: dia, ini, fim: 24 * 60 });
        dia = proximoDia(dia);
        ini = 0;
      }
      if (fimB.minuto > ini) saida.push({ data: dia, ini, fim: fimB.minuto });
    }
    return saida;
  } catch (e) {
    console.error("[vela:google] ocupado:", (e instanceof Error ? e.message : String(e)).slice(0, 120));
    return [];
  }
}
