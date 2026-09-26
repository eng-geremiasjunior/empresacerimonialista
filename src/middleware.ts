import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { appUrl, PREFIXOS_DO_PORTAL } from "@/lib/app-url";

// O que o portal da debutante usa: as telas do portal, a entrada por
// link (/auth/confirm), as rotas de API que as telas chamam e as páginas
// públicas que a família abre de dentro dele.
const DO_PORTAL = [
  "/portal",
  "/auth/",
  "/nova-senha",
  "/api/",
  "/c/",
  "/confirmar/",
  "/entrada/",
  "/guia/",
  "/privacidade",
  "/termos",
  "/manifest.webmanifest",
  "/portal-sw.js",
  "/portal-offline.html",
  "/pdf.worker.min.mjs",
  "/sounds/",
];

/**
 * O portal no endereço dele (25/09/2026): debut.eorganizei.com.br abre SÓ
 * o portal. A raiz e o /login levam à porta da família; qualquer tela da
 * área da cerimonialista (painel, cadastro, admin) volta para o endereço
 * principal, onde mora.
 */
function enderecoDoPortal(request: NextRequest): NextResponse | null {
  // o cabeçalho, e não a URL: atrás do proxy (e no servidor de
  // desenvolvimento) a URL pode vir com o host interno
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.hostname
  ).toLowerCase();
  // os endereços que são SÓ portal moram em SUBDOMINIO_DO_PORTAL (app-url)
  if (!PREFIXOS_DO_PORTAL.some((h) => host.startsWith(h))) return null;
  const p = request.nextUrl.pathname;
  if (p === "/" || p.startsWith("/login") || p === "/equipe") {
    return NextResponse.redirect(new URL("/portal", `${request.nextUrl.protocol}//${host}`));
  }
  if (DO_PORTAL.some((prefixo) => p === prefixo || p.startsWith(prefixo))) return null;
  return NextResponse.redirect(new URL(p + request.nextUrl.search, appUrl()));
}

export async function middleware(request: NextRequest) {
  // Webhooks são chamados por serviços externos (Meta/WhatsApp), sem
  // sessão. Precisam passar direto, sem redirecionar para /login.
  if (request.nextUrl.pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const doPortal = enderecoDoPortal(request);
  if (doPortal) return doPortal;

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
