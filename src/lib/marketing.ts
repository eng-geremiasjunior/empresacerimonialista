// Medição de anúncio: a tag do Google e o pixel da Meta.
//
// ONDE ELES PODEM ENTRAR — e esta é a regra mais importante do arquivo.
//
// Só nas telas de marketing: a porta de entrada (/login, onde a conta é
// criada), /planos, /termos e /privacidade. Em NENHUMA outra.
//
// O motivo não é preferência, é credencial: no portal da cliente, no
// convite do convidado, no link do fornecedor, no guia, no posto da
// recepção, na proposta e na entrada do QR, o HASH VIAJA NA URL e o hash
// É a credencial. Script de terceiro nessas páginas manda o endereço
// inteiro para o servidor dele (page_location no GA, o referrer no
// pixel) — e quem tivesse acesso àquele painel teria acesso ao evento de
// uma cliente. Além do problema de LGPD, com a cerimonialista como
// controladora e nós como operador, é uma porta que não se abre por
// conveniência de marketing.
//
// Por isso a lista abaixo é de PERMISSÃO, não de bloqueio: rota nova
// nasce sem medição, e só entra aqui quem for olhada uma a uma.
//
// DUAS TELAS, e nenhuma a mais (dono, 06/09/2026). Começou em /login
// apenas — "antes da cliente ter qualquer acesso" —, e /planos entrou
// quando ele decidiu transformá-la na página de destino do anúncio, com
// a oferta e a criação de conta no fim.
//
// As duas cabem pelo mesmo teste, que é o único que vale aqui: **o
// endereço delas não carrega credencial**. É por isso que /portal,
// /confirmar, /c, /guia, /fornecedor, /recepcao, /entrada e /orcamento
// nunca entram — não por serem menos importantes para a venda, mas
// porque o hash na URL É a chave de acesso.

/** As telas onde a medição pode rodar. Comparação exata, sem prefixo. */
const TELAS_DE_MARKETING = new Set(["/login", "/planos"]);

/**
 * A tela é a da oferta? Só ela dispara "viu o conteúdo" — o evento que
 * separa quem chegou de quem leu a proposta. Em /login isso não faz
 * sentido: quem está lá já decidiu entrar.
 */
export function telaDaOferta(pathname: string): boolean {
  return pathname === "/planos";
}

export function telaDeMarketing(pathname: string): boolean {
  return TELAS_DE_MARKETING.has(pathname);
}

/**
 * Os dois identificadores. São públicos por natureza (vão para o
 * navegador de qualquer visitante), então vivem em NEXT_PUBLIC_ — o que
 * não os torna menos configuráveis: sem eles, nada carrega, e a tela
 * funciona igual.
 */
export function idDoGoogle(): string | null {
  const v = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return v && /^G-[A-Z0-9]+$/i.test(v) ? v : null;
}

export function idDoPixelMeta(): string | null {
  const v = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return v && /^\d{6,20}$/.test(v) ? v : null;
}

/* ------------------------------------------------------------------ */
/* Os eventos                                                          */
/* ------------------------------------------------------------------ */

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
  }
}

/** O nome do cookie que carrega a origem do clique até a assinatura. */
export const COOKIE_ORIGEM = "eorg_origem";

