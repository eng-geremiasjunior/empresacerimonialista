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
import { PREFIXOS_DO_PORTAL } from "@/lib/app-url";
import { COOKIE_NAO_LEMBRAR, COOKIE_SESSAO } from "@/lib/lembrar-sessao";

export const dynamic = "force-dynamic";

/**
 * Para onde voltar. A sessão nasce no host que ABRIU o link — no portal
 * com endereço próprio (debut.eorganizei.com.br), voltar para o endereço
 * principal deixaria a família sem sessão, na porta de login. Só vale o
 * subdomínio de portal do PRÓPRIO host; qualquer outro cabeçalho é
 * ignorado.
 */
function origemDoPedido(request: NextRequest): string {
  const url = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").toLowerCase();
  const prefixo = PREFIXOS_DO_PORTAL.find((p) => host.startsWith(p));
  if (prefixo && host !== url.host && host.slice(prefixo.length) === url.host.replace(/^www\./, "")) {
    return `${url.protocol}//${host}`;
  }
  return url.origin;
}

/**
 * Entrada nova: com o "Lembrar de mim" desmarcado neste navegador, a
 * sessão que nasce aqui vale até ele fechar (lembrar-sessao.ts). Sem
 * isto, o middleware encerraria na hora a sessão do link recém-aberto.
 */
function entrou(request: NextRequest, destino: string): NextResponse {
  const resposta = NextResponse.redirect(destino);
  if (request.cookies.get(COOKIE_NAO_LEMBRAR)?.value === "1") {
    resposta.cookies.set(COOKIE_SESSAO, "1", { path: "/", sameSite: "lax" });
  }
  return resposta;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = origemDoPedido(request);
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
    return entrou(request, `${origin}${destino}`);
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      // Mesma porta de erro do fluxo com `code`. Este ramo tinha ficado
      // para trás e mandava a cerimonialista para a porta da CLIENTE —
      // o erro que o comentário acima já descrevia como corrigido.
      return NextResponse.redirect(`${origin}${portaDeErro}`);
    }
    return entrou(request, `${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}${portaDeErro}`);
}
