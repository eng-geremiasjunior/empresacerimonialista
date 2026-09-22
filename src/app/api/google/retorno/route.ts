// A volta do Google: confere o nonce, troca o código pelas chaves,
// garante a agenda "eOrganizei" na conta dela, grava a conexão (chave
// cifrada) e põe na fila tudo o que ela vê, de hoje em diante.
//
// Nunca dois "eOrganizei": quem reconecta com a agenda ainda de pé
// continua na mesma. E consentimento pela metade (sem a permissão de
// criar a agenda) não vira conexão — a chave é revogada na hora e a tela
// explica.

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { cifrar } from "@/lib/google/cifra";
import {
  COOKIE_ESTADO,
  ESCOPO_AGENDA,
  ESCOPO_OCUPADO,
  googleConfigurado,
  revogar,
  trocarCodigo,
} from "@/lib/google/oauth";
import { agendaExiste, criarAgenda } from "@/lib/google/agenda";
import { servicoGoogle } from "@/lib/google/servico";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: NextRequest) {
  const voltar = (aviso: string) => {
    const r = NextResponse.redirect(new URL(`/configuracoes?google=${aviso}`, appUrl()));
    r.cookies.set(COOKIE_ESTADO, "", { path: "/api/google", maxAge: 0 });
    return r;
  };
  if (!googleConfigurado()) return voltar("erro");

  const url = new URL(request.url);
  const erroDoGoogle = url.searchParams.get("error");
  if (erroDoGoogle) return voltar(erroDoGoogle === "access_denied" ? "recusado" : "erro");

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const nonce = request.cookies.get(COOKIE_ESTADO)?.value ?? "";
  if (!code || !state || !nonce || !iguais(state, nonce)) return voltar("erro");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/configuracoes", appUrl()));
  const { data: cargo } = await supabase.rpc("meu_cargo");
  const c = (cargo as { empresa_id: string }[] | null)?.[0];
  if (!c) return voltar("erro");

  const troca = await trocarCodigo(code);
  if (!troca.ok) {
    console.error("[vela:google] troca do código:", troca.erro);
    return voltar("erro");
  }
  const { chaves } = troca;

  // sem a permissão de criar a agenda não há conexão — e a chave que o
  // Google acabou de dar não fica pendurada
  if (!chaves.escopos.includes(ESCOPO_AGENDA)) {
    await revogar(chaves.refreshToken);
    return voltar("recusado");
  }
  const podeLerOcupado = chaves.escopos.includes(ESCOPO_OCUPADO);

  const db = servicoGoogle();

  // a agenda: a que já existe (reconexão) ou uma nova. Se o Google falhar
  // aqui, a fila cria na primeira gravação.
  let calendarioId: string | null = null;
  try {
    const { data: antiga } = await db
      .from("google_agenda_conexao")
      .select("calendario_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const idAntigo = (antiga as { calendario_id: string | null } | null)?.calendario_id ?? null;
    calendarioId =
      idAntigo && (await agendaExiste(chaves.accessToken, idAntigo)) ? idAntigo : await criarAgenda(chaves.accessToken);
  } catch (e) {
    console.error("[vela:google] agenda ao conectar:", (e instanceof Error ? e.message : String(e)).slice(0, 120));
  }

  const agora = new Date().toISOString();
  const { error } = await db.from("google_agenda_conexao").upsert(
    {
      user_id: user.id,
      empresa_id: c.empresa_id,
      google_email: chaves.email,
      refresh_token_cifrado: cifrar(chaves.refreshToken),
      calendario_id: calendarioId,
      pode_ler_ocupado: podeLerOcupado,
      conectado_em: agora,
      falha: null,
      falha_em: null,
      avisado_em: null,
      atualizado_em: agora,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("[vela:google] gravar conexão:", error.code ?? error.message);
    await revogar(chaves.refreshToken);
    return voltar("erro");
  }

  // tudo o que ela vê, de hoje em diante, vai para a agenda dela agora
  const { error: erroFila } = await db.rpc("google_agenda_enfileirar_tudo", { p_user: user.id });
  if (erroFila) console.error("[vela:google] enfileirar tudo:", erroFila.message);

  return voltar(podeLerOcupado ? "ok" : "ok_sem_ocupado");
}
