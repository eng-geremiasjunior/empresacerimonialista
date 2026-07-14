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
      request.nextUrl.pathname.startsWith("/confirmacao/")
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
  // Rotas de cron protegem-se sozinhas com Bearer CRON_SECRET
  const isCron = pathname.startsWith("/api/cron/");

  if (!user && !isLoginPage && !isPublicRoteiro && !isPublicConfirmacao && !isCron) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/eventos/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
