// Callback de autenticação por e-mail (link de "esqueci minha senha",
// convite, confirmação). Troca a credencial do link por uma sessão e
// encaminha para o destino.
//
// Dois formatos chegam aqui, e os DOIS precisam funcionar:
//
//   ?code=...            → fluxo PKCE, o padrão do @supabase/ssr com o
//                          template de e-mail padrão do Supabase. O GoTrue
//                          verifica o token nele mesmo e redireciona para
//                          cá com um code; a troca usa o code_verifier que
//                          ficou no cookie DESTE navegador.
//   ?token_hash=&type=   → template de e-mail customizado que aponta
//                          direto para esta rota ({{ .TokenHash }}).
//
// Sem tratar o formato ?code=, o link "funcionava" no e-mail mas caía de
// volta no login — foi exatamente o sintoma reportado.

import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Só caminhos internos: sem isto, o link do e-mail viraria redirect
  // aberto para qualquer domínio.
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Quem errou o link volta para a porta DELA. Mandar a cerimonialista
  // para /portal/entrar (a porta da cliente) fazia parecer que ela tinha
  // errado de sistema.
  const portaDeErro = destino.startsWith("/portal")
    ? "/portal/entrar?erro=link"
    : "/login?erro=link";

  // Link expirado/já usado chega com error na query — não é caso de trocar.
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}${portaDeErro}`);
  }

  const supabase = createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // O caso mais comum: o e-mail foi aberto em OUTRO navegador/aparelho
      // (o code_verifier do PKCE mora no cookie de quem pediu o link).
      return NextResponse.redirect(`${origin}${portaDeErro}`);
    }
    return NextResponse.redirect(`${origin}${destino}`);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      return NextResponse.redirect(`${origin}/portal/entrar?erro=link`);
    }
    return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/portal/entrar?erro=link`);
}
