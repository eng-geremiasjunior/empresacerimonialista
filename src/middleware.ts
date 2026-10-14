import { soCampanha } from "@/lib/parametros-de-campanha";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { appUrl, PREFIXOS_DO_PORTAL } from "@/lib/app-url";
import {
  COOKIE_BARRADO,
  COOKIE_IMPRESSAO,
  IMPRESSOES_BLOQUEADAS,
  IPS_BLOQUEADOS,
  NAVEGADORES_BLOQUEADOS,
  ehRoboDeBuscaOuPrevia,
  ipDoPedido,
  navegadorDoPedido,
  paisDoPedido,
} from "@/lib/ips-bloqueados";

// Chamados por serviços de fora do país, com segredo próprio: as rotinas
// (Vercel) e a fila do Google (o banco, pelo pg_net). Os avisos da
// Pagar.me e do WhatsApp (/api/webhooks) nem passam pelo middleware.
const SEM_FRONTEIRA = ["/api/cron/", "/api/google/fila"];

function barrar(): NextResponse {
  return new NextResponse("Acesso indisponível.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
}
import { registrarTentativaBarrada } from "@/lib/tentativas-barradas";

// O que o portal da debutante usa: as telas do portal, a entrada por
// link (/auth/confirm), as rotas de API que as telas chamam e as páginas
// públicas que a família abre de dentro dele.
const DO_PORTAL = [
  "/portal",
  "/auth/",
  "/nova-senha",
  "/api/",
  "/c/",
  // o convite animado (exemplo e prévia no iframe do portal)
  "/convites/",
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
    // com os parâmetros de CAMPANHA (fbclid, utm_…): precisam chegar à
    // porta, onde o pixel lê — e só eles (lib/parametros-de-campanha)
    return NextResponse.redirect(
      new URL("/portal" + soCampanha(request.nextUrl.searchParams), `${request.nextUrl.protocol}//${host}`)
    );
  }
  if (DO_PORTAL.some((prefixo) => p === prefixo || p.startsWith(prefixo))) return null;
  return NextResponse.redirect(new URL(p + request.nextUrl.search, appUrl()));
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // Barrado no site inteiro (ips-bloqueados.ts): o IP, o navegador (os
  // cookies do pixel e do Google) ou a marca que o site deixou na última
  // vez. Quem é barrado ganha a marca por 1 ano: troca o IP e continua
  // barrado. Cada tentativa conta no /admin (207), sem segurar a resposta.
  const ip = ipDoPedido(request.headers);
  const nav = navegadorDoPedido((n) => request.cookies.get(n)?.value);
  const impressao = request.cookies.get(COOKIE_IMPRESSAO)?.value ?? null;
  const porIp = !!ip && IPS_BLOQUEADOS.has(ip);
  const porImpressao = !!impressao && IMPRESSOES_BLOQUEADAS.has(impressao);
  const porNavegador =
    (!!nav.fbp && NAVEGADORES_BLOQUEADOS.has(nav.fbp)) ||
    (!!nav.ga && NAVEGADORES_BLOQUEADOS.has(nav.ga)) ||
    request.cookies.get(COOKIE_BARRADO)?.value === "1";
  if (porIp || porNavegador || porImpressao) {
    event.waitUntil(
      registrarTentativaBarrada("site", porIp ? "ip_bloqueado" : porImpressao ? "impressao_digital" : "navegador_barrado", ip)
    );
    const barrado = barrar();
    barrado.cookies.set(COOKIE_BARRADO, "1", { maxAge: 60 * 60 * 24 * 365, path: "/", httpOnly: true, sameSite: "lax", secure: true });
    return barrado;
  }

  // Só o Brasil (dono, 14/10/2026: "não atendo outros países"; VPN costuma
  // sair por fora). Sem país (servidor local) não barra. Os robôs de busca
  // e de prévia de link leem as páginas públicas; nada além de GET.
  const pais = paisDoPedido(request.headers);
  const caminho = request.nextUrl.pathname;
  if (
    pais &&
    pais !== "BR" &&
    !SEM_FRONTEIRA.some((p) => caminho.startsWith(p)) &&
    !(request.method === "GET" && !caminho.startsWith("/api/") && ehRoboDeBuscaOuPrevia(request.headers.get("user-agent")))
  ) {
    event.waitUntil(registrarTentativaBarrada("site", "fora_do_brasil", ip));
    return barrar();
  }

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
    // arquivos estáticos não passam pela sessão (o violino do modelo 06 é
    // tocado pelo convidado, sem login)
    "/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)",
  ],
};
