// Os registros que alimentam a tela Sistema do painel do dono (123,
// seção 10): e-mails enviados, uso da IA e erros vistos pelo servidor.
//
// Três regras valem para tudo aqui:
//   · SERVER-SIDE APENAS, com a chave de serviço (as tabelas não têm
//     policy nenhuma);
//   · nada de dado de quem usa: nem destinatário, nem assunto, nem
//     mensagem de erro (que pode repetir o que a pessoa digitou). Só tipo,
//     resultado, código curto e o nome da área;
//   · registrar NUNCA atrapalha o que está sendo registrado: toda falha
//     (inclusive a tabela ainda não existir) é engolida aqui.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null | undefined;

function servico(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cliente =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false },
          global: { fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) },
        })
      : null;
  return cliente;
}

/** Tabela ou função da 123 ainda não aplicada: não é erro de ninguém. */
const AINDA_NAO_EXISTE = /could not find|does not exist|schema cache/i;

function limpo(texto: string, maximo: number): string {
  return texto.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, maximo);
}

export async function registrarEnvioDeEmail(linha: {
  tipo: string;
  ok: boolean;
  provedorId: string | null;
  /** um código ("http_403", "sem_chave"), nunca a resposta do provedor */
  erro: string | null;
}): Promise<void> {
  try {
    const db = servico();
    if (!db) return;
    const { error } = await db.from("email_envio").insert({
      tipo: limpo(linha.tipo || "outro", 40),
      ok: linha.ok,
      provedor_id: linha.provedorId ? linha.provedorId.slice(0, 80) : null,
      erro: linha.erro ? limpo(linha.erro, 120) : null,
    });
    if (error && !AINDA_NAO_EXISTE.test(error.message)) {
      console.error("[eorganizei:sistema] registro do e-mail:", error.code);
    }
  } catch {
    // medir nunca atrapalha enviar
  }
}

/**
 * Uma chamada à IA. Quem chama passa a PESSOA (já autenticada pela rota);
 * a conta sai do vínculo dela, do mesmo jeito que a presença faz.
 * Nada da pergunta nem da resposta é guardado: só a contagem de tokens
 * que o provedor devolve.
 */
export async function registrarUsoDaIa(linha: {
  userId: string;
  rota: string;
  ok: boolean;
  tokensEntrada?: number | null;
  tokensSaida?: number | null;
}): Promise<void> {
  try {
    const db = servico();
    if (!db) return;
    const { data: vinculo } = await db
      .from("membros_equipe")
      .select("empresa_id")
      .eq("user_id", linha.userId)
      .eq("status", "ativo")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const empresaId = (vinculo?.empresa_id as string | undefined) ?? null;
    if (!empresaId) return;
    const { error } = await db.rpc("registrar_uso_ia", {
      p_empresa_id: empresaId,
      p_rota: linha.rota,
      p_ok: linha.ok,
      p_entrada: Math.max(0, Math.round(linha.tokensEntrada ?? 0)),
      p_saida: Math.max(0, Math.round(linha.tokensSaida ?? 0)),
    });
    if (error && !AINDA_NAO_EXISTE.test(error.message)) {
      console.error("[eorganizei:sistema] registro da IA:", error.code);
    }
  } catch {
    // medir nunca atrapalha a resposta
  }
}

/**
 * Um erro que o servidor viu e tratou (rota pública, aviso da operadora,
 * rotina). `area` é um nome fixo escrito no código ("Aceite da proposta"),
 * nunca o endereço; `codigo`, um código curto (do Postgres, HTTP...).
 */
export async function registrarErroDoServidor(linha: {
  area: string;
  codigo: string | null;
  empresaId?: string | null;
  origem?: "servidor" | "rotina";
}): Promise<void> {
  try {
    const db = servico();
    if (!db) return;
    const { error } = await db.from("erro_do_sistema").insert({
      origem: linha.origem ?? "servidor",
      area: linha.area.slice(0, 80),
      codigo: linha.codigo ? limpo(linha.codigo, 60) : null,
      empresa_id: linha.empresaId ?? null,
    });
    if (error && !AINDA_NAO_EXISTE.test(error.message)) {
      console.error("[eorganizei:sistema] registro do erro:", error.code);
    }
  } catch {
    // registrar nunca vira um segundo erro
  }
}
