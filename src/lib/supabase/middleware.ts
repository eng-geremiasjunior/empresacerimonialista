import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase ainda não configurado (.env.local ausente): manda tudo
  // para /login, que exibe as instruções de configuração.
  if (!supabaseUrl || !supabaseKey) {
    if (
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.includes("/roteiro/publico/") ||
      request.nextUrl.pathname.startsWith("/confirmacao/") ||
      request.nextUrl.pathname.startsWith("/orcamento/") ||
      request.nextUrl.pathname.startsWith("/agendar/") ||
      request.nextUrl.pathname === "/privacidade" ||
      request.nextUrl.pathname.startsWith("/portal/entrar") ||
      request.nextUrl.pathname.startsWith("/auth/confirm") ||
      request.nextUrl.pathname.startsWith("/confirmar/")
    ) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANTE: não colocar lógica entre createServerClient e getUser,
  // senão a sessão pode não ser renovada corretamente.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");
  // Link público do roteiro do fornecedor — acessível sem login
  const isPublicRoteiro = /^\/eventos\/[^/]+\/roteiro\/publico\//.test(pathname);
  // Página pública de confirmação do fornecedor — acessível sem login
  const isPublicConfirmacao = pathname.startsWith("/confirmacao/");
  // Convite de agendamento (Secretário) — fornecedor escolhe horário sem login
  const isPublicAgendar = pathname.startsWith("/agendar/");
  // Política de privacidade — pública (exigida pela Meta)
  const isPublicPrivacidade = pathname === "/privacidade";
  // Link público do orçamento (cliente aprova/recusa) — acessível sem login
  const isPublicOrcamento = pathname.startsWith("/orcamento/");
  // Rotas de cron protegem-se sozinhas com Bearer CRON_SECRET
  const isCron = pathname.startsWith("/api/cron/");
  // Portal da Cliente: a porta de entrada é pública; o resto exige sessão
  const isPortalEntrar = pathname.startsWith("/portal/entrar");
  // Callback de OTP (reset de senha) — precisa rodar antes de haver sessão
  const isAuthConfirm = pathname.startsWith("/auth/confirm");
  // Confirmação de presença do convidado — link público, sem login
  const isPublicConfirmar = pathname.startsWith("/confirmar/");

  if (
    !user &&
    !isLoginPage &&
    !isPublicRoteiro &&
    !isPublicConfirmacao &&
    !isPublicAgendar &&
    !isPublicPrivacidade &&
    !isPublicOrcamento &&
    !isCron &&
    !isPortalEntrar &&
    !isAuthConfirm &&
    !isPublicConfirmar
  ) {
    const url = request.nextUrl.clone();
    // A cliente que abre um link do portal sem sessão volta para a porta
    // dela, não para o login da cerimonialista.
    url.pathname = pathname.startsWith("/portal") ? "/portal/entrar" : "/login";
    return NextResponse.redirect(url);
  }

  // ------------------------------------------------------------------
  // As duas casas do sistema não se misturam.
  //
  // A marca de portal vive em app_metadata (posta pelo servidor na criação
  // do acesso), justamente porque user_metadata é editável pela própria
  // usuária — ela poderia remover a marca e cair no app profissional.
  // ------------------------------------------------------------------
  const ehPortal = user?.app_metadata?.portal === true;
  const emPortal = pathname.startsWith("/portal");

  if (user && ehPortal) {
    // Senha provisória não navega: troca primeiro.
    const precisaTrocarSenha = user.app_metadata?.senha_provisoria === true;
    const emTrocaDeSenha =
      pathname.startsWith("/portal/primeiro-acesso") ||
      pathname.startsWith("/portal/redefinir");

    if (precisaTrocarSenha && !emTrocaDeSenha && !isAuthConfirm) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/primeiro-acesso";
      return NextResponse.redirect(url);
    }
    if (!emPortal && !isAuthConfirm && !isPublicConfirmar) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
  }

  // Quem NÃO é do portal (equipe) pode abrir /portal: um e-mail é uma
  // conta só no Supabase, então a mesma pessoa pode ser da equipe e ter
  // vínculo de cliente num evento (a própria dona testando, ou uma
  // cerimonialista que vai se casar). Quem decide é o vínculo, não a
  // marca — e essa checagem exige banco, então mora no layout do portal,
  // não aqui: consultar em toda requisição sairia caro.

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = ehPortal ? "/portal" : "/eventos/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isPortalEntrar && ehPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
