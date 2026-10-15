// "Conectar Google Agenda": manda a pessoa logada para a tela do Google.
//
// O nonce vai num cookie httpOnly e volta no `state`: é o que impede um
// link forjado de amarrar a conta Google de outra pessoa à sessão dela.
//
// `?voltar=` diz de que tela ela saiu (Configurações ou a Visão geral de
// um evento) — só destinos da lista de `destinoDeVolta` — e a volta do
// Google a devolve para lá.

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { possoUsar } from "@/lib/supabase/nivel-do-plano";
import {
  COOKIE_ESTADO,
  COOKIE_VOLTA,
  destinoDeVolta,
  googleConfigurado,
  urlDeAutorizacao,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destino = destinoDeVolta(request.nextUrl.searchParams.get("voltar"));
  const voltar = (aviso: string) => NextResponse.redirect(new URL(`${destino}?google=${aviso}`, appUrl()));
  if (!googleConfigurado()) return voltar("erro");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(destino)}`, appUrl()));
  const { data: cargo } = await supabase.rpc("meu_cargo");
  if (!(cargo as unknown[] | null)?.length) return voltar("erro");
  // planos por recurso (09/10/2026): a Agenda do Google é dos planos pagos
  // (a noiva da conta de família fica fora da matriz)
  if (!(await possoUsar("google_agenda"))) return voltar("plano");

  const nonce = randomBytes(16).toString("hex");
  const resposta = NextResponse.redirect(urlDeAutorizacao(nonce));
  const cookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/google",
    maxAge: 600,
  };
  resposta.cookies.set(COOKIE_ESTADO, nonce, cookie);
  resposta.cookies.set(COOKIE_VOLTA, destino, cookie);
  return resposta;
}
