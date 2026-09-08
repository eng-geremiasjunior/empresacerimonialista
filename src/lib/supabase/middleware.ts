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
  // A raiz decide sozinha para onde mandar (login ou painel) — e precisa
  // rodar para isso. Sem esta linha, um link de confirmação que o
  // Supabase mandou para "/?code=…" (o Site URL, quando o destino pedido
  // não está na lista de permitidas) era rebatido para /login AQUI, com
  // o code jogado fora, antes de a página ter a chance de encaminhá-lo
  // para /auth/confirm. Para quem chega sem sessão e sem code, o
  // resultado é o mesmo de antes: /login.
  (p) => p === "/",
  (p) => p.startsWith("/login"),
  // roteiro do fornecedor: /eventos/{id}/roteiro/publico/{hash}
  (p) => new RegExp("^/eventos/[^/]+/roteiro/publico/").test(p),
  (p) => p.startsWith("/confirmacao/"),
  // convite de agendamento (Secretário): o fornecedor escolhe o horário
  (p) => p.startsWith("/agendar/"),
  // política de privacidade — pública, exigida pela Meta
  (p) => p === "/privacidade",
  // termos de uso — o link da caixinha de aceite abre ANTES de haver conta
  (p) => p === "/termos",
  // os planos lado a lado — a pessoa escolhe ANTES de ter conta
  (p) => p === "/planos",
  // o teste de sete dias (154): quatro campos, sem cartão e sem conta
  (p) => p === "/criar-conta",
  // o checkout de quem chega do anúncio: a conta nasce junto com a
  // cobrança, então esta tela existe para quem ainda não tem sessão
  (p) => p === "/comecar",
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
  // o destino do QR do convidado: mostra o código de entrada e nada mais
  (p) => p.startsWith("/entrada/"),
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

/**
 * O caminho pedido, repassado ao servidor num cabeçalho.
 *
 * Layout no App Router não sabe qual rota está renderizando, e a trava da
 * assinatura precisa saber: sem isso ela mandaria para /assinatura a
 * própria /assinatura, em laço infinito.
 *
 * Os cabeçalhos são copiados NA HORA da chamada, e não uma vez no topo,
 * porque `request.cookies.set` (que o Supabase usa para renovar a sessão)
 * mexe no cabeçalho de cookie do request: copiar antes congelaria a
 * sessão velha e derrubaria o login na navegação seguinte.
 */
function comCaminho(request: NextRequest) {
  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-caminho", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: cabecalhos } });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = comCaminho(request);

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
        supabaseResponse = comCaminho(request);
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
