import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Tudo que se alcança sem sessão.
 *
 * Havia DUAS listas neste arquivo — uma para o caso de o Supabase não
 * estar configurado e outra para o caso normal — e elas já tinham
 * divergido: /api/cron/ estava só na segunda. Uma rota nova esquecida na
 * lista errada vira 302 para /login numa página que deveria abrir no
 * celular do fornecedor, no dia do evento.
 *
 * O hash É a credencial nestas rotas: quem tem o link entra, e a RPC do
 * outro lado devolve só a fatia dele.
 */
const ROTAS_PUBLICAS: ((p: string) => boolean)[] = [
  (p) => p.startsWith("/login"),
  // roteiro do fornecedor: /eventos/{id}/roteiro/publico/{hash}
  (p) => new RegExp("^/eventos/[^/]+/roteiro/publico/").test(p),
  (p) => p.startsWith("/confirmacao/"),
  // convite de agendamento (Secretário): o fornecedor escolhe o horário
  (p) => p.startsWith("/agendar/"),
  // política de privacidade — pública, exigida pela Meta
  (p) => p === "/privacidade",
  // orçamento na mão da cliente (aprova ou recusa)
  (p) => p.startsWith("/orcamento/"),
  // as rotas de cron se protegem sozinhas com Bearer CRON_SECRET
  (p) => p.startsWith("/api/cron/"),
  // cadastro do convidado pelo link do evento
  (p) => p.startsWith("/api/rsvp/"),
  // as fotos do álbum do convite (token assinado emitido pela rota)
  (p) => p.startsWith("/api/album/"),
  // Portal da Cliente: a porta é pública; o resto exige sessão
  (p) => p.startsWith("/portal/entrar"),
  // callback do OTP: roda ANTES de existir sessão
  (p) => p.startsWith("/auth/confirm"),
  // a tela de senha nova — a sessão nasce em /auth/confirm e o formulário
  // recusa sozinho quando não há
  (p) => p.startsWith("/nova-senha"),
  // confirmação de presença do convidado
  (p) => p.startsWith("/confirmar/"),
  // o site do casamento pelo endereço bonito (/c/ana-e-bruno)
  (p) => p.startsWith("/c/"),
  // guia de estilo na mão do fornecedor
  (p) => p.startsWith("/guia/"),
  // Central de Solicitações na mão do fornecedor
  (p) => p.startsWith("/fornecedor/"),
  (p) => p.startsWith("/api/fornecedor/"),
  // o posto da recepção (check-in por QR) e a rota que ele chama; o hash
  // do posto é a credencial e o banco decide se ele ainda vale
  (p) => p.startsWith("/recepcao/"),
  (p) => p.startsWith("/api/recepcao/"),
];

function ehPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((casa) => casa(pathname));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase ainda não configurado (.env.local ausente): manda tudo
  // para /login, que exibe as instruções de configuração.
  if (!supabaseUrl || !supabaseKey) {
    if (ehPublica(request.nextUrl.pathname)) {
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
  if (!user && !ehPublica(pathname)) {
    const url = request.nextUrl.clone();
    // A cliente que abre um link do portal sem sessão volta para a porta
    // dela, não para o login da cerimonialista.
    url.pathname = pathname.startsWith("/portal") ? "/portal/entrar" : "/login";
    return NextResponse.redirect(url);
  }

  // Quatro destas rotas voltam aqui embaixo por outro motivo: não é
  // "quem entra sem sessão", é para onde vai quem JÁ tem uma.
  const isLoginPage = pathname.startsWith("/login");
  const isPortalEntrar = pathname.startsWith("/portal/entrar");
  const isAuthConfirm = pathname.startsWith("/auth/confirm");
  // /c/ junto: a noiva LOGADA no portal abre o próprio site do casamento
  // pelos dois endereços — sem isto seria expulsa para /portal
  const isPublicConfirmar =
    pathname.startsWith("/confirmar/") || pathname.startsWith("/c/");

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
