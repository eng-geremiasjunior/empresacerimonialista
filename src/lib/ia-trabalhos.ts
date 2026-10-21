import "server-only";

// O registro dos trabalhos de IA (ia_trabalho, 220). Quem GRAVA é só o
// servidor, com a chave de serviço, depois de conferir cargo e evento
// pela sessão; a sessão só lê (revisão dos céticos, 21/10/2026: se a
// sessão gravasse, dava para forjar o "resultado" com ids de outra
// empresa e o desfazer apagaria o que não é dela).
//
// O texto colado NÃO é guardado: os trabalhos de uma etapa só gravam o
// pacote (o que a IA propôs, já passado pela allowlist).

import { createClient as criarSupabase } from "@supabase/supabase-js";

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return criarSupabase(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

export type TipoDeTrabalho = "montar_roteiro" | "preparar_semana" | "registrar_reuniao";

/** Cria o trabalho já pronto para conferir. Devolve o id, ou null. */
export async function criarTrabalho(p: {
  empresaId: string;
  eventId: string | null;
  userId: string;
  tipo: TipoDeTrabalho;
  pacote: unknown;
}): Promise<string | null> {
  const db = servico();
  if (!db) return null;
  const { data, error } = await db
    .from("ia_trabalho")
    .insert({
      empresa_id: p.empresaId,
      event_id: p.eventId,
      criado_por: p.userId,
      tipo: p.tipo,
      estado: "pronto",
      pacote: p.pacote,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[eorg:ia] criar trabalho:", error.code);
    return null;
  }
  return (data as { id: string }).id;
}

/** Confirmado, descartado ou desfeito: só o servidor muda o estado. */
export async function fecharTrabalho(
  id: string,
  estado: "confirmado" | "descartado" | "desfeito",
  extra: { userId?: string; resultado?: unknown } = {}
): Promise<boolean> {
  const db = servico();
  if (!db) return false;
  const agora = new Date().toISOString();
  const campos: Record<string, unknown> = { estado };
  if (estado === "confirmado") {
    campos.confirmado_por = extra.userId ?? null;
    campos.confirmado_em = agora;
    campos.resultado = extra.resultado ?? null;
  }
  if (estado === "desfeito") campos.desfeito_em = agora;
  const { error } = await db.from("ia_trabalho").update(campos).eq("id", id);
  if (error) console.error("[eorg:ia] fechar trabalho:", error.code);
  return !error;
}