function cookie(nome: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * A impressão digital do clique, no momento em que a conta nasce.
 *
 * Ela só existe no navegador e só agora: os cookies são do pixel e da tag,
 * e os parâmetros vêm da URL do anúncio. A assinatura vai acontecer
 * depois — no servidor, às vezes dias depois —, e sem isto guardado a
 * plataforma conta a venda mas não sabe de qual anúncio ela veio.
 *
 * Guarda num cookie próprio, de 90 dias, porque é o único carregador que
 * atravessa a sessão: entre criar a conta e assinar pode haver um logout,
 * um e-mail de confirmação e outro dia.
 *
 * Nada aqui identifica pessoa: identifica navegador e campanha.
 *
 * CHAMAR NA PRIMEIRA TELA, NÃO SÓ NO CADASTRO (08/09/2026). O anúncio
 * entrega em `/planos?utm_source=…&fbclid=…`, e a pessoa só chega ao
 * cadastro dois ou três cliques depois — quando a URL já não carrega
 * nada. Enquanto esta função rodava só no formulário, `utm_source`,
 * `utm_campaign`, `gclid` e o `fbclid` (que vira o `fbc` da Meta) eram
 * perdidos em TODA conta: a plataforma recebia a conversão sem saber de
 * qual anúncio ela veio, que é a única pergunta que o dono faz ao olhar
 * o painel.
 *
 * E A SEGUNDA CHAMADA NÃO PODE APAGAR A PRIMEIRA. Chamada no cadastro,
 * onde só existem os cookies do pixel, ela reescrevia o cookie inteiro
 * sem os `utm_*` — jogando fora justamente o que a landing tinha
 * guardado. Agora o que já está gravado permanece, e só é substituído
 * quando a URL de AGORA traz marca de campanha nova: quem volta por um
 * segundo anúncio conta para o segundo anúncio, quem só navegou pelo
 * site continua contando para o primeiro.
 */
export function guardarOrigemDoClique(): void {
  if (typeof document === "undefined") return;
  try {
    const url = new URLSearchParams(window.location.search);
    const dados = {
      fbp: cookie("_fbp"),
      // o _fbc só existe se a pessoa veio de um anúncio; quando não existe,
      // dá para montá-lo a partir do fbclid da URL, no formato da Meta
      fbc:
        cookie("_fbc") ??
        (url.get("fbclid") ? `fb.1.${Date.now()}.${url.get("fbclid")}` : null),
      // o cookie _ga é "GA1.1.<client_id>" — o client_id é o par final
      gaClientId: cookie("_ga")?.split(".").slice(-2).join(".") ?? null,
      gclid: url.get("gclid"),
      utm_source: url.get("utm_source"),
      utm_medium: url.get("utm_medium"),
      utm_campaign: url.get("utm_campaign"),
    };
    // Marca de campanha na URL de AGORA = toque novo, e toque novo manda.
    // Sem ela, esta chamada é só uma navegação interna e não tem
    // autoridade para trocar a origem de nada.
    const toqueNovo = Boolean(
      url.get("utm_source") ||
        url.get("utm_medium") ||
        url.get("utm_campaign") ||
        url.get("gclid") ||
        url.get("fbclid")
    );

    let guardado: Record<string, string | null> = {};
    try {
      const cru = cookie(COOKIE_ORIGEM);
      if (cru) guardado = JSON.parse(decodeURIComponent(cru)) as Record<string, string | null>;
    } catch {
      guardado = {};
    }

    const juntos: Record<string, string | null> = { ...dados };
    for (const [chave, valor] of Object.entries(guardado)) {
      if (!valor) continue;
      // o que já estava guardado só cede a um toque novo de verdade; os
      // identificadores de navegador (fbp, ga) cedem sempre que houver
      // um valor mais fresco, porque identificam o mesmo navegador
      const eDeCampanha = chave.startsWith("utm_") || chave === "gclid" || chave === "fbc";
      if (eDeCampanha && toqueNovo) continue;
      if (!juntos[chave]) juntos[chave] = valor;
      else if (eDeCampanha) juntos[chave] = valor;
    }

    if (!Object.values(juntos).some(Boolean)) return;
    const noventaDias = 90 * 24 * 60 * 60;
    document.cookie =
      `${COOKIE_ORIGEM}=${encodeURIComponent(JSON.stringify(juntos))};` +
      `path=/;max-age=${noventaDias};SameSite=Lax`;
  } catch {
    // sem cookie a conta continua sendo criada; só a atribuição se perde
  }
}

/**
 * A conversão que importa: a conta foi criada.
 *
 * É este evento que o anúncio otimiza — sem ele, a Meta gasta o dia
 * inteiro procurando clique, não cliente. Dispara UMA vez, no sucesso do
 * cadastro, e nunca leva e-mail, nome ou qualquer dado de pessoa: só o
 * fato. O que a plataforma precisa saber é que aconteceu, não com quem.
 */
export function contaCriada(): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "sign_up", { method: "email" });
    window.fbq?.("track", "CompleteRegistration");
  } catch {
    // medição nunca derruba cadastro: se o bloqueador de anúncio comeu o
    // script, a conta continua sendo criada e ninguém fica sabendo disso
    // pela tela de erro
  }
}

