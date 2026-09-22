// "Conectar Google Agenda": manda a pessoa logada para a tela do Google.
//
// O nonce vai num cookie httpOnly e volta no `state`: é o que impede um
// link forjado de amarrar a conta Google de outra pessoa à sessão dela.

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";
import { COOKIE_ESTADO, googleConfigurado, urlDeAutorizacao } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const voltar = (aviso: string) => NextResponse.redirect(new URL(`/configuracoes?google=${aviso}`, appUrl()));
  if (!googleConfigurado()) return voltar("erro");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/configuracoes", appUrl()));
  const { data: cargo } = await supabase.rpc("meu_cargo");
  if (!(cargo as unknown[] | null)?.length) return voltar("erro");

  const nonce = randomBytes(16).toString("hex");
  const resposta = NextResponse.redirect(urlDeAutorizacao(nonce));
  resposta.cookies.set(COOKIE_ESTADO, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return resposta;
}