/** Ela abriu o formulário de assinatura, com um plano escolhido. */
export function assinaturaIniciada(plano: string, valor: number): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "begin_checkout", {
      currency: "BRL",
      value: valor,
      items: [{ item_id: plano }],
    });
    window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value: valor });
  } catch {
    /* idem */
  }
}

/** A assinatura foi aprovada pela operadora. */
export function assinaturaFeita(plano: string, valor: number): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "purchase", {
      currency: "BRL",
      value: valor,
      transaction_id: plano + ":" + Date.now(),
      items: [{ item_id: plano }],
    });
    window.fbq?.("track", "Subscribe", { currency: "BRL", value: valor });
  } catch {
    /* idem */
  }
}

/**
 * Alguém mexeu na demonstração da página de vendas: escreveu o nome e
 * mandou o evento nascer. É o número que separa quem só leu de quem
 * quis ver — e o que diz se a demo puxa gente para o checkout ou não.
 *
 * Só dispara em /planos, onde os scripts existem; fora dela `fbq` e
 * `gtag` são undefined e nada acontece. Leva só o tipo do evento —
 * nunca o nome que ela digitou.
 */
export function demoIniciada(tipo: string): void {
  try {
    window.gtag?.("event", "demo_iniciada", { tipo });
    window.fbq?.("trackCustom", "DemoIniciada", { tipo });
  } catch {
    // medir nunca pode quebrar a página
  }
}

/**
 * O CLIQUE EM CADA CHAMADA DA PÁGINA DE VENDAS (09/09/2026).
 *
 * Pedido do dono: "coloca disparo em todos os botões, todos". O motivo é
 * prático — nenhuma conta foi criada ainda, e um conjunto de anúncios sem
 * conversão nenhuma não sai da fase de aprendizado. Um evento de meio de
 * funil, com volume, dá à plataforma o que otimizar enquanto o de baixo
 * não acontece.
 *
 * A régua para escolher o nome de cada um:
 *
 *  · quem clica no botão que leva ao cadastro está DECLARANDO INTENÇÃO, e
 *    isso tem nome padrão na Meta: `Lead`. É evento reconhecido, aparece
 *    na lista de otimização e serve de alvo enquanto "Concluir inscrição"
 *    não tem volume;
 *  · quem clica em "assinar" NÃO dispara `InitiateCheckout` aqui. Esse
 *    nome já é usado pelo SERVIDOR no momento em que a cobrança vai à
 *    operadora — repeti-lo num clique dobraria o número e estragaria a
 *    única medida confiável de "chegou ao pagamento";
 *  · o resto vira evento próprio, com nome que diz o que é. Nome
 *    inventado não polui os padrões e continua contável no Gerenciador.
 *
 * Nada aqui identifica pessoa: identifica qual botão foi tocado.
 */
export function cliqueNaChamada(destino: string, rotulo?: string | null): void {
  if (typeof window === "undefined") return;
  const alvo = (destino || "").split("?")[0];
  const dados = { botao: (rotulo || "").trim().slice(0, 60) || alvo };
  try {
    if (alvo === "/criar-conta") {
      window.fbq?.("track", "Lead", dados);
      window.gtag?.("event", "generate_lead", dados);
      return;
    }
    if (alvo === "/comecar" || alvo.startsWith("/assinatura")) {
      window.fbq?.("trackCustom", "ClicouAssinar", dados);
      window.gtag?.("event", "clicou_assinar", dados);
      return;
    }
    if (alvo === "#experimente") {
      window.fbq?.("trackCustom", "ClicouExperimentar", dados);
      window.gtag?.("event", "clicou_experimentar", dados);
      return;
    }
    if (alvo === "#planos") {
      window.fbq?.("trackCustom", "ClicouVerPlanos", dados);
      window.gtag?.("event", "clicou_ver_planos", dados);
      return;
    }
    if (alvo === "/login") {
      window.gtag?.("event", "clicou_entrar", dados);
      return;
    }
  } catch {
    // medição nunca atrapalha a navegação
  }
}
